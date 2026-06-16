/**
 * Loan post-submission processing failure tracking.
 *
 * `processLoanApplication` (a Node action) runs credit scoring + approval-request
 * creation in the background. Previously its errors were swallowed, so a loan
 * could sit unscored and unapprovable with no operator signal. These functions
 * make those failures durable, observable, and retryable.
 *
 * Mutations here are internal (called by the action) except the staff-facing
 * `retryLoanProcessing` and the staff query.
 */

import { ConvexError, v } from 'convex/values';
import { internal } from './_generated/api';
import { internalMutation, mutation, query } from './_generated/server';
import { assertStaff } from './lib/auth';

/** Max automatic attempts before a failure is dead-lettered for manual action. */
export const MAX_PROCESSING_ATTEMPTS = 3;

const failureStage = v.union(
  v.literal('scoring'),
  v.literal('recordScore'),
  v.literal('approvalRequest'),
  v.literal('notification'),
  v.literal('unknown')
);

/**
 * Upsert a processing failure for a loan. Increments the attempt counter and
 * dead-letters once MAX_PROCESSING_ATTEMPTS is reached, notifying admins.
 * Returns the new attempt count + whether it is now dead-lettered (the action
 * uses this to decide whether to schedule another retry).
 */
export const recordProcessingFailure = internalMutation({
  args: {
    loanId: v.id('loans'),
    stage: failureStage,
    errorMessage: v.string(),
    errorCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query('loanProcessingFailures')
      .withIndex('by_loanId', (q) => q.eq('loanId', args.loanId))
      .first();

    const attemptCount = (existing?.attemptCount ?? 0) + 1;
    const deadLettered = attemptCount >= MAX_PROCESSING_ATTEMPTS;
    const status = deadLettered ? 'dead_letter' : 'open';
    // Exponential backoff: 30s, 2m, ... (only meaningful while not dead-lettered)
    const nextRetryAt = deadLettered ? undefined : now + 30_000 * Math.pow(4, attemptCount - 1);

    if (existing) {
      await ctx.db.patch(existing._id, {
        stage: args.stage,
        status,
        attemptCount,
        lastErrorCode: args.errorCode,
        lastErrorMessage: args.errorMessage.slice(0, 500),
        nextRetryAt,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert('loanProcessingFailures', {
        loanId: args.loanId,
        stage: args.stage,
        status,
        attemptCount,
        lastErrorCode: args.errorCode,
        lastErrorMessage: args.errorMessage.slice(0, 500),
        nextRetryAt,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Alert operators once the failure is dead-lettered.
    if (deadLettered) {
      const admin = await ctx.db
        .query('userRoles')
        .filter((q) => q.or(q.eq(q.field('role'), 'admin'), q.eq(q.field('role'), 'tenant_admin')))
        .first();
      if (admin) {
        await ctx.scheduler
          .runAfter(0, internal.notifications.createNotification, {
            userId: admin.userId,
            title: 'Loan processing failed',
            message: `Loan ${args.loanId} failed automated processing at stage '${args.stage}' after ${attemptCount} attempts and needs manual review.`,
            category: 'general' as const,
            priority: 'high' as const,
            actionUrl: `/admin/loans/${args.loanId}`,
            actionLabel: 'Review Loan',
          })
          .catch((err: unknown) =>
            console.error('[loanProcessing] dead-letter notify failed:', err)
          );
      }
    }

    return { attemptCount, deadLettered };
  },
});

/** Mark any open/retrying failure for a loan as resolved (called on success). */
export const resolveProcessingFailure = internalMutation({
  args: { loanId: v.id('loans') },
  handler: async (ctx, { loanId }) => {
    const open = await ctx.db
      .query('loanProcessingFailures')
      .withIndex('by_loanId', (q) => q.eq('loanId', loanId))
      .first();
    if (open && (open.status === 'open' || open.status === 'retrying')) {
      await ctx.db.patch(open._id, { status: 'resolved', updatedAt: Date.now() });
    }
  },
});

/**
 * Staff: classify in-flight loans against the new KYC/scoring readiness invariant.
 *
 * Run this before the fail-closed KYC gate is treated as blocking so operators can
 * see which existing draft/submitted/under_review loans are ready vs. blocked, and
 * why — rather than discovering blocked applications only at approval time.
 * Read-only: produces a report, does not mutate loans.
 */
export const reconcileInFlightLoansForKycReadiness = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    await assertStaff(ctx);
    const IN_FLIGHT = ['draft', 'submitted', 'under_review'];

    const loans = (
      await ctx.db
        .query('loans')
        .order('desc')
        .take(limit ?? 1000)
    ).filter((l) => IN_FLIGHT.includes(l.status));

    const buckets = {
      ready: [] as string[],
      blockedKyc: [] as string[],
      missingProfile: [] as string[],
      missingScoring: [] as string[],
    };

    for (const loan of loans) {
      const profile = await ctx.db
        .query('profiles')
        .withIndex('by_userId', (q) => q.eq('userId', loan.userId))
        .first();

      if (!profile) {
        buckets.missingProfile.push(loan._id);
        continue;
      }
      if (profile.kycStatus !== 'verified') {
        buckets.blockedKyc.push(loan._id);
        continue;
      }
      if (
        loan.creditScore === undefined ||
        loan.debtToIncomeRatio === undefined ||
        loan.recommendation === undefined
      ) {
        buckets.missingScoring.push(loan._id);
        continue;
      }
      buckets.ready.push(loan._id);
    }

    return {
      scanned: loans.length,
      counts: {
        ready: buckets.ready.length,
        blockedKyc: buckets.blockedKyc.length,
        missingProfile: buckets.missingProfile.length,
        missingScoring: buckets.missingScoring.length,
      },
      loans: buckets,
    };
  },
});

/** Staff: list processing failures for the operator dashboard. */
export const listProcessingFailures = query({
  args: {
    status: v.optional(
      v.union(
        v.literal('open'),
        v.literal('retrying'),
        v.literal('resolved'),
        v.literal('dead_letter')
      )
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { status, limit }) => {
    await assertStaff(ctx);
    if (status) {
      return ctx.db
        .query('loanProcessingFailures')
        .withIndex('by_status', (q) => q.eq('status', status))
        .order('desc')
        .take(limit ?? 100);
    }
    return ctx.db
      .query('loanProcessingFailures')
      .order('desc')
      .take(limit ?? 100);
  },
});

/**
 * Staff: manually retry background processing for a loan. Re-runs scoring +
 * approval-request creation by re-scheduling the action with loan-derived args.
 */
export const retryLoanProcessing = mutation({
  args: { loanId: v.id('loans') },
  handler: async (ctx, { loanId }) => {
    await assertStaff(ctx);
    const loan = await ctx.db.get(loanId);
    if (!loan) throw new ConvexError({ code: 'NOT_FOUND', message: 'Loan not found.' });

    const failure = await ctx.db
      .query('loanProcessingFailures')
      .withIndex('by_loanId', (q) => q.eq('loanId', loanId))
      .first();
    if (failure) {
      await ctx.db.patch(failure._id, {
        status: 'retrying',
        attemptCount: 0, // reset the automatic-retry budget on manual retry
        updatedAt: Date.now(),
      });
    }

    await ctx.scheduler.runAfter(
      0,
      internal.actions.processLoanApplication.processLoanApplication,
      {
        loanId,
        userId: loan.userId,
        amount: loan.principal,
        interestRate: loan.interestRate,
        termMonths: loan.termMonths,
        purpose: loan.purpose,
        monthlyIncome: loan.monthlyIncome,
        monthlyExpenses: loan.monthlyExpenses,
        existingDebt: loan.existingDebt,
      }
    );

    return { scheduled: true };
  },
});
