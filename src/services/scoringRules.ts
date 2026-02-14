/**
 * Declarative Credit Scoring Rule Engine
 * Replaces procedural scoring functions with configuration-driven rules
 * ~250 lines of procedural code → ~100 lines of declarative rules
 */

import type { CreditFactors, CreditScoreFactor } from './creditScoring';

// ============ Rule Types ============

export interface ScoringRule {
  category: string;
  condition: (factors: CreditFactors) => boolean;
  score: number;
  factor: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number;
  description: string | ((factors: CreditFactors) => string);
}

export interface ThresholdRule {
  min?: number;
  max?: number;
  score: number;
  factor: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number;
  description: string;
}

// ============ Income Scoring Rules ============

export const INCOME_RULES: ThresholdRule[] = [
  { min: 20000, score: 100, factor: 'High income level', impact: 'positive', weight: 25, description: 'Strong income provides good repayment capacity' },
  { min: 10000, max: 19999, score: 80, factor: 'Good income level', impact: 'positive', weight: 20, description: 'Adequate income for loan repayment' },
  { min: 5000, max: 9999, score: 60, factor: 'Moderate income', impact: 'neutral', weight: 15, description: 'Income meets minimum requirements' },
  { min: 3000, max: 4999, score: 40, factor: 'Low income', impact: 'negative', weight: -10, description: 'Income near minimum threshold' },
  { max: 2999, score: 20, factor: 'Income below minimum', impact: 'negative', weight: -20, description: 'Income does not meet minimum requirements' },
];

// ============ DTI Scoring Rules ============

export const DTI_RULES: ThresholdRule[] = [
  { max: 20, score: 100, factor: 'Excellent debt-to-income ratio', impact: 'positive', weight: 20, description: 'DTI indicates strong financial position' },
  { min: 21, max: 30, score: 80, factor: 'Good debt-to-income ratio', impact: 'positive', weight: 15, description: 'DTI is within acceptable range' },
  { min: 31, max: 40, score: 50, factor: 'Moderate debt-to-income ratio', impact: 'neutral', weight: 0, description: 'DTI is approaching limits' },
  { min: 41, score: 20, factor: 'High debt-to-income ratio', impact: 'negative', weight: -15, description: 'DTI indicates potential repayment stress' },
];

// ============ Employment Duration Rules ============

export const EMPLOYMENT_DURATION_RULES: ThresholdRule[] = [
  { min: 24, score: 50, factor: 'Stable employment', impact: 'positive', weight: 15, description: '2+ years at current employer' },
  { min: 12, max: 23, score: 30, factor: 'Good employment history', impact: 'positive', weight: 10, description: '1+ year at current employer' },
  { min: 3, max: 11, score: 15, factor: 'Recent employment', impact: 'neutral', weight: 5, description: 'Less than 1 year at current employer' },
  { max: 2, score: 0, factor: 'New employment', impact: 'negative', weight: -5, description: 'Less than 3 months at current employer' },
];

// ============ Verification Rules ============

export const VERIFICATION_RULES: ScoringRule[] = [
  { category: 'Verification', condition: (f) => f.hasVerifiedId, score: 40, factor: 'ID verified', impact: 'positive', weight: 5, description: 'Identity has been verified' },
  { category: 'Verification', condition: (f) => f.hasVerifiedAddress, score: 30, factor: 'Address verified', impact: 'positive', weight: 3, description: 'Address has been verified' },
  { category: 'Verification', condition: (f) => f.hasVerifiedEmployment, score: 30, factor: 'Employment verified', impact: 'positive', weight: 5, description: 'Employment has been verified' },
];

// ============ Risk Level Thresholds ============

export const RISK_THRESHOLDS = {
  LOW: 750,
  MEDIUM: 670,
  HIGH: 580,
} as const;

// ============ Rate Adjustments by Risk ============

export const RATE_ADJUSTMENTS: Record<string, number> = {
  low: 0,
  medium: 5,
  high: 10,
  very_high: 14, // Will hit MAX_RATE of 32%
};

// ============ Recommendation Rules ============

export interface RecommendationRule {
  category: string;
  factorPattern?: string;
  condition?: (factors: CreditFactors, score: number) => boolean;
  recommendation: string;
}

export const RECOMMENDATION_RULES: RecommendationRule[] = [
  { category: 'Income', recommendation: 'Consider providing additional income documentation' },
  { category: 'Debt', recommendation: 'Pay down existing debt to improve your debt-to-income ratio' },
  { category: 'Employment', recommendation: 'Maintain stable employment to improve creditworthiness' },
  { category: 'History', factorPattern: 'default', recommendation: 'Work on rebuilding credit by making all payments on time' },
  { category: 'History', factorPattern: 'late', recommendation: 'Set up payment reminders to avoid late payments' },
];

export const VERIFICATION_RECOMMENDATIONS = [
  { condition: (f: CreditFactors) => !f.hasVerifiedId, recommendation: 'Complete ID verification to improve your application' },
  { condition: (f: CreditFactors) => !f.hasVerifiedEmployment, recommendation: 'Provide employment verification documents' },
];

export const SCORE_BASED_RECOMMENDATIONS = [
  { maxScore: 580, recommendations: ['Consider a smaller loan amount to increase approval chances', 'A longer repayment term may reduce monthly payments'] },
];

// ============ Rule Engine Functions ============

/**
 * Apply threshold rules to a numeric value and return score + factor
 */
export function applyThresholdRules(
  value: number,
  rules: ThresholdRule[],
  category: string,
  scoreFactors: CreditScoreFactor[],
  dynamicDescription?: (rule: ThresholdRule, value: number) => string
): number {
  for (const rule of rules) {
    const minMatch = rule.min === undefined || value >= rule.min;
    const maxMatch = rule.max === undefined || value <= rule.max;
    
    if (minMatch && maxMatch) {
      const description = dynamicDescription 
        ? dynamicDescription(rule, value)
        : rule.description;
      
      scoreFactors.push({
        category,
        factor: rule.factor,
        impact: rule.impact,
        weight: rule.weight,
        description,
      });
      
      return rule.score;
    }
  }
  
  return 0;
}

/**
 * Apply condition-based rules and sum scores
 */
export function applyConditionRules(
  factors: CreditFactors,
  rules: ScoringRule[],
  scoreFactors: CreditScoreFactor[]
): number {
  let totalScore = 0;
  
  for (const rule of rules) {
    if (rule.condition(factors)) {
      const description = typeof rule.description === 'function'
        ? rule.description(factors)
        : rule.description;
      
      scoreFactors.push({
        category: rule.category,
        factor: rule.factor,
        impact: rule.impact,
        weight: rule.weight,
        description,
      });
      
      totalScore += rule.score;
    }
  }
  
  return totalScore;
}

/**
 * Generate recommendations based on negative factors
 */
export function generateRecommendationsFromRules(
  factors: CreditFactors,
  scoreFactors: CreditScoreFactor[],
  score: number
): string[] {
  const recommendations: string[] = [];
  const negativeFactors = scoreFactors.filter(f => f.impact === 'negative');
  
  // Apply category-based recommendations
  for (const factor of negativeFactors) {
    for (const rule of RECOMMENDATION_RULES) {
      if (factor.category === rule.category) {
        if (!rule.factorPattern || factor.factor.toLowerCase().includes(rule.factorPattern)) {
          if (!recommendations.includes(rule.recommendation)) {
            recommendations.push(rule.recommendation);
          }
        }
      }
    }
  }
  
  // Apply verification recommendations
  for (const rec of VERIFICATION_RECOMMENDATIONS) {
    if (rec.condition(factors) && !recommendations.includes(rec.recommendation)) {
      recommendations.push(rec.recommendation);
    }
  }
  
  // Apply score-based recommendations
  for (const rec of SCORE_BASED_RECOMMENDATIONS) {
    if (score < rec.maxScore) {
      for (const r of rec.recommendations) {
        if (!recommendations.includes(r)) {
          recommendations.push(r);
        }
      }
    }
  }
  
  return recommendations.slice(0, 5);
}

/**
 * Get risk level from score using thresholds
 */
export function getRiskLevelFromScore(score: number): 'low' | 'medium' | 'high' | 'very_high' {
  if (score >= RISK_THRESHOLDS.LOW) return 'low';
  if (score >= RISK_THRESHOLDS.MEDIUM) return 'medium';
  if (score >= RISK_THRESHOLDS.HIGH) return 'high';
  return 'very_high';
}

/**
 * Get interest rate adjustment for risk level
 */
export function getRateAdjustment(riskLevel: string): number {
  return RATE_ADJUSTMENTS[riskLevel] || 0;
}

export default {
  INCOME_RULES,
  DTI_RULES,
  EMPLOYMENT_DURATION_RULES,
  VERIFICATION_RULES,
  RISK_THRESHOLDS,
  RATE_ADJUSTMENTS,
  RECOMMENDATION_RULES,
  applyThresholdRules,
  applyConditionRules,
  generateRecommendationsFromRules,
  getRiskLevelFromScore,
  getRateAdjustment,
};
