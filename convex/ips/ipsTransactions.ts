/**
 * IPS Transactions — 54-column equivalent.
 * Idempotency enforced via msgId uniqueness check on every insert.
 * Replaces ipsService.ts RPC calls.
 */

import { v } from 'convex/values';
import { query, mutation, internalQuery, internalMutation } from '../_generated/server';
import { ConvexError } from 'convex/values';
import { assertAuthenticated, assertStaff, assertOwnerOrStaff } from '../lib/auth';
import { scheduleAuditLog } from '../lib/audit';
import { ipsTransactionStatus } from '../schema';

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getTransaction = query({
  args: { transactionId: v.id('ipsTransactions') },
  handler: async (ctx, { transactionId }) => {
    await assertAuthenticated(ctx);
    return ctx.db.get(transactionId);
  },
});

export const getTransactionByMsgId = query({
  args: { msgId: v.string() },
  handler: async (ctx, { msgId }) => {
    await assertAuthenticated(ctx);
    return ctx.db
      .query('ipsTransactions')
      .withIndex('by_msgId', (q) => q.eq('msgId', msgId))
      .first();
  },
});

/** Internal version — callable from actions/webhooks without auth context. */
export const getTransactionByMsgIdInternal = internalQuery({
  args: { msgId: v.string() },
  handler: async (ctx, { msgId }) => {
    return ctx.db
      .query('ipsTransactions')
      .withIndex('by_msgId', (q) => q.eq('msgId', msgId))
      .first();
  },
});

export const getTransactionsByLoan = query({
  args: { loanId: v.id('loans') },
  handler: async (ctx, { loanId }) => {
    const loan = await ctx.db.get(loanId);
    if (!loan) return [];
    await assertOwnerOrStaff(ctx, loan.userId);
    return ctx.db
      .query('ipsTransactions')
      .withIndex('by_loanId', (q) => q.eq('loanId', loanId))
      .order('desc')
      .collect();
  },
});

export const adminListIpsTransactions = query({
  args: {
    status: v.optional(ipsTransactionStatus),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { status, limit }) => {
    await assertStaff(ctx);
    if (status) {
      return ctx.db
        .query('ipsTransactions')
        .withIndex('by_status', (q) => q.eq('status', status))
        .order('desc')
        .take(limit ?? 100);
    }
    return ctx.db
      .query('ipsTransactions')
      .order('desc')
      .take(limit ?? 100);
  },
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Initiate an IPS transaction.
 * Idempotent — throws if msgId already exists.
 * Atomically enqueues IPS_INITIATE in TigerBeetle outbox.
 */
export const initiateIpsTransaction = mutation({
  args: {
    msgId: v.string(),
    txType: v.union(
      v.literal('credit_transfer'),
      v.literal('request_to_pay'),
      v.literal('reversal')
    ),
    direction: v.union(v.literal('inbound'), v.literal('outbound')),
    amount: v.number(),
    currency: v.string(),
    debtorVpa: v.optional(v.string()),
    creditorVpa: v.optional(v.string()),
    debtorName: v.optional(v.string()),
    creditorName: v.optional(v.string()),
    debtorBic: v.optional(v.string()),
    creditorBic: v.optional(v.string()),
    endToEndId: v.optional(v.string()),
    remittanceInfo: v.optional(v.string()),
    loanId: v.optional(v.id('loans')),
    disbursementId: v.optional(v.id('disbursements')),
    externalRef: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);

    // Idempotency check — reject duplicate msgId
    const existing = await ctx.db
      .query('ipsTransactions')
      .withIndex('by_msgId', (q) => q.eq('msgId', args.msgId))
      .first();

    if (existing) {
      throw new ConvexError({
        code: 'DUPLICATE_MSG_ID',
        message: `IPS transaction with msgId '${args.msgId}' already exists.`,
      });
    }

    const now = Date.now();
    const txId = await ctx.db.insert('ipsTransactions', {
      ...args,
      userId: userId,
      status: 'pending',
      initiatedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    // Enqueue TigerBeetle IPS_INITIATE outbox entry
    await ctx.db.insert('tigerBeetleOutbox', {
      eventType: 'IPS_INITIATE',
      sourceTable: 'ipsTransactions',
      sourceId: txId,
      payload: {
        amount: Math.round(args.amount * 100),
        msg_id: args.msgId,
        direction: args.direction,
      },
      status: 'pending',
      retryCount: 0,
      createdAt: now,
    });

    return txId;
  },
});

/**
 * Update IPS transaction status (typically from webhook callback).
 * Replaces `update_ips_transaction_status` RPC.
 */
export const updateIpsTransactionStatus = mutation({
  args: {
    transactionId: v.id('ipsTransactions'),
    status: v.union(
      v.literal('processing'),
      v.literal('completed'),
      v.literal('failed'),
      v.literal('reversed'),
      v.literal('timeout')
    ),
    rawResponse: v.optional(v.any()),
    errorCode: v.optional(v.string()),
    errorDescription: v.optional(v.string()),
    settlementDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertStaff(ctx);
    const tx = await ctx.db.get(args.transactionId);
    if (!tx) throw new ConvexError({ code: 'NOT_FOUND', message: 'IPS transaction not found.' });

    const now = Date.now();
    const updates: Record<string, unknown> = {
      status: args.status,
      rawResponse: args.rawResponse,
      errorCode: args.errorCode,
      errorDescription: args.errorDescription,
      settlementDate: args.settlementDate,
      updatedAt: now,
    };

    if (args.status === 'completed') {
      updates.completedAt = now;

      // Enqueue IPS_COMPLETE for TigerBeetle
      await ctx.db.insert('tigerBeetleOutbox', {
        eventType: 'IPS_COMPLETE',
        sourceTable: 'ipsTransactions',
        sourceId: args.transactionId,
        payload: { amount: tx.amount * 100, msg_id: tx.msgId },
        status: 'pending',
        retryCount: 0,
        createdAt: now,
      });
    } else if (args.status === 'failed' || args.status === 'timeout') {
      // Enqueue IPS_REVERSE for TigerBeetle
      await ctx.db.insert('tigerBeetleOutbox', {
        eventType: 'IPS_REVERSE',
        sourceTable: 'ipsTransactions',
        sourceId: args.transactionId,
        payload: { amount: tx.amount * 100, msg_id: tx.msgId, reason: args.errorDescription },
        status: 'pending',
        retryCount: 0,
        createdAt: now,
      });
    }

    await ctx.db.patch(args.transactionId, updates);

    scheduleAuditLog(
      ctx,
      'ips_transaction',
      args.transactionId,
      'STATUS_CHANGE',
      tx.status,
      args.status
    );
  },
});

/**
 * Internal version of updateIpsTransactionStatus — callable from actions/webhooks
 * without auth context. Same logic as the public mutation above.
 */
export const updateIpsTransactionStatusInternal = internalMutation({
  args: {
    transactionId: v.id('ipsTransactions'),
    status: v.union(
      v.literal('processing'),
      v.literal('completed'),
      v.literal('failed'),
      v.literal('reversed'),
      v.literal('timeout')
    ),
    rawResponse: v.optional(v.any()),
    errorCode: v.optional(v.string()),
    errorDescription: v.optional(v.string()),
    settlementDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tx = await ctx.db.get(args.transactionId);
    if (!tx) throw new ConvexError({ code: 'NOT_FOUND', message: 'IPS transaction not found.' });

    const now = Date.now();
    const updates: Record<string, unknown> = {
      status: args.status,
      rawResponse: args.rawResponse,
      errorCode: args.errorCode,
      errorDescription: args.errorDescription,
      settlementDate: args.settlementDate,
      updatedAt: now,
    };

    if (args.status === 'completed') {
      updates.completedAt = now;
      await ctx.db.insert('tigerBeetleOutbox', {
        eventType: 'IPS_COMPLETE',
        sourceTable: 'ipsTransactions',
        sourceId: args.transactionId,
        payload: { amount: tx.amount * 100, msg_id: tx.msgId },
        status: 'pending',
        retryCount: 0,
        createdAt: now,
      });
    } else if (args.status === 'failed' || args.status === 'timeout') {
      await ctx.db.insert('tigerBeetleOutbox', {
        eventType: 'IPS_REVERSE',
        sourceTable: 'ipsTransactions',
        sourceId: args.transactionId,
        payload: { amount: tx.amount * 100, msg_id: tx.msgId, reason: args.errorDescription },
        status: 'pending',
        retryCount: 0,
        createdAt: now,
      });
    }

    await ctx.db.patch(args.transactionId, updates);

    scheduleAuditLog(
      ctx,
      'ips_transaction',
      args.transactionId,
      'STATUS_CHANGE',
      tx.status,
      args.status
    );
  },
});
