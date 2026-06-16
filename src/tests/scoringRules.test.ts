/**
 * Unit tests for the declarative credit scoring rule engine.
 * Tests pure functions — no Supabase calls needed.
 */

import type { CreditFactors, CreditScoreFactor } from '@/services/creditScoring';
import {
  applyConditionRules,
  applyThresholdRules,
  DTI_RULES,
  EMPLOYMENT_DURATION_RULES,
  generateRecommendationsFromRules,
  getRateAdjustment,
  getRiskLevelFromScore,
  INCOME_RULES,
  VERIFICATION_RULES,
} from '@/services/scoringRules';
import { describe, expect, it } from 'vitest';

// ── Helper to create a base CreditFactors object ────────────────────
function makeFactors(overrides: Partial<CreditFactors> = {}): CreditFactors {
  return {
    monthlyIncome: 12000,
    employmentStatus: 'employed',
    employmentDuration: 24,
    existingDebt: 5000,
    monthlyDebtPayments: 2000,
    requestedAmount: 10000,
    requestedTerm: 12,
    hasVerifiedId: true,
    hasVerifiedAddress: true,
    hasVerifiedEmployment: true,
    previousLoans: 2,
    paidOnTime: 2,
    defaults: 0,
    latePayments: 0,
    ...overrides,
  };
}

// ============================================================================
// applyThresholdRules — Income
// ============================================================================
describe('applyThresholdRules — Income', () => {
  it('returns 100 for high income (>= 20000)', () => {
    const factors: CreditScoreFactor[] = [];
    const score = applyThresholdRules(25000, INCOME_RULES, 'Income', factors);
    expect(score).toBe(100);
    expect(factors).toHaveLength(1);
    expect(factors[0].factor).toBe('High income level');
    expect(factors[0].impact).toBe('positive');
  });

  it('returns 80 for good income (10000–19999)', () => {
    const factors: CreditScoreFactor[] = [];
    const score = applyThresholdRules(15000, INCOME_RULES, 'Income', factors);
    expect(score).toBe(80);
    expect(factors[0].factor).toBe('Good income level');
  });

  it('returns 60 for moderate income (5000–9999)', () => {
    const factors: CreditScoreFactor[] = [];
    const score = applyThresholdRules(7000, INCOME_RULES, 'Income', factors);
    expect(score).toBe(60);
    expect(factors[0].factor).toBe('Moderate income');
  });

  it('returns 40 for low income (3000–4999)', () => {
    const factors: CreditScoreFactor[] = [];
    const score = applyThresholdRules(4000, INCOME_RULES, 'Income', factors);
    expect(score).toBe(40);
    expect(factors[0].impact).toBe('negative');
  });

  it('returns 20 for income below minimum (<= 2999)', () => {
    const factors: CreditScoreFactor[] = [];
    const score = applyThresholdRules(2000, INCOME_RULES, 'Income', factors);
    expect(score).toBe(20);
    expect(factors[0].factor).toBe('Income below minimum');
  });

  it('uses dynamicDescription callback when provided', () => {
    const factors: CreditScoreFactor[] = [];
    applyThresholdRules(25000, INCOME_RULES, 'Income', factors, (_rule, val) => `Custom: ${val}`);
    expect(factors[0].description).toBe('Custom: 25000');
  });
});

// ============================================================================
// applyThresholdRules — DTI
// ============================================================================
describe('applyThresholdRules — DTI', () => {
  it('returns 100 for excellent DTI (<= 20%)', () => {
    const factors: CreditScoreFactor[] = [];
    const score = applyThresholdRules(15, DTI_RULES, 'Debt', factors);
    expect(score).toBe(100);
  });

  it('returns 80 for good DTI (21–30%)', () => {
    const factors: CreditScoreFactor[] = [];
    const score = applyThresholdRules(25, DTI_RULES, 'Debt', factors);
    expect(score).toBe(80);
  });

  it('returns 50 for moderate DTI (31–40%)', () => {
    const factors: CreditScoreFactor[] = [];
    const score = applyThresholdRules(35, DTI_RULES, 'Debt', factors);
    expect(score).toBe(50);
  });

  it('returns 20 for high DTI (>= 41%)', () => {
    const factors: CreditScoreFactor[] = [];
    const score = applyThresholdRules(45, DTI_RULES, 'Debt', factors);
    expect(score).toBe(20);
  });
});

// ============================================================================
// applyThresholdRules — Employment Duration
// ============================================================================
describe('applyThresholdRules — Employment Duration', () => {
  it('returns 50 for 24+ months', () => {
    const factors: CreditScoreFactor[] = [];
    const score = applyThresholdRules(36, EMPLOYMENT_DURATION_RULES, 'Employment', factors);
    expect(score).toBe(50);
  });

  it('returns 30 for 12–23 months', () => {
    const factors: CreditScoreFactor[] = [];
    const score = applyThresholdRules(18, EMPLOYMENT_DURATION_RULES, 'Employment', factors);
    expect(score).toBe(30);
  });

  it('returns 15 for 3–11 months', () => {
    const factors: CreditScoreFactor[] = [];
    const score = applyThresholdRules(6, EMPLOYMENT_DURATION_RULES, 'Employment', factors);
    expect(score).toBe(15);
  });

  it('returns 0 for < 3 months', () => {
    const factors: CreditScoreFactor[] = [];
    const score = applyThresholdRules(1, EMPLOYMENT_DURATION_RULES, 'Employment', factors);
    expect(score).toBe(0);
    expect(factors[0].impact).toBe('negative');
  });
});

// ============================================================================
// applyConditionRules — Verification
// ============================================================================
describe('applyConditionRules — Verification', () => {
  it('returns 100 when all 3 verifications are true', () => {
    const factors: CreditScoreFactor[] = [];
    const f = makeFactors({
      hasVerifiedId: true,
      hasVerifiedAddress: true,
      hasVerifiedEmployment: true,
    });
    const score = applyConditionRules(f, VERIFICATION_RULES, factors);
    expect(score).toBe(40 + 30 + 30); // 100
    expect(factors).toHaveLength(3);
  });

  it('returns 0 when no verifications are true', () => {
    const factors: CreditScoreFactor[] = [];
    const f = makeFactors({
      hasVerifiedId: false,
      hasVerifiedAddress: false,
      hasVerifiedEmployment: false,
    });
    const score = applyConditionRules(f, VERIFICATION_RULES, factors);
    expect(score).toBe(0);
    expect(factors).toHaveLength(0);
  });

  it('returns partial score for partial verifications', () => {
    const factors: CreditScoreFactor[] = [];
    const f = makeFactors({
      hasVerifiedId: true,
      hasVerifiedAddress: false,
      hasVerifiedEmployment: true,
    });
    const score = applyConditionRules(f, VERIFICATION_RULES, factors);
    expect(score).toBe(40 + 30); // 70
    expect(factors).toHaveLength(2);
  });

  it('pushes correct factor details per matching rule', () => {
    const factors: CreditScoreFactor[] = [];
    const f = makeFactors({
      hasVerifiedId: true,
      hasVerifiedAddress: false,
      hasVerifiedEmployment: false,
    });
    applyConditionRules(f, VERIFICATION_RULES, factors);
    expect(factors[0].category).toBe('Verification');
    expect(factors[0].factor).toBe('ID verified');
    expect(factors[0].impact).toBe('positive');
  });
});

// ============================================================================
// generateRecommendationsFromRules
// ============================================================================
describe('generateRecommendationsFromRules', () => {
  it('returns empty array when there are no negative factors', () => {
    const positiveFactors: CreditScoreFactor[] = [
      {
        category: 'Income',
        factor: 'High income level',
        impact: 'positive',
        weight: 25,
        description: 'Good',
      },
    ];
    const result = generateRecommendationsFromRules(makeFactors(), positiveFactors, 800);
    expect(result).toEqual([]);
  });

  it('returns income recommendation for negative income factor', () => {
    const factors: CreditScoreFactor[] = [
      {
        category: 'Income',
        factor: 'Low income',
        impact: 'negative',
        weight: -10,
        description: 'Low',
      },
    ];
    const result = generateRecommendationsFromRules(makeFactors(), factors, 650);
    expect(result.some((r) => r.includes('income'))).toBe(true);
  });

  it('returns verification recommendation when ID is not verified', () => {
    const factors: CreditScoreFactor[] = [];
    const f = makeFactors({ hasVerifiedId: false });
    const result = generateRecommendationsFromRules(f, factors, 700);
    expect(result.some((r) => r.includes('ID verification'))).toBe(true);
  });

  it('returns score-based recommendations for score < 580', () => {
    const factors: CreditScoreFactor[] = [];
    const result = generateRecommendationsFromRules(makeFactors(), factors, 500);
    expect(result.some((r) => r.includes('smaller loan amount'))).toBe(true);
  });

  it('limits recommendations to max 5', () => {
    // Create many negative factors to generate many recommendations
    const factors: CreditScoreFactor[] = [
      {
        category: 'Income',
        factor: 'Low income',
        impact: 'negative',
        weight: -10,
        description: '',
      },
      { category: 'Debt', factor: 'High debt', impact: 'negative', weight: -15, description: '' },
      {
        category: 'Employment',
        factor: 'New employment',
        impact: 'negative',
        weight: -5,
        description: '',
      },
      {
        category: 'History',
        factor: 'Has default',
        impact: 'negative',
        weight: -20,
        description: '',
      },
      {
        category: 'History',
        factor: 'Has late payments',
        impact: 'negative',
        weight: -10,
        description: '',
      },
    ];
    const f = makeFactors({ hasVerifiedId: false, hasVerifiedEmployment: false });
    const result = generateRecommendationsFromRules(f, factors, 400);
    expect(result.length).toBeLessThanOrEqual(5);
  });
});

// ============================================================================
// getRiskLevelFromScore
// ============================================================================
describe('getRiskLevelFromScore', () => {
  it('returns "low" for score >= 750', () => {
    expect(getRiskLevelFromScore(750)).toBe('low');
    expect(getRiskLevelFromScore(850)).toBe('low');
  });

  it('returns "medium" for 670–749', () => {
    expect(getRiskLevelFromScore(700)).toBe('medium');
    expect(getRiskLevelFromScore(670)).toBe('medium');
  });

  it('returns "high" for 580–669', () => {
    expect(getRiskLevelFromScore(600)).toBe('high');
    expect(getRiskLevelFromScore(580)).toBe('high');
  });

  it('returns "very_high" for < 580', () => {
    expect(getRiskLevelFromScore(500)).toBe('very_high');
    expect(getRiskLevelFromScore(300)).toBe('very_high');
  });
});

// ============================================================================
// getRateAdjustment
// ============================================================================
describe('getRateAdjustment', () => {
  it('returns 0 for low risk', () => {
    expect(getRateAdjustment('low')).toBe(0);
  });

  it('returns 5 for medium risk', () => {
    expect(getRateAdjustment('medium')).toBe(5);
  });

  it('returns 10 for high risk', () => {
    expect(getRateAdjustment('high')).toBe(10);
  });

  it('returns 14 for very_high risk', () => {
    expect(getRateAdjustment('very_high')).toBe(14);
  });
});
