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
  },
});
