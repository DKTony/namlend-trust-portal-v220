// Loan product bounds shared by the amount input and the step validation so
// the two can never drift apart. Server-side limits remain authoritative.
export const LOAN_AMOUNT_MIN = 1000;
export const LOAN_AMOUNT_MAX = 50000;

export function isLoanAmountValid(amount: number): boolean {
  return Number.isFinite(amount) && amount >= LOAN_AMOUNT_MIN && amount <= LOAN_AMOUNT_MAX;
}
