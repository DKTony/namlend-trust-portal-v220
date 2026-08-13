/**
 * TigerBeetle reconciliation records.
 */

import { v } from 'convex/values';
import { mutation, query } from '../_generated/server';
import { assertPlatformOwner, assertPlatformSupport } from '../lib/platformAuth';

export const listReconciliations = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    await assertPlatformSupport(ctx);
    return ctx.db
      .query('tigerBeetleReconciliation')
      .order('desc')
      .take(limit ?? 50);
  },
});

export const recordReconciliation = mutation({
  args: {
    runDate: v.string(),
    entityType: v.optional(v.string()),
    tbBalance: v.number(),
    dbBalance: v.number(),
    variance: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertPlatformOwner(ctx);
    return ctx.db.insert('tigerBeetleReconciliation', {
      ...args,
      status: Math.abs(args.variance) < 0.01 ? 'matched' : 'variance_detected',
      createdAt: Date.now(),
    });
  },
});
