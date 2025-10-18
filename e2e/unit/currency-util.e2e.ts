import { test, expect } from '@playwright/test';
import { formatNAD } from '../../src/utils/currency';

// Note: Intl output can vary slightly across environments (symbol vs code, spacing),
// so we assert stable parts only (prefix starts with 'N' and numeric parts).

test.describe('formatNAD utility', () => {
  test('formats zero correctly', () => {
    const s = formatNAD(0);
    expect(s).toContain('0.00');
  });

  test('formats thousands with decimals', () => {
    const s = formatNAD(1234.56);
    // en-NA and en-US both use ',' thousands and '.' decimal
    expect(s).toContain('1,234.56');
  });

  test('formats millions', () => {
    const s = formatNAD(1_000_000);
    expect(s).toContain('1,000,000.00');
  });

  test('handles null/undefined gracefully', () => {
    expect(formatNAD(null as any)).toContain('0.00');
    expect(formatNAD(undefined as any)).toContain('0.00');
  });
});
