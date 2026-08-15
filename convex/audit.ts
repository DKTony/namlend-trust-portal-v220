/**
 * Audit & Compliance module.
 * Replaces: log_state_transition RPC, log_view_access RPC, generate_compliance_report RPC.
 *
 * Security model:
 *   writeStateTransition / writeAuditEntry → internalMutation (NOT callable from browser)
 *   getAuditLogs / getStateTransitions     → query (staff only)
 *
 * 7-year retention: no hard deletes permitted (Namibian law).
 */

import { ConvexError, v } from 'convex/values';
import { internalMutation, mutation, query } from './_generated/server';
import { assertAuthenticated, assertStaff } from './lib/auth';
import { resolveWriteInstitution } from './lib/tenancy';

// ---------------------------------------------------------------------------
// Internal writes (not callable from browser)
// ---------------------------------------------------------------------------

/**
 * Write a state transition entry.
 * Invoked via ctx.scheduler.runAfter(0, internal.audit.writeStateTransition, {...})
 */
export const writeStateTransition = internalMutation({
  args: {
    entityType: v.string(),
    entityId: v.string(),
    action: v.string(),
    fromState: v.string(),
    toState: v.string(),
    reason: v.optional(v.string()),
    triggeredBy: v.optional(v.id('users')),
    workflowInstanceId: v.optional(v.id('workflowInstances')),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('stateTransitions', {
      entityType: args.entityType,
      entityId: args.entityId,
      fromState: args.fromState,
      toState: args.toState,
      transitionReason: args.reason,
      triggeredBy: args.triggeredBy,
      workflowInstanceId: args.workflowInstanceId,
      timestamp: Date.now(),
    });
  },
});

/**
 * Write a general audit log entry.
 * Invoked via ctx.scheduler.runAfter(0, internal.audit.writeAuditEntry, {...})
 */
export const writeAuditEntry = internalMutation({
  args: {
    entityType: v.string(),
    entityId: v.string(),
    action: v.string(),
    oldState: v.optional(v.any()),
    newState: v.optional(v.any()),
    userId: v.optional(v.id('users')),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('auditLogs', {
      userId: args.userId,
      action: args.action,
      entityType: args.entityType,
      entityId: args.entityId,
      oldState: args.oldState,
      newState: args.newState,
      metadata: args.metadata,
      timestamp: Date.now(),
    });
  },
});

// ---------------------------------------------------------------------------
// View log (authenticated users log their own view events)
// ---------------------------------------------------------------------------

export const logViewAccess = mutation({
  args: {
    entityType: v.string(),
    entityId: v.string(),
    fieldsViewed: v.optional(v.array(v.string())),
    viewDurationMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);
    await ctx.db.insert('viewLogs', {
      userId,
      entityType: args.entityType,
      entityId: args.entityId,
      fieldsViewed: args.fieldsViewed,
      viewDurationMs: args.viewDurationMs,
      timestamp: Date.now(),
    });
  },
});

// ---------------------------------------------------------------------------
// Queries (staff / admin only)
// ---------------------------------------------------------------------------

export const getAuditLogs = query({
  args: {
    entityType: v.optional(v.string()),
    entityId: v.optional(v.string()),
    userId: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await assertStaff(ctx);

    let results;
    if (args.entityType && args.entityId) {
      results = await ctx.db
        .query('auditLogs')
        .withIndex('by_entityId', (q) =>
          q.eq('entityType', args.entityType!).eq('entityId', args.entityId!)
        )
        .order('desc')
        .take(args.limit ?? 100);
    } else {
      results = await ctx.db
        .query('auditLogs')
        .withIndex('by_timestamp')
        .order('desc')
        .take(args.limit ?? 100);
    }

    if (args.startDate) {
      results = results.filter((r) => r.timestamp >= args.startDate!);
    }
    if (args.endDate) {
      results = results.filter((r) => r.timestamp <= args.endDate!);
    }
    return results;
  },
});

export const getStateTransitions = query({
  args: {
    entityType: v.optional(v.string()),
    entityId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await assertStaff(ctx);

    if (args.entityType && args.entityId) {
      return ctx.db
        .query('stateTransitions')
        .withIndex('by_entityId', (q) =>
          q.eq('entityType', args.entityType!).eq('entityId', args.entityId!)
        )
        .order('desc')
        .take(args.limit ?? 100);
    }

    return ctx.db
      .query('stateTransitions')
      .order('desc')
      .take(args.limit ?? 100);
  },
});

export const getViewLogs = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await assertStaff(ctx);
    return ctx.db
      .query('viewLogs')
      .order('desc')
      .take(args.limit ?? 100);
  },
});

export const getComplianceReports = query({
  args: {
    reportType: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await assertStaff(ctx);
    let results = await ctx.db
      .query('complianceReports')
      .order('desc')
      .take(args.limit ?? 50);
    if (args.reportType) {
      results = results.filter((r) => r.reportType === args.reportType);
    }
    return results;
  },
});

export const generateComplianceReport = mutation({
  args: {
    reportType: v.union(
      v.literal('monthly_approvals'),
      v.literal('user_activity'),
      v.literal('state_changes'),
      v.literal('view_access'),
      v.literal('security_audit')
    ),
    periodStart: v.string(),
    periodEnd: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await assertStaff(ctx);

    const from = Date.parse(args.periodStart);
    const to = Date.parse(args.periodEnd);
    if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) {
      throw new ConvexError({
        code: 'VALIDATION_ERROR',
        message: 'Invalid report period.',
      });
    }
    const toInclusive = to + 86_400_000 - 1;

    let reportData: Record<string, unknown> = {};
    if (args.reportType === 'monthly_approvals') {
      const rows = await ctx.db.query('loanApprovals').take(5000);
      const inPeriod = rows.filter((r) => r.createdAt >= from && r.createdAt <= toInclusive);
      reportData = {
        total: inPeriod.length,
        approved: inPeriod.filter((r) => r.decision === 'approved').length,
        rejected: inPeriod.filter((r) => r.decision === 'rejected').length,
        pending: inPeriod.filter((r) => r.decision === 'pending').length,
      };
    } else if (args.reportType === 'user_activity') {
      const rows = await ctx.db
        .query('auditLogs')
        .withIndex('by_timestamp')
        .order('desc')
        .take(5000);
      const inPeriod = rows.filter((r) => r.timestamp >= from && r.timestamp <= toInclusive);
      reportData = {
        total: inPeriod.length,
        byAction: inPeriod.reduce<Record<string, number>>((acc, row) => {
          acc[row.action] = (acc[row.action] ?? 0) + 1;
          return acc;
        }, {}),
      };
    } else if (args.reportType === 'state_changes') {
      const rows = await ctx.db.query('stateTransitions').order('desc').take(5000);
      const inPeriod = rows.filter((r) => r.timestamp >= from && r.timestamp <= toInclusive);
      reportData = {
        total: inPeriod.length,
        byEntityType: inPeriod.reduce<Record<string, number>>((acc, row) => {
          acc[row.entityType] = (acc[row.entityType] ?? 0) + 1;
          return acc;
        }, {}),
      };
    } else if (args.reportType === 'view_access') {
      const rows = await ctx.db.query('viewLogs').order('desc').take(5000);
      const inPeriod = rows.filter((r) => r.timestamp >= from && r.timestamp <= toInclusive);
      reportData = { total: inPeriod.length };
    } else {
      const rows = await ctx.db
        .query('auditLogs')
        .withIndex('by_timestamp')
        .order('desc')
        .take(5000);
      const inPeriod = rows.filter((r) => r.timestamp >= from && r.timestamp <= toInclusive);
      reportData = {
        total: inPeriod.length,
        sensitiveActions: inPeriod.filter((r) =>
          /AUTH|LOGIN|ROLE|SECURITY|REJECT|DELETE/i.test(r.action)
        ).length,
      };
    }

    const reportId = await ctx.db.insert('complianceReports', {
      reportType: args.reportType,
      periodStart: args.periodStart,
      periodEnd: args.periodEnd,
      institutionId: await resolveWriteInstitution(ctx),
      generatedAt: Date.now(),
      generatedBy: userId,
      reportData,
      status: 'completed',
    });

    return reportId;
  },
});
