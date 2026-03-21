/**
 * Regulatory constants — server-side copy for Convex mutations.
 * Mirrors src/constants/regulatory.ts exactly.
 * Import this in every mutation that accepts an interestRate.
 */

/** Maximum APR allowed by Namibian regulations (NBFI Act) */
export const APR_LIMIT = 32;

export const CURRENCY_CODE = 'NAD';
export const CURRENCY_SYMBOL = 'N$';

/**
 * Returns true only if the APR is positive and does not exceed Namibian legal limit.
 * Use this guard in every loan create / update mutation.
 */
export function isValidAPR(apr: number): boolean {
  return apr > 0 && apr <= APR_LIMIT;
}

/** Format a NAD amount with N$ prefix and 2dp — for display in server-generated strings */
export function formatNAD(amount: number): string {
  return `${CURRENCY_SYMBOL}${amount.toLocaleString('en-NA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
