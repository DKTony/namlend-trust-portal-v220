/**
 * Shared repayment completion routine — the single write path for applying a
 * completed payment to the schedule, the loan, and the TigerBeetle outbox.
 *
 * Used by all three money paths (staff completePayment, gateway
 * applyPaymentWebhook, IPS completeLinkedPayment) so that:
 * - splits are always DERIVED from the schedule allocation (interest-first,
 *   settlement rebate — see ./paymentAllocation), never assumed all-principal;
 * - exactly one REPAYMENT outbox entry exists per payment regardless of which
 *   path completed it (shared idempotency key `repayment:payment:{id}`);
 * - loan balance arithmetic happens in integer cents (no float === 0 payoff).
 */

import { GenericMutationCtx } from 'convex/server';
import { internal } from '../_generated/api';
import { DataModel, Doc } from '../_generated/dataModel';
import { fromCents, toCents } from './amortization';
import { scheduleAuditLog } from './audit';
import { DOMAIN_EVENTS, emitDomainEvent } from './domainEvents';
import { enqueueOutboxIdempotent } from './outbox';
import { allocateRepayment, type AllocationResult } from './paymentAllocation';
import { buildRepaymentOutboxPayloadFromCents } from './repaymentOutbox';

type MutCtx = GenericMutationCtx<DataModel>;

export interface ApplyCompletedRepaymentArgs {
  payment: Doc<'paymentTransactions'>;
  /** Fee portion in NAD; off-schedule, caller-controlled. */
  feesPaidNAD: number;
  now: number;
}

export async function applyCompletedRepayment(
  ctx: MutCtx,
  { payment, feesPaidNAD, now }: ApplyCompletedRepaymentArgs
): Promise<AllocationResult<Doc<'paymentSchedules'>['_id']>> {
  const loan = await ctx.db.get(payment.loanId);
  const rows = await ctx.db
    .query('paymentSchedules')
    .withIndex('by_loanId', (q) => q.eq('loanId', payment.loanId))
    .collect();

  const amountCents = toCents(payment.amount);
  const feeCents = Math.min(amountCents, Math.max(0, toCents(feesPaidNAD)));
  const outstandingBalanceCents = Math.max(
    0,
    toCents(loan?.outstandingBalance ?? loan?.principal ?? 0)
  );

  const result = allocateRepayment({
    rows,
    amountCents,
    feeCents,
    outstandingBalanceCents,
    now,
  });

  // 1. Apply allocations to schedule rows + allocation ledger + audit
  for (const a of result.allocations) {
    await ctx.db.patch(a.scheduleId, {
      status: a.newStatus,
      paidAmount: fromCents(a.newPaidAmountCents),
      principalPaidAmount: fromCents(a.newPrincipalPaidAmountCents),
      interestPaidAmount: fromCents(a.newInterestPaidAmountCents),
      ...(a.newStatus === 'paid' || a.newStatus === 'waived' ? { paidAt: now } : {}),
    });
    scheduleAuditLog(
      ctx,
      'paymentSchedules',
      a.scheduleId,
      a.waived ? 'WAIVE_REBATE' : a.newStatus === 'paid' ? 'MARK_PAID' : 'MARK_PARTIALLY_PAID',
      a.previousStatus,
      a.newStatus
    );
    await ctx.db.insert('paymentAllocations', {
      paymentId: payment._id,
      scheduleId: a.scheduleId,
      loanId: payment.loanId,
      institutionId: loan?.institutionId,
      principalCents: a.principalCents,
      interestCents: a.interestCents,
      waived: a.waived || undefined,
      createdAt: now,
    });
  }

  // 1b. Principal retired directly against the loan (no schedule row) is
  // recorded in the allocation ledger too, so reversals stay cent-exact.
  if (result.directPrincipalCents > 0) {
    await ctx.db.insert('paymentAllocations', {
      paymentId: payment._id,
      loanId: payment.loanId,
      institutionId: loan?.institutionId,
      principalCents: result.directPrincipalCents,
      interestCents: 0,
      createdAt: now,
    });
  }

  // 2. Complete the payment with the DERIVED split (D4)
  const metadata =
    result.totals.surplusCents > 0
      ? {
          ...((payment.metadata as Record<string, unknown>) ?? {}),
          unallocatedCents: result.totals.surplusCents,
        }
      : undefined;
  await ctx.db.patch(payment._id, {
    status: 'completed',
    principalPaid: fromCents(result.totals.principalCents),
    interestPaid: fromCents(result.totals.interestCents),
    feesPaid: fromCents(result.totals.feeCents),
    paymentDate: payment.paymentDate ?? now,
    updatedAt: now,
    ...(metadata ? { metadata } : {}),
  });
  if (result.totals.surplusCents > 0) {
    // Overpayment beyond the payoff quote: excluded from ledger transfers,
    // flagged for a manual refund decision (never silently absorbed).
    scheduleAuditLog(ctx, 'payment', payment._id, 'OVERPAYMENT_SURPLUS', 'completed', 'completed');
  }

  // 3. Exactly one REPAYMENT ledger entry per payment across all paths
  await enqueueOutboxIdempotent(ctx, {
    idempotencyKey: `repayment:payment:${payment._id}`,
    eventType: 'REPAYMENT',
    sourceTable: 'paymentTransactions',
    sourceId: payment._id,
    payload: buildRepaymentOutboxPayloadFromCents({
      loanId: payment.loanId,
      paymentId: payment._id,
      amountCents,
      principalCents: result.totals.principalCents,
      interestCents: result.totals.interestCents,
      feeCents: result.totals.feeCents,
      surplusCents: result.totals.surplusCents,
    }),
  });

  // 4. Loan update — all arithmetic in cents
  if (loan) {
    const updates: Record<string, unknown> = {
      outstandingBalance: fromCents(result.newLoanBalanceCents),
      totalPaid: fromCents(toCents(loan.totalPaid ?? 0) + amountCents),
      updatedAt: now,
    };
    if (result.paidOff && loan.status !== 'paid_off') {
      updates.status = 'paid_off';
      updates.completedAt = now;
      scheduleAuditLog(ctx, 'loan', payment.loanId, 'PAID_OFF', loan.status, 'paid_off');
      emitDomainEvent(ctx, DOMAIN_EVENTS.LOAN_PAID_OFF, 'loans', payment.loanId, {
        loanId: payment.loanId,
        paymentId: payment._id,
      });
      ctx.scheduler
        .runAfter(0, internal.notifications.createNotification, {
          userId: loan.userId,
          title: 'Loan Fully Repaid',
          message:
            'Congratulations! Your loan has been completely paid off. Thank you for your timely repayments.',
          category: 'payment' as const,
          priority: 'high' as const,
          actionUrl: `/loans/${payment.loanId}`,
          actionLabel: 'View Loan',
        })
        .catch((err: unknown) => console.error('[notification] paid_off notify failed:', err));
    } else if (!result.paidOff && loan.status === 'funded') {
      updates.status = 'active';
      ctx.scheduler
        .runAfter(0, internal.notifications.createNotification, {
          userId: loan.userId,
          title: 'Loan Account Active',
          message: 'Your loan account is now active. Your regular monthly repayments have begun.',
          category: 'loan' as const,
          priority: 'normal' as const,
          actionUrl: `/loans/${payment.loanId}`,
          actionLabel: 'View Loan',
        })
        .catch((err: unknown) => console.error('[notification] funded→active notify failed:', err));
    }
    await ctx.db.patch(payment.loanId, updates);
  }

  return result;
}
