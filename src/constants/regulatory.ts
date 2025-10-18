/**
 * Regulatory constants for NamLend loan platform
 * Namibian financial regulations and compliance limits
 */

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
 * Format currency amount in Namibian Dollars
 * @param amount - Amount to format
 * @returns Formatted currency string
 */
export const formatNAD = (amount: number): string => {
  return `${CURRENCY_SYMBOL}${amount.toLocaleString('en-NA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

/**
 * Calculate maximum loan amount based on APR limit
 * @param monthlyPayment - Monthly payment amount
 * @param termMonths - Loan term in months
 * @returns Maximum principal amount at APR limit
 */
export const calculateMaxLoanAtAPRLimit = (monthlyPayment: number, termMonths: number): number => {
  const monthlyRate = APR_LIMIT / 100 / 12;
  const presentValue = monthlyPayment * ((1 - Math.pow(1 + monthlyRate, -termMonths)) / monthlyRate);
  return Math.floor(presentValue);
};
