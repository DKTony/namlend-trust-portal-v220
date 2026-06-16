/**
 * Settlement Adjustments — manual corrections to settlement figures.
 * Require admin approval; all state changes audited.
 */

import { ConvexError, v } from 'convex/values';
import { internalMutation, internalQuery, mutation, query } from '../_generated/server';
import { scheduleAuditLog } from '../lib/audit';
import { assertAdmin, assertStaff } from '../lib/auth';

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

export const listAdjustmentsByStatus = query({
  args: { status: v.string() },
  handler: async (ctx, { status }) => {
    await assertStaff(ctx);
    return ctx.db
      .query('settlementAdjustments')
      .withIndex('by_status', (q: any) => q.eq('status', status))
      .order('desc')
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
    runId: v.optional(v.id('settlementRuns')),
    originalTxId: v.optional(v.id('ipsTransactions')),
    adjustmentType: v.string(),
    sourceParticipantId: v.id('settlementParticipants'),
    targetParticipantId: v.id('settlementParticipants'),
    amount: v.number(),
    currency: v.optional(v.string()),
    reasonCode: v.optional(v.string()),
    reasonDescription: v.optional(v.string()),
    responseRequiredBy: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const staffId = await assertAdmin(ctx);

    if (args.amount <= 0) {
      throw new ConvexError({
        code: 'VALIDATION_ERROR',
        message: 'Adjustment amount must be positive.',
      });
    }
    if (args.sourceParticipantId === args.targetParticipantId) {
      throw new ConvexError({
        code: 'VALIDATION_ERROR',
        message: 'Adjustment source and target participants must differ.',
      });
    }

    const now = Date.now();
    const adjustmentId = await ctx.db.insert('settlementAdjustments', {
      ...args,
      currency: args.currency ?? 'NAD',
      status: 'pending',
      createdBy: staffId,
      createdAt: now,
      updatedAt: now,
    });

    scheduleAuditLog(
      ctx,
      'settlementAdjustments',
      adjustmentId,
      'create_adjustment',
      'none',
      'pending',
      args.reasonDescription
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
    if (!adj) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Adjustment not found.' });
    }
    if (adj.status !== 'pending') {
      throw new ConvexError({
        code: 'INVALID_STATE',
        message: `Cannot approve adjustment in status '${adj.status}'.`,
      });
    }

    const now = Date.now();
    await ctx.db.patch(adjustmentId, {
      status: 'approved',
      respondedAt: now,
      responseNotes: notes,
      updatedAt: now,
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
    if (!adj) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Adjustment not found.' });
    }
    if (adj.status !== 'pending') {
      throw new ConvexError({
        code: 'INVALID_STATE',
        message: `Cannot reject adjustment in status '${adj.status}'.`,
      });
    }

    const now = Date.now();
    await ctx.db.patch(adjustmentId, {
      status: 'rejected',
      respondedAt: now,
      responseNotes: reason,
      updatedAt: now,
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

export const listApprovedAdjustmentsInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query('settlementAdjustments')
      .withIndex('by_status', (q: any) => q.eq('status', 'approved'))
      .collect();
    return rows.filter((row) => !row.settledInRunId);
  },
});

export const listPendingAdjustmentResponsesInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    return ctx.db
      .query('settlementAdjustments')
      .withIndex('by_status', (q: any) => q.eq('status', 'pending'))
      .collect();
  },
});

export const markAdjustmentsSettledInternal = internalMutation({
  args: {
    runId: v.id('settlementRuns'),
    adjustmentIds: v.array(v.id('settlementAdjustments')),
  },
  handler: async (ctx, { runId, adjustmentIds }) => {
    const now = Date.now();
    for (const adjustmentId of adjustmentIds) {
      const adjustment = await ctx.db.get(adjustmentId);
      if (!adjustment || adjustment.status !== 'approved' || adjustment.settledInRunId) continue;

      await ctx.db.patch(adjustmentId, {
        status: 'settled',
        settledInRunId: runId,
        updatedAt: now,
      });

      scheduleAuditLog(
        ctx,
        'settlementAdjustments',
        adjustmentId,
        'settle_adjustment',
        'approved',
        'settled',
        `Included in settlement run ${runId}`
      );
    }
  },
});
