/**
 * Disbursement state machine.
 * Replaces 5 Supabase RPCs:
 *   initiate_disbursement, process_disbursement, complete_disbursement,
 *   fail_disbursement, reverse_disbursement
 *
 * TigerBeetle outbox entry is enqueued atomically in the same mutation as
 * the disbursement insert — guaranteeing the outbox entry is created if and
 * only if the DB write succeeds.
 *
 * FINANCIAL SAFETY: All mutations have retry: false on useMutation (frontend).
 */

import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import { ConvexError } from 'convex/values';
import { assertStaff, assertOwnerOrStaff } from './lib/auth';
import { scheduleAuditLog } from './lib/audit';
import { emitRelationship } from './lib/relationshipEmitter';
import { emitEvent, generateCorrelationId } from './lib/eventEmitter';
import {
  selectOptimalRail,
  DEFAULT_RAIL_WEIGHTS,
  type RailCandidate,
  type RailWeights,
} from './lib/railSelector';
import { emitDomainEvent, DOMAIN_EVENTS } from './lib/domainEvents';
import { getJsonRule } from './lib/ruleEvaluator';
import { txStatus } from './schema';
import { internal } from './_generated/api';

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getDisbursementsByLoan = query({
  args: { loanId: v.id('loans') },
  handler: async (ctx, { loanId }) => {
    const loan = await ctx.db.get(loanId);
    if (!loan) return [];
    await assertOwnerOrStaff(ctx, loan.userId);
    return ctx.db
      .query('disbursements')
      .withIndex('by_loanId', (q) => q.eq('loanId', loanId))
      .collect();
  },
});

export const adminListDisbursements = query({
  args: {
    status: v.optional(txStatus),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { status, limit }) => {
    await assertStaff(ctx);
    if (status) {
      return ctx.db
        .query('disbursements')
        .withIndex('by_status', (q) => q.eq('status', status))
        .order('desc')
        .take(limit ?? 100);
    }
    return ctx.db
      .query('disbursements')
      .order('desc')
      .take(limit ?? 100);
  },
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Initiate a disbursement for an approved loan.
 * Replaces `initiate_disbursement` RPC.
 * Atomically enqueues a TigerBeetle DISBURSEMENT outbox entry.
 */
export const initiateDisbursement = mutation({
  args: {
    loanId: v.id('loans'),
    amount: v.number(),
    method: v.union(
      v.literal('bank_transfer'),
      v.literal('ips'),
      v.literal('mobile_money'),
      v.literal('cash'),
      v.literal('cheque')
    ),
    bankName: v.optional(v.string()),
    accountNumber: v.optional(v.string()),
    accountName: v.optional(v.string()),
    branchCode: v.optional(v.string()),
    railCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const staffId = await assertStaff(ctx);
    const loan = await ctx.db.get(args.loanId);
    if (!loan) throw new ConvexError({ code: 'NOT_FOUND', message: 'Loan not found.' });

    if (loan.status !== 'approved') {
      throw new ConvexError({
        code: 'INVALID_STATE',
        message: `Loan must be in 'approved' status to disburse. Current: '${loan.status}'.`,
      });
    }

    if (args.amount <= 0 || args.amount > loan.principal) {
      throw new ConvexError({
        code: 'VALIDATION_ERROR',
        message: `Disbursement amount must be between 0 and loan principal (${loan.principal}).`,
      });
    }

    // --- IDEMPOTENCY GUARD ---
    // Prevent duplicate disbursements from retries or double-clicks
    const existingPending = await ctx.db
      .query('disbursements')
      .withIndex('by_loanId_status', (q) => q.eq('loanId', args.loanId).eq('status', 'pending'))
      .first();
    if (existingPending) return existingPending._id;

    // --- MANDATE SOFT-CHECK (Ontology Phase 2) ---
    // Warn if no active mandate exists for this loan.
    // This is a soft check (warning, not blocker) to preserve backward compatibility.
    const loanMandates = await ctx.db
      .query('mandates')
      .withIndex('by_loanId', (q) => q.eq('loanId', args.loanId))
      .collect();
    const activeMandate = loanMandates.find((m) => m.status === 'active');
    if (!activeMandate) {
      console.warn(
        `[disbursement] No active mandate for loan ${args.loanId}. ` +
          `Collections will rely on soft path (reminders/PTP) only.`
      );
    }

    // --- RAIL SELECTION (Ontology Phase 5) ---
    // Query active rails, run selector, record decision in event journal.
    // Falls back gracefully if no rails are seeded yet.
    let selectedRailId: string | undefined;
    let railDecision: { railCode: string; score: number; reasoning: string } | undefined;

    const allRails = await ctx.db
      .query('paymentRails')
      .withIndex('by_status', (q) => q.eq('status', 'active'))
      .collect();

    if (allRails.length > 0) {
      // Read rail weights from business rules (data-driven); falls back to hardcoded defaults
      const weights = await getJsonRule<RailWeights>(ctx, 'RAIL_WEIGHTS', DEFAULT_RAIL_WEIGHTS);
      const ranked = selectOptimalRail(
        allRails as RailCandidate[],
        args.amount,
        'disbursement',
        args.railCode,
        weights
      );
      if (ranked.length > 0) {
        selectedRailId = ranked[0].railId;
        railDecision = {
          railCode: ranked[0].railCode,
          score: ranked[0].score,
          reasoning: ranked[0].reasoning,
        };
      }
    }

    const now = Date.now();
    const disbursementId = await ctx.db.insert('disbursements', {
      loanId: args.loanId,
      userId: loan.userId,
      amount: args.amount,
      method: args.method,
      status: 'pending',
      bankName: args.bankName,
      accountNumber: args.accountNumber,
      accountName: args.accountName,
      branchCode: args.branchCode,
      railId: selectedRailId as never,
      initiatedBy: staffId,
      createdAt: now,
      updatedAt: now,
    });

    // Atomically enqueue TigerBeetle outbox entry
    await ctx.db.insert('tigerBeetleOutbox', {
      eventType: 'DISBURSEMENT',
      sourceTable: 'disbursements',
      sourceId: disbursementId,
      payload: {
        loan_id: args.loanId,
        amount: Math.round(args.amount * 100), // cents
        disbursement_id: disbursementId,
        transfer_code: 1001, // LOAN_PRINCIPAL_RECEIVABLE
      },
      status: 'pending',
      retryCount: 0,
      createdAt: now,
    });

    scheduleAuditLog(ctx, 'disbursement', disbursementId, 'INITIATE', 'none', 'pending');
    emitDomainEvent(ctx, DOMAIN_EVENTS.DISBURSEMENT_INITIATED, 'disbursements', disbursementId, {
      loanId: args.loanId,
      amount: loan.principal,
    });

    // Ontology: record rail selection decision in event journal
    if (railDecision) {
      emitEvent(ctx, {
        eventType: 'disbursement.rail_selected',
        entityType: 'disbursements',
        entityId: disbursementId,
        domainSource: 'payments',
        correlationId: generateCorrelationId(),
        actorId: staffId,
        actorType: 'user',
        payload: {
          loanId: args.loanId,
          amount: args.amount,
          selectedRail: railDecision.railCode,
          score: railDecision.score,
          reasoning: railDecision.reasoning,
          preferredRailCode: args.railCode,
          availableRails: allRails.length,
        },
      });
    }

    // Ontology: loan -> disbursed_via -> disbursement
    emitRelationship(
      ctx,
      { type: 'loans', id: args.loanId },
      { type: 'disbursements', id: disbursementId },
      'disbursed_via'
    );

    return disbursementId;
  },
});

/**
 * Mark disbursement as processing (bank transfer in flight).
 * Replaces `process_disbursement` RPC.
 */
export const processDisbursement = mutation({
  args: {
    disbursementId: v.id('disbursements'),
    referenceNumber: v.optional(v.string()),
  },
  handler: async (ctx, { disbursementId, referenceNumber }) => {
    await assertStaff(ctx);
    const d = await ctx.db.get(disbursementId);
    if (!d) throw new ConvexError({ code: 'NOT_FOUND', message: 'Disbursement not found.' });

    if (d.status !== 'pending') {
      throw new ConvexError({
        code: 'INVALID_STATE',
        message: `Disbursement must be pending to process. Current: '${d.status}'.`,
      });
    }

    await ctx.db.patch(disbursementId, {
      status: 'processing',
      referenceNumber,
      updatedAt: Date.now(),
    });

    scheduleAuditLog(ctx, 'disbursement', disbursementId, 'PROCESS', 'pending', 'processing');
    emitDomainEvent(ctx, DOMAIN_EVENTS.DISBURSEMENT_PROCESSING, 'disbursements', disbursementId);
  },
});

/**
 * Complete a disbursement and mark the loan as funded.
 * Replaces `complete_disbursement` RPC.
 */
export const completeDisbursement = mutation({
  args: {
    disbursementId: v.id('disbursements'),
    referenceNumber: v.optional(v.string()),
  },
  handler: async (ctx, { disbursementId, referenceNumber }) => {
    await assertStaff(ctx);
    const d = await ctx.db.get(disbursementId);
    if (!d) throw new ConvexError({ code: 'NOT_FOUND', message: 'Disbursement not found.' });

    if (!['pending', 'processing'].includes(d.status)) {
      throw new ConvexError({
        code: 'INVALID_STATE',
        message: `Cannot complete disbursement with status '${d.status}'.`,
      });
    }

    await ctx.db.patch(disbursementId, {
      status: 'completed',
      referenceNumber: referenceNumber ?? d.referenceNumber,
      processedAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Update loan to funded
    const loan = await ctx.db.get(d.loanId);
    if (loan && loan.status === 'approved') {
      await ctx.db.patch(d.loanId, {
        status: 'funded',
        disbursedAt: Date.now(),
        updatedAt: Date.now(),
      });
      scheduleAuditLog(ctx, 'loan', d.loanId, 'FUND', 'approved', 'funded');

      // Notify client that funds have been disbursed
      const amountFormatted = new Intl.NumberFormat('en-NA', {
        style: 'currency',
        currency: 'NAD',
        currencyDisplay: 'symbol',
      })
        .format(d.amount)
        .replace('NAD', 'N$');

      ctx.scheduler
        .runAfter(0, internal.notifications.createNotification, {
          userId: d.userId,
          title: 'Loan Funds Disbursed',
          message: `${amountFormatted} has been disbursed to your account${referenceNumber ? ` (Ref: ${referenceNumber})` : ''}. Your loan is now active.`,
          category: 'loan' as const,
          priority: 'high' as const,
          actionUrl: `/loans/${d.loanId}`,
          actionLabel: 'View Loan',
          metadata: { loanId: d.loanId, disbursementId, amount: d.amount, referenceNumber },
        })
        .catch((err: unknown) =>
          console.error('[notification] completeDisbursement notify failed:', err)
        );
    }

    scheduleAuditLog(ctx, 'disbursement', disbursementId, 'COMPLETE', d.status, 'completed');
    emitDomainEvent(ctx, DOMAIN_EVENTS.DISBURSEMENT_COMPLETED, 'disbursements', disbursementId, {
      loanId: d.loanId,
      amount: d.amount,
    });
  },
});

/**
 * Mark a disbursement as failed.
 * Replaces `fail_disbursement` RPC.
 */
export const failDisbursement = mutation({
  args: {
    disbursementId: v.id('disbursements'),
    reason: v.string(),
  },
  handler: async (ctx, { disbursementId, reason }) => {
    await assertStaff(ctx);
    const d = await ctx.db.get(disbursementId);
    if (!d) throw new ConvexError({ code: 'NOT_FOUND', message: 'Disbursement not found.' });
    if (!['pending', 'processing'].includes(d.status)) {
      throw new ConvexError({
        code: 'INVALID_STATE',
        message: `Disbursement cannot be failed from status '${d.status}'.`,
      });
    }
    await ctx.db.patch(disbursementId, {
      status: 'failed',
      failureReason: reason,
      updatedAt: Date.now(),
    });
    scheduleAuditLog(ctx, 'disbursement', disbursementId, 'FAIL', d.status, 'failed', reason);
    emitDomainEvent(ctx, DOMAIN_EVENTS.DISBURSEMENT_FAILED, 'disbursements', disbursementId, {
      reason,
    });
  },
});

/**
 * Reverse a completed disbursement.
 * Replaces `reverse_disbursement` RPC.
 */
export const reverseDisbursement = mutation({
  args: {
    disbursementId: v.id('disbursements'),
    reason: v.string(),
  },
  handler: async (ctx, { disbursementId, reason }) => {
    await assertStaff(ctx);
    const d = await ctx.db.get(disbursementId);
    if (!d) throw new ConvexError({ code: 'NOT_FOUND', message: 'Disbursement not found.' });

    if (d.status !== 'completed') {
      throw new ConvexError({
        code: 'INVALID_STATE',
        message: 'Only completed disbursements can be reversed.',
      });
    }

    await ctx.db.patch(disbursementId, {
      status: 'reversed',
      failureReason: reason,
      updatedAt: Date.now(),
    });

    // Enqueue TigerBeetle reversal
    await ctx.db.insert('tigerBeetleOutbox', {
      eventType: 'IPS_REVERSE',
      sourceTable: 'disbursements',
      sourceId: disbursementId,
      payload: {
        disbursement_id: disbursementId,
        loan_id: d.loanId,
        amount: Math.round(d.amount * 100),
        reason,
      },
      status: 'pending',
      retryCount: 0,
      createdAt: Date.now(),
    });

    scheduleAuditLog(
      ctx,
      'disbursement',
      disbursementId,
      'REVERSE',
      'completed',
      'reversed',
      reason
    );
    emitDomainEvent(ctx, DOMAIN_EVENTS.DISBURSEMENT_REVERSED, 'disbursements', disbursementId, {
      reason,
    });
  },
});
