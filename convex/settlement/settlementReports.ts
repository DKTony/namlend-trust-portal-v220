/**
 * Settlement Reports — read queries and generation mutation.
 */

import { v } from 'convex/values';
import { mutation, query } from '../_generated/server';
import { assertAdmin, assertStaff } from '../lib/auth';

const settlementReportType = v.union(
  v.literal('raw_data'),
  v.literal('ntsl'),
  v.literal('adjustment'),
  v.literal('pending_adjustment_response'),
  v.literal('pending_status'),
  v.literal('timeout')
);

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
    reportType: settlementReportType,
    reportData: v.any(),
    fileName: v.optional(v.string()),
    fileContent: v.optional(v.string()),
    fileChecksum: v.optional(v.string()),
    fileSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    const run = await ctx.db.get(args.runId);
    if (!run) throw new Error('Settlement run not found');

    return ctx.db.insert('settlementReports', {
      runId: args.runId,
      reportType: args.reportType,
      reportData: args.reportData,
      fileName: args.fileName ?? `${args.reportType}-${run.settlementDate}.json`,
      fileContent: args.fileContent,
      fileChecksum: args.fileChecksum,
      fileSize: args.fileSize,
      createdAt: Date.now(),
    });
  },
});
