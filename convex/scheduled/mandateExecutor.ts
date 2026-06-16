/**
 * Mandate Executor — cron handler for processing due mandates.
 *
 * Runs daily at 06:00 UTC to:
 *   1. Find all active mandates with nextExecutionDate <= now
 *   2. Expire mandates past their expiresAt date
 *   3. Execute debit for each due mandate
 *
 * This is the "hard path" for collections — automatic debit execution.
 * The "soft path" (reminders, PTP) in collections.ts continues to coexist.
 */

import { internal } from '../_generated/api';
import { internalAction } from '../_generated/server';

/**
 * Process all due mandates.
 * Called by crons.ts daily at 06:00 UTC.
 */
export const processDueMandates = internalAction({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // KILL-SWITCH: mandate auto-debit is disabled until the execution lifecycle
    // (completion-driven ledger posting) is fully modeled and tested. Defaults OFF.
    // Re-enable by seeding businessRule MANDATE_AUTODEBIT_ENABLED=true.
    const autoDebitEnabled = await ctx.runQuery(internal.lib.ruleEvaluator.getBooleanRuleQuery, {
      ruleCode: 'MANDATE_AUTODEBIT_ENABLED',
      fallback: false,
    });
    if (!autoDebitEnabled) {
      console.log(
        '[mandate-executor] Auto-debit disabled (MANDATE_AUTODEBIT_ENABLED=false). Skipping.'
      );
      return;
    }

    // Step 1: Find and expire mandates past their expiry date
    const activeMandates = await ctx.runQuery(
      internal.ontology.mandateExecutions.getActiveMandatesInternal,
      {}
    );

    let expiredCount = 0;
    let executedCount = 0;
    let failedCount = 0;

    for (const mandate of activeMandates) {
      // Check expiry
      if (mandate.expiresAt && mandate.expiresAt <= now) {
        await ctx.runMutation(internal.ontology.mandates.expireMandate, {
          mandateId: mandate._id,
        });
        expiredCount++;
        continue;
      }

      // Check if due for execution
      if (
        mandate.nextExecutionDate !== undefined &&
        mandate.nextExecutionDate <= now &&
        mandate.loanId // Can only execute if linked to a loan
      ) {
        try {
          const result = await ctx.runMutation(
            internal.ontology.mandateExecutions.executeMandateDebit,
            { mandateId: mandate._id }
          );
          if (result) {
            executedCount++;
          }
        } catch (err) {
          console.error(`[mandate-executor] Failed to execute mandate ${mandate.mandateRef}:`, err);
          failedCount++;
        }
      }
    }

    console.log(
      `[mandate-executor] Processed: ${executedCount} executed, ${expiredCount} expired, ${failedCount} failed`
    );
  },
});
