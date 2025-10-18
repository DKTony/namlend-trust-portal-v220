/**
 * Currency Formatting Utilities
 * Version: v2.4.2
 * 
 * Namibian Dollar (NAD) formatting utilities
 */

/**
 * Format amount as NAD currency
 * @param amount - Numeric amount to format
 * @returns Formatted string like "N$1,234.56"
 */
export const formatNAD = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'N$0.00';
  }

  return `N$${amount.toLocaleString('en-NA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * Parse NAD string to number
 * @param nadString - String like "N$1,234.56"
 * @returns Numeric value
 */
export const parseNAD = (nadString: string): number => {
  const cleaned = nadString.replace(/[N$,\s]/g, '');
  return parseFloat(cleaned) || 0;
};

/**
 * Validate APR against Namibian regulatory limit (32%)
 * @param apr - Annual Percentage Rate
 * @returns true if valid, false if exceeds limit
 */
export const isValidAPR = (apr: number): boolean => {
  const MAX_APR = parseInt(process.env.EXPO_PUBLIC_MAX_APR || '32', 10);
  return apr > 0 && apr <= MAX_APR;
};

/**
 * Format percentage
 * @param value - Numeric percentage value
 * @returns Formatted string like "28.5%"
 */
export const formatPercentage = (value: number): string => {
  return `${value.toFixed(2)}%`;
};
