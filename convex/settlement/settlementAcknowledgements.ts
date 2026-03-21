/**
 * Settlement Acknowledgements — SWIFT/NISS ack tracking.
 * Records confirmations received from Bank of Namibia NISS and SWIFT network.
 */

import { v } from 'convex/values';
import { query, mutation, internalMutation } from '../_generated/server';
import { assertStaff, assertAdmin } from '../lib/auth';

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
    // ackStatus is not indexed; filter in-memory from full scan (low volume table)
    const all = await ctx.db.query('settlementAcknowledgements').collect();
    return all.filter((a) => (a as Record<string, unknown>).ackStatus === 'pending');
  },
});

/**
 * Record an inbound SWIFT/NISS acknowledgement (called from webhook or admin UI).
 */
export const recordAcknowledgement = mutation({
  args: {
    runId: v.id('settlementRuns'),
    batchId: v.id('settlementPacs009Batches'),
    ackType: v.union(v.literal('swift'), v.literal('niss')),
    ackReference: v.string(),
    ackStatus: v.union(v.literal('accepted'), v.literal('rejected'), v.literal('pending')),
    rawPayload: v.optional(v.any()),
    rejectionReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);

    return ctx.db.insert('settlementAcknowledgements', {
      ...args,
      receivedAt: Date.now(),
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
    ackType: v.union(v.literal('swift'), v.literal('niss')),
    ackReference: v.string(),
    ackStatus: v.union(v.literal('accepted'), v.literal('rejected'), v.literal('pending')),
    rawPayload: v.optional(v.any()),
    rejectionReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert('settlementAcknowledgements', {
      ...args,
      receivedAt: Date.now(),
    });
  },
});

/**
 * Update ack status when a follow-up message is received.
 */
export const updateAcknowledgementStatus = mutation({
  args: {
    ackId: v.id('settlementAcknowledgements'),
    ackStatus: v.union(v.literal('accepted'), v.literal('rejected')),
    rejectionReason: v.optional(v.string()),
    rawPayload: v.optional(v.any()),
  },
  handler: async (ctx, { ackId, ackStatus, rejectionReason, rawPayload }) => {
    await assertAdmin(ctx);
    const ack = await ctx.db.get(ackId);
    if (!ack) throw new Error('Acknowledgement not found');

    await ctx.db.patch(ackId, {
      ackStatus,
      rejectionReason,
      ...(rawPayload !== undefined ? { rawPayload } : {}),
    });
  },
});
