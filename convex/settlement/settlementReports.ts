/**
 * Settlement Reports — read queries and generation mutation.
 */

import { v } from 'convex/values';
import { query, mutation } from '../_generated/server';
import { assertStaff, assertAdmin } from '../lib/auth';

export const listReportsByRun = query({
  args: { runId: v.id('settlementRuns') },
  handler: async (ctx, { runId }) => {
    await assertStaff(ctx);
    return ctx.db
      .query('settlementReports')
      .withIndex('by_runId', (q) => q.eq('runId', runId))
      .collect();
  },
});

export const getReport = query({
  args: { reportId: v.id('settlementReports') },
  handler: async (ctx, { reportId }) => {
    await assertStaff(ctx);
    return ctx.db.get(reportId);
  },
});

export const listRecentReports = query({
  args: {
    reportType: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { reportType, limit }) => {
    await assertStaff(ctx);
    let results = await ctx.db
      .query('settlementReports')
      .order('desc')
      .take(limit ?? 50);

    if (reportType) {
      results = results.filter((r) => r.reportType === reportType);
    }
    return results;
  },
});

/**
 * Create a manual report entry (admin only).
 * Automated report generation is triggered by settlementActions.ts after settlement.
 */
export const createReport = mutation({
  args: {
    runId: v.id('settlementRuns'),
    reportType: v.string(),
    reportData: v.any(),
    fileStorageId: v.optional(v.id('_storage')),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    const run = await ctx.db.get(args.runId);
    if (!run) throw new Error('Settlement run not found');

    return ctx.db.insert('settlementReports', {
      runId: args.runId,
      settlementDate: run.settlementDate,
      reportType: args.reportType,
      reportData: args.reportData,
      fileStorageId: args.fileStorageId,
      generatedAt: Date.now(),
    });
  },
});
