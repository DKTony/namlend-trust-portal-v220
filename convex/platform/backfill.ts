/**
 * Phase 1a tenancy backfill — stamp the sole-tenant institutionId onto legacy financial-core
 * rows that predate stamp-on-write. Idempotent and batched (re-run until `remaining` is 0).
 *
 * Run BEFORE flipping `TENANCY_ENFORCEMENT` on. Owner action (data migration):
 *   npx convex run platform/backfill:backfillTenancyFinancialCore
 *
 * Safe while enforcement is off — it only fills nulls; it never moves a row between tenants.
 */

import { v } from 'convex/values';
import { Id } from '../_generated/dataModel';
import { internalMutation } from '../_generated/server';

/** All tenant-owned tables carrying an `institutionId` (financial core + Phase 1b). */
export const CORE_TABLES = [
  // Phase 1a financial core
  'loans',
  'paymentTransactions',
  'disbursements',
  'approvalRequests',
  'mandates',
  // Phase 1b — client/PII, lending child, collections, IPS, reconciliation
  'profiles',
  'kycDocuments',
  'loanDocuments',
  'loanApprovals',
  'paymentSchedules',
  'notifications',
  'notificationPreferences',
  'communicationLogs',
  'vpaRegistry',
  'consentRecords',
  'ipsApiLogs',
  'ipsTransactions',
  'collectionsInteractions',
  'promiseToPay',
  'overdueReminders',
  'complianceReports',
  'bankTransactions',
  'reconciliationRuns',
  'mandateExecutions',
] as const;

type CoreTable = (typeof CORE_TABLES)[number];

async function soleLenderInstitution(ctx: any): Promise<Id<'institutions'> | null> {
  const all = await ctx.db.query('institutions').collect();
  const lenders = all.filter((i: any) => i.type === 'lender');
  if (lenders.length === 1) return lenders[0]._id;
  if (all.length === 1) return all[0]._id;
  return null;
}

export const backfillTenancyFinancialCore = internalMutation({
  args: { batchSize: v.optional(v.number()) },
  handler: async (ctx, { batchSize }) => {
    const institutionId = await soleLenderInstitution(ctx);
    if (!institutionId) {
      return {
        ok: false,
        reason:
          'Cannot determine a sole tenant — backfill requires exactly one lender institution.',
      };
    }

    const limit = batchSize ?? 500;
    const stamped: Record<string, number> = {};
    let remaining = 0;

    for (const table of CORE_TABLES) {
      const nullRows = await ctx.db
        .query(table as CoreTable)
        .filter((q) => q.eq(q.field('institutionId'), undefined))
        .take(limit);
      for (const row of nullRows) {
        await ctx.db.patch(row._id, { institutionId });
      }
      stamped[table] = nullRows.length;
      // If we filled a full batch there may be more — signal a re-run.
      if (nullRows.length === limit) remaining += 1;
    }

    return { ok: true, institutionId, stamped, needsRerun: remaining > 0 };
  },
});
