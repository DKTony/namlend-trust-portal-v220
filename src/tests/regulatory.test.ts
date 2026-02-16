import { describe, it, expect } from 'vitest';
import {
  APR_LIMIT,
  CURRENCY_CODE,
  CURRENCY_SYMBOL,
  isValidAPR,
  formatNAD,
  calculateMaxLoanAtAPRLimit,
} from '@/constants/regulatory';

describe('Regulatory Constants', () => {
  it('APR_LIMIT is 32% per Namibian law', () => {
    expect(APR_LIMIT).toBe(32);
  });

  it('currency is NAD', () => {
    expect(CURRENCY_CODE).toBe('NAD');
    expect(CURRENCY_SYMBOL).toBe('N$');
  });
});

describe('isValidAPR', () => {
  it('accepts rates within limit', () => {
    expect(isValidAPR(18)).toBe(true);
    expect(isValidAPR(32)).toBe(true);
    expect(isValidAPR(0.5)).toBe(true);
  });

  it('rejects rates above 32%', () => {
    expect(isValidAPR(32.01)).toBe(false);
    expect(isValidAPR(35)).toBe(false);
    expect(isValidAPR(100)).toBe(false);
  });

  it('rejects zero and negative rates', () => {
    expect(isValidAPR(0)).toBe(false);
    expect(isValidAPR(-5)).toBe(false);
  });
});

describe('formatNAD', () => {
  it('formats with N$ prefix and 2 decimal places', () => {
    const result = formatNAD(1234.5);
    expect(result).toContain('N$');
    expect(result).toContain('1');
    expect(result).toContain('234');
    expect(result).toContain('.50');
  });

  it('formats zero correctly', () => {
    const result = formatNAD(0);
    expect(result).toBe('N$0.00');
  });

  it('formats large amounts with separators', () => {
    const result = formatNAD(1000000);
    expect(result).toContain('N$');
    expect(result).toContain('000');
    expect(result).toContain('.00');
  });

  it('rounds to 2 decimal places', () => {
    const result = formatNAD(99.999);
    expect(result).toContain('100.00');
  });
});

describe('calculateMaxLoanAtAPRLimit', () => {
  it('returns positive value for valid inputs', () => {
    const result = calculateMaxLoanAtAPRLimit(1000, 12);
    expect(result).toBeGreaterThan(0);
  });

  it('increases with higher monthly payments', () => {
    const low = calculateMaxLoanAtAPRLimit(500, 12);
    const high = calculateMaxLoanAtAPRLimit(1000, 12);
    expect(high).toBeGreaterThan(low);
  });

  it('increases with longer terms', () => {
    const short = calculateMaxLoanAtAPRLimit(1000, 6);
    const long = calculateMaxLoanAtAPRLimit(1000, 24);
    expect(long).toBeGreaterThan(short);
  });

  it('returns floor-rounded integer', () => {
    const result = calculateMaxLoanAtAPRLimit(1000, 12);
    expect(Number.isInteger(result)).toBe(true);
  });
});
