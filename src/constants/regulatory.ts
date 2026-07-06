/**
 * Regulatory constants for NamLend loan platform
 * Namibian financial regulations and compliance limits
 */
import { formatNAD as formatNADCanonical } from '../utils/currency';

// Maximum Annual Percentage Rate (APR) allowed by Namibian regulations
export const APR_LIMIT = 32;

// Currency formatting for Namibian Dollar
export const CURRENCY_CODE = 'NAD';
export const CURRENCY_SYMBOL = 'N$';

/**
 * Validate APR against regulatory limit
 * @param apr - Annual Percentage Rate to validate
 * @returns true if APR is within regulatory limits
 */
export const isValidAPR = (apr: number): boolean => {
  return apr > 0 && apr <= APR_LIMIT;
};

/**
 * Format currency amount in Namibian Dollars.
 * Delegates to the canonical implementation in `src/utils/currency.ts` so the
 * app has exactly one NAD formatter; prefer importing from `@/utils/currency`.
 */
export const formatNAD = formatNADCanonical;

/**
 * Calculate maximum loan amount based on APR limit
 * @param monthlyPayment - Monthly payment amount
 * @param termMonths - Loan term in months
 * @returns Maximum principal amount at APR limit
 */
export const calculateMaxLoanAtAPRLimit = (monthlyPayment: number, termMonths: number): number => {
  const monthlyRate = APR_LIMIT / 100 / 12;
  const presentValue =
    monthlyPayment * ((1 - Math.pow(1 + monthlyRate, -termMonths)) / monthlyRate);
  return Math.floor(presentValue);
};
