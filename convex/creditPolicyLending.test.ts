/**
 * Lending-time credit-policy enforcement.
 *
 * Credit policy is not just stored tenant config: loan creation and approval must enforce it.
 */

import { convexTest } from 'convex-test';
import { describe, expect, test } from 'vitest';
import { api } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { CREDIT_POLICY_KEY, DEFAULT_CREDIT_POLICY, type CreditPolicy } from './lib/creditPolicy';
import schema from './schema';

const modules = import.meta.glob('./**/*.*s');
type TestCtx = ReturnType<typeof convexTest>;

function asUser(t: TestCtx, userId: Id<'users'>) {
  return t.withIdentity({ subject: `${userId}|testsession` });
}

async function seedInstitution(t: TestCtx, code: string): Promise<Id<'institutions'>> {
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
  t: TestCtx,
  opts: {
    role?: 'client' | 'loan_officer' | 'admin' | 'tenant_admin';
    institutionId?: Id<'institutions'>;
    kyc?: 'pending' | 'submitted' | 'verified' | 'rejected';
  } = {}
): Promise<Id<'users'>> {
  return t.run(async (ctx) => {
    const userId = await ctx.db.insert('users', {});
    await ctx.db.insert('profiles', {
      userId,
      institutionId: opts.institutionId,
      email: `${userId}@example.test`,
      kycStatus: opts.kyc ?? 'verified',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    if (opts.role) {
      await ctx.db.insert('userRoles', {
        userId,
        role: opts.role,
        institutionId: opts.institutionId,
        createdAt: Date.now(),
      });
    }
    return userId;
  });
}

async function seedCreditPolicy(
  t: TestCtx,
  institutionId: Id<'institutions'>,
  overrides: Partial<CreditPolicy>
) {
  await t.run(async (ctx) => {
    await ctx.db.insert('institutionConfig', {
      institutionId,
      key: CREDIT_POLICY_KEY,
      value: { ...DEFAULT_CREDIT_POLICY, ...overrides },
      effectiveFrom: Date.now(),
      version: 1,
      createdAt: Date.now(),
    });
  });
}

async function seedLoan(
  t: TestCtx,
  institutionId: Id<'institutions'>,
  borrower: Id<'users'>,
  overrides: Record<string, unknown> = {}
): Promise<Id<'loans'>> {
  return t.run(async (ctx) => {
    const now = Date.now();
    return ctx.db.insert('loans', {
      userId: borrower,
      institutionId,
      principal: 10_000,
      interestRate: 20,
      termMonths: 12,
      monthlyIncome: 6_000,
      status: 'under_review',
      outstandingBalance: 10_000,
      totalPaid: 0,
      creditScore: 700,
      debtToIncomeRatio: 0.3,
      recommendation: 'approve',
      createdAt: now,
      updatedAt: now,
      ...overrides,
    });
  });
}

describe('credit policy in loan creation', () => {
  test('createLoan rejects amounts below and above tenant policy', async () => {
    const t = convexTest(schema, modules);
    const inst = await seedInstitution(t, 'CP_CREATE_AMOUNT');
    const borrower = await seedUser(t, { role: 'client', institutionId: inst });
    await seedCreditPolicy(t, inst, { minLoanAmount: 1_000, maxLoanAmount: 5_000 });

    await expect(
      asUser(t, borrower).mutation(api.loans.createLoan, {
        principal: 500,
        interestRate: 20,
        termMonths: 12,
      })
    ).rejects.toMatchObject({ data: { code: 'CREDIT_POLICY_VIOLATION' } });

    await expect(
      asUser(t, borrower).mutation(api.loans.createLoan, {
        principal: 6_000,
        interestRate: 20,
        termMonths: 12,
      })
    ).rejects.toMatchObject({ data: { code: 'CREDIT_POLICY_VIOLATION' } });
  });

  test('createLoan rejects interest above tenant policy even when below legal APR cap', async () => {
    const t = convexTest(schema, modules);
    const inst = await seedInstitution(t, 'CP_CREATE_RATE');
    const borrower = await seedUser(t, { role: 'client', institutionId: inst });
    await seedCreditPolicy(t, inst, {
      baseInterestRate: 18,
      maxInterestRate: 20,
      riskPremiumMedium: 1,
      riskPremiumHigh: 2,
    });

    await expect(
      asUser(t, borrower).mutation(api.loans.createLoan, {
        principal: 2_000,
        interestRate: 21,
        termMonths: 12,
      })
    ).rejects.toMatchObject({ data: { code: 'CREDIT_POLICY_VIOLATION' } });
  });
});

describe('credit policy in approval', () => {
  test('approveLoan rejects monthly income below tenant policy', async () => {
    const t = convexTest(schema, modules);
    const inst = await seedInstitution(t, 'CP_APPROVE_INCOME');
    const borrower = await seedUser(t, { role: 'client', institutionId: inst, kyc: 'verified' });
    const staff = await seedUser(t, { role: 'loan_officer', institutionId: inst });
    await seedCreditPolicy(t, inst, { minMonthlyIncome: 5_000 });
    const loanId = await seedLoan(t, inst, borrower, { monthlyIncome: 2_500 });

    await expect(
      asUser(t, staff).mutation(api.loans.approveLoan, { loanId })
    ).rejects.toMatchObject({ data: { code: 'CREDIT_POLICY_VIOLATION' } });
  });

  test('approveLoan rejects DTI above tenant policy but below global scoring limit', async () => {
    const t = convexTest(schema, modules);
    const inst = await seedInstitution(t, 'CP_APPROVE_DTI');
    const borrower = await seedUser(t, { role: 'client', institutionId: inst, kyc: 'verified' });
    const staff = await seedUser(t, { role: 'loan_officer', institutionId: inst });
    await seedCreditPolicy(t, inst, { maxDebtToIncome: 35 });
    const loanId = await seedLoan(t, inst, borrower, { debtToIncomeRatio: 0.38 });

    await expect(
      asUser(t, staff).mutation(api.loans.approveLoan, { loanId })
    ).rejects.toMatchObject({ data: { code: 'CREDIT_POLICY_VIOLATION' } });
  });

  test('default credit policy preserves an existing valid approval flow', async () => {
    const t = convexTest(schema, modules);
    const inst = await seedInstitution(t, 'CP_APPROVE_DEFAULT');
    const borrower = await seedUser(t, { role: 'client', institutionId: inst, kyc: 'verified' });
    const staff = await seedUser(t, { role: 'loan_officer', institutionId: inst });
    const loanId = await seedLoan(t, inst, borrower);

    await asUser(t, staff).mutation(api.loans.approveLoan, { loanId });
    expect(await t.run(async (ctx) => (await ctx.db.get(loanId))?.status)).toBe('approved');
  });
});
