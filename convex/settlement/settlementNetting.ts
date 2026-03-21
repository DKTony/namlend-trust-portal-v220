/**
 * Settlement Net Instructions — read queries.
 * Net instructions are immutable once written (written by settlementActions.ts).
 */

import { v } from 'convex/values';
import { query } from '../_generated/server';
import { assertStaff } from '../lib/auth';

export const listNetInstructionsByRun = query({
  args: { runId: v.id('settlementRuns') },
  handler: async (ctx, { runId }) => {
    await assertStaff(ctx);
    return ctx.db
      .query('settlementNetInstructions')
      .withIndex('by_runId', (q) => q.eq('runId', runId))
      .collect();
  },
});

export const getNetInstruction = query({
  args: { instructionId: v.id('settlementNetInstructions') },
  handler: async (ctx, { instructionId }) => {
    await assertStaff(ctx);
    return ctx.db.get(instructionId);
  },
});

export const getNettingMatrix = query({
  args: { runId: v.id('settlementRuns') },
  handler: async (ctx, { runId }) => {
    await assertStaff(ctx);

    const instructions = await ctx.db
      .query('settlementNetInstructions')
      .withIndex('by_runId', (q) => q.eq('runId', runId))
      .collect();

    // Build a matrix: participantId → participantId → amount
    const matrix: Record<string, Record<string, number>> = {};

    for (const inst of instructions) {
      const source = String(inst.sourceParticipantId);
      const target = String(inst.targetParticipantId);
      if (!matrix[source]) matrix[source] = {};
      matrix[source][target] = inst.amount;
    }

    return {
      instructions,
      matrix,
      totalCount: instructions.length,
      totalNetAmount: instructions.reduce((s, i) => s + i.amount, 0),
    };
  },
});
