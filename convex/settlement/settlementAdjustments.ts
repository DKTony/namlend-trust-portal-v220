/**
 * Settlement Adjustments — manual corrections to settlement figures.
 * Require admin approval; all state changes audited.
 */

import { v } from 'convex/values';
import { query, mutation } from '../_generated/server';
import { assertAdmin, assertStaff } from '../lib/auth';
import { scheduleAuditLog } from '../lib/audit';

export const listAdjustmentsByRun = query({
  args: { runId: v.id('settlementRuns') },
  handler: async (ctx, { runId }) => {
    await assertStaff(ctx);
    return ctx.db
      .query('settlementAdjustments')
      .withIndex('by_runId', (q: any) => q.eq('runId', runId))
      .collect();
  },
});

export const listPendingAdjustments = query({
  args: {},
  handler: async (ctx) => {
    await assertStaff(ctx);
    return ctx.db
      .query('settlementAdjustments')
      .withIndex('by_status', (q: any) => q.eq('status', 'pending'))
      .collect();
  },
});

export const getAdjustment = query({
  args: { adjustmentId: v.id('settlementAdjustments') },
  handler: async (ctx, { adjustmentId }) => {
    await assertStaff(ctx);
    return ctx.db.get(adjustmentId);
  },
});

export const createAdjustment = mutation({
  args: {
    runId: v.id('settlementRuns'),
    participantId: v.id('settlementParticipants'),
    adjustmentType: v.union(v.literal('debit'), v.literal('credit')),
    amount: v.number(),
    reason: v.string(),
    referenceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);

    if (args.amount <= 0) {
      throw new Error('Adjustment amount must be positive');
    }

    const adjustmentId = await ctx.db.insert('settlementAdjustments', {
      ...args,
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    scheduleAuditLog(
      ctx,
      'settlementAdjustments',
      adjustmentId,
      'create_adjustment',
      null,
      'pending',
      args.reason
    );

    return adjustmentId;
  },
});

export const approveAdjustment = mutation({
  args: {
    adjustmentId: v.id('settlementAdjustments'),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { adjustmentId, notes }) => {
    await assertAdmin(ctx);

    const adj = await ctx.db.get(adjustmentId);
    if (!adj) throw new Error('Adjustment not found');
    if (adj.status !== 'pending') {
      throw new Error(`Cannot approve adjustment in status: ${adj.status}`);
    }

    await ctx.db.patch(adjustmentId, {
      status: 'approved',
      approvedAt: Date.now(),
      notes,
      updatedAt: Date.now(),
    });

    scheduleAuditLog(
      ctx,
      'settlementAdjustments',
      adjustmentId,
      'approve_adjustment',
      'pending',
      'approved',
      notes
    );
  },
});

export const rejectAdjustment = mutation({
  args: {
    adjustmentId: v.id('settlementAdjustments'),
    reason: v.string(),
  },
  handler: async (ctx, { adjustmentId, reason }) => {
    await assertAdmin(ctx);

    const adj = await ctx.db.get(adjustmentId);
    if (!adj) throw new Error('Adjustment not found');
    if (adj.status !== 'pending') {
      throw new Error(`Cannot reject adjustment in status: ${adj.status}`);
    }

    await ctx.db.patch(adjustmentId, {
      status: 'rejected',
      notes: reason,
      updatedAt: Date.now(),
    });

    scheduleAuditLog(
      ctx,
      'settlementAdjustments',
      adjustmentId,
      'reject_adjustment',
      'pending',
      'rejected',
      reason
    );
  },
});
