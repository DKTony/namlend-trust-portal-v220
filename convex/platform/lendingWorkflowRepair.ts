/**
 * Additive, audited lending-workflow repairs.
 *
 * Every mutation is dry-run-first, paginated where rows are changed, and
 * idempotent. No financial or compliance record is deleted or fabricated.
 */

import { v } from 'convex/values';
import type { Id } from '../_generated/dataModel';
import { internalMutation, internalQuery } from '../_generated/server';
import { scheduleAuditEntry } from '../lib/audit';
import { resolveWriteInstitution } from '../lib/tenancy';
import { createNotificationIdempotent } from '../notifications';

export const repairIpsDisbursementMethods = internalMutation({
  args: {
    dryRun: v.boolean(),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, { dryRun, limit, cursor }) => {
    const page = await ctx.db
      .query('disbursements')
      .order('asc')
      .paginate({ numItems: Math.min(limit ?? 100, 500), cursor: cursor ?? null });
    const provenIps = page.page.filter(
      (row) => row.ipsTransactionId !== undefined && row.method !== 'ips'
    );

    if (!dryRun) {
      for (const row of provenIps) {
        await ctx.db.patch(row._id, { method: 'ips', updatedAt: Date.now() });
      }
      if (provenIps.length > 0) {
        scheduleAuditEntry(ctx, {
          entityType: 'disbursements',
          entityId: 'repairIpsDisbursementMethods',
          action: 'BACKFILL_IPS_PROVENANCE',
          newState: { scanned: page.page.length, repaired: provenIps.length },
        });
      }
    }

    return {
      dryRun,
      scanned: page.page.length,
      repaired: provenIps.length,
      ids: provenIps.map((row) => String(row._id)),
      continueCursor: page.continueCursor,
      isDone: page.isDone,
    };
  },
});

export const backfillPendingStaffNotifications = internalMutation({
  args: {
    dryRun: v.boolean(),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, { dryRun, limit, cursor }) => {
    const page = await ctx.db
      .query('approvalRequests')
      .withIndex('by_status', (q) => q.eq('status', 'pending'))
      .order('asc')
      .paginate({ numItems: Math.min(limit ?? 100, 500), cursor: cursor ?? null });
    let wouldCreate = 0;
    let created = 0;
    let unbound = 0;

    for (const request of page.page) {
      const institutionId =
        request.institutionId ??
        (await resolveWriteInstitution(ctx, {
          loanId: request.entityType === 'loan' ? (request.entityId as Id<'loans'>) : undefined,
          userId: request.requestedBy,
        }));
      if (!institutionId) {
        unbound += 1;
        continue;
      }
      const roles = await ctx.db
        .query('userRoles')
        .withIndex('by_institutionId', (q) => q.eq('institutionId', institutionId))
        .collect();
      const staffIds = Array.from(
        new Set(
          roles
            .filter((role) => ['loan_officer', 'admin', 'tenant_admin'].includes(role.role))
            .map((role) => role.userId)
        )
      );
      const isKyc = request.entityType === 'kyc';
      const dedupeKey = isKyc
        ? `kyc:${request._id}:submitted:staff`
        : `approval:${request._id}:submitted:staff`;

      for (const userId of staffIds) {
        const existing = await ctx.db
          .query('notifications')
          .withIndex('by_userId_dedupeKey', (q) =>
            q.eq('userId', userId).eq('dedupeKey', dedupeKey)
          )
          .first();
        if (existing) continue;
        wouldCreate += 1;
        if (!dryRun) {
          await createNotificationIdempotent(ctx, {
            userId,
            institutionId,
            title: isKyc ? 'KYC Package Awaiting Review' : 'Loan Application Awaiting Review',
            message: isKyc
              ? 'A submitted KYC package is waiting in the approval queue.'
              : 'A submitted loan application is waiting in the approval queue.',
            category: isKyc ? 'kyc' : 'loan',
            priority: request.priority === 'urgent' ? 'urgent' : 'high',
            actionUrl: '/admin/approvals',
            actionLabel: 'View Approvals',
            dedupeKey,
            entityType: 'approvalRequests',
            entityId: String(request._id),
            metadata: { requestId: request._id, requestType: request.requestType },
          });
          created += 1;
        }
      }
    }

    if (!dryRun && created > 0) {
      scheduleAuditEntry(ctx, {
        entityType: 'notifications',
        entityId: 'backfillPendingStaffNotifications',
        action: 'BACKFILL_ACTIONABLE_ALERTS',
        newState: { scanned: page.page.length, created, unbound },
      });
    }
    return {
      dryRun,
      scanned: page.page.length,
      wouldCreate,
      created,
      unbound,
      continueCursor: page.continueCursor,
      isDone: page.isDone,
    };
  },
});

export const rebuildPortfolioMetrics = internalMutation({
  args: { dryRun: v.boolean() },
  handler: async (ctx, { dryRun }) => {
    const [loans, disbursements, payments] = await Promise.all([
      ctx.db.query('loans').take(10000),
      ctx.db.query('disbursements').take(10000),
      ctx.db.query('paymentTransactions').take(10000),
    ]);
    const expected: Record<string, number> = {
      active_loan_count: loans.filter((loan) => ['active', 'funded'].includes(loan.status)).length,
      approved_loan_count: loans.filter((loan) => loan.status === 'approved').length,
      approved_loan_amount: loans
        .filter((loan) => loan.status === 'approved')
        .reduce((sum, loan) => sum + loan.principal, 0),
      paid_off_loan_count: loans.filter((loan) => loan.status === 'paid_off').length,
      pending_loan_count: loans.filter((loan) => loan.status === 'draft').length,
      submitted_loan_count: loans.filter((loan) =>
        ['submitted', 'under_review'].includes(loan.status)
      ).length,
      rejected_loan_count: loans.filter((loan) => loan.status === 'rejected').length,
      total_disbursed: disbursements
        .filter((row) => row.status === 'completed')
        .reduce((sum, row) => sum + row.amount, 0),
      failed_disbursement_count: disbursements.filter((row) => row.status === 'failed').length,
      total_repaid: payments
        .filter((row) => row.status === 'completed')
        .reduce((sum, row) => sum + row.amount, 0),
      completed_payment_count: payments.filter((row) => row.status === 'completed').length,
      failed_payment_count: payments.filter((row) => row.status === 'failed').length,
    };

    const comparison: Record<string, { current: number | null; expected: number }> = {};
    for (const [metricKey, value] of Object.entries(expected)) {
      const existing = await ctx.db
        .query('portfolioMetrics')
        .withIndex('by_metricKey', (q) => q.eq('metricKey', metricKey))
        .first();
      comparison[metricKey] = { current: existing?.value ?? null, expected: value };
      if (!dryRun) {
        if (existing) {
          await ctx.db.patch(existing._id, {
            value,
            lastEventId: `rebuild:${Date.now()}`,
            updatedAt: Date.now(),
          });
        } else {
          await ctx.db.insert('portfolioMetrics', {
            metricKey,
            value,
            lastEventId: `rebuild:${Date.now()}`,
            updatedAt: Date.now(),
          });
        }
      }
    }

    if (!dryRun) {
      scheduleAuditEntry(ctx, {
        entityType: 'portfolioMetrics',
        entityId: 'rebuildPortfolioMetrics',
        action: 'ABSOLUTE_REBUILD',
        newState: {
          metrics: expected,
          sourceCounts: {
            loans: loans.length,
            disbursements: disbursements.length,
            payments: payments.length,
          },
        },
      });
    }
    return {
      dryRun,
      sourceCounts: {
        loans: loans.length,
        disbursements: disbursements.length,
        payments: payments.length,
      },
      comparison,
    };
  },
});

export const backfillPendingIpsStaffNotifications = internalMutation({
  args: {
    dryRun: v.boolean(),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, { dryRun, limit, cursor }) => {
    const page = await ctx.db
      .query('ipsTransactions')
      .withIndex('by_status', (q) => q.eq('status', 'pending'))
      .order('asc')
      .paginate({ numItems: Math.min(limit ?? 100, 500), cursor: cursor ?? null });
    let wouldCreate = 0;
    let created = 0;
    let unbound = 0;

    for (const transaction of page.page) {
      const institutionId =
        transaction.institutionId ??
        (await resolveWriteInstitution(ctx, {
          loanId: transaction.loanId,
          userId: transaction.userId,
        }));
      if (!institutionId) {
        unbound += 1;
        continue;
      }
      const roles = await ctx.db
        .query('userRoles')
        .withIndex('by_institutionId', (q) => q.eq('institutionId', institutionId))
        .collect();
      const staffIds = Array.from(
        new Set(
          roles
            .filter((role) => ['loan_officer', 'admin', 'tenant_admin'].includes(role.role))
            .map((role) => role.userId)
        )
      );
      for (const userId of staffIds) {
        const dedupeKey = `ips:${transaction._id}:pending:staff`;
        const existing = await ctx.db
          .query('notifications')
          .withIndex('by_userId_dedupeKey', (q) =>
            q.eq('userId', userId).eq('dedupeKey', dedupeKey)
          )
          .first();
        if (existing) continue;
        wouldCreate += 1;
        if (!dryRun) {
          await createNotificationIdempotent(ctx, {
            userId,
            institutionId,
            title: 'IPS Item Requires Reconciliation',
            message: 'A pending IPS item requires staff review or provider reconciliation.',
            category: 'payment',
            priority: 'high',
            actionUrl: '/admin/loans',
            actionLabel: 'Review IPS Item',
            dedupeKey,
            entityType: 'ipsTransactions',
            entityId: String(transaction._id),
            metadata: {
              ipsTransactionId: transaction._id,
              loanId: transaction.loanId,
              disbursementId: transaction.disbursementId,
            },
          });
          created += 1;
        }
      }
    }

    if (!dryRun && created > 0) {
      scheduleAuditEntry(ctx, {
        entityType: 'notifications',
        entityId: 'backfillPendingIpsStaffNotifications',
        action: 'BACKFILL_IPS_RECONCILIATION_ALERTS',
        newState: { scanned: page.page.length, created, unbound },
      });
    }
    return {
      dryRun,
      scanned: page.page.length,
      wouldCreate,
      created,
      unbound,
      continueCursor: page.continueCursor,
      isDone: page.isDone,
    };
  },
});

/** Settled loans without historical schedules are reported, never fabricated. */
export const getHistoricalScheduleExceptions = internalQuery({
  args: {},
  handler: async (ctx) => {
    const paidOff = await ctx.db
      .query('loans')
      .withIndex('by_status', (q) => q.eq('status', 'paid_off'))
      .collect();
    const exceptions: Array<{ loanId: string; reason: string }> = [];
    for (const loan of paidOff) {
      const schedule = await ctx.db
        .query('paymentSchedules')
        .withIndex('by_loanId', (q) => q.eq('loanId', loan._id))
        .first();
      if (!schedule) {
        exceptions.push({
          loanId: String(loan._id),
          reason: 'paid_off_historical_loan_without_schedule_preserved',
        });
      }
    }
    return { paidOffLoans: paidOff.length, exceptions: exceptions.length, items: exceptions };
  },
});

export const backfillBlockedDisbursementStaffNotifications = internalMutation({
  args: { dryRun: v.boolean(), limit: v.optional(v.number()) },
  handler: async (ctx, { dryRun, limit }) => {
    const deadLetters = await ctx.db
      .query('tigerBeetleOutbox')
      .withIndex('by_status', (q) => q.eq('status', 'dead_letter'))
      .take(Math.min(limit ?? 500, 1000));
    let scanned = 0;
    let wouldCreate = 0;
    let created = 0;

    for (const entry of deadLetters) {
      if (entry.eventType !== 'DISBURSEMENT' || entry.sourceTable !== 'disbursements') continue;
      const disbursement = await ctx.db.get(entry.sourceId as Id<'disbursements'>);
      if (!disbursement || disbursement.status !== 'failed') {
        continue;
      }
      const institutionId =
        disbursement.institutionId ??
        (await resolveWriteInstitution(ctx, { loanId: disbursement.loanId }));
      if (!institutionId) continue;
      scanned += 1;
      const roles = await ctx.db
        .query('userRoles')
        .withIndex('by_institutionId', (q) => q.eq('institutionId', institutionId))
        .collect();
      for (const userId of Array.from(
        new Set(
          roles
            .filter((role) => ['loan_officer', 'admin', 'tenant_admin'].includes(role.role))
            .map((role) => role.userId)
        )
      )) {
        const dedupeKey = `disbursement:${disbursement._id}:failed:staff`;
        const existing = await ctx.db
          .query('notifications')
          .withIndex('by_userId_dedupeKey', (q) =>
            q.eq('userId', userId).eq('dedupeKey', dedupeKey)
          )
          .first();
        if (existing) continue;
        wouldCreate += 1;
        if (!dryRun) {
          await createNotificationIdempotent(ctx, {
            userId,
            institutionId,
            title: 'Disbursement Requires Manual Review',
            message:
              'A failed disbursement has blocked ledger evidence and must be reconciled manually.',
            category: 'payment',
            priority: 'urgent',
            actionUrl: '/admin/loans',
            actionLabel: 'Review Disbursement',
            dedupeKey,
            entityType: 'disbursements',
            entityId: String(disbursement._id),
            metadata: { disbursementId: disbursement._id, loanId: disbursement.loanId },
          });
          created += 1;
        }
      }
    }

    if (!dryRun && created > 0) {
      scheduleAuditEntry(ctx, {
        entityType: 'notifications',
        entityId: 'backfillBlockedDisbursementStaffNotifications',
        action: 'BACKFILL_BLOCKED_LEDGER_ALERTS',
        newState: { scanned, created },
      });
    }
    return { dryRun, scanned, wouldCreate, created };
  },
});
