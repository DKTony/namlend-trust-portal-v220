import { describe, it, expect } from 'vitest';
import { validatePaymentAmount } from './paymentValidation';

describe('validatePaymentAmount', () => {
  it('rejects NaN and non-finite amounts', () => {
    expect(validatePaymentAmount(NaN, 5000).valid).toBe(false);
    expect(validatePaymentAmount(Infinity, 5000).valid).toBe(false);
  });

  it('rejects zero and negative amounts', () => {
    expect(validatePaymentAmount(0, 5000).valid).toBe(false);
    expect(validatePaymentAmount(-100, 5000).valid).toBe(false);
  });

  it('rejects amounts above the outstanding balance', () => {
    const result = validatePaymentAmount(5000.01, 5000);
    expect(result.valid).toBe(false);
    expect(result.message).toContain('N$');
  });

  it('accepts a valid partial payment', () => {
    expect(validatePaymentAmount(1000, 5000).valid).toBe(true);
  });

  it('accepts paying off the exact balance despite float artifacts', () => {
    expect(validatePaymentAmount(3333.3300000000004, 3333.33).valid).toBe(true);
  });

  it('skips the balance ceiling when balance is unknown or zero', () => {
    expect(validatePaymentAmount(1000, NaN).valid).toBe(true);
    expect(validatePaymentAmount(1000, 0).valid).toBe(true);
  });
});
