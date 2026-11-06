/**
 * Reference-number tests (convex-test harness). These numbers land on executed loan
 * agreements, so the properties under test are contractual, not cosmetic:
 *  - UNIQUE: no two profiles or loans ever share a number
 *  - PERMANENT: an allocated number is never replaced on a later write
 *  - PER-TENANT: each institution numbers its own clients from 000001
 *  - FORMATTED: matches what Schedule A of the agreement prints
 *
 * Run: npm run test:convex
 */
import { convexTest } from 'convex-test';
import { describe, expect, test } from 'vitest';
import type { Id } from './_generated/dataModel';
import { enrollUser } from './lib/enrollment';
import {
  allocateLoanNumber,
  allocateSequence,
  ensureClientNumber,
  formatClientNumber,
  formatLoanNumber,
  namibianYear,
} from './lib/referenceNumbers';
import schema from './schema';

const modules = import.meta.glob('./**/*.*s');

function harness() {
  return convexTest(schema, modules);
}

type T = ReturnType<typeof harness>;

async function seedAuthUser(t: T, email?: string): Promise<Id<'users'>> {
  return t.run(async (ctx) => ctx.db.insert('users', email ? { email } : {}));
}

async function seedInstitution(t: T, shortCode: string): Promise<Id<'institutions'>> {
  const now = Date.now();
  return t.run(async (ctx) =>
    ctx.db.insert('institutions', {
      name: `${shortCode} Financial Services CC`,
      shortCode,
      type: 'lender',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    })
  );
}

describe('formatting', () => {
  test('client number is zero-padded to six digits, as Schedule A prints it', () => {
    expect(formatClientNumber(1)).toBe('000001');
    expect(formatClientNumber(42)).toBe('000042');
    expect(formatClientNumber(999999)).toBe('999999');
  });

  test('a seventh digit widens rather than truncating', () => {
    // Truncating would silently reuse '000000' and break uniqueness on the contract.
    expect(formatClientNumber(1000000)).toBe('1000000');
  });

  test('loan number carries the tenant short code, year and sequence', () => {
    const jan2026 = Date.UTC(2026, 0, 15);
    expect(formatLoanNumber('OGFS', 123, jan2026)).toBe('OGFS-2026-000123');
  });

  test('short code is normalised, and an untenanted loan still gets a reference', () => {
    const t = Date.UTC(2026, 5, 1);
    expect(formatLoanNumber('og-fs 1', 7, t)).toBe('OGFS1-2026-000007');
    expect(formatLoanNumber(undefined, 7, t)).toBe('LN-2026-000007');
    expect(formatLoanNumber('', 7, t)).toBe('LN-2026-000007');
  });

  test('year is Namibian local time, not UTC', () => {
    // 23:30 UTC on 31 Dec is already 01:30 on 1 Jan in Windhoek (UTC+2, no DST).
    expect(namibianYear(Date.UTC(2025, 11, 31, 23, 30))).toBe(2026);
    expect(namibianYear(Date.UTC(2025, 11, 31, 21, 30))).toBe(2025);
  });
});

describe('allocateSequence', () => {
  test('starts at 1 and increments', async () => {
    const t = harness();
    const first = await t.run(async (ctx) => allocateSequence(ctx, 'clientNumber', undefined));
    const second = await t.run(async (ctx) => allocateSequence(ctx, 'clientNumber', undefined));
    const third = await t.run(async (ctx) => allocateSequence(ctx, 'clientNumber', undefined));
    expect([first, second, third]).toEqual([1, 2, 3]);
  });

  test('each institution has its own counter', async () => {
    const t = harness();
    const a = await seedInstitution(t, 'OGFS');
    const b = await seedInstitution(t, 'OTHER');

    expect(await t.run(async (ctx) => allocateSequence(ctx, 'clientNumber', a))).toBe(1);
    expect(await t.run(async (ctx) => allocateSequence(ctx, 'clientNumber', a))).toBe(2);
    // A second tenant must not inherit the first one's position.
    expect(await t.run(async (ctx) => allocateSequence(ctx, 'clientNumber', b))).toBe(1);
  });

  test('client and loan sequences are independent', async () => {
    const t = harness();
    await t.run(async (ctx) => allocateSequence(ctx, 'clientNumber', undefined));
    await t.run(async (ctx) => allocateSequence(ctx, 'clientNumber', undefined));
    expect(await t.run(async (ctx) => allocateSequence(ctx, 'loanNumber', undefined))).toBe(1);
  });
});

describe('ensureClientNumber', () => {
  test('allocates on first call and is stable thereafter', async () => {
    const t = harness();
    const userId = await seedAuthUser(t, 'borrower@example.com');
    await t.run(async (ctx) => enrollUser(ctx, { userId, source: 'password' }));

    const read = async () =>
      t.run(async (ctx) => {
        const profile = await ctx.db
          .query('profiles')
          .withIndex('by_userId', (q) => q.eq('userId', userId))
          .first();
        return profile!;
      });

    const initial = (await read()).clientNumber;
    expect(initial).toMatch(/^\d{6}$/);

    // Idempotent: a number already printed on an agreement must never be reissued.
    const again = await t.run(async (ctx) => {
      const profile = await ctx.db
        .query('profiles')
        .withIndex('by_userId', (q) => q.eq('userId', userId))
        .first();
      return ensureClientNumber(ctx, profile!);
    });
    expect(again).toBe(initial);
  });

  test('backfills a profile that predates client numbers', async () => {
    const t = harness();
    const userId = await seedAuthUser(t);
    const now = Date.now();
    const profileId = await t.run(async (ctx) =>
      ctx.db.insert('profiles', {
        userId,
        email: 'legacy@example.com',
        kycStatus: 'pending',
        createdAt: now,
        updatedAt: now,
      })
    );

    const assigned = await t.run(async (ctx) =>
      ensureClientNumber(ctx, (await ctx.db.get(profileId))!)
    );
    expect(assigned).toBe('000001');
    expect(await t.run(async (ctx) => (await ctx.db.get(profileId))!.clientNumber)).toBe('000001');
  });
});

describe('enrollUser', () => {
  test('every newly enrolled profile gets a unique client number', async () => {
    const t = harness();
    const numbers: string[] = [];

    for (const email of ['a@example.com', 'b@example.com', 'c@example.com']) {
      const userId = await seedAuthUser(t, email);
      await t.run(async (ctx) => enrollUser(ctx, { userId, email, source: 'password' }));
      numbers.push(
        await t.run(async (ctx) => {
          const profile = await ctx.db
            .query('profiles')
            .withIndex('by_userId', (q) => q.eq('userId', userId))
            .first();
          return profile!.clientNumber!;
        })
      );
    }

    expect(numbers).toEqual(['000001', '000002', '000003']);
    expect(new Set(numbers).size).toBe(3);
  });

  test('re-enrolling on every sign-in does not reissue the number', async () => {
    const t = harness();
    const userId = await seedAuthUser(t, 'repeat@example.com');

    await t.run(async (ctx) => enrollUser(ctx, { userId, source: 'password' }));
    const first = await t.run(async (ctx) => {
      const p = await ctx.db
        .query('profiles')
        .withIndex('by_userId', (q) => q.eq('userId', userId))
        .first();
      return p!.clientNumber;
    });

    await t.run(async (ctx) => enrollUser(ctx, { userId, source: 'google' }));
    await t.run(async (ctx) => enrollUser(ctx, { userId, source: 'self_heal' }));

    const after = await t.run(async (ctx) => {
      const p = await ctx.db
        .query('profiles')
        .withIndex('by_userId', (q) => q.eq('userId', userId))
        .first();
      return p!.clientNumber;
    });
    expect(after).toBe(first);
  });
});

describe('allocateLoanNumber', () => {
  test('uses the institution short code and increments', async () => {
    const t = harness();
    const institutionId = await seedInstitution(t, 'OGFS');
    const year = namibianYear(Date.now());

    const first = await t.run(async (ctx) => allocateLoanNumber(ctx, institutionId));
    const second = await t.run(async (ctx) => allocateLoanNumber(ctx, institutionId));

    expect(first).toBe(`OGFS-${year}-000001`);
    expect(second).toBe(`OGFS-${year}-000002`);
  });

  test('falls back to LN when the loan has no institution', async () => {
    const t = harness();
    const number = await t.run(async (ctx) => allocateLoanNumber(ctx, undefined));
    expect(number).toBe(`LN-${namibianYear(Date.now())}-000001`);
  });
});
