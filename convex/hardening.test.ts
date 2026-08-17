/**
 * Production-safe hardening regression tests (Convex in-memory harness).
 *
 * Covers the load-bearing invariants from the hardening program:
 *   - both approval paths enforce identical readiness (KYC + scoring)
 *   - repayment ledger posts on completion, exactly once, idempotently
 *   - failed payments post nothing
 *   - role assignment is admin-only
 *
 * Run: npm run test:convex
 */
import { convexTest } from 'convex-test';
import { describe, expect, test } from 'vitest';
import { api, internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import schema from './schema';

// Load all Convex modules for the harness.
const modules = import.meta.glob('./**/*.*s');

type Role = 'client' | 'loan_officer' | 'admin' | 'tenant_admin';
type Kyc = 'pending' | 'submitted' | 'verified' | 'rejected';

function asUser(t: ReturnType<typeof convexTest>, userId: Id<'users'>) {
  return t.withIdentity({ subject: `${userId}|testsession` });
}

async function seedInstitution(
  t: ReturnType<typeof convexTest>,
  code = 'TEST'
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
  opts: { role?: Role; kyc?: Kyc; institutionId?: Id<'institutions'> } = {}
): Promise<Id<'users'>> {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert('users', {});
    await ctx.db.insert('profiles', {
      userId,
      email: `${userId}@example.test`,
      kycStatus: opts.kyc ?? 'pending',
      ...(opts.institutionId ? { institutionId: opts.institutionId } : {}),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    if (opts.role) {
      await ctx.db.insert('userRoles', {
        userId,
        role: opts.role,
        ...(opts.institutionId ? { institutionId: opts.institutionId } : {}),
        createdAt: Date.now(),
      });
    }
    return userId;
  });
}

async function seedLoan(
  t: ReturnType<typeof convexTest>,
  userId: Id<'users'>,
  overrides: Record<string, unknown> = {}
): Promise<Id<'loans'>> {
  return await t.run(async (ctx) => {
    const now = Date.now();
    return await ctx.db.insert('loans', {
      userId,
      principal: 10000,
      interestRate: 20,
      termMonths: 12,
      status: 'under_review',
      outstandingBalance: 10000,
      totalPaid: 0,
      creditScore: 700,
      debtToIncomeRatio: 0.3,
      monthlyIncome: 5000,
      recommendation: 'approve',
      createdAt: now,
      updatedAt: now,
      ...overrides,
    });
  });
}

const loanStatus = (t: ReturnType<typeof convexTest>, loanId: Id<'loans'>) =>
  t.run(async (ctx) => (await ctx.db.get(loanId))?.status);

const outboxCount = (t: ReturnType<typeof convexTest>, sourceId: string) =>
  t.run(
    async (ctx) =>
      (
        await ctx.db
          .query('tigerBeetleOutbox')
          .withIndex('by_sourceId', (q) => q.eq('sourceId', sourceId))
          .collect()
      ).length
  );

// ---------------------------------------------------------------------------
// Approval readiness — BOTH paths must enforce the same invariant
// ---------------------------------------------------------------------------

describe('approval readiness (loans.approveLoan)', () => {
  test('rejects unverified KYC', async () => {
    const t = convexTest(schema, modules);
    const staff = await seedUser(t, { role: 'loan_officer' });
    const borrower = await seedUser(t, { kyc: 'pending' });
    const loanId = await seedLoan(t, borrower);

    await expect(
      asUser(t, staff).mutation(api.loans.approveLoan, { loanId })
    ).rejects.toMatchObject({ data: { code: 'KYC_REQUIRED' } });
    expect(await loanStatus(t, loanId)).toBe('under_review');
  });

  test('rejects missing scoring (score/DTI/recommendation)', async () => {
    const t = convexTest(schema, modules);
    const staff = await seedUser(t, { role: 'loan_officer' });
    const borrower = await seedUser(t, { kyc: 'verified' });
    const loanId = await seedLoan(t, borrower, {
      creditScore: undefined,
      debtToIncomeRatio: undefined,
      recommendation: undefined,
    });

    await expect(
      asUser(t, staff).mutation(api.loans.approveLoan, { loanId })
    ).rejects.toMatchObject({ data: { code: 'SCORING_REQUIRED' } });
  });

  test('approves when fully ready', async () => {
    const t = convexTest(schema, modules);
    const staff = await seedUser(t, { role: 'loan_officer' });
    const borrower = await seedUser(t, { kyc: 'verified' });
    const loanId = await seedLoan(t, borrower);

    await asUser(t, staff).mutation(api.loans.approveLoan, { loanId });
    expect(await loanStatus(t, loanId)).toBe('approved');
  });
});

describe('approval readiness (approvalWorkflow.processApprovalRequest) — same invariant', () => {
  async function seedRequest(
    t: ReturnType<typeof convexTest>,
    loanId: Id<'loans'>,
    requestedBy: Id<'users'>
  ) {
    return await t.run(async (ctx) => {
      const now = Date.now();
      return await ctx.db.insert('approvalRequests', {
        entityType: 'loan',
        entityId: loanId,
        requestType: 'loan_review',
        status: 'pending',
        requestedBy,
        createdAt: now,
        updatedAt: now,
      });
    });
  }

  test('cannot approve a loan with unverified KYC via the workflow path', async () => {
    const t = convexTest(schema, modules);
    const staff = await seedUser(t, { role: 'loan_officer' });
    const borrower = await seedUser(t, { kyc: 'pending' });
    const loanId = await seedLoan(t, borrower);
    const requestId = await seedRequest(t, loanId, staff);

    await expect(
      asUser(t, staff).mutation(api.approvalWorkflow.processApprovalRequest, {
        requestId,
        action: 'approve',
      })
    ).rejects.toMatchObject({ data: { code: 'KYC_REQUIRED' } });
    // Atomic rollback: neither the loan nor the request advanced.
    expect(await loanStatus(t, loanId)).toBe('under_review');
    expect(await t.run(async (ctx) => (await ctx.db.get(requestId))?.status)).toBe('pending');
  });

  test('approves through the workflow path when ready', async () => {
    const t = convexTest(schema, modules);
    const staff = await seedUser(t, { role: 'loan_officer' });
    const borrower = await seedUser(t, { kyc: 'verified' });
    const loanId = await seedLoan(t, borrower);
    const requestId = await seedRequest(t, loanId, staff);

    await asUser(t, staff).mutation(api.approvalWorkflow.processApprovalRequest, {
      requestId,
      action: 'approve',
    });
    expect(await loanStatus(t, loanId)).toBe('approved');
  });
});

// ---------------------------------------------------------------------------
// Repayment ledger — post on completion, exactly once, idempotent
// ---------------------------------------------------------------------------

describe('repayment ledger posting', () => {
  async function seedActiveLoan(t: ReturnType<typeof convexTest>, borrower: Id<'users'>) {
    return await seedLoan(t, borrower, { status: 'active' });
  }

  test('recordPayment posts no ledger row; completePayment posts exactly one', async () => {
    const t = convexTest(schema, modules);
    const staff = await seedUser(t, { role: 'loan_officer' });
    const borrower = await seedUser(t, { kyc: 'verified' });
    const loanId = await seedActiveLoan(t, borrower);

    const paymentId: Id<'paymentTransactions'> = await asUser(t, staff).mutation(
      api.payments.recordPayment,
      { loanId, amount: 1000, method: 'manual' }
    );

    expect(await outboxCount(t, paymentId)).toBe(0); // pending only — no ledger post

    await asUser(t, staff).mutation(api.payments.completePayment, { paymentId });
    expect(await outboxCount(t, paymentId)).toBe(1); // posted on completion
  });

  test('completing twice is idempotent (single ledger row)', async () => {
    const t = convexTest(schema, modules);
    const staff = await seedUser(t, { role: 'loan_officer' });
    const borrower = await seedUser(t, { kyc: 'verified' });
    const loanId = await seedActiveLoan(t, borrower);
    const paymentId: Id<'paymentTransactions'> = await asUser(t, staff).mutation(
      api.payments.recordPayment,
      { loanId, amount: 1000, method: 'manual' }
    );

    await asUser(t, staff).mutation(api.payments.completePayment, { paymentId });
    await asUser(t, staff).mutation(api.payments.completePayment, { paymentId }); // replay → no-op
    expect(await outboxCount(t, paymentId)).toBe(1);
  });

  test('failed payment posts nothing to the ledger', async () => {
    const t = convexTest(schema, modules);
    const staff = await seedUser(t, { role: 'loan_officer' });
    const borrower = await seedUser(t, { kyc: 'verified' });
    const loanId = await seedActiveLoan(t, borrower);
    const paymentId: Id<'paymentTransactions'> = await asUser(t, staff).mutation(
      api.payments.recordPayment,
      { loanId, amount: 1000, method: 'manual' }
    );

    await asUser(t, staff).mutation(api.payments.failPayment, { paymentId, reason: 'nsf' });
    expect(await outboxCount(t, paymentId)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Post-review fixes — split validation, webhook reconciliation, stale disbursement
// ---------------------------------------------------------------------------

describe('payment split validation (Fix 1)', () => {
  test('consistent split (principal + fee = amount) is accepted', async () => {
    const t = convexTest(schema, modules);
    const staff = await seedUser(t, { role: 'loan_officer' });
    const borrower = await seedUser(t, { kyc: 'verified' });
    const loanId = await seedLoan(t, borrower, { status: 'active' });

    const paymentId = await asUser(t, staff).mutation(api.payments.recordPayment, {
      loanId,
      amount: 1025,
      principalPaid: 1000,
      feesPaid: 25,
      method: 'bank_transfer',
    });
    expect(paymentId).toBeDefined();
  });

  test('inconsistent split (fee without matching total) is rejected', async () => {
    const t = convexTest(schema, modules);
    const staff = await seedUser(t, { role: 'loan_officer' });
    const borrower = await seedUser(t, { kyc: 'verified' });
    const loanId = await seedLoan(t, borrower, { status: 'active' });

    await expect(
      asUser(t, staff).mutation(api.payments.recordPayment, {
        loanId,
        amount: 1000,
        feesPaid: 25, // splitTotal=25 ≠ 1000 — the old Payment.tsx shape
        method: 'bank_transfer',
      })
    ).rejects.toMatchObject({ data: { code: 'VALIDATION_ERROR' } });
  });
});

describe('webhook financial reconciliation (Fix 2)', () => {
  async function seedPendingPayment(t: ReturnType<typeof convexTest>) {
    const staff = await seedUser(t, { role: 'loan_officer' });
    const borrower = await seedUser(t, { kyc: 'verified' });
    const loanId = await seedLoan(t, borrower, { status: 'active' });
    const paymentId: Id<'paymentTransactions'> = await asUser(t, staff).mutation(
      api.payments.recordPayment,
      { loanId, amount: 1000, method: 'mobile_money', externalTransactionId: 'EXT-1' }
    );
    return paymentId;
  }

  test('amount mismatch does not complete the payment and posts nothing', async () => {
    const t = convexTest(schema, modules);
    const paymentId = await seedPendingPayment(t);

    const result = await t.mutation(internal.payments.applyPaymentWebhook, {
      gateway: 'paytoday',
      status: 'completed',
      externalTransactionId: 'EXT-1',
      amount: 999999, // wrong amount, signature-valid scenario
    });

    expect(result).toMatchObject({ ok: false, reason: 'amount_mismatch' });
    expect(await t.run(async (ctx) => (await ctx.db.get(paymentId))?.status)).toBe('pending');
    expect(await outboxCount(t, paymentId)).toBe(0);
  });

  test('matching amount completes exactly once (replay idempotent)', async () => {
    const t = convexTest(schema, modules);
    const paymentId = await seedPendingPayment(t);

    const first = await t.mutation(internal.payments.applyPaymentWebhook, {
      gateway: 'paytoday',
      status: 'completed',
      externalTransactionId: 'EXT-1',
      amount: 1000,
      currency: 'NAD',
    });
    const replay = await t.mutation(internal.payments.applyPaymentWebhook, {
      gateway: 'paytoday',
      status: 'completed',
      externalTransactionId: 'EXT-1',
      amount: 1000,
    });

    expect(first).toMatchObject({ ok: true, idempotent: false });
    expect(replay).toMatchObject({ ok: true, idempotent: true });
    expect(await t.run(async (ctx) => (await ctx.db.get(paymentId))?.status)).toBe('completed');
    expect(await outboxCount(t, paymentId)).toBe(1);
  });
});

describe('stale disbursement completion (Fix 3)', () => {
  async function seedPendingDisbursement(
    t: ReturnType<typeof convexTest>,
    loanId: Id<'loans'>,
    borrower: Id<'users'>,
    amount: number
  ) {
    return await t.run(async (ctx) => {
      const now = Date.now();
      return await ctx.db.insert('disbursements', {
        loanId,
        userId: borrower,
        amount,
        method: 'bank_transfer' as const,
        status: 'pending' as const,
        createdAt: now,
        updatedAt: now,
      });
    });
  }

  test('cannot complete after the loan left approved state', async () => {
    const t = convexTest(schema, modules);
    const staff = await seedUser(t, { role: 'loan_officer' });
    const borrower = await seedUser(t, { kyc: 'verified' });
    const loanId = await seedLoan(t, borrower, { status: 'approved' });
    const disbursementId = await seedPendingDisbursement(t, loanId, borrower, 10000);

    // Loan is rejected after the disbursement was initiated.
    await t.run(async (ctx) => {
      await ctx.db.patch(loanId, { status: 'rejected' });
    });

    await expect(
      asUser(t, staff).mutation(api.disbursements.completeDisbursement, { disbursementId })
    ).rejects.toMatchObject({ data: { code: 'INVALID_STATE' } });
    expect(await outboxCount(t, disbursementId)).toBe(0);
  });

  test('cannot complete a legacy partial-amount disbursement', async () => {
    const t = convexTest(schema, modules);
    const staff = await seedUser(t, { role: 'loan_officer' });
    const borrower = await seedUser(t, { kyc: 'verified' });
    const loanId = await seedLoan(t, borrower, { status: 'approved' });
    const disbursementId = await seedPendingDisbursement(t, loanId, borrower, 5000); // < principal

    await expect(
      asUser(t, staff).mutation(api.disbursements.completeDisbursement, { disbursementId })
    ).rejects.toMatchObject({ data: { code: 'VALIDATION_ERROR' } });
    expect(await outboxCount(t, disbursementId)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Role assignment — admin-only
// ---------------------------------------------------------------------------

describe('approval requests are deduplicated per loan (no double queue entry)', () => {
  const approvalCount = (t: ReturnType<typeof convexTest>, loanId: Id<'loans'>) =>
    t.run(
      async (ctx) =>
        (
          await ctx.db
            .query('approvalRequests')
            .withIndex('by_entityId', (q) => q.eq('entityId', loanId))
            .collect()
        ).length
    );

  test('submitForApproval called twice yields exactly one open request', async () => {
    const t = convexTest(schema, modules);
    const borrower = await seedUser(t, { role: 'client', kyc: 'verified' });
    const loanId = await seedLoan(t, borrower, { status: 'under_review' });

    const first = await asUser(t, borrower).mutation(api.approvalWorkflow.submitForApproval, {
      entityType: 'loan',
      entityId: loanId,
      requestType: 'loan_application',
    });
    const second = await asUser(t, borrower).mutation(api.approvalWorkflow.submitForApproval, {
      entityType: 'loan',
      entityId: loanId,
      requestType: 'loan_application',
    });

    expect(second).toBe(first); // idempotent — same request id returned
    expect(await approvalCount(t, loanId)).toBe(1);
  });
});

describe('createLoan stores income on the loan without touching the profile', () => {
  const profileIncome = (t: ReturnType<typeof convexTest>, userId: Id<'users'>) =>
    t.run(
      async (ctx) =>
        (
          await ctx.db
            .query('profiles')
            .withIndex('by_userId', (q) => q.eq('userId', userId))
            .first()
        )?.monthlyIncome
    );

  test('application income lands on the loan, profile stays untouched', async () => {
    const t = convexTest(schema, modules);
    const borrower = await seedUser(t, { role: 'client' });

    const loanId = await asUser(t, borrower).mutation(api.loans.createLoan, {
      principal: 10000,
      interestRate: 20,
      termMonths: 12,
      monthlyIncome: 8500,
    });

    // Loan carries the income (credit scoring reads it); profile is NOT mutated
    // so returning applicants still see the editable income field.
    const loan = await t.run(async (ctx) => ctx.db.get(loanId));
    expect(loan!.monthlyIncome).toBe(8500);
    expect(await profileIncome(t, borrower)).toBeFalsy();
  });
});

describe('role assignment authorization', () => {
  test('non-admin cannot assign roles', async () => {
    const t = convexTest(schema, modules);
    const officer = await seedUser(t, { role: 'loan_officer' });
    const target = await seedUser(t, { role: 'client' });

    await expect(
      asUser(t, officer).mutation(api.users.assignRole, {
        targetUserId: target,
        role: 'loan_officer',
      })
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });
  });

  test('admin can assign roles', async () => {
    const t = convexTest(schema, modules);
    const admin = await seedUser(t, { role: 'admin' });
    const target = await seedUser(t, { role: 'client' });

    await asUser(t, admin).mutation(api.users.assignRole, {
      targetUserId: target,
      role: 'loan_officer',
    });
    const role = await t.run(
      async (ctx) =>
        (
          await ctx.db
            .query('userRoles')
            .withIndex('by_userId', (q) => q.eq('userId', target))
            .first()
        )?.role
    );
    expect(role).toBe('loan_officer');
  });

  test('tenant_admin can promote a client to loan_officer', async () => {
    const t = convexTest(schema, modules);
    const admin = await seedUser(t, { role: 'tenant_admin' });
    const target = await seedUser(t, { role: 'client' });

    await asUser(t, admin).mutation(api.users.assignRole, {
      targetUserId: target,
      role: 'loan_officer',
    });
    const role = await t.run(
      async (ctx) =>
        (
          await ctx.db
            .query('userRoles')
            .withIndex('by_userId', (q) => q.eq('userId', target))
            .first()
        )?.role
    );
    expect(role).toBe('loan_officer');
  });

  test('tenant_admin can promote a client to tenant_admin', async () => {
    const t = convexTest(schema, modules);
    const admin = await seedUser(t, { role: 'tenant_admin' });
    const target = await seedUser(t, { role: 'client' });

    await asUser(t, admin).mutation(api.users.assignRole, {
      targetUserId: target,
      role: 'tenant_admin',
    });
    const role = await t.run(
      async (ctx) =>
        (
          await ctx.db
            .query('userRoles')
            .withIndex('by_userId', (q) => q.eq('userId', target))
            .first()
        )?.role
    );
    expect(role).toBe('tenant_admin');
  });

  test('assignRole stamps the admin tenant onto an unbound user', async () => {
    const t = convexTest(schema, modules);
    const institutionId = await seedInstitution(t);
    const admin = await seedUser(t, { role: 'tenant_admin', institutionId });
    const target = await seedUser(t, { role: 'client' });

    await asUser(t, admin).mutation(api.users.assignRole, {
      targetUserId: target,
      role: 'loan_officer',
    });

    const bound = await t.run(async (ctx) => {
      const role = await ctx.db
        .query('userRoles')
        .withIndex('by_userId', (q) => q.eq('userId', target))
        .first();
      const profile = await ctx.db
        .query('profiles')
        .withIndex('by_userId', (q) => q.eq('userId', target))
        .first();
      return {
        roleInstitutionId: role?.institutionId,
        profileInstitutionId: profile?.institutionId,
      };
    });
    expect(bound.roleInstitutionId).toBe(institutionId);
    expect(bound.profileInstitutionId).toBe(institutionId);
  });

  test('tenant admin cannot claim a profile bound to another tenant', async () => {
    const t = convexTest(schema, modules);
    const adminInstitutionId = await seedInstitution(t, 'ADMIN');
    const targetInstitutionId = await seedInstitution(t, 'TARGET');
    const admin = await seedUser(t, {
      role: 'tenant_admin',
      institutionId: adminInstitutionId,
    });
    const target = await seedUser(t, { institutionId: targetInstitutionId });

    await expect(
      asUser(t, admin).mutation(api.users.assignRole, {
        targetUserId: target,
        role: 'loan_officer',
      })
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });

    const bindings = await t.run(async (ctx) => {
      const role = await ctx.db
        .query('userRoles')
        .withIndex('by_userId', (q) => q.eq('userId', target))
        .first();
      const profile = await ctx.db
        .query('profiles')
        .withIndex('by_userId', (q) => q.eq('userId', target))
        .first();
      return {
        role,
        profileInstitutionId: profile?.institutionId,
      };
    });
    expect(bindings.role).toBeNull();
    expect(bindings.profileInstitutionId).toBe(targetInstitutionId);
  });

  test('legacy admin is not publicly assignable', async () => {
    const t = convexTest(schema, modules);
    const institutionId = await seedInstitution(t);
    const admin = await seedUser(t, { role: 'tenant_admin', institutionId });
    const target = await seedUser(t, { role: 'client', institutionId });

    await expect(
      asUser(t, admin).mutation(api.users.assignRole, {
        targetUserId: target,
        // @ts-expect-error Legacy admin is readable but not a public assignment target.
        role: 'admin',
      })
    ).rejects.toThrow();
  });

  test('admin cannot change their own role', async () => {
    const t = convexTest(schema, modules);
    const admin = await seedUser(t, { role: 'tenant_admin' });

    await expect(
      asUser(t, admin).mutation(api.users.assignRole, {
        targetUserId: admin,
        role: 'client',
      })
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });
  });
});
