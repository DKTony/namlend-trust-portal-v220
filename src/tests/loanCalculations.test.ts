/**
 * Unit tests — Loan financial calculation utilities.
 *
 * Every financial formula used in NamLend Trust is tested here.
 * Tests cover: standard loans, edge cases, rounding integrity,
 * schedule correctness, and regulatory boundary conditions.
 *
 * Run: npm run test:unit
 */
import { describe, it, expect } from 'vitest';
import {
  calculateMonthlyInstalment,
  calculateTotalRepayable,
  calculateTotalInterest,
  calculateDTI,
  applyPayment,
  generatePaymentSchedule,
  validateScheduleIntegrity,
  calculateDaysOverdue,
} from '@/utils/loanCalculations';

// ---------------------------------------------------------------------------
// calculateMonthlyInstalment
// ---------------------------------------------------------------------------

describe('calculateMonthlyInstalment', () => {
  it('standard 24-month loan at 18% APR', () => {
    // N$50,000 @ 18% APR (1.5%/month) for 24 months
    // PMT = 50000 * 0.015 / (1 - (1.015)^-24) ≈ N$2,496.21
    const result = calculateMonthlyInstalment(50000, 18, 24);
    expect(result).toBeCloseTo(2496.21, 0);
    expect(result).toBeGreaterThan(0);
  });

  it('zero-interest loan divides principal evenly', () => {
    const result = calculateMonthlyInstalment(12000, 0, 12);
    // 12000 / 12 = 1000 exactly
    expect(result).toBe(1000);
  });

  it('single-payment loan at zero interest equals principal', () => {
    const result = calculateMonthlyInstalment(5000, 0, 1);
    expect(result).toBe(5000);
  });

  it('returns value rounded to 2 decimal places', () => {
    const result = calculateMonthlyInstalment(30000, 24, 36);
    const decimalPlaces = (result.toString().split('.')[1] ?? '').length;
    expect(decimalPlaces).toBeLessThanOrEqual(2);
  });

  it('throws when APR exceeds 32% regulatory limit', () => {
    expect(() => calculateMonthlyInstalment(50000, 32.01, 12)).toThrow(/APR.*limit/i);
    expect(() => calculateMonthlyInstalment(50000, 100, 12)).toThrow();
  });

  it('throws for zero or negative principal', () => {
    expect(() => calculateMonthlyInstalment(0, 18, 12)).toThrow();
    expect(() => calculateMonthlyInstalment(-1000, 18, 12)).toThrow();
  });

  it('throws for fractional term months', () => {
    expect(() => calculateMonthlyInstalment(50000, 18, 12.5)).toThrow();
  });

  it('accepts maximum allowed APR of exactly 32%', () => {
    const result = calculateMonthlyInstalment(50000, 32, 24);
    expect(result).toBeGreaterThan(0);
  });

  it('higher APR produces higher instalment for same term and principal', () => {
    const low = calculateMonthlyInstalment(50000, 10, 24);
    const high = calculateMonthlyInstalment(50000, 30, 24);
    expect(high).toBeGreaterThan(low);
  });

  it('longer term produces lower instalment for same APR and principal', () => {
    const short = calculateMonthlyInstalment(50000, 18, 12);
    const long = calculateMonthlyInstalment(50000, 18, 36);
    expect(long).toBeLessThan(short);
  });

  it('larger principal produces proportionally larger instalment', () => {
    const small = calculateMonthlyInstalment(10000, 18, 12);
    const large = calculateMonthlyInstalment(20000, 18, 12);
    // Should be approximately double
    expect(large / small).toBeCloseTo(2, 1);
  });
});

// ---------------------------------------------------------------------------
// calculateTotalRepayable
// ---------------------------------------------------------------------------

describe('calculateTotalRepayable', () => {
  it('is instalment × term', () => {
    const instalment = calculateMonthlyInstalment(50000, 18, 24);
    const total = calculateTotalRepayable(50000, 18, 24);
    expect(total).toBeCloseTo(instalment * 24, 1);
  });

  it('equals principal exactly at zero interest', () => {
    const total = calculateTotalRepayable(12000, 0, 12);
    expect(total).toBe(12000);
  });

  it('is always greater than principal at positive APR', () => {
    const principal = 50000;
    const total = calculateTotalRepayable(principal, 18, 24);
    expect(total).toBeGreaterThan(principal);
  });
});

// ---------------------------------------------------------------------------
// calculateTotalInterest
// ---------------------------------------------------------------------------

describe('calculateTotalInterest', () => {
  it('is zero when APR is zero (evenly divisible principal)', () => {
    // 12000 / 12 = 1000 exactly — no rounding, so total interest is exactly 0
    expect(calculateTotalInterest(12000, 0, 12)).toBe(0);
  });

  it('is positive for any positive APR', () => {
    expect(calculateTotalInterest(50000, 18, 24)).toBeGreaterThan(0);
  });

  it('equals totalRepayable minus principal', () => {
    const principal = 50000;
    const total = calculateTotalRepayable(principal, 18, 24);
    const interest = calculateTotalInterest(principal, 18, 24);
    expect(Math.abs(total - principal - interest)).toBeLessThan(0.02);
  });
});

// ---------------------------------------------------------------------------
// calculateDTI
// ---------------------------------------------------------------------------

describe('calculateDTI', () => {
  it('returns ratio between 0 and 1 for normal cases', () => {
    const dti = calculateDTI(2000, 10000);
    expect(dti).toBe(0.2);
  });

  it('returns 1 for zero income (worst case)', () => {
    expect(calculateDTI(1000, 0)).toBe(1);
  });

  it('returns 1 for negative income (guard case)', () => {
    expect(calculateDTI(1000, -5000)).toBe(1);
  });

  it('correctly flags 35% threshold boundary', () => {
    const exactly35 = calculateDTI(3500, 10000);
    expect(exactly35).toBeCloseTo(0.35, 5);
  });

  it('DTI > 1 is possible if payment exceeds income', () => {
    const dti = calculateDTI(15000, 10000);
    expect(dti).toBe(1.5);
  });
});

// ---------------------------------------------------------------------------
// applyPayment
// ---------------------------------------------------------------------------

describe('applyPayment', () => {
  it('reduces outstanding balance by principal portion', () => {
    const result = applyPayment(50000, 2500, 18);
    expect(result.newBalance).toBeLessThan(50000);
    expect(result.newBalance).toBeGreaterThan(0);
  });

  it('interest + principal = total payment (within 1 cent)', () => {
    const result = applyPayment(50000, 2500, 18);
    const reconstituted = result.principalPaid + result.interestPaid;
    expect(Math.abs(reconstituted - 2500)).toBeLessThan(0.02);
  });

  it('full payment clears small balance to zero', () => {
    const result = applyPayment(100, 110, 18); // Overpayment
    expect(result.newBalance).toBe(0);
  });

  it('throws for zero or negative payment', () => {
    expect(() => applyPayment(50000, 0, 18)).toThrow();
    expect(() => applyPayment(50000, -100, 18)).toThrow();
  });

  it('zero APR means no interest charged', () => {
    const result = applyPayment(10000, 1000, 0);
    expect(result.interestPaid).toBe(0);
    expect(result.principalPaid).toBe(1000);
    expect(result.newBalance).toBe(9000);
  });
});

// ---------------------------------------------------------------------------
// generatePaymentSchedule
// ---------------------------------------------------------------------------

describe('generatePaymentSchedule', () => {
  const disbursementDate = new Date('2026-03-01');

  it('generates correct number of entries', () => {
    const schedule = generatePaymentSchedule(50000, 18, 24, disbursementDate);
    expect(schedule).toHaveLength(24);
  });

  it('first instalment is due 1 month after disbursement', () => {
    const schedule = generatePaymentSchedule(50000, 18, 12, disbursementDate);
    const firstDue = new Date(schedule[0].dueDate);
    expect(firstDue.getMonth()).toBe((disbursementDate.getMonth() + 1) % 12);
  });

  it('instalment numbers run sequentially from 1', () => {
    const schedule = generatePaymentSchedule(50000, 18, 12, disbursementDate);
    schedule.forEach((entry, i) => {
      expect(entry.installmentNumber).toBe(i + 1);
    });
  });

  it('final closing balance is exactly zero', () => {
    const schedule = generatePaymentSchedule(50000, 18, 24, disbursementDate);
    const last = schedule[schedule.length - 1];
    expect(last.closingBalance).toBe(0);
  });

  it('all totalDue values equal principalDue + interestDue', () => {
    const schedule = generatePaymentSchedule(50000, 18, 12, disbursementDate);
    schedule.forEach((entry) => {
      const reconstructed = entry.principalDue + entry.interestDue;
      expect(Math.abs(reconstructed - entry.totalDue)).toBeLessThan(0.02);
    });
  });

  it('closing balance decreases monotonically', () => {
    const schedule = generatePaymentSchedule(50000, 18, 24, disbursementDate);
    for (let i = 1; i < schedule.length; i++) {
      expect(schedule[i].closingBalance).toBeLessThan(schedule[i - 1].closingBalance);
    }
  });

  it('all monetary values are positive', () => {
    const schedule = generatePaymentSchedule(50000, 18, 12, disbursementDate);
    schedule.forEach((entry) => {
      expect(entry.principalDue).toBeGreaterThan(0);
      expect(entry.interestDue).toBeGreaterThanOrEqual(0);
      expect(entry.totalDue).toBeGreaterThan(0);
    });
  });

  it('zero-APR schedule has zero interest on every entry', () => {
    const schedule = generatePaymentSchedule(12000, 0, 12, disbursementDate);
    schedule.forEach((entry) => {
      expect(entry.interestDue).toBe(0);
    });
  });

  it('sum of all principal payments approximately equals original loan amount', () => {
    const principal = 50000;
    const schedule = generatePaymentSchedule(principal, 18, 24, disbursementDate);
    const totalPrincipal = schedule.reduce((sum, e) => sum + e.principalDue, 0);
    // Should match within 1 cent (rounding adjustment on final instalment)
    expect(Math.abs(totalPrincipal - principal)).toBeLessThan(0.02);
  });
});

// ---------------------------------------------------------------------------
// validateScheduleIntegrity
// ---------------------------------------------------------------------------

describe('validateScheduleIntegrity', () => {
  it('returns valid for a correctly generated schedule', () => {
    const schedule = generatePaymentSchedule(50000, 18, 24, new Date('2026-03-01'));
    const result = validateScheduleIntegrity(schedule, 50000);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns invalid for an empty schedule', () => {
    const result = validateScheduleIntegrity([], 50000);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('detects non-zero final balance', () => {
    const schedule = generatePaymentSchedule(50000, 18, 12, new Date());
    // Tamper: set final closing balance to non-zero
    schedule[schedule.length - 1] = { ...schedule[schedule.length - 1], closingBalance: 100 };
    const result = validateScheduleIntegrity(schedule, 50000);
    expect(result.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// calculateDaysOverdue
// ---------------------------------------------------------------------------

describe('calculateDaysOverdue', () => {
  it('returns negative for future due dates', () => {
    const futureDate = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days from now
    expect(calculateDaysOverdue(futureDate)).toBeLessThan(0);
  });

  it('returns 0 for today', () => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const result = calculateDaysOverdue(startOfToday.getTime(), startOfToday.getTime());
    expect(result).toBe(0);
  });

  it('returns positive for past due dates', () => {
    const pastDate = Date.now() - 10 * 24 * 60 * 60 * 1000; // 10 days ago
    expect(calculateDaysOverdue(pastDate)).toBeGreaterThan(0);
  });

  it('accepts an explicit currentDateMs override', () => {
    const dueDate = new Date('2026-01-01').getTime();
    const currentDate = new Date('2026-01-11').getTime();
    expect(calculateDaysOverdue(dueDate, currentDate)).toBe(10);
  });

  it('returns 1 for exactly one day overdue', () => {
    const dueDate = new Date('2026-01-01').getTime();
    const currentDate = new Date('2026-01-02').getTime();
    expect(calculateDaysOverdue(dueDate, currentDate)).toBe(1);
  });

  it('handles 90+ day overdue correctly', () => {
    const dueDate = new Date('2025-10-01').getTime();
    const currentDate = new Date('2026-01-01').getTime();
    // 92 days between Oct 1 and Jan 1
    const result = calculateDaysOverdue(dueDate, currentDate);
    expect(result).toBe(92);
  });
});

// ---------------------------------------------------------------------------
// Regulatory boundary integration tests
// ---------------------------------------------------------------------------

describe('Regulatory compliance — APR limit enforcement', () => {
  it('all calculation functions reject APR > 32%', () => {
    const overLimit = 32.01;
    expect(() => calculateMonthlyInstalment(50000, overLimit, 12)).toThrow();
    expect(() => calculateTotalRepayable(50000, overLimit, 12)).toThrow();
    expect(() => calculateTotalInterest(50000, overLimit, 12)).toThrow();
    expect(() => generatePaymentSchedule(50000, overLimit, 12, new Date())).toThrow();
  });

  it('maximum legal APR of 32% is accepted', () => {
    expect(() => calculateMonthlyInstalment(50000, 32, 12)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Floating-point safety tests
// ---------------------------------------------------------------------------

describe('Floating-point safety (integer-cents arithmetic)', () => {
  it('0.1 + 0.2 problem does not affect schedule generation', () => {
    // This would fail with naive floating point
    const schedule = generatePaymentSchedule(10000.1, 18, 12, new Date());
    const last = schedule[schedule.length - 1];
    expect(last.closingBalance).toBe(0);
  });

  it('large loan amounts do not accumulate rounding errors', () => {
    const schedule = generatePaymentSchedule(500000, 28, 60, new Date());
    const integrity = validateScheduleIntegrity(schedule, 500000);
    expect(integrity.valid).toBe(true);
  });

  it('instalment calculation returns value with at most 2 decimal places', () => {
    // Test a variety of combinations known to produce long decimal expansions
    const cases = [
      [33333, 15, 7],
      [77777, 23, 19],
      [12345.67, 11, 17],
    ] as [number, number, number][];

    for (const [p, r, t] of cases) {
      const result = calculateMonthlyInstalment(p, r, t);
      const str = result.toString();
      const decimals = str.includes('.') ? str.split('.')[1].length : 0;
      expect(decimals).toBeLessThanOrEqual(2);
    }
  });
});
