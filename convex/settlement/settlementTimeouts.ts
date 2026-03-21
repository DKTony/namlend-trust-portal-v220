/**
 * Settlement Timeout Transactions — tracks transactions that exceeded response deadlines.
 * Staff resolution requires admin approval.
 */

import { v } from 'convex/values';
import { query, mutation } from '../_generated/server';
import { assertAdmin, assertStaff } from '../lib/auth';
import { scheduleAuditLog } from '../lib/audit';

export const listTimeoutsByRun = query({
  args: { runId: v.id('settlementRuns') },
  handler: async (ctx, { runId }) => {
    await assertStaff(ctx);
    return ctx.db
      .query('settlementTimeoutTransactions')
      .withIndex('by_runId', (q: any) => q.eq('runId', runId))
      .collect();
  },
});

export const listPendingTimeouts = query({
  args: {},
  handler: async (ctx) => {
    await assertStaff(ctx);
    return ctx.db
      .query('settlementTimeoutTransactions')
      .withIndex('by_status', (q: any) => q.eq('status', 'pending'))
      .collect();
  },
});

export const getTimeout = query({
  args: { timeoutId: v.id('settlementTimeoutTransactions') },
  handler: async (ctx, { timeoutId }) => {
    await assertStaff(ctx);
    return ctx.db.get(timeoutId);
  },
});

export const recordTimeout = mutation({
  args: {
    runId: v.id('settlementRuns'),
    participantId: v.id('settlementParticipants'),
    transactionRef: v.string(),
    amount: v.number(),
    timeoutReason: v.string(),
    originalTimestamp: v.number(),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);

    const timeoutId = await ctx.db.insert('settlementTimeoutTransactions', {
      ...args,
      status: 'pending',
      detectedAt: Date.now(),
      updatedAt: Date.now(),
    });

    scheduleAuditLog(
      ctx,
      'settlementTimeoutTransactions',
      timeoutId,
      'record_timeout',
      null,
      'pending',
      args.timeoutReason
    );

    return timeoutId;
  },
});

export const resolveTimeoutTransaction = mutation({
  args: {
    timeoutId: v.id('settlementTimeoutTransactions'),
    resolution: v.union(v.literal('cancelled'), v.literal('reprocessed'), v.literal('written_off')),
    resolutionNotes: v.string(),
  },
  handler: async (ctx, { timeoutId, resolution, resolutionNotes }) => {
    await assertAdmin(ctx);

    const timeout = await ctx.db.get(timeoutId);
    if (!timeout) throw new Error('Timeout transaction not found');
    if (timeout.status !== 'pending') {
      throw new Error(`Cannot resolve timeout in status: ${timeout.status}`);
    }

    await ctx.db.patch(timeoutId, {
      status: 'resolved',
      resolution,
      resolutionNotes,
      resolvedAt: Date.now(),
      updatedAt: Date.now(),
    });

    scheduleAuditLog(
      ctx,
      'settlementTimeoutTransactions',
      timeoutId,
      'resolve_timeout',
      'pending',
      'resolved',
      `${resolution}: ${resolutionNotes}`
    );
  },
});
