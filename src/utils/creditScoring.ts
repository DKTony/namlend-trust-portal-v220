/**
 * Pure credit scoring utilities — re-exported from the service layer.
 * Only the algorithmic (non-Supabase) exports are surfaced here.
 * UI components should import from this module, not from @/services/creditScoring.
 */

export {
  CREDIT_SCORE_RANGES,
  calculateCreditScore,
  getLoanRecommendation,
} from '@/services/creditScoring';

export type {
  CreditFactors,
  CreditScore,
  CreditScoreFactor,
  LoanRecommendation,
  RiskLevel,
} from '@/services/creditScoring';
