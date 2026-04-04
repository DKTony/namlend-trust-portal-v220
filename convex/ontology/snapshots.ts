/**
 * Snapshots — regulatory point-in-time captures.
 *
 * Ontology: Projection primitive — derived, queryable views of state at a point in time.
 * Immutable once created. Powers "show me the portfolio as of date X" queries.
 *
 * Security model:
 *   generateSnapshot → internalMutation (called by cron or admin)
 *   queries             - staff-only
 */

import { v } from 'convex/values';
import { internalMutation, mutation, query } from '../_generated/server';
import { internal } from '../_generated/api';
import { assertStaff } from '../lib/auth';
import { snapshotType } from '../schema';
import { toSnapshotDate } from '../lib/temporal';

// ---------------------------------------------------------------------------
// Internal writes (called by cron or system)
// ---------------------------------------------------------------------------

/**
 * Generate a portfolio snapshot — captures aggregate lending portfolio state.
 * Called by the end-of-day cron job.
 */
export const generatePortfolioSnapshot = internalMutation({
  args: {
    snapshotType: snapshotType,
    snapshotDate: v.string(),
  },
  handler: async (ctx, args) => {
    // Aggregate portfolio metrics from loans table
    const allLoans = await ctx.db.query('loans').take(10000);

    const activeStatuses = ['active', 'disbursed', 'funded'];
    const activeLoans = allLoans.filter((l) => activeStatuses.includes(l.status));

    const totalPortfolio = activeLoans.reduce((sum, l) => sum + l.principal, 0);
    const totalOutstanding = activeLoans.reduce(
      (sum, l) => sum + (l.outstandingBalance ?? l.principal),
      0
    );
    const totalPaid = allLoans.reduce((sum, l) => sum + (l.totalPaid ?? 0), 0);

    const statusCounts: Record<string, number> = {};
    for (const loan of allLoans) {
      statusCounts[loan.status] = (statusCounts[loan.status] ?? 0) + 1;
    }

    const snapshotData = {
      totalLoans: allLoans.length,
      activeLoans: activeLoans.length,
      totalPortfolio,
      totalOutstanding,
      totalPaid,
      statusCounts,
      avgLoanSize: activeLoans.length > 0 ? totalPortfolio / activeLoans.length : 0,
      defaultRate:
        allLoans.length > 0 ? ((statusCounts['defaulted'] ?? 0) / allLoans.length) * 100 : 0,
    };

    await ctx.db.insert('snapshots', {
      snapshotType: args.snapshotType,
      snapshotDate: args.snapshotDate,
      entityType: 'portfolio',
      data: snapshotData,
      generatedAt: Date.now(),
      metadata: { source: 'eod-snapshot-cron' },
    });

    return snapshotData;
  },
});

// ---------------------------------------------------------------------------
// Admin: manual snapshot trigger
// ---------------------------------------------------------------------------

/**
 * Trigger an ad-hoc snapshot (admin only).
 * Delegates to the internal mutation via scheduler.
 */
export const triggerAdHocSnapshot = mutation({
  args: {},
  handler: async (ctx) => {
    await assertStaff(ctx);
    const today = toSnapshotDate(Date.now());

    await ctx.scheduler.runAfter(0, internal.ontology.snapshots.generatePortfolioSnapshot, {
      snapshotType: 'ad_hoc' as const,
      snapshotDate: today,
    });

    return { scheduled: true, snapshotDate: today };
  },
});

// ---------------------------------------------------------------------------
// Queries (staff only)
// ---------------------------------------------------------------------------

/**
 * Get snapshots for a specific date range.
 */
export const getSnapshotsByDateRange = query({
  args: {
    fromDate: v.string(),
    toDate: v.string(),
    snapshotType: v.optional(snapshotType),
  },
  handler: async (ctx, { fromDate, toDate, snapshotType: sType }) => {
    await assertStaff(ctx);

    let results;
    if (sType) {
      results = await ctx.db
        .query('snapshots')
        .withIndex('by_type_date', (q) =>
          q.eq('snapshotType', sType).gte('snapshotDate', fromDate).lte('snapshotDate', toDate)
        )
        .collect();
    } else {
      results = await ctx.db
        .query('snapshots')
        .withIndex('by_date')
        .filter((q) =>
          q.and(q.gte(q.field('snapshotDate'), fromDate), q.lte(q.field('snapshotDate'), toDate))
        )
        .collect();
    }

    return results;
  },
});

/**
 * Get the latest snapshot of a given type.
 */
export const getLatestSnapshot = query({
  args: {
    snapshotType: snapshotType,
    entityType: v.optional(v.string()),
  },
  handler: async (ctx, { snapshotType: sType, entityType }) => {
    await assertStaff(ctx);

    const results = await ctx.db
      .query('snapshots')
      .withIndex('by_type_date', (q) => q.eq('snapshotType', sType))
      .order('desc')
      .take(10);

    if (entityType) {
      return results.find((s) => s.entityType === entityType) ?? null;
    }

    return results[0] ?? null;
  },
});

/**
 * Get all snapshots for a specific entity.
 */
export const getEntitySnapshots = query({
  args: {
    entityType: v.string(),
    entityId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { entityType, entityId, limit }) => {
    await assertStaff(ctx);

    if (entityId) {
      return ctx.db
        .query('snapshots')
        .withIndex('by_entity', (q) => q.eq('entityType', entityType).eq('entityId', entityId))
        .order('desc')
        .take(limit ?? 30);
    }

    return ctx.db
      .query('snapshots')
      .withIndex('by_entity', (q) => q.eq('entityType', entityType))
      .order('desc')
      .take(limit ?? 30);
  },
});
