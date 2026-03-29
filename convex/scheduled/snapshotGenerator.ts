/**
 * End-of-day snapshot generator — cron handler.
 *
 * Runs daily at 23:30 UTC to capture the portfolio state before midnight.
 * Delegates to the internal generatePortfolioSnapshot mutation.
 */

import { internalAction } from '../_generated/server';
import { internal } from '../_generated/api';

/**
 * Generate end-of-day portfolio snapshot.
 * Called by crons.ts daily at 23:30 UTC.
 */
export const generateEndOfDaySnapshot = internalAction({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toISOString().slice(0, 10);

    await ctx.runMutation(internal.ontology.snapshots.generatePortfolioSnapshot, {
      snapshotType: 'end_of_day',
      snapshotDate: today,
    });

    console.log(`[snapshot] End-of-day snapshot generated for ${today}`);
  },
});
