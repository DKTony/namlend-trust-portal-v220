/**
 * IPS API Logs — append-only request/response log.
 */

import { v } from 'convex/values';
import { query, internalMutation, internalQuery } from '../_generated/server';
import { assertStaff } from '../lib/auth';

export const logApiCall = internalMutation({
  args: {
    transactionId: v.optional(v.id('ipsTransactions')),
    method: v.string(),
    endpoint: v.string(),
    requestMsgId: v.optional(v.string()),
    requestBody: v.optional(v.any()),
    responseStatus: v.optional(v.number()),
    responseBody: v.optional(v.any()),
    durationMs: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    // Phase 1: XML protocol support
    direction: v.optional(
      v.union(v.literal('OUTBOUND'), v.literal('INBOUND'), v.literal('CALLBACK'))
    ),
    contentType: v.optional(v.union(v.literal('json'), v.literal('xml'))),
    apiName: v.optional(v.string()),
    rawXml: v.optional(v.string()),
    correlationId: v.optional(v.string()),
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
    await assertStaff(ctx);
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

export const getLatestApiLogByRequestMsgId = internalQuery({
  args: {
    requestMsgId: v.string(),
  },
  handler: async (ctx, { requestMsgId }) => {
    const logs = await ctx.db
      .query('ipsApiLogs')
      .withIndex('by_requestMsgId', (q) => q.eq('requestMsgId', requestMsgId))
      .order('desc')
      .take(1);

    return logs[0] ?? null;
  },
});

export const getLatestCallbackApiLogByRequestMsgId = internalQuery({
  args: {
    requestMsgId: v.string(),
  },
  handler: async (ctx, { requestMsgId }) => {
    const logs = await ctx.db
      .query('ipsApiLogs')
      .withIndex('by_requestMsgId', (q) => q.eq('requestMsgId', requestMsgId))
      .order('desc')
      .take(10);

    return logs.find((log) => log.direction === 'CALLBACK') ?? null;
  },
});

export const getLatestOutboundApiLogByRequestMsgId = internalQuery({
  args: {
    requestMsgId: v.string(),
  },
  handler: async (ctx, { requestMsgId }) => {
    const logs = await ctx.db
      .query('ipsApiLogs')
      .withIndex('by_requestMsgId', (q) => q.eq('requestMsgId', requestMsgId))
      .order('desc')
      .take(10);

    return logs.find((log) => log.direction === 'OUTBOUND') ?? null;
  },
});
