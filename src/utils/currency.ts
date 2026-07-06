// Centralized NAD currency formatting utilities
// NamLend Project Rules: Currency is NAD; locale en-NA

export function formatNAD(
  amount: number | null | undefined,
  options?: Intl.NumberFormatOptions
): string {
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
  // Normalize to a strict "N$" prefix across environments that may render NAD
  // as "$" or "NAD", preserving a leading minus sign for negative amounts.
  formatted = formatted.replace(/^(-?)\s*\$/, '$1N$$');
  formatted = formatted.replace(/^(-?)NAD\s*/i, '$1N$$');
  formatted = formatted.replace(/^(-?)N\s?\$/, '$1N$$');
  return formatted;
}

export const nadFormatter = new Intl.NumberFormat('en-NA', {
  style: 'currency',
  currency: 'NAD',
  currencyDisplay: 'symbol',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
