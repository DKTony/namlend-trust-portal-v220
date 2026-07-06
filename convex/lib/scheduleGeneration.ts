/**
 * Payment-schedule generation — shared by completeDisbursement, the
 * backfill mutation, and the E2E seed.
 *
 * Idempotent by design: a loan that already has schedule rows is never
 * regenerated (schedules are financial records — no deletes, no rewrites).
 * Audit/domain-event emission stays with the calling mutation so each caller
 * can attach its own action context.
 */

import { GenericMutationCtx } from 'convex/server';
import { DataModel, Doc } from '../_generated/dataModel';
import { generatePaymentSchedule } from './amortization';

type MutCtx = GenericMutationCtx<DataModel>;

/**
 * Generate and insert `paymentSchedules` rows for a loan, unless rows already
 * exist. First installment falls one month after `disbursementDate`.
 *
 * @returns number of rows inserted (0 when the schedule already existed)
 */
export async function ensurePaymentSchedule(
  ctx: MutCtx,
  loan: Doc<'loans'>,
  disbursementDate: number
): Promise<number> {
  const existing = await ctx.db
    .query('paymentSchedules')
    .withIndex('by_loanId', (q) => q.eq('loanId', loan._id))
    .first();
  if (existing) return 0;

  const entries = generatePaymentSchedule(
    loan.principal,
    loan.interestRate,
    loan.termMonths,
    new Date(disbursementDate)
  );

  const now = Date.now();
  for (const entry of entries) {
    await ctx.db.insert('paymentSchedules', {
      loanId: loan._id,
      institutionId: loan.institutionId,
      installmentNumber: entry.installmentNumber,
      dueDate: entry.dueDate,
      principalDue: entry.principalDue,
      interestDue: entry.interestDue,
      totalDue: entry.totalDue,
      status: 'scheduled',
      createdAt: now,
    });
  }
  return entries.length;
}
