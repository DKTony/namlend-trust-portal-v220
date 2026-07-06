/**
 * Loan financial calculation utilities — NamLend Trust.
 *
 * The amortization core (instalment/schedule math, integer-cents arithmetic)
 * lives in `convex/lib/amortization.ts` so backend schedule generation and the
 * frontend share one implementation — this file re-exports it and keeps the
 * frontend-only helpers (DTI, payment application, overdue days).
 *
 * FINANCIAL SAFETY RULES:
 * 1. All monetary amounts are operated in integer CENTS internally to prevent
 *    floating-point accumulation errors (e.g. 0.1 + 0.2 !== 0.3 in JS).
 * 2. Public-facing functions accept and return NAD amounts (floating-point display
 *    values) but round to 2dp at entry and exit.
 * 3. Payment schedules are generated so the LAST instalment absorbs any
 *    rounding residual — the final balance is always exactly zero.
 *
 * APR limit: 32% (Namibian NBFI Act). Import isValidAPR from regulatory.ts before
 * calling these functions.
 */

import { fromCents, toCents } from '../../convex/lib/amortization';

export {
  calculateMonthlyInstalment,
  calculateTotalInterest,
  calculateTotalRepayable,
  generatePaymentSchedule,
  validateScheduleIntegrity,
  type ScheduleEntry,
} from '../../convex/lib/amortization';

/**
 * Calculate the Debt-to-Income ratio.
 *
 * @param monthlyPayment - Monthly loan payment in NAD
 * @param monthlyIncome - Gross monthly income in NAD
 * @returns DTI as a decimal (e.g. 0.35 = 35%)
 */
export function calculateDTI(monthlyPayment: number, monthlyIncome: number): number {
  if (monthlyIncome <= 0) return 1; // Treat zero income as 100% DTI
  return monthlyPayment / monthlyIncome;
}

/**
 * Calculate the remaining outstanding balance after a payment is applied.
 * Uses reducing-balance (amortisation) arithmetic in cents.
 *
 * @param outstandingBalance - Current outstanding balance in NAD
 * @param paymentAmount - Total payment received in NAD
 * @param annualRatePercent - Current annual interest rate
 * @returns Object with { newBalance, principalPaid, interestPaid } all in NAD
 */
export function applyPayment(
  outstandingBalance: number,
  paymentAmount: number,
  annualRatePercent: number
): { newBalance: number; principalPaid: number; interestPaid: number } {
  if (paymentAmount <= 0) throw new Error('Payment amount must be positive');

  const balanceCents = toCents(outstandingBalance);
  const paymentCents = toCents(paymentAmount);

  const monthlyRate = annualRatePercent / 100 / 12;
  const interestCents = Math.round(balanceCents * monthlyRate);
  const principalCents = Math.min(paymentCents - interestCents, balanceCents);
  const newBalanceCents = Math.max(0, balanceCents - principalCents);

  return {
    newBalance: fromCents(newBalanceCents),
    principalPaid: fromCents(principalCents),
    interestPaid: fromCents(interestCents),
  };
}

/**
 * Calculate days overdue for a payment.
 *
 * @param dueDateMs - Due date as Unix timestamp (ms)
 * @param currentDateMs - Current date as Unix timestamp (ms); defaults to Date.now()
 * @returns Number of days overdue (negative = not yet due, 0 = due today)
 */
export function calculateDaysOverdue(dueDateMs: number, currentDateMs?: number): number {
  const now = currentDateMs ?? Date.now();
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((now - dueDateMs) / msPerDay);
}
