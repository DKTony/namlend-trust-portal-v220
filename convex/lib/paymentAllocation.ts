/**
 * Payment allocation engine — the single source of truth for how repayment
 * cents are applied to a loan's amortization schedule.
 *
 * Pure module (no ctx, no db): callers load schedule rows and persist the
 * returned allocations. All arithmetic is integer cents; every function
 * asserts its own conservation invariant so a cent can never appear or
 * vanish between the payment, the schedule, the loan balance, and the
 * TigerBeetle transfer legs derived from the result.
 *
 * Policy (see plan D2):
 * - NORMAL mode (net payment < payoff quote): walk unsettled installments in
 *   order; within each, allocate remaining INTEREST first, then remaining
 *   principal. Rows become 'paid' when fully covered, else 'partially_paid'.
 * - SETTLEMENT mode (net payment >= payoff quote): cover interest already due,
 *   then retire all outstanding principal oldest-first; installments made
 *   redundant by early principal retirement are 'waived' (unearned-interest
 *   rebate — consistent with the reducing-balance model in ./amortization).
 */

import { fromCents, toCents } from './amortization';

export type PaymentScheduleStatusValue =
  | 'scheduled'
  | 'paid'
  | 'partially_paid'
  | 'overdue'
  | 'waived';

/** Structural row type so the module stays pure/testable (Doc<'paymentSchedules'> satisfies it). */
export interface ScheduleRowLike<Id = string> {
  _id: Id;
  installmentNumber: number;
  dueDate: number;
  principalDue: number;
  interestDue: number;
  totalDue: number;
  paidAmount?: number;
  principalPaidAmount?: number;
  interestPaidAmount?: number;
  status: PaymentScheduleStatusValue;
}

export interface RowAllocation<Id = string> {
  scheduleId: Id;
  installmentNumber: number;
  /** Cents of this payment applied to the row's principal. */
  principalCents: number;
  /** Cents of this payment applied to the row's interest. */
  interestCents: number;
  /** Cumulative paid amount on the row after this payment (cents). */
  newPaidAmountCents: number;
  newPrincipalPaidAmountCents: number;
  newInterestPaidAmountCents: number;
  newStatus: PaymentScheduleStatusValue;
  /** True when the remaining obligation on this row was rebated (settlement). */
  waived: boolean;
  previousStatus: PaymentScheduleStatusValue;
}

export interface AllocationResult<Id = string> {
  allocations: RowAllocation<Id>[];
  totals: {
    principalCents: number;
    interestCents: number;
    feeCents: number;
    /** Cents that could not be applied anywhere (overpayment beyond payoff). */
    surplusCents: number;
  };
  /**
   * Principal retired directly against the loan balance without a schedule
   * row — loans with missing/exhausted schedules (e.g. externally disbursed
   * or legacy loans). Included in totals.principalCents.
   */
  directPrincipalCents: number;
  settlementMode: boolean;
  newLoanBalanceCents: number;
  paidOff: boolean;
}

const UNSETTLED: PaymentScheduleStatusValue[] = ['scheduled', 'overdue', 'partially_paid'];

/**
 * Split a row's cumulative paidAmount into principal/interest cents.
 * Uses the stored decomposition when present; legacy rows (written before the
 * decomposition fields existed) fall back to interest-first.
 */
export function decomposePaidAmount(row: ScheduleRowLike<unknown>): {
  principalPaidCents: number;
  interestPaidCents: number;
} {
  if (row.principalPaidAmount != null || row.interestPaidAmount != null) {
    return {
      principalPaidCents: toCents(row.principalPaidAmount ?? 0),
      interestPaidCents: toCents(row.interestPaidAmount ?? 0),
    };
  }
  const paidCents = toCents(row.paidAmount ?? 0);
  const interestPaidCents = Math.min(paidCents, toCents(row.interestDue));
  return { principalPaidCents: paidCents - interestPaidCents, interestPaidCents };
}

function isDue(row: ScheduleRowLike<unknown>, now: number): boolean {
  return row.dueDate <= now || row.status === 'overdue' || row.status === 'partially_paid';
}

/**
 * Full-settlement quote in cents: outstanding principal plus unpaid interest
 * on installments that are already due (or partially paid). Unearned interest
 * on future installments is excluded — it gets rebated on early settlement.
 */
export function computePayoffQuoteCents(
  rows: ScheduleRowLike<unknown>[],
  outstandingBalanceNAD: number,
  now: number
): number {
  let quoteCents = Math.max(0, toCents(outstandingBalanceNAD));
  for (const row of rows) {
    if (!UNSETTLED.includes(row.status)) continue;
    if (!isDue(row, now)) continue;
    const { interestPaidCents } = decomposePaidAmount(row);
    quoteCents += Math.max(0, toCents(row.interestDue) - interestPaidCents);
  }
  return quoteCents;
}

/** Convenience NAD wrapper for UI consumers. */
export function computePayoffQuoteNAD(
  rows: ScheduleRowLike<unknown>[],
  outstandingBalanceNAD: number,
  now: number
): number {
  return fromCents(computePayoffQuoteCents(rows, outstandingBalanceNAD, now));
}

export interface AllocateRepaymentInput<Id> {
  rows: ScheduleRowLike<Id>[];
  /** Full payment amount in cents (including fees). */
  amountCents: number;
  /** Fee portion in cents — off-schedule, deducted off the top. */
  feeCents: number;
  /** Loan outstanding (principal) balance in cents. */
  outstandingBalanceCents: number;
  now: number;
}

export function allocateRepayment<Id>(input: AllocateRepaymentInput<Id>): AllocationResult<Id> {
  const { rows, amountCents, feeCents, outstandingBalanceCents, now } = input;
  if (!Number.isInteger(amountCents) || !Number.isInteger(feeCents)) {
    throw new Error('allocateRepayment requires integer cent amounts');
  }
  if (feeCents < 0 || amountCents < 0 || feeCents > amountCents) {
    throw new Error(`Invalid amounts: amountCents=${amountCents} feeCents=${feeCents}`);
  }

  const netCents = amountCents - feeCents;
  const unsettled = rows
    .filter((r) => UNSETTLED.includes(r.status))
    .sort((a, b) => a.installmentNumber - b.installmentNumber);

  const quoteCents = computePayoffQuoteCents(rows, fromCents(outstandingBalanceCents), now);
  const settlementMode = quoteCents > 0 && netCents >= quoteCents;

  // Working state per row
  const work = unsettled.map((row) => {
    const d = decomposePaidAmount(row);
    return {
      row,
      interestOutstanding: Math.max(0, toCents(row.interestDue) - d.interestPaidCents),
      principalOutstanding: Math.max(0, toCents(row.principalDue) - d.principalPaidCents),
      principalPaidCents: d.principalPaidCents,
      interestPaidCents: d.interestPaidCents,
      interestAlloc: 0,
      principalAlloc: 0,
      waived: false,
    };
  });

  let remaining = netCents;
  // Total principal applied is capped by the loan's outstanding balance so the
  // loan record and the schedule can never disagree about principal retired.
  let principalBudget = Math.max(0, outstandingBalanceCents);

  if (settlementMode) {
    // 1. Interest already due (in installment order)
    for (const w of work) {
      if (remaining <= 0) break;
      if (!isDue(w.row, now)) continue;
      const alloc = Math.min(remaining, w.interestOutstanding);
      w.interestAlloc += alloc;
      remaining -= alloc;
    }
    // 2. Retire all outstanding principal oldest-first
    for (const w of work) {
      if (remaining <= 0 || principalBudget <= 0) break;
      const alloc = Math.min(remaining, principalBudget, w.principalOutstanding);
      w.principalAlloc += alloc;
      remaining -= alloc;
      principalBudget -= alloc;
    }
    // 3. Any row not fully covered is extinguished by the settlement — waive
    //    the remaining obligation (unearned-interest rebate / residual).
    for (const w of work) {
      const fullyCovered =
        w.interestAlloc >= w.interestOutstanding && w.principalAlloc >= w.principalOutstanding;
      if (!fullyCovered) w.waived = true;
    }
  } else {
    // Normal: interest-first within each installment, in order.
    for (const w of work) {
      if (remaining <= 0) break;
      const interestAlloc = Math.min(remaining, w.interestOutstanding);
      w.interestAlloc += interestAlloc;
      remaining -= interestAlloc;

      const principalAlloc = Math.min(remaining, principalBudget, w.principalOutstanding);
      w.principalAlloc += principalAlloc;
      remaining -= principalAlloc;
      principalBudget -= principalAlloc;
    }
  }

  // Catch-all: retire remaining cents directly against the loan balance when
  // schedule rows are missing or exhausted (externally disbursed / legacy
  // loans, or drift between schedule and balance). Without this, a legitimate
  // repayment on a schedule-less loan would be misclassified as surplus and
  // post nothing to the ledger.
  let directPrincipalCents = 0;
  if (remaining > 0 && principalBudget > 0) {
    directPrincipalCents = Math.min(remaining, principalBudget);
    remaining -= directPrincipalCents;
    principalBudget -= directPrincipalCents;
  }

  const allocations: RowAllocation<Id>[] = [];
  let principalTotal = directPrincipalCents;
  let interestTotal = 0;

  for (const w of work) {
    const applied = w.interestAlloc + w.principalAlloc;
    if (applied === 0 && !w.waived) continue;

    principalTotal += w.principalAlloc;
    interestTotal += w.interestAlloc;

    const newPaidAmountCents = toCents(w.row.paidAmount ?? 0) + applied;
    const newPrincipalPaidAmountCents = w.principalPaidCents + w.principalAlloc;
    const newInterestPaidAmountCents = w.interestPaidCents + w.interestAlloc;

    let newStatus: PaymentScheduleStatusValue;
    if (w.waived) {
      newStatus = 'waived';
    } else if (newPaidAmountCents >= toCents(w.row.totalDue)) {
      newStatus = 'paid';
    } else {
      newStatus = 'partially_paid';
    }

    allocations.push({
      scheduleId: w.row._id,
      installmentNumber: w.row.installmentNumber,
      principalCents: w.principalAlloc,
      interestCents: w.interestAlloc,
      newPaidAmountCents,
      newPrincipalPaidAmountCents,
      newInterestPaidAmountCents,
      newStatus,
      waived: w.waived,
      previousStatus: w.row.status,
    });
  }

  // In settlement mode every cent beyond due interest goes to principal, so
  // the loan is retired even when schedule rows carry rounding residue.
  const newLoanBalanceCents = settlementMode
    ? 0
    : Math.max(0, outstandingBalanceCents - principalTotal);
  // Settlement retires the full outstanding balance; surplus is whatever the
  // payment carried beyond that (reported, never silently absorbed).
  const surplusCents = remaining;

  // Conservation invariant: every cent of the payment is principal, interest,
  // fee, or explicitly-reported surplus.
  if (principalTotal + interestTotal + feeCents + surplusCents !== amountCents) {
    throw new Error(
      `Allocation invariant violated: ${principalTotal}+${interestTotal}+${feeCents}+${surplusCents} !== ${amountCents}`
    );
  }
  if (settlementMode && principalTotal > outstandingBalanceCents) {
    throw new Error(
      `Settlement allocated more principal (${principalTotal}) than outstanding (${outstandingBalanceCents})`
    );
  }

  return {
    allocations,
    totals: {
      principalCents: principalTotal,
      interestCents: interestTotal,
      feeCents,
      surplusCents,
    },
    directPrincipalCents,
    settlementMode,
    newLoanBalanceCents,
    paidOff: newLoanBalanceCents === 0 && (settlementMode || outstandingBalanceCents > 0),
  };
}
