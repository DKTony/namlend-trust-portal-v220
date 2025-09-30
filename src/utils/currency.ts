// Centralized NAD currency formatting utilities
// NamLend Project Rules: Currency is NAD; locale en-NA

export function formatNAD(amount: number | null | undefined, options?: Intl.NumberFormatOptions): string {
  const value = Number(amount ?? 0);
  const formatter = new Intl.NumberFormat('en-NA', {
    style: 'currency',
    currency: 'NAD',
    currencyDisplay: 'symbol',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  });
  let formatted = formatter.format(value);
  // Normalize to strict "N$" prefix across environments that may render NAD as "$" or "NAD"
  if (/^\s*\$/.test(formatted)) {
    formatted = formatted.replace(/^\s*\$/, 'N$');
  }
  formatted = formatted.replace(/^NAD\s*/i, 'N$');
  formatted = formatted.replace(/^N\s?\$/, 'N$');
  return formatted;
}

export const nadFormatter = new Intl.NumberFormat('en-NA', {
  style: 'currency',
  currency: 'NAD',
  currencyDisplay: 'symbol',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
