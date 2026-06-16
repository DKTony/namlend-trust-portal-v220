/**
 * Settlement Acknowledgements — SWIFT/NISS ack tracking.
 * Records confirmations received from Bank of Namibia NISS and SWIFT network.
 */

import { v } from 'convex/values';
import { internalMutation, mutation, query } from '../_generated/server';
import { assertAdmin, assertStaff } from '../lib/auth';

const settlementAckType = v.union(
  v.literal('xsys_001'),
  v.literal('xsys_002'),
  v.literal('xsys_003')
);

function serializePayload(payload: unknown): string | undefined {
  if (payload === undefined) return undefined;
  return typeof payload === 'string' ? payload : JSON.stringify(payload);
}

export const listAcknowledgementsByRun = query({
  args: { runId: v.id('settlementRuns') },
  handler: async (ctx, { runId }) => {
    await assertStaff(ctx);
    return ctx.db
      .query('settlementAcknowledgements')
      .withIndex('by_runId', (q) => q.eq('runId', runId))
      .collect();
  },
});

export const listAcknowledgementsByBatch = query({
  args: { batchId: v.id('settlementPacs009Batches') },
  handler: async (ctx, { batchId }) => {
    await assertStaff(ctx);
    return ctx.db
      .query('settlementAcknowledgements')
      .withIndex('by_batchId', (q) => q.eq('batchId', batchId))
      .collect();
  },
});

export const getPendingAcknowledgements = query({
  args: {},
  handler: async (ctx) => {
    await assertStaff(ctx);
    const all = await ctx.db.query('settlementAcknowledgements').collect();
    return all.filter((a) => a.processedAt === undefined && a.errorCode === undefined);
  },
});

/**
 * Record an inbound SWIFT/NISS acknowledgement (called from webhook or admin UI).
 */
export const recordAcknowledgement = mutation({
  args: {
    runId: v.id('settlementRuns'),
    batchId: v.id('settlementPacs009Batches'),
    ackType: settlementAckType,
    msgId: v.string(),
    rawPayload: v.optional(v.any()),
    errorCode: v.optional(v.string()),
    errorDescription: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    const now = Date.now();

    return ctx.db.insert('settlementAcknowledgements', {
      runId: args.runId,
      batchId: args.batchId,
      ackType: args.ackType,
      msgId: args.msgId,
      rawPayload: serializePayload(args.rawPayload),
      errorCode: args.errorCode,
      errorDescription: args.errorDescription,
      receivedAt: now,
      createdAt: now,
    });
  },
});

/**
 * Internal version for webhook-driven ack processing (no user auth required).
 */
export const recordAcknowledgementInternal = internalMutation({
  args: {
    runId: v.id('settlementRuns'),
    batchId: v.id('settlementPacs009Batches'),
    ackType: settlementAckType,
    msgId: v.string(),
    rawPayload: v.optional(v.any()),
    errorCode: v.optional(v.string()),
    errorDescription: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return ctx.db.insert('settlementAcknowledgements', {
      runId: args.runId,
      batchId: args.batchId,
      ackType: args.ackType,
      msgId: args.msgId,
      rawPayload: serializePayload(args.rawPayload),
      errorCode: args.errorCode,
      errorDescription: args.errorDescription,
      receivedAt: now,
      createdAt: now,
    });
  },
});

/**
 * Update ack status when a follow-up message is received.
 */
export const updateAcknowledgementStatus = mutation({
  args: {
    ackId: v.id('settlementAcknowledgements'),
    errorCode: v.optional(v.string()),
    errorDescription: v.optional(v.string()),
    rawPayload: v.optional(v.any()),
  },
  handler: async (ctx, { ackId, errorCode, errorDescription, rawPayload }) => {
    await assertAdmin(ctx);
    const ack = await ctx.db.get(ackId);
    if (!ack) throw new Error('Acknowledgement not found');

    await ctx.db.patch(ackId, {
      processedAt: Date.now(),
      errorCode,
      errorDescription,
      ...(rawPayload !== undefined ? { rawPayload: serializePayload(rawPayload) } : {}),
    });
  },
});
