/**
 * Seed identity tests. Password sign-in resolves `authAccounts` (provider=password,
 * providerAccountId=email) and Convex Auth also reads `users.email`. A seed that
 * skipped secret refresh or left users.email blank is what stranded protected E2E
 * on /auth after a "successful" preview seed.
 *
 * Run: npm run test:convex
 */
import { convexTest } from 'convex-test';
import { describe, expect, test } from 'vitest';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { E2E_PASSWORD_LOGIN_EMAILS } from './seedMutations';
import schema from './schema';

const modules = import.meta.glob('./**/*.*s');

function harness() {
  return convexTest(schema, modules);
}

async function seedInstitution(t: ReturnType<typeof harness>): Promise<Id<'institutions'>> {
  return await t.run(async (ctx) =>
    ctx.db.insert('institutions', {
      name: 'E2E Tenant',
      shortCode: `E2E${Math.floor(Math.random() * 1e6)}`,
      type: 'lender',
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  );
}

async function passwordAccount(t: ReturnType<typeof harness>, email: string) {
  return t.run(async (ctx) =>
    ctx.db
      .query('authAccounts')
      .filter((q) =>
        q.and(q.eq(q.field('provider'), 'password'), q.eq(q.field('providerAccountId'), email))
      )
      .first()
  );
}

describe('createTestUser identity', () => {
  test('writes users.email and a password authAccounts secret', async () => {
    const t = harness();
    const institutionId = await seedInstitution(t);

    const created = await t.mutation(internal.seedMutations.createTestUser, {
      email: 'Admin@test.namlend.com',
      hashedPassword: 'hash-v1',
      role: 'admin',
      institutionId,
    });

    const user = await t.run(async (ctx) => ctx.db.get(created.userId));
    const account = await passwordAccount(t, 'admin@test.namlend.com');

    expect(created.created).toBe(true);
    expect(user?.email).toBe('admin@test.namlend.com');
    expect(account?.secret).toBe('hash-v1');
    expect(account?.userId).toBe(created.userId);
  });

  test('re-seed refreshes the password secret instead of skipping', async () => {
    const t = harness();
    const institutionId = await seedInstitution(t);

    await t.mutation(internal.seedMutations.createTestUser, {
      email: 'client1@test.namlend.com',
      hashedPassword: 'hash-v1',
      role: 'client',
      institutionId,
    });
    await t.mutation(internal.seedMutations.createTestUser, {
      email: 'client1@test.namlend.com',
      hashedPassword: 'hash-v2',
      role: 'client',
      institutionId,
    });

    const account = await passwordAccount(t, 'client1@test.namlend.com');
    expect(account?.secret).toBe('hash-v2');
  });
});

describe('seedPlatformOwnerForE2E identity', () => {
  test('writes users.email and refreshes the password secret', async () => {
    const t = harness();

    const first = await t.mutation(internal.seedMutations.seedPlatformOwnerForE2E, {
      ownerEmail: 'platformowner@test.namlend.com',
      hashedPassword: 'hash-v1',
    });
    const second = await t.mutation(internal.seedMutations.seedPlatformOwnerForE2E, {
      ownerEmail: 'platformowner@test.namlend.com',
      hashedPassword: 'hash-v2',
    });

    const user = await t.run(async (ctx) => ctx.db.get(second.userId));
    const account = await passwordAccount(t, 'platformowner@test.namlend.com');

    expect(second.userId).toBe(first.userId);
    expect(user?.email).toBe('platformowner@test.namlend.com');
    expect(account?.secret).toBe('hash-v2');
  });
});

describe('E2E password census', () => {
  test('counts secrets for the four disposable-preview emails, not Notion aromatic logins', async () => {
    const t = harness();
    const institutionId = await seedInstitution(t);

    expect(E2E_PASSWORD_LOGIN_EMAILS).not.toContain('owner@namlend.test');
    expect(E2E_PASSWORD_LOGIN_EMAILS).not.toContain('operator@namlend.test');
    expect(E2E_PASSWORD_LOGIN_EMAILS).not.toContain('client@namlend.test');

    await t.mutation(internal.seedMutations.createTestUser, {
      email: 'client1@test.namlend.com',
      hashedPassword: 'h',
      role: 'client',
      institutionId,
    });
    await t.mutation(internal.seedMutations.createTestUser, {
      email: 'admin@test.namlend.com',
      hashedPassword: 'h',
      role: 'admin',
      institutionId,
    });
    await t.mutation(internal.seedMutations.createTestUser, {
      email: 'loan_officer@test.namlend.com',
      hashedPassword: 'h',
      role: 'loan_officer',
      institutionId,
    });
    await t.mutation(internal.seedMutations.seedPlatformOwnerForE2E, {
      ownerEmail: 'platformowner@test.namlend.com',
      hashedPassword: 'h',
    });

    const census = await t.query(internal.seedMutations.countE2EAuthAccounts, {});
    expect(census.count).toBe(4);
    expect(census.emails).toEqual([...E2E_PASSWORD_LOGIN_EMAILS]);
  });
});
