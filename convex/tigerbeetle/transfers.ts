/**
 * TigerBeetle shadow transfers — append-only ledger record.
 * 7-year retention: no deletes permitted.
 */

import { v } from 'convex/values';
import { internalMutation, query } from '../_generated/server';
import { assertAdmin } from '../lib/auth';

/** Internal: record a shadow transfer after successful TB post. */
export const recordShadowTransfer = internalMutation({
  args: {
    tbTransferIdHigh: v.number(),
    tbTransferIdLow: v.number(),
    amount: v.number(),
    tbLedger: v.number(),
    tbCode: v.number(),
    sourceTable: v.string(),
    sourceId: v.string(),
    outboxId: v.id('tigerBeetleOutbox'),
    isPosted: v.boolean(),
    userData128: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('tigerBeetleTransfers', {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const getTransfersBySource = query({
  args: { sourceId: v.string() },
  handler: async (ctx, { sourceId }) => {
    await assertAdmin(ctx);
    return ctx.db
      .query('tigerBeetleTransfers')
      .withIndex('by_outboxId')
      .collect()
      .then((transfers: any[]) => transfers.filter((t) => t.sourceId === sourceId));
  },
});
