/**
 * Settlement Pacs.009 Batches — read queries.
 * Batches are append-only once written (written by settlementActions.ts).
 */

import { v } from 'convex/values';
import { query } from '../_generated/server';
import { assertStaff } from '../lib/auth';

export const listBatchesByRun = query({
  args: { runId: v.id('settlementRuns') },
  handler: async (ctx, { runId }) => {
    await assertStaff(ctx);
    return ctx.db
      .query('settlementPacs009Batches')
      .withIndex('by_runId', (q) => q.eq('runId', runId))
      .collect();
  },
});

export const getBatch = query({
  args: { batchId: v.id('settlementPacs009Batches') },
  handler: async (ctx, { batchId }) => {
    await assertStaff(ctx);
    return ctx.db.get(batchId);
  },
});

export const getBatchXml = query({
  args: { batchId: v.id('settlementPacs009Batches') },
  handler: async (ctx, { batchId }) => {
    await assertStaff(ctx);
    const batch = await ctx.db.get(batchId);
    if (!batch) return null;
    // Return just the XML content for display/download
    return {
      batchId,
      batchType: batch.batchType,
      xmlContent: batch.fileContent,
      instructionCount: batch.instructionCount,
      totalAmount: batch.totalAmount,
      generatedAt: batch.createdAt,
    };
  },
});
