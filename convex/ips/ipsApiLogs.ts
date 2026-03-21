/**
 * IPS API Logs — append-only request/response log.
 */

import { v } from 'convex/values';
import { query, internalMutation } from '../_generated/server';
import { assertAdmin } from '../lib/auth';

export const logApiCall = internalMutation({
  args: {
    transactionId: v.optional(v.id('ipsTransactions')),
    method: v.string(),
    endpoint: v.string(),
    requestBody: v.optional(v.any()),
    responseStatus: v.optional(v.number()),
    responseBody: v.optional(v.any()),
    durationMs: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('ipsApiLogs', {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const getApiLogs = query({
  args: {
    transactionId: v.optional(v.id('ipsTransactions')),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { transactionId, limit }) => {
    await assertAdmin(ctx);
    if (transactionId) {
      return ctx.db
        .query('ipsApiLogs')
        .withIndex('by_transactionId', (q: any) => q.eq('transactionId', transactionId))
        .order('desc')
        .take(limit ?? 50);
    }
    return ctx.db
      .query('ipsApiLogs')
      .order('desc')
      .take(limit ?? 50);
  },
});
