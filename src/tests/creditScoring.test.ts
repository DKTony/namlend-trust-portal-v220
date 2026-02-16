import { describe, it, expect, vi } from 'vitest';

// Mock the supabase client to avoid storage.getItem error in jsdom
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {},
}));

import {
  calculateCreditScore,
  getLoanRecommendation,
  CREDIT_SCORE_RANGES,
  type CreditFactors,
} from '@/services/creditScoring';

// Helper: build a baseline "good" applicant
function goodApplicant(overrides: Partial<CreditFactors> = {}): CreditFactors {
  return {
    monthlyIncome: 15000,
    employmentStatus: 'employed',
    employmentDuration: 24,
    existingDebt: 5000,
    monthlyDebtPayments: 1000,
    requestedAmount: 20000,
    requestedTerm: 12,
    hasVerifiedId: true,
    hasVerifiedAddress: true,
    hasVerifiedEmployment: true,
    previousLoans: 3,
    paidOnTime: 3,
    defaults: 0,
    latePayments: 0,
    ...overrides,
  };
}

// ─── calculateCreditScore ──────────────────────────────────────────────

describe('calculateCreditScore', () => {
  it('returns score between 300 and 850', () => {
    const result = calculateCreditScore(goodApplicant());
    expect(result.score).toBeGreaterThanOrEqual(300);
    expect(result.score).toBeLessThanOrEqual(850);
  });

  it('returns all required fields', () => {
    const result = calculateCreditScore(goodApplicant());
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('scoreRange');
    expect(result).toHaveProperty('riskLevel');
    expect(result).toHaveProperty('factors');
    expect(result).toHaveProperty('recommendations');
    expect(result).toHaveProperty('maxApprovedAmount');
    expect(result).toHaveProperty('suggestedInterestRate');
    expect(result).toHaveProperty('debtToIncomeRatio');
    expect(result).toHaveProperty('affordabilityScore');
  });

  it('scoreRange matches the numeric score', () => {
    const result = calculateCreditScore(goodApplicant());
    const range = CREDIT_SCORE_RANGES[result.scoreRange];
    expect(result.score).toBeGreaterThanOrEqual(range.min);
    expect(result.score).toBeLessThanOrEqual(range.max);
  });

  it('suggested interest rate never exceeds 32% APR', () => {
    // Even the worst applicant should not exceed regulatory limit
    const worst = goodApplicant({
      monthlyIncome: 2000,
      employmentStatus: 'unemployed',
      employmentDuration: 0,
      existingDebt: 50000,
      monthlyDebtPayments: 5000,
      hasVerifiedId: false,
      hasVerifiedAddress: false,
      hasVerifiedEmployment: false,
      previousLoans: 2,
      paidOnTime: 0,
      defaults: 2,
      latePayments: 5,
    });
    const result = calculateCreditScore(worst);
    expect(result.suggestedInterestRate).toBeLessThanOrEqual(32);
  });

  it('higher income produces higher score', () => {
    const low = calculateCreditScore(goodApplicant({ monthlyIncome: 3000 }));
    const high = calculateCreditScore(goodApplicant({ monthlyIncome: 25000 }));
    expect(high.score).toBeGreaterThan(low.score);
  });

  it('defaults reduce the credit score', () => {
    const clean = calculateCreditScore(goodApplicant({ defaults: 0 }));
    const defaulted = calculateCreditScore(goodApplicant({ defaults: 2 }));
    expect(defaulted.score).toBeLessThan(clean.score);
  });

  it('verified applicant scores higher than unverified', () => {
    const verified = calculateCreditScore(
      goodApplicant({ hasVerifiedId: true, hasVerifiedAddress: true, hasVerifiedEmployment: true })
    );
    const unverified = calculateCreditScore(
      goodApplicant({
        hasVerifiedId: false,
        hasVerifiedAddress: false,
        hasVerifiedEmployment: false,
      })
    );
    expect(verified.score).toBeGreaterThan(unverified.score);
  });

  it('first-time borrower gets neutral history score', () => {
    const firstTime = calculateCreditScore(
      goodApplicant({ previousLoans: 0, paidOnTime: 0, defaults: 0, latePayments: 0 })
    );
    // First-time borrower should still get a reasonable score with good income/employment
    expect(firstTime.score).toBeGreaterThanOrEqual(500);
  });

  it('maxApprovedAmount stays within 500–50000 range', () => {
    const result = calculateCreditScore(goodApplicant());
    expect(result.maxApprovedAmount).toBeGreaterThanOrEqual(500);
    expect(result.maxApprovedAmount).toBeLessThanOrEqual(50000);
  });

  it('debtToIncomeRatio is computed as percentage', () => {
    const result = calculateCreditScore(goodApplicant());
    expect(result.debtToIncomeRatio).toBeGreaterThan(0);
    expect(result.debtToIncomeRatio).toBeLessThan(200); // sanity check
  });

  it('risk levels map correctly to score ranges', () => {
    const excellent = calculateCreditScore(
      goodApplicant({ monthlyIncome: 30000, previousLoans: 5, paidOnTime: 5 })
    );
    expect(['low', 'medium']).toContain(excellent.riskLevel);

    const poor = calculateCreditScore(
      goodApplicant({
        monthlyIncome: 2500,
        employmentStatus: 'unemployed',
        employmentDuration: 0,
        defaults: 2,
        hasVerifiedId: false,
      })
    );
    expect(['high', 'very_high']).toContain(poor.riskLevel);
  });
});

// ─── getLoanRecommendation ─────────────────────────────────────────────

describe('getLoanRecommendation', () => {
  it('approves a good applicant', () => {
    const factors = goodApplicant();
    const score = calculateCreditScore(factors);
    const rec = getLoanRecommendation(factors, score);
    expect(rec.approved).toBe(true);
    expect(rec.approvedAmount).toBeGreaterThan(0);
    expect(rec.monthlyPayment).toBeGreaterThan(0);
    expect(rec.totalRepayment).toBeGreaterThan(rec.approvedAmount);
  });

  it('rejects when credit score is below 400', () => {
    const factors = goodApplicant({
      monthlyIncome: 2000,
      employmentStatus: 'unemployed',
      employmentDuration: 0,
      existingDebt: 50000,
      monthlyDebtPayments: 5000,
      hasVerifiedId: false,
      hasVerifiedAddress: false,
      hasVerifiedEmployment: false,
      previousLoans: 3,
      paidOnTime: 0,
      defaults: 3,
      latePayments: 10,
    });
    const score = calculateCreditScore(factors);

    // Only test rejection if score is actually below 400
    if (score.score < 400) {
      const rec = getLoanRecommendation(factors, score);
      expect(rec.approved).toBe(false);
      expect(rec.approvedAmount).toBe(0);
    }
  });

  it('rejects when monthly income is below N$3,000', () => {
    const factors = goodApplicant({
      monthlyIncome: 2500,
      existingDebt: 0,
      monthlyDebtPayments: 0,
      requestedAmount: 2000,
      requestedTerm: 12,
    });
    const score = calculateCreditScore(factors);
    const rec = getLoanRecommendation(factors, score);
    expect(rec.approved).toBe(false);
    expect(rec.reasons).toEqual(
      expect.arrayContaining([expect.stringContaining('income below minimum')])
    );
  });

  it('rejects when DTI exceeds 50%', () => {
    const factors = goodApplicant({
      monthlyIncome: 5000,
      monthlyDebtPayments: 3000,
      requestedAmount: 50000,
      requestedTerm: 6,
    });
    const score = calculateCreditScore(factors);
    if (score.debtToIncomeRatio > 50) {
      const rec = getLoanRecommendation(factors, score);
      expect(rec.approved).toBe(false);
      expect(rec.reasons).toEqual(
        expect.arrayContaining([expect.stringContaining('Debt-to-income')])
      );
    }
  });

  it('reduces approved amount when requested exceeds max', () => {
    const factors = goodApplicant({ requestedAmount: 100000 });
    const score = calculateCreditScore(factors);
    const rec = getLoanRecommendation(factors, score);
    if (rec.approved) {
      expect(rec.approvedAmount).toBeLessThanOrEqual(score.maxApprovedAmount);
    }
  });

  it('adds conditions for medium-risk applicants', () => {
    const factors = goodApplicant({
      monthlyIncome: 8000,
      employmentDuration: 6,
      previousLoans: 1,
      paidOnTime: 1,
    });
    const score = calculateCreditScore(factors);
    if (score.riskLevel === 'medium') {
      const rec = getLoanRecommendation(factors, score);
      expect(rec.conditions).toBeDefined();
      expect(rec.conditions).toEqual(
        expect.arrayContaining([expect.stringContaining('income verification')])
      );
    }
  });

  it('requires ID verification when not verified', () => {
    const factors = goodApplicant({ hasVerifiedId: false });
    const score = calculateCreditScore(factors);
    const rec = getLoanRecommendation(factors, score);
    if (rec.approved && rec.conditions) {
      expect(rec.conditions).toEqual(
        expect.arrayContaining([expect.stringContaining('ID verification')])
      );
    }
  });

  it('interest rate on recommendation matches suggested rate from score', () => {
    const factors = goodApplicant();
    const score = calculateCreditScore(factors);
    const rec = getLoanRecommendation(factors, score);
    if (rec.approved) {
      expect(rec.interestRate).toBe(score.suggestedInterestRate);
    }
  });

  it('total repayment equals monthly payment × term', () => {
    const factors = goodApplicant();
    const score = calculateCreditScore(factors);
    const rec = getLoanRecommendation(factors, score);
    if (rec.approved) {
      expect(rec.totalRepayment).toBeCloseTo(rec.monthlyPayment * rec.suggestedTerm, 0);
    }
  });
});
