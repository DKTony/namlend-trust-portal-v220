/**
 * Settlement Runs — CRUD and read queries.
 * Write operations (state transitions) happen in settlementActions.ts.
 */

import { v } from 'convex/values';
import { query, mutation } from '../_generated/server';
import { ConvexError } from 'convex/values';
import { assertAdmin, assertStaff } from '../lib/auth';
import { settlementRunState } from '../schema';

export const listSettlementRuns = query({
  args: {
    state: v.optional(settlementRunState),
    dateFrom: v.optional(v.string()),
    dateTo: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { state, dateFrom, dateTo, limit }) => {
    await assertStaff(ctx);

    let results;
    if (state) {
      results = await ctx.db
        .query('settlementRuns')
        .withIndex('by_state', (q) => q.eq('state', state))
        .order('desc')
        .take(limit ?? 50);
    } else {
      results = await ctx.db
        .query('settlementRuns')
        .order('desc')
        .take(limit ?? 50);
    }

    if (dateFrom) {
      results = results.filter((r) => r.settlementDate >= dateFrom!);
    }
    if (dateTo) {
      results = results.filter((r) => r.settlementDate <= dateTo!);
    }
    return results;
  },
});

export const getSettlementRun = query({
  args: { runId: v.id('settlementRuns') },
  handler: async (ctx, { runId }) => {
    await assertStaff(ctx);
    return ctx.db.get(runId);
  },
});

export const getSettlementRunDetails = query({
  args: { runId: v.id('settlementRuns') },
  handler: async (ctx, { runId }) => {
    await assertStaff(ctx);
    const run = await ctx.db.get(runId);
    if (!run) return null;

    const [obligations, netInstructions, batches, exposures, acknowledgements] = await Promise.all([
      ctx.db
        .query('settlementObligations')
        .withIndex('by_runId', (q) => q.eq('runId', runId))
        .collect(),
      ctx.db
        .query('settlementNetInstructions')
        .withIndex('by_runId', (q) => q.eq('runId', runId))
        .collect(),
      ctx.db
        .query('settlementPacs009Batches')
        .withIndex('by_runId', (q) => q.eq('runId', runId))
        .collect(),
      ctx.db
        .query('settlementExposures')
        .withIndex('by_runId', (q) => q.eq('runId', runId))
        .collect(),
      ctx.db
        .query('settlementAcknowledgements')
        .collect()
        .then((all) => all.filter((a) => a.runId === runId)),
    ]);

    return { run, obligations, netInstructions, batches, exposures, acknowledgements };
  },
});

export const getSettlementStatistics = query({
  args: {
    dateFrom: v.optional(v.string()),
    dateTo: v.optional(v.string()),
  },
  handler: async (ctx, { dateFrom, dateTo }) => {
    await assertStaff(ctx);

    const runs = await ctx.db.query('settlementRuns').collect();
    const adjustments = await ctx.db.query('settlementAdjustments').collect();
    const timeouts = await ctx.db.query('settlementTimeoutTransactions').collect();

    let filtered = runs;
    if (dateFrom) filtered = filtered.filter((r) => r.settlementDate >= dateFrom);
    if (dateTo) filtered = filtered.filter((r) => r.settlementDate <= dateTo);

    return {
      runs: {
        total: filtered.length,
        settled: filtered.filter((r) => r.state === 'settled').length,
        failed: filtered.filter((r) => r.state === 'failed_validation').length,
        pending: filtered.filter(
          (r) => !['settled', 'closed', 'failed_validation'].includes(r.state)
        ).length,
      },
      totals: {
        principal: filtered.reduce((s, r) => s + r.totalPrincipal, 0),
        interchange: filtered.reduce((s, r) => s + r.totalInterchange, 0),
        switching_fee: filtered.reduce((s, r) => s + r.totalSwitchingFee, 0),
        transactions: filtered.reduce((s, r) => s + r.transactionCount, 0),
      },
      adjustments: {
        pending: adjustments.filter((a) => a.status === 'pending').length,
        approved: adjustments.filter((a) => a.status === 'approved').length,
        total_amount: adjustments.reduce((s, a) => s + a.amount, 0),
      },
      timeouts: {
        pending: timeouts.filter((t) => t.status === 'pending').length,
        resolved: timeouts.filter((t) => t.status === 'resolved').length,
      },
    };
  },
});
