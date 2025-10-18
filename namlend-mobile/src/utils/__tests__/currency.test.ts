/**
 * Currency Utility Tests
 * Version: v2.6.0
 */

import { formatNAD } from '../currency';

describe('formatNAD', () => {
  it('should format positive numbers correctly', () => {
    expect(formatNAD(1000)).toBe('N$ 1,000.00');
    expect(formatNAD(5000)).toBe('N$ 5,000.00');
    expect(formatNAD(50000)).toBe('N$ 50,000.00');
  });

  it('should format decimal numbers correctly', () => {
    expect(formatNAD(1234.56)).toBe('N$ 1,234.56');
    expect(formatNAD(999.99)).toBe('N$ 999.99');
  });

  it('should handle zero', () => {
    expect(formatNAD(0)).toBe('N$ 0.00');
  });

  it('should format large numbers with thousands separators', () => {
    expect(formatNAD(1000000)).toBe('N$ 1,000,000.00');
  });

  it('should round to 2 decimal places', () => {
    expect(formatNAD(1234.567)).toBe('N$ 1,234.57');
    expect(formatNAD(1234.564)).toBe('N$ 1,234.56');
  });
});
