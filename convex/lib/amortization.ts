/**
 * Amortization math — canonical implementation shared by Convex mutations
 * (schedule generation at disbursement, E2E seeding) and the frontend
 * (src/utils/loanCalculations.ts re-exports these).
 *
 * FINANCIAL SAFETY RULES:
 * 1. All monetary amounts are operated in integer CENTS internally to prevent
 *    floating-point accumulation errors (e.g. 0.1 + 0.2 !== 0.3 in JS).
 * 2. Public-facing functions accept and return NAD amounts (floating-point
 *    display values) but round to 2dp at entry and exit.
 * 3. Payment schedules are generated so the LAST instalment absorbs any
 *    rounding residual — the final balance is always exactly zero.
 *
 * Pure module: no ctx, no db access. The APR check uses the hardcoded
 * regulatory fallback; data-driven limits (getAPRLimit) are enforced by the
 * calling mutation before invoking these functions.
 */

import { APR_LIMIT } from './regulatory';

// ---------------------------------------------------------------------------
// Integer-cents arithmetic
// ---------------------------------------------------------------------------

/** Round a floating NAD amount to integer cents (× 100). */
export function toCents(nad: number): number {
  return Math.round(nad * 100);
}

/** Convert integer cents back to NAD with 2dp precision. */
export function fromCents(cents: number): number {
  return Math.round(cents) / 100;
}

// ---------------------------------------------------------------------------
// Core financial functions
// ---------------------------------------------------------------------------

/**
 * Calculate the fixed monthly instalment (PMT formula) for a reducing-balance loan.
 *
 * @param principal - Loan amount in NAD
 * @param annualRatePercent - Annual interest rate as a percentage (e.g. 18 for 18%)
 * @param termMonths - Number of monthly instalments
 * @returns Monthly payment in NAD, rounded to 2 decimal places
 *
 * @throws if annualRatePercent > APR_LIMIT
 */
export function calculateMonthlyInstalment(
  principal: number,
  annualRatePercent: number,
  termMonths: number
): number {
  if (annualRatePercent > APR_LIMIT) {
    throw new Error(`APR ${annualRatePercent}% exceeds Namibian regulatory limit of ${APR_LIMIT}%`);
  }
  if (principal <= 0) throw new Error('Principal must be positive');
  if (termMonths <= 0 || !Number.isInteger(termMonths))
    throw new Error('Term must be a positive integer');

  if (annualRatePercent === 0) {
    return fromCents(Math.ceil(toCents(principal) / termMonths));
  }

  const r = annualRatePercent / 100 / 12;
  const rawPayment =
    (principal * r * Math.pow(1 + r, termMonths)) / (Math.pow(1 + r, termMonths) - 1);
  return fromCents(Math.round(toCents(rawPayment)));
}

/**
 * Calculate the total amount repayable (sum of all instalments).
 *
 * @returns Total repayable in NAD, rounded to 2dp
 */
export function calculateTotalRepayable(
  principal: number,
  annualRatePercent: number,
  termMonths: number
): number {
  const instalment = calculateMonthlyInstalment(principal, annualRatePercent, termMonths);
  return fromCents(toCents(instalment) * termMonths);
}

/**
 * Calculate the total interest cost over the life of the loan.
 */
export function calculateTotalInterest(
  principal: number,
  annualRatePercent: number,
  termMonths: number
): number {
  return fromCents(
    toCents(calculateTotalRepayable(principal, annualRatePercent, termMonths)) - toCents(principal)
  );
}

// ---------------------------------------------------------------------------
// Payment schedule generation
// ---------------------------------------------------------------------------

export interface ScheduleEntry {
  installmentNumber: number;
  /** Unix timestamp (ms) of due date */
  dueDate: number;
  principalDue: number;
  interestDue: number;
  totalDue: number;
  /** Outstanding balance AFTER this instalment is paid */
  closingBalance: number;
}

/**
 * Generate a full amortisation schedule for a loan.
 *
 * The LAST instalment is adjusted to clear any rounding residual so the
 * final closing balance is exactly zero.
 *
 * @param principal - Loan amount in NAD
 * @param annualRatePercent - Annual interest rate (%)
 * @param termMonths - Number of monthly instalments
 * @param disbursementDate - Date of disbursement (first payment is 1 month later)
 * @returns Array of ScheduleEntry, length === termMonths
 */
export function generatePaymentSchedule(
  principal: number,
  annualRatePercent: number,
  termMonths: number,
  disbursementDate: Date
): ScheduleEntry[] {
  const instalment = calculateMonthlyInstalment(principal, annualRatePercent, termMonths);
  const monthlyRate = annualRatePercent / 100 / 12;
  const schedule: ScheduleEntry[] = [];

  let balanceCents = toCents(principal);

  for (let i = 1; i <= termMonths; i++) {
    const dueDate = new Date(disbursementDate);
    dueDate.setMonth(dueDate.getMonth() + i);

    const interestCents = Math.round(balanceCents * monthlyRate);
    let instalmentCents = toCents(instalment);

    // Last instalment: absorb rounding residual
    if (i === termMonths) {
      instalmentCents = balanceCents + interestCents;
    }

    const principalCents = instalmentCents - interestCents;
    balanceCents = Math.max(0, balanceCents - principalCents);

    schedule.push({
      installmentNumber: i,
      dueDate: dueDate.getTime(),
      principalDue: fromCents(principalCents),
      interestDue: fromCents(interestCents),
      totalDue: fromCents(instalmentCents),
      closingBalance: fromCents(balanceCents),
    });
  }

  return schedule;
}

/**
 * Validate that a generated schedule sums correctly.
 * Returns true if the final closing balance is exactly zero
 * and the sum of all principal matches the original loan amount (within 1 cent).
 */
export function validateScheduleIntegrity(
  schedule: ScheduleEntry[],
  originalPrincipal: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (schedule.length === 0) {
    errors.push('Schedule is empty');
    return { valid: false, errors };
  }

  const last = schedule[schedule.length - 1];
  if (last.closingBalance !== 0) {
    errors.push(`Final closing balance is ${last.closingBalance}, expected 0`);
  }

  const totalPrincipal = schedule.reduce((sum, e) => sum + toCents(e.principalDue), 0);
  const principalDiff = Math.abs(totalPrincipal - toCents(originalPrincipal));
  if (principalDiff > 1) {
    errors.push(
      `Sum of principal payments (${fromCents(totalPrincipal)}) differs from loan amount (${originalPrincipal}) by more than 1 cent`
    );
  }

  return { valid: errors.length === 0, errors };
}
