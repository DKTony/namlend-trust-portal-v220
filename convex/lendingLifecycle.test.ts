/**
 * Critical lending journey: create → submit (KYC) → score/approval →
 * approve → disburse → repay, plus reject-from-status, alias redaction,
 * compliance report persistence, budget ownership, and IPP admin start.
 */
import { convexTest } from 'convex-test';
import { describe, expect, test, vi } from 'vitest';
import { api, internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import schema from './schema';

const modules = import.meta.glob('./**/*.*s');

type Role = 'client' | 'loan_officer' | 'admin';
type Kyc = 'pending' | 'submitted' | 'verified' | 'rejected';

function asUser(t: ReturnType<typeof convexTest>, userId: Id<'users'>) {
  return t.withIdentity({ subject: `${userId}|testsession` });
}

async function seedUser(
  t: ReturnType<typeof convexTest>,
  opts: { role?: Role; kyc?: Kyc } = {}
): Promise<Id<'users'>> {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert('users', {});
    await ctx.db.insert('profiles', {
      userId,
      email: `${userId}@example.test`,
      fullName: `User ${String(userId).slice(-6)}`,
      kycStatus: opts.kyc ?? 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    if (opts.role) {
      await ctx.db.insert('userRoles', { userId, role: opts.role, createdAt: Date.now() });
    }
    return userId;
  });
}

describe('J1/J2 authz and KYC gates', () => {
  test('unauthenticated callers cannot create a loan', async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.loans.createLoan, {
        principal: 5000,
        interestRate: 20,
        termMonths: 12,
      })
    ).rejects.toThrow();
  });

  test('clients cannot approve loans', async () => {
    const t = convexTest(schema, modules);
    const borrower = await seedUser(t, { role: 'client', kyc: 'verified' });
    const loanId = await asUser(t, borrower).mutation(api.loans.createLoan, {
      principal: 5000,
      interestRate: 20,
      termMonths: 12,
    });
    await expect(asUser(t, borrower).mutation(api.loans.approveLoan, { loanId })).rejects.toThrow();
  });

  test('submitLoan requires verified KYC; drafts do not', async () => {
    const t = convexTest(schema, modules);
    const pending = await seedUser(t, { role: 'client', kyc: 'pending' });
    const loanId = await asUser(t, pending).mutation(api.loans.createLoan, {
      principal: 5000,
      interestRate: 20,
      termMonths: 12,
    });
    await expect(
      asUser(t, pending).mutation(api.loans.submitLoan, { loanId })
    ).rejects.toMatchObject({ data: { code: 'KYC_REQUIRED' } });
    expect(await t.run(async (ctx) => (await ctx.db.get(loanId))?.status)).toBe('draft');
  });
});

describe('J3–J6 apply → approve → disburse → repay', () => {
  test('same loan is visible to staff and client through disbursement and repayment', async () => {
    vi.useFakeTimers();
    try {
      const t = convexTest(schema, modules);
      const admin = await seedUser(t, { role: 'admin', kyc: 'verified' });
      const staff = await seedUser(t, { role: 'loan_officer', kyc: 'verified' });
      const borrower = await seedUser(t, { role: 'client', kyc: 'verified' });

      const loanId = await asUser(t, borrower).mutation(api.loans.createLoan, {
        principal: 10000,
        interestRate: 20,
        termMonths: 12,
        monthlyIncome: 8000,
      });
      await asUser(t, borrower).mutation(api.loans.submitLoan, { loanId });
      expect(await t.run(async (ctx) => (await ctx.db.get(loanId))?.status)).toBe('submitted');

      await asUser(t, admin).mutation(internal.loans.recordCreditScore, {
        loanId,
        creditScore: 700,
        monthlyPayment: 926,
        debtToIncomeRatio: 0.2,
        recommendation: 'approve',
      });
      const requestId = await asUser(t, admin).mutation(
        internal.approvalWorkflow.createSystemApprovalRequest,
        {
          entityType: 'loan',
          entityId: loanId,
          requestType: 'loan_review',
          priority: 'low',
        }
      );
      expect(requestId).toBeTruthy();

      const queue = await asUser(t, staff).query(api.approvalWorkflow.adminListApprovals, {});
      expect(queue.some((row) => row.entityId === loanId && row.status === 'pending')).toBe(true);

      await asUser(t, staff).mutation(api.approvalWorkflow.processApprovalRequest, {
        requestId: requestId!,
        action: 'approve',
      });
      expect(await t.run(async (ctx) => (await ctx.db.get(loanId))?.status)).toBe('approved');

      const disbursementId = await asUser(t, staff).mutation(
        api.disbursements.initiateDisbursement,
        {
          loanId,
          amount: 10000,
          method: 'bank_transfer',
        }
      );
      await asUser(t, staff).mutation(api.disbursements.completeDisbursement, { disbursementId });
      expect(await t.run(async (ctx) => (await ctx.db.get(loanId))?.status)).toBe('funded');

      const clientLoans = await asUser(t, borrower).query(api.loans.getMyLoans, {});
      expect(clientLoans.some((loan) => loan._id === loanId && loan.status === 'funded')).toBe(
        true
      );
      const staffLoans = await asUser(t, staff).query(api.loans.adminListLoans, {});
      expect(staffLoans.some((loan) => loan._id === loanId)).toBe(true);

      const paymentId = await asUser(t, borrower).mutation(api.payments.recordPayment, {
        loanId,
        amount: 1000,
        method: 'manual',
      });
      const pendingOutbox = await t.run(
        async (ctx) =>
          (
            await ctx.db
              .query('tigerBeetleOutbox')
              .withIndex('by_sourceId', (q) => q.eq('sourceId', paymentId))
              .collect()
          ).length
      );
      expect(pendingOutbox).toBe(0);

      await asUser(t, staff).mutation(api.payments.completePayment, { paymentId });
      const postedOutbox = await t.run(
        async (ctx) =>
          (
            await ctx.db
              .query('tigerBeetleOutbox')
              .withIndex('by_sourceId', (q) => q.eq('sourceId', paymentId))
              .collect()
          ).length
      );
      expect(postedOutbox).toBe(1);

      await t.finishAllScheduledFunctions(() => {
        vi.runAllTimers();
      });
      const notes = await asUser(t, borrower).query(api.notifications.getMyNotifications, {});
      expect(notes.length).toBeGreaterThan(0);

      await expect(
        asUser(t, staff).mutation(api.loans.rejectLoan, {
          loanId,
          reason: 'too late',
        })
      ).rejects.toMatchObject({ data: { code: 'INVALID_STATE' } });
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('remaining surface fixes', () => {
  test('rejectLoan is allowed from submitted and blocked after funding', async () => {
    const t = convexTest(schema, modules);
    const staff = await seedUser(t, { role: 'loan_officer' });
    const borrower = await seedUser(t, { role: 'client', kyc: 'verified' });
    const loanId = await asUser(t, borrower).mutation(api.loans.createLoan, {
      principal: 4000,
      interestRate: 18,
      termMonths: 6,
    });
    await asUser(t, borrower).mutation(api.loans.submitLoan, { loanId });
    await asUser(t, staff).mutation(api.loans.rejectLoan, {
      loanId,
      reason: 'incomplete file',
    });
    expect(await t.run(async (ctx) => (await ctx.db.get(loanId))?.status)).toBe('rejected');
  });

  test('getAliasByAddr redacts non-owner lookups to addr+status', async () => {
    const t = convexTest(schema, modules);
    const owner = await seedUser(t, { role: 'client' });
    const stranger = await seedUser(t, { role: 'client' });
    await t.run(async (ctx) => {
      await ctx.db.insert('ipsAliasDirectory', {
        userId: owner,
        addr: '812345678@namlend',
        entityType: 'PERSON',
        idType: 'MOBILE',
        idValue: '812345678',
        status: 'ACTIVE',
        syncedWithIps: true,
        isDefault: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });
    const mine = await asUser(t, owner).query(api.ips.ipsAliasDirectory.getAliasByAddr, {
      addr: '812345678@namlend',
    });
    expect(mine).toMatchObject({ addr: '812345678@namlend', syncedWithIps: true });
    const redacted = await asUser(t, stranger).query(api.ips.ipsAliasDirectory.getAliasByAddr, {
      addr: '812345678@namlend',
    });
    expect(redacted).toEqual({ addr: '812345678@namlend', status: 'ACTIVE' });
    expect(redacted).not.toHaveProperty('syncedWithIps');
    expect(redacted).not.toHaveProperty('entityType');
  });

  test('generateComplianceReport persists computed data as completed', async () => {
    const t = convexTest(schema, modules);
    const staff = await seedUser(t, { role: 'loan_officer' });
    const reportId = await asUser(t, staff).mutation(api.audit.generateComplianceReport, {
      reportType: 'monthly_approvals',
      periodStart: '2026-08-01',
      periodEnd: '2026-08-31',
    });
    const row = await t.run(async (ctx) => ctx.db.get(reportId));
    expect(row?.status).toBe('completed');
    expect(row?.reportData).toMatchObject({ total: 0, approved: 0, rejected: 0 });
  });

  test('adminStartOnboarding creates an application for another user', async () => {
    const t = convexTest(schema, modules);
    const staff = await seedUser(t, { role: 'loan_officer' });
    const client = await seedUser(t, { role: 'client' });
    const applicationId = await asUser(t, staff).mutation(
      api.ips.ipsOnboarding.adminStartOnboarding,
      {
        userId: client,
      }
    );
    const listed = await asUser(t, staff).query(api.ips.ipsOnboarding.adminListOnboarding, {});
    expect(listed.some((row) => row._id === applicationId && row.userId === client)).toBe(true);
  });

  test('budget entries and savings goals are owner-scoped', async () => {
    const t = convexTest(schema, modules);
    const owner = await seedUser(t, { role: 'client' });
    const other = await seedUser(t, { role: 'client' });
    await asUser(t, owner).mutation(api.budget.createBudgetEntry, {
      date: '2026-08-15',
      description: 'Salary',
      category: 'Income',
      type: 'in',
      amount: 25000,
    });
    const goalId = await asUser(t, owner).mutation(api.budget.createSavingsGoal, {
      name: 'Emergency',
      targetAmount: 10000,
    });
    await asUser(t, owner).mutation(api.budget.addFundsToGoal, { goalId, amount: 500 });
    expect(await asUser(t, owner).query(api.budget.listMyBudgetEntries, {})).toHaveLength(1);
    expect(await asUser(t, other).query(api.budget.listMyBudgetEntries, {})).toHaveLength(0);
    const goals = await asUser(t, owner).query(api.budget.listMySavingsGoals, {});
    expect(goals[0]?.currentAmount).toBe(500);
    await expect(
      asUser(t, other).mutation(api.budget.addFundsToGoal, { goalId, amount: 1 })
    ).rejects.toThrow();
  });

  test('updateWorkflowDefinition patches an existing definition', async () => {
    const t = convexTest(schema, modules);
    const admin = await seedUser(t, { role: 'admin' });
    const workflowId = await asUser(t, admin).mutation(
      api.approvalWorkflow.createWorkflowDefinition,
      {
        name: 'Loan review',
        entityType: 'loan_application',
        stages: [{ name: 'Officer', order: 1, requiredRole: 'loan_officer', actions: ['review'] }],
      }
    );
    await asUser(t, admin).mutation(api.approvalWorkflow.updateWorkflowDefinition, {
      workflowId,
      name: 'Loan review v2',
    });
    const listed = await asUser(t, admin).query(api.approvalWorkflow.listWorkflowDefinitions, {});
    expect(listed.find((row) => row._id === workflowId)?.name).toBe('Loan review v2');
  });
});

describe('Wave E cross-tenant object-level authz', () => {
  test('staff from another tenant cannot getLoan even when TENANCY_ENFORCEMENT is off', async () => {
    const t = convexTest(schema, modules);
    const seeded = await t.run(async (ctx) => {
      const now = Date.now();
      const instA = await ctx.db.insert('institutions', {
        name: 'Tenant A',
        shortCode: 'TENANTA',
        type: 'lender',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      });
      const instB = await ctx.db.insert('institutions', {
        name: 'Tenant B',
        shortCode: 'TENANTB',
        type: 'lender',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      });
      const borrower = await ctx.db.insert('users', {});
      const staffA = await ctx.db.insert('users', {});
      const staffB = await ctx.db.insert('users', {});
      await ctx.db.insert('userRoles', {
        userId: borrower,
        role: 'client',
        institutionId: instA,
        createdAt: now,
      });
      await ctx.db.insert('userRoles', {
        userId: staffA,
        role: 'loan_officer',
        institutionId: instA,
        createdAt: now,
      });
      await ctx.db.insert('userRoles', {
        userId: staffB,
        role: 'loan_officer',
        institutionId: instB,
        createdAt: now,
      });
      const loanId = await ctx.db.insert('loans', {
        userId: borrower,
        institutionId: instA,
        principal: 5000,
        interestRate: 20,
        termMonths: 12,
        status: 'under_review',
        outstandingBalance: 5000,
        totalPaid: 0,
        createdAt: now,
        updatedAt: now,
      });
      return { loanId, staffA, staffB, borrower };
    });

    expect(
      await asUser(t, seeded.staffA).query(api.loans.getLoan, { loanId: seeded.loanId })
    ).toMatchObject({
      _id: seeded.loanId,
    });
    expect(
      await asUser(t, seeded.borrower).query(api.loans.getLoan, { loanId: seeded.loanId })
    ).toMatchObject({
      _id: seeded.loanId,
    });
    await expect(
      asUser(t, seeded.staffB).query(api.loans.getLoan, { loanId: seeded.loanId })
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });
  });
});
