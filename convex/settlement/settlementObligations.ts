/**
 * Settlement Obligations — read queries.
 * Obligations and exposures are immutable once written (written by settlementActions.ts).
 */

import { v } from 'convex/values';
import { query } from '../_generated/server';
import { assertStaff } from '../lib/auth';

export const listObligationsByRun = query({
  args: { runId: v.id('settlementRuns') },
  handler: async (ctx, { runId }) => {
    await assertStaff(ctx);
    return ctx.db
      .query('settlementObligations')
      .withIndex('by_runId', (q: any) => q.eq('runId', runId))
      .collect();
  },
});

export const getObligation = query({
  args: { obligationId: v.id('settlementObligations') },
  handler: async (ctx, { obligationId }) => {
    await assertStaff(ctx);
    return ctx.db.get(obligationId);
  },
});

export const listExposuresByRun = query({
  args: { runId: v.id('settlementRuns') },
  handler: async (ctx, { runId }) => {
    await assertStaff(ctx);
    return ctx.db
      .query('settlementExposures')
      .withIndex('by_runId', (q: any) => q.eq('runId', runId))
      .collect();
  },
});

export const listExposuresByParticipant = query({
  args: {
    runId: v.id('settlementRuns'),
    participantId: v.id('settlementParticipants'),
  },
  handler: async (ctx, { runId, participantId }) => {
    await assertStaff(ctx);
    const all = await ctx.db
      .query('settlementExposures')
      .withIndex('by_runId', (q: any) => q.eq('runId', runId))
      .collect();
    return all.filter(
      (e: any) =>
        e.debtorParticipantId === participantId || e.creditorParticipantId === participantId
    );
  },
});
