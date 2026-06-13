/**
 * Phase 1a tenancy-enforcement tests (convex-test harness). Proves:
 *  - stamp-on-write sets institutionId (caller-derived for loans, loan-derived for payments)
 *  - INERTNESS: with TENANCY_ENFORCEMENT off, staff see all tenants (no scoping)
 *  - NEGATIVE ISOLATION: with the flag on, staff see only their tenant; cross-tenant
 *    single-row fetch is denied
 *  - backfill stamps null rows to the sole tenant, idempotently
 *
 * Run: npm run test:convex
 */
import { convexTest } from 'convex-test';
import { describe, expect, test } from 'vitest';
import schema from './schema';
import { api, internal } from './_generated/api';
import type { Id } from './_generated/dataModel';

const modules = import.meta.glob('./**/*.*s');

function asUser(t: ReturnType<typeof convexTest>, userId: Id<'users'>) {
  return t.withIdentity({ subject: `${userId}|testsession` });
}

async function seedInstitution(
  t: ReturnType<typeof convexTest>,
  code: string
): Promise<Id<'institutions'>> {
  return t.run(async (ctx) =>
    ctx.db.insert('institutions', {
      name: code,
      shortCode: code,
      type: 'lender',
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  );
}

async function seedUser(
  t: ReturnType<typeof convexTest>,
  opts: { role: string; institutionId?: Id<'institutions'>; kyc?: string } = { role: 'client' }
): Promise<Id<'users'>> {
  return t.run(async (ctx) => {
    const userId = await ctx.db.insert('users', {});
    await ctx.db.insert('profiles', {
      userId,
      email: `${userId}@example.test`,
      kycStatus: (opts.kyc ?? 'verified') as 'pending' | 'verified',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await ctx.db.insert('userRoles', {
      userId,
      role: opts.role as 'client' | 'loan_officer' | 'admin' | 'tenant_admin',
      institutionId: opts.institutionId,
      createdAt: Date.now(),
    });
    return userId;
  });
}

async function enableEnforcement(t: ReturnType<typeof convexTest>) {
  await t.run(async (ctx) => {
    await ctx.db.insert('businessRules', {
      ruleCode: 'TENANCY_ENFORCEMENT',
      category: 'platform',
      displayName: 'Tenancy enforcement',
      valueType: 'boolean',
      value: 'true',
      version: 1,
      effectiveFrom: Date.now(),
      createdAt: Date.now(),
    });
  });
}

async function seedLoanFor(
  t: ReturnType<typeof convexTest>,
  borrower: Id<'users'>,
  institutionId: Id<'institutions'>
): Promise<Id<'loans'>> {
  return t.run(async (ctx) => {
    const now = Date.now();
    return ctx.db.insert('loans', {
      userId: borrower,
      institutionId,
      principal: 1000,
      interestRate: 20,
      termMonths: 6,
      status: 'under_review',
      outstandingBalance: 1000,
      totalPaid: 0,
      createdAt: now,
      updatedAt: now,
    });
  });
}

// ---------------------------------------------------------------------------
// Stamp-on-write
// ---------------------------------------------------------------------------

describe('stamp-on-write', () => {
  test('createLoan stamps the caller tenant; recordPayment stamps from the loan', async () => {
    const t = convexTest(schema, modules);
    const inst = await seedInstitution(t, 'ACME');
    const borrower = await seedUser(t, { role: 'client', institutionId: inst });

    const loanId: Id<'loans'> = await asUser(t, borrower).mutation(api.loans.createLoan, {
      principal: 5000,
      interestRate: 20,
      termMonths: 12,
    });
    const loanInst = await t.run(async (ctx) => (await ctx.db.get(loanId))?.institutionId);
    expect(loanInst).toBe(inst);

    // move to active so a payment can be recorded
    await t.run(async (ctx) => ctx.db.patch(loanId, { status: 'active' }));
    const staff = await seedUser(t, { role: 'loan_officer', institutionId: inst });
    const paymentId: Id<'paymentTransactions'> = await asUser(t, staff).mutation(
      api.payments.recordPayment,
      { loanId, amount: 100, method: 'manual' }
    );
    const payInst = await t.run(async (ctx) => (await ctx.db.get(paymentId))?.institutionId);
    expect(payInst).toBe(inst);
  });
});

// ---------------------------------------------------------------------------
// Inertness vs negative isolation
// ---------------------------------------------------------------------------

describe('scope-on-read', () => {
  async function twoTenantsWithLoans(t: ReturnType<typeof convexTest>) {
    const instA = await seedInstitution(t, 'AAA');
    const instB = await seedInstitution(t, 'BBB');
    const borrowerA = await seedUser(t, { role: 'client', institutionId: instA });
    const borrowerB = await seedUser(t, { role: 'client', institutionId: instB });
    const loanA = await seedLoanFor(t, borrowerA, instA);
    const loanB = await seedLoanFor(t, borrowerB, instB);
    const staffA = await seedUser(t, { role: 'tenant_admin', institutionId: instA });
    return { instA, instB, loanA, loanB, staffA };
  }

  test('INERT: with enforcement off, staff A sees both tenants loans', async () => {
    const t = convexTest(schema, modules);
    const { staffA } = await twoTenantsWithLoans(t);
    const loans = await asUser(t, staffA).query(api.loans.adminListLoans, {});
    expect(loans.length).toBe(2);
  });

  test('ISOLATED: with enforcement on, staff A sees only tenant A', async () => {
    const t = convexTest(schema, modules);
    const { instA, loanA, loanB, staffA } = await twoTenantsWithLoans(t);
    await enableEnforcement(t);

    const loans = await asUser(t, staffA).query(api.loans.adminListLoans, {});
    expect(loans.length).toBe(1);
    expect(loans[0]._id).toBe(loanA);
    expect(loans.every((l) => l.institutionId === instA)).toBe(true);

    // cross-tenant single-row fetch is denied
    await expect(
      asUser(t, staffA).query(api.loans.getLoan, { loanId: loanB })
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });
    // own-tenant fetch still works
    expect(await asUser(t, staffA).query(api.loans.getLoan, { loanId: loanA })).toBeTruthy();
  });

  test('legacy null-institution rows remain visible to the sole tenant when enforcing', async () => {
    const t = convexTest(schema, modules);
    const inst = await seedInstitution(t, 'ONLY');
    const borrower = await seedUser(t, { role: 'client', institutionId: inst });
    const staff = await seedUser(t, { role: 'tenant_admin', institutionId: inst });
    // a legacy loan with NO institutionId
    await t.run(async (ctx) => {
      const now = Date.now();
      await ctx.db.insert('loans', {
        userId: borrower,
        principal: 1,
        interestRate: 10,
        termMonths: 1,
        status: 'draft',
        createdAt: now,
        updatedAt: now,
      });
    });
    await enableEnforcement(t);
    const loans = await asUser(t, staff).query(api.loans.adminListLoans, {});
    expect(loans.length).toBe(1); // null-institution row still visible (treated as in-scope)
  });
});

// ---------------------------------------------------------------------------
// Backfill
// ---------------------------------------------------------------------------

describe('backfill', () => {
  test('stamps null core rows to the sole tenant, idempotently', async () => {
    const t = convexTest(schema, modules);
    const inst = await seedInstitution(t, 'SOLE');
    const borrower = await seedUser(t, { role: 'client', institutionId: inst });
    await t.run(async (ctx) => {
      const now = Date.now();
      await ctx.db.insert('loans', {
        userId: borrower,
        principal: 1,
        interestRate: 10,
        termMonths: 1,
        status: 'draft',
        createdAt: now,
        updatedAt: now,
      });
    });

    const r1 = await t.mutation(internal.platform.backfill.backfillTenancyFinancialCore, {});
    expect(r1.ok).toBe(true);
    expect(r1.stamped?.loans).toBe(1);

    const stampedInst = await t.run(async (ctx) => {
      const loan = await ctx.db.query('loans').first();
      return loan?.institutionId;
    });
    expect(stampedInst).toBe(inst);

    // re-run: nothing left to stamp
    const r2 = await t.mutation(internal.platform.backfill.backfillTenancyFinancialCore, {});
    expect(r2.stamped?.loans).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Phase 1b — representative isolation across derivation classes
// ---------------------------------------------------------------------------

describe('Phase 1b isolation', () => {
  test('user-owned: listUsers shows only the caller tenant when enforcing', async () => {
    const t = convexTest(schema, modules);
    const instA = await seedInstitution(t, 'UA');
    const instB = await seedInstitution(t, 'UB');
    const staffA = await seedUser(t, { role: 'tenant_admin', institutionId: instA });
    await seedUser(t, { role: 'client', institutionId: instA });
    await seedUser(t, { role: 'client', institutionId: instB });

    const before = await asUser(t, staffA).query(api.users.listUsers, {});
    expect(before.length).toBe(3); // inert → all

    await enableEnforcement(t);
    const after = await asUser(t, staffA).query(api.users.listUsers, {});
    expect(after.length).toBe(2); // staffA + clientA only
    expect(after.every((u) => u.institutionId === instA)).toBe(true);
  });

  test('loan-child: collections queue shows only the caller tenant when enforcing', async () => {
    const t = convexTest(schema, modules);
    const instA = await seedInstitution(t, 'CA');
    const instB = await seedInstitution(t, 'CB');
    const staffA = await seedUser(t, { role: 'tenant_admin', institutionId: instA });
    const borrowerA = await seedUser(t, { role: 'client', institutionId: instA });
    const borrowerB = await seedUser(t, { role: 'client', institutionId: instB });
    const loanA = await seedLoanFor(t, borrowerA, instA);
    const loanB = await seedLoanFor(t, borrowerB, instB);
    await t.run(async (ctx) => {
      const base = {
        installmentNumber: 1,
        dueDate: Date.now() - 86_400_000,
        principalDue: 100,
        interestDue: 10,
        totalDue: 110,
        status: 'overdue' as const,
        createdAt: Date.now(),
      };
      await ctx.db.insert('paymentSchedules', { ...base, loanId: loanA, institutionId: instA });
      await ctx.db.insert('paymentSchedules', { ...base, loanId: loanB, institutionId: instB });
    });

    await enableEnforcement(t);
    const queue = await asUser(t, staffA).query(api.collections.getCollectionsQueue, {});
    expect(queue.length).toBe(1);
    expect(queue[0].institutionId).toBe(instA);
  });

  test('staff-created: bank transactions list scopes by tenant when enforcing', async () => {
    const t = convexTest(schema, modules);
    const instA = await seedInstitution(t, 'BA');
    const instB = await seedInstitution(t, 'BB');
    const staffA = await seedUser(t, { role: 'tenant_admin', institutionId: instA });
    await t.run(async (ctx) => {
      const base = {
        amount: 100,
        transactionDate: '2026-01-01',
        transactionType: 'credit' as const,
        source: 'manual',
        status: 'unmatched' as const,
        importedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await ctx.db.insert('bankTransactions', { ...base, externalId: 'A1', institutionId: instA });
      await ctx.db.insert('bankTransactions', { ...base, externalId: 'B1', institutionId: instB });
    });

    await enableEnforcement(t);
    const rows = await asUser(t, staffA).query(api.reconciliation.listBankTransactions, {});
    expect(rows.length).toBe(1);
    expect(rows[0].institutionId).toBe(instA);
  });
});
