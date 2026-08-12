import { convexTest } from 'convex-test';
import { describe, expect, test } from 'vitest';
import { api, internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import schema from './schema';

const modules = import.meta.glob('./**/*.*s');

function asUser(t: ReturnType<typeof convexTest>, userId: Id<'users'>) {
  return t.withIdentity({ subject: `${userId}|testsession` });
}

describe('reciprocal staff notifications', () => {
  test('fans out within one tenant, deduplicates, and persists read state', async () => {
    const t = convexTest(schema, modules);
    const seeded = await t.run(async (ctx) => {
      const now = Date.now();
      const institutionA = await ctx.db.insert('institutions', {
        name: 'Tenant A',
        shortCode: 'TENANTA',
        type: 'lender',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      });
      const institutionB = await ctx.db.insert('institutions', {
        name: 'Tenant B',
        shortCode: 'TENANTB',
        type: 'lender',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      });
      const admin = await ctx.db.insert('users', {});
      const officer = await ctx.db.insert('users', {});
      const otherAdmin = await ctx.db.insert('users', {});
      await ctx.db.insert('userRoles', {
        userId: admin,
        role: 'admin',
        institutionId: institutionA,
        createdAt: now,
      });
      await ctx.db.insert('userRoles', {
        userId: officer,
        role: 'loan_officer',
        institutionId: institutionA,
        createdAt: now,
      });
      await ctx.db.insert('userRoles', {
        userId: otherAdmin,
        role: 'admin',
        institutionId: institutionB,
        createdAt: now,
      });
      return { institutionA, admin, officer, otherAdmin };
    });

    const args = {
      institutionId: seeded.institutionA,
      title: 'New Loan Application',
      message: 'A request is ready.',
      category: 'loan' as const,
      priority: 'high' as const,
      dedupeKey: 'approval:test:submitted:staff',
    };
    await t.mutation(internal.notifications.createStaffNotifications, args);
    await t.mutation(internal.notifications.createStaffNotifications, args);

    const rows = await t.run(async (ctx) => ctx.db.query('notifications').collect());
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((row) => row.userId))).toEqual(new Set([seeded.admin, seeded.officer]));
    expect(rows.some((row) => row.userId === seeded.otherAdmin)).toBe(false);

    const adminRow = rows.find((row) => row.userId === seeded.admin)!;
    await asUser(t, seeded.admin).mutation(api.notifications.markNotificationRead, {
      notificationId: adminRow._id,
    });
    expect(await t.run(async (ctx) => (await ctx.db.get(adminRow._id))?.isRead)).toBe(true);
  });
});

describe('authoritative client portfolio summary', () => {
  test('aggregates all active balances and picks the earliest unpaid installment', async () => {
    const t = convexTest(schema, modules);
    const seeded = await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', {});
      const now = Date.now();
      const base = {
        userId,
        interestRate: 20,
        termMonths: 3,
        status: 'funded' as const,
        createdAt: now,
        updatedAt: now,
      };
      const first = await ctx.db.insert('loans', {
        ...base,
        principal: 1000,
        outstandingBalance: 800,
        creditScore: 710,
      });
      const second = await ctx.db.insert('loans', {
        ...base,
        principal: 2000,
        outstandingBalance: 1500,
        creditScore: 720,
        createdAt: now + 1,
        updatedAt: now + 1,
      });
      await ctx.db.insert('paymentSchedules', {
        loanId: first,
        installmentNumber: 1,
        dueDate: now + 2000,
        principalDue: 300,
        interestDue: 20,
        totalDue: 320,
        status: 'scheduled',
        createdAt: now,
      });
      await ctx.db.insert('paymentSchedules', {
        loanId: second,
        installmentNumber: 1,
        dueDate: now + 1000,
        principalDue: 600,
        interestDue: 40,
        totalDue: 640,
        paidAmount: 40,
        status: 'partially_paid',
        createdAt: now,
      });
      return { userId, second };
    });

    const summary = await asUser(t, seeded.userId).query(api.loans.getMyPortfolioSummary, {});
    expect(summary.outstandingPrincipal).toBe(2300);
    expect(summary.activeLoanCount).toBe(2);
    expect(summary.latestCreditScore).toBe(720);
    expect(summary.nextInstallment).toMatchObject({ loanId: seeded.second, amountDue: 600 });
  });
});

describe('canonical staff portfolio joins', () => {
  test('uses verified account-holder name when the legacy profile name is absent', async () => {
    const t = convexTest(schema, modules);
    const seeded = await t.run(async (ctx) => {
      const now = Date.now();
      const institutionId = await ctx.db.insert('institutions', {
        name: 'Tenant A',
        shortCode: 'TENANTA',
        type: 'lender',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      });
      const staffId = await ctx.db.insert('users', {});
      const borrowerId = await ctx.db.insert('users', {});
      await ctx.db.insert('userRoles', {
        userId: staffId,
        role: 'admin',
        institutionId,
        createdAt: now,
      });
      await ctx.db.insert('userRoles', {
        userId: borrowerId,
        role: 'client',
        institutionId,
        createdAt: now,
      });
      await ctx.db.insert('profiles', {
        userId: borrowerId,
        institutionId,
        email: 'client1@example.test',
        kycStatus: 'verified',
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert('ipsAliasDirectory', {
        userId: borrowerId,
        addr: 'client1@fnb',
        entityType: 'PERSON',
        idType: 'NUMERICID',
        idValue: '1002003001',
        status: 'ACTIVE',
        linkedBankBic: 'FIRNNANX',
        accountHolderName: 'Client One',
        syncedWithIps: true,
        isDefault: true,
        createdAt: now,
        updatedAt: now,
      });
      const loanId = await ctx.db.insert('loans', {
        userId: borrowerId,
        institutionId,
        principal: 1350,
        interestRate: 20,
        termMonths: 3,
        status: 'funded',
        outstandingBalance: 1200,
        createdAt: now,
        updatedAt: now,
      });
      const disbursementId = await ctx.db.insert('disbursements', {
        loanId,
        userId: borrowerId,
        institutionId,
        amount: 1350,
        method: 'ips',
        status: 'completed',
        processedAt: now,
        createdAt: now,
        updatedAt: now,
      });
      return { staffId, disbursementId };
    });

    const staff = asUser(t, seeded.staffId);
    const [clients, disbursements] = await Promise.all([
      staff.query(api.users.adminListClientsWithPortfolio, {}),
      staff.query(api.disbursements.adminListDisbursements, {}),
    ]);
    expect(clients[0]).toMatchObject({ fullName: 'Client One', outstandingBalance: 1200 });
    expect(disbursements.find((row) => row._id === seeded.disbursementId)).toMatchObject({
      clientName: 'Client One',
      actualRail: 'ips',
    });
  });
});

describe('unified manual disbursement completion', () => {
  test('funds once, creates one schedule and one manual ledger event on replay', async () => {
    const t = convexTest(schema, modules);
    const seeded = await t.run(async (ctx) => {
      const now = Date.now();
      const staff = await ctx.db.insert('users', {});
      const borrower = await ctx.db.insert('users', {});
      await ctx.db.insert('userRoles', { userId: staff, role: 'loan_officer', createdAt: now });
      await ctx.db.insert('profiles', {
        userId: borrower,
        email: 'borrower@example.test',
        kycStatus: 'verified',
        createdAt: now,
        updatedAt: now,
      });
      const loanId = await ctx.db.insert('loans', {
        userId: borrower,
        principal: 1350,
        interestRate: 32,
        termMonths: 3,
        status: 'approved',
        createdAt: now,
        updatedAt: now,
      });
      const disbursementId = await ctx.db.insert('disbursements', {
        loanId,
        userId: borrower,
        amount: 1350,
        method: 'bank_transfer',
        status: 'pending',
        initiatedBy: staff,
        createdAt: now,
        updatedAt: now,
      });
      return { staff, loanId, disbursementId };
    });

    const caller = asUser(t, seeded.staff);
    await caller.mutation(api.disbursements.completeDisbursement, {
      disbursementId: seeded.disbursementId,
      referenceNumber: 'BANK-TEST-001',
    });
    await caller.mutation(api.disbursements.completeDisbursement, {
      disbursementId: seeded.disbursementId,
      referenceNumber: 'BANK-TEST-001',
    });

    const result = await t.run(async (ctx) => ({
      loan: await ctx.db.get(seeded.loanId),
      schedule: await ctx.db
        .query('paymentSchedules')
        .withIndex('by_loanId', (q) => q.eq('loanId', seeded.loanId))
        .collect(),
      outbox: await ctx.db
        .query('tigerBeetleOutbox')
        .withIndex('by_sourceId', (q) => q.eq('sourceId', seeded.disbursementId))
        .collect(),
    }));
    expect(result.loan).toMatchObject({ status: 'funded', outstandingBalance: 1350 });
    expect(result.schedule).toHaveLength(3);
    expect(result.outbox).toHaveLength(1);
    expect(result.outbox[0].eventType).toBe('DISBURSEMENT');
  });
});

describe('dry-run repair idempotency', () => {
  test('proven IPS provenance and projection rebuild are repeatable', async () => {
    const t = convexTest(schema, modules);
    const seeded = await t.run(async (ctx) => {
      const now = Date.now();
      const userId = await ctx.db.insert('users', {});
      const loanId = await ctx.db.insert('loans', {
        userId,
        principal: 5000,
        interestRate: 20,
        termMonths: 6,
        status: 'funded',
        outstandingBalance: 5000,
        createdAt: now,
        updatedAt: now,
      });
      const disbursementId = await ctx.db.insert('disbursements', {
        loanId,
        userId,
        amount: 5000,
        method: 'bank_transfer',
        status: 'completed',
        processedAt: now,
        createdAt: now,
        updatedAt: now,
      });
      const transactionId = await ctx.db.insert('ipsTransactions', {
        msgId: 'TEST-IPS-PROVENANCE',
        txType: 'credit_transfer',
        direction: 'outbound',
        status: 'completed',
        amount: 5000,
        currency: 'NAD',
        userId,
        loanId,
        disbursementId,
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.patch(disbursementId, { ipsTransactionId: transactionId });
      await ctx.db.insert('portfolioMetrics', {
        metricKey: 'active_loan_count',
        value: -1,
        updatedAt: now,
      });
      return { disbursementId };
    });

    const repairArgs = { dryRun: true, limit: 100 };
    const firstDryRun = await t.mutation(
      internal.platform.lendingWorkflowRepair.repairIpsDisbursementMethods,
      repairArgs
    );
    const secondDryRun = await t.mutation(
      internal.platform.lendingWorkflowRepair.repairIpsDisbursementMethods,
      repairArgs
    );
    expect(firstDryRun.repaired).toBe(1);
    expect(secondDryRun.repaired).toBe(1);
    expect(await t.run(async (ctx) => (await ctx.db.get(seeded.disbursementId))?.method)).toBe(
      'bank_transfer'
    );

    await t.mutation(internal.platform.lendingWorkflowRepair.repairIpsDisbursementMethods, {
      dryRun: false,
      limit: 100,
    });
    const postRepair = await t.mutation(
      internal.platform.lendingWorkflowRepair.repairIpsDisbursementMethods,
      repairArgs
    );
    expect(postRepair.repaired).toBe(0);
    expect(await t.run(async (ctx) => (await ctx.db.get(seeded.disbursementId))?.method)).toBe(
      'ips'
    );

    const projectionDryOne = await t.mutation(
      internal.platform.lendingWorkflowRepair.rebuildPortfolioMetrics,
      { dryRun: true }
    );
    const projectionDryTwo = await t.mutation(
      internal.platform.lendingWorkflowRepair.rebuildPortfolioMetrics,
      { dryRun: true }
    );
    expect(projectionDryOne).toEqual(projectionDryTwo);
    expect(projectionDryOne.comparison.active_loan_count).toEqual({
      current: -1,
      expected: 1,
    });

    const reconciliation = await t.query(
      internal.tigerbeetle.outbox.getReconciliationReportInternal,
      { limit: 100 }
    );
    expect(reconciliation).toMatchObject({ scanned: 0, safeToReplay: 0 });
    const scheduleExceptions = await t.query(
      internal.platform.lendingWorkflowRepair.getHistoricalScheduleExceptions,
      {}
    );
    expect(scheduleExceptions).toMatchObject({ paidOffLoans: 0, exceptions: 0 });
  });
});
