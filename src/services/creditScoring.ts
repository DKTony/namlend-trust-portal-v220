/**
 * AI-Powered Credit Scoring Service
 * Provides intelligent credit risk assessment and loan recommendations
 */

import { supabase } from '@/integrations/supabase/client';

// Credit Score Ranges (similar to credit bureau ranges)
export const CREDIT_SCORE_RANGES = {
  EXCELLENT: { min: 750, max: 850, label: 'Excellent', color: 'green' },
  GOOD: { min: 670, max: 749, label: 'Good', color: 'blue' },
  FAIR: { min: 580, max: 669, label: 'Fair', color: 'yellow' },
  POOR: { min: 300, max: 579, label: 'Poor', color: 'red' },
};

export type RiskLevel = 'low' | 'medium' | 'high' | 'very_high';

export interface CreditFactors {
  // Income & Employment
  monthlyIncome: number;
  employmentStatus: string;
  employmentDuration: number; // months

  // Existing Debt
  existingDebt: number;
  monthlyDebtPayments: number;

  // Loan Request
  requestedAmount: number;
  requestedTerm: number;

  // Profile
  age?: number;
  hasVerifiedId: boolean;
  hasVerifiedAddress: boolean;
  hasVerifiedEmployment: boolean;

  // History (if available)
  previousLoans: number;
  paidOnTime: number;
  defaults: number;
  latePayments: number;
}

export interface CreditScore {
  score: number;
  scoreRange: keyof typeof CREDIT_SCORE_RANGES;
  riskLevel: RiskLevel;
  factors: CreditScoreFactor[];
  recommendations: string[];
  maxApprovedAmount: number;
  suggestedInterestRate: number;
  debtToIncomeRatio: number;
  affordabilityScore: number;
}

export interface CreditScoreFactor {
  category: string;
  factor: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number;
  description: string;
}

export interface LoanRecommendation {
  approved: boolean;
  approvedAmount: number;
  suggestedTerm: number;
  interestRate: number;
  monthlyPayment: number;
  totalRepayment: number;
  reasons: string[];
  conditions?: string[];
}

// Scoring weights (add up to 100%)
const SCORING_WEIGHTS = {
  INCOME: 0.25, // 25% - Stable income
  DEBT_RATIO: 0.2, // 20% - Debt-to-income ratio
  EMPLOYMENT: 0.15, // 15% - Employment stability
  PAYMENT_HISTORY: 0.2, // 20% - Past payment behavior
  VERIFICATION: 0.1, // 10% - Identity verification
  LOAN_HISTORY: 0.1, // 10% - Previous loan history
};

// Base interest rate (regulatory max is 32%)
const BASE_RATE = 18;
const MAX_RATE = 32;

/**
 * Calculate credit score from provided factors
 */
export function calculateCreditScore(factors: CreditFactors): CreditScore {
  const scoreFactors: CreditScoreFactor[] = [];
  let totalScore = 0;

  // 1. Income Assessment (25%)
  const incomeScore = calculateIncomeScore(factors, scoreFactors);
  totalScore += incomeScore * SCORING_WEIGHTS.INCOME;

  // 2. Debt-to-Income Ratio (20%)
  const dtiScore = calculateDTIScore(factors, scoreFactors);
  totalScore += dtiScore * SCORING_WEIGHTS.DEBT_RATIO;

  // 3. Employment Stability (15%)
  const employmentScore = calculateEmploymentScore(factors, scoreFactors);
  totalScore += employmentScore * SCORING_WEIGHTS.EMPLOYMENT;

  // 4. Payment History (20%)
  const paymentScore = calculatePaymentHistoryScore(factors, scoreFactors);
  totalScore += paymentScore * SCORING_WEIGHTS.PAYMENT_HISTORY;

  // 5. Verification Status (10%)
  const verificationScore = calculateVerificationScore(factors, scoreFactors);
  totalScore += verificationScore * SCORING_WEIGHTS.VERIFICATION;

  // 6. Loan History (10%)
  const loanHistoryScore = calculateLoanHistoryScore(factors, scoreFactors);
  totalScore += loanHistoryScore * SCORING_WEIGHTS.LOAN_HISTORY;

  // Convert to credit score range (300-850)
  const creditScore = Math.round(300 + (totalScore / 100) * 550);
  const clampedScore = Math.max(300, Math.min(850, creditScore));

  // Determine score range
  const scoreRange = getScoreRange(clampedScore);
  const riskLevel = getRiskLevel(clampedScore);

  // Calculate key metrics
  const dti = calculateDTI(factors);
  const affordability = calculateAffordability(factors);
  const maxApproved = calculateMaxApprovedAmount(factors, clampedScore);
  const suggestedRate = calculateSuggestedRate(clampedScore, riskLevel);

  // Generate recommendations
  const recommendations = generateRecommendations(factors, scoreFactors, clampedScore);

  return {
    score: clampedScore,
    scoreRange,
    riskLevel,
    factors: scoreFactors,
    recommendations,
    maxApprovedAmount: maxApproved,
    suggestedInterestRate: suggestedRate,
    debtToIncomeRatio: dti,
    affordabilityScore: affordability,
  };
}

/**
 * Get loan recommendation based on credit score and factors
 */
export function getLoanRecommendation(
  factors: CreditFactors,
  creditScore: CreditScore
): LoanRecommendation {
  const reasons: string[] = [];
  const conditions: string[] = [];

  // Check minimum requirements
  if (creditScore.score < 400) {
    return {
      approved: false,
      approvedAmount: 0,
      suggestedTerm: 0,
      interestRate: 0,
      monthlyPayment: 0,
      totalRepayment: 0,
      reasons: [
        'Credit score below minimum threshold',
        'Please improve your credit standing and try again',
      ],
    };
  }

  // Check DTI
  if (creditScore.debtToIncomeRatio > 50) {
    return {
      approved: false,
      approvedAmount: 0,
      suggestedTerm: 0,
      interestRate: 0,
      monthlyPayment: 0,
      totalRepayment: 0,
      reasons: ['Debt-to-income ratio too high', 'Consider reducing existing debt before applying'],
    };
  }

  // Check income
  if (factors.monthlyIncome < 3000) {
    return {
      approved: false,
      approvedAmount: 0,
      suggestedTerm: 0,
      interestRate: 0,
      monthlyPayment: 0,
      totalRepayment: 0,
      reasons: ['Monthly income below minimum requirement (N$3,000)'],
    };
  }

  // Calculate approved amount
  let approvedAmount = Math.min(factors.requestedAmount, creditScore.maxApprovedAmount);

  // Determine optimal term
  let suggestedTerm = factors.requestedTerm;
  const monthlyPayment = calculateMonthlyPayment(
    approvedAmount,
    creditScore.suggestedInterestRate,
    suggestedTerm
  );

  // Ensure payment is affordable (max 35% of income)
  const maxMonthlyPayment = factors.monthlyIncome * 0.35;
  if (monthlyPayment > maxMonthlyPayment) {
    // Try longer term
    suggestedTerm = Math.min(24, factors.requestedTerm + 6);
    const adjustedPayment = calculateMonthlyPayment(
      approvedAmount,
      creditScore.suggestedInterestRate,
      suggestedTerm
    );

    if (adjustedPayment > maxMonthlyPayment) {
      // Reduce amount
      approvedAmount = calculateMaxLoanFromPayment(
        maxMonthlyPayment,
        creditScore.suggestedInterestRate,
        suggestedTerm
      );
    }
  }

  const finalPayment = calculateMonthlyPayment(
    approvedAmount,
    creditScore.suggestedInterestRate,
    suggestedTerm
  );
  const totalRepayment = finalPayment * suggestedTerm;

  // Build reasons
  if (approvedAmount < factors.requestedAmount) {
    reasons.push(
      `Amount reduced from ${formatCurrency(factors.requestedAmount)} to ${formatCurrency(approvedAmount)} based on affordability`
    );
  }

  if (suggestedTerm !== factors.requestedTerm) {
    reasons.push(`Term adjusted to ${suggestedTerm} months for better affordability`);
  }

  if (creditScore.riskLevel === 'medium') {
    conditions.push('Subject to income verification');
  }

  if (creditScore.riskLevel === 'high') {
    conditions.push('Subject to additional documentation');
    conditions.push('May require co-signer');
  }

  if (!factors.hasVerifiedId) {
    conditions.push('ID verification required');
  }

  reasons.push(`Credit score: ${creditScore.score} (${creditScore.scoreRange})`);
  reasons.push(`Risk level: ${creditScore.riskLevel}`);

  return {
    approved: true,
    approvedAmount,
    suggestedTerm,
    interestRate: creditScore.suggestedInterestRate,
    monthlyPayment: finalPayment,
    totalRepayment,
    reasons,
    conditions: conditions.length > 0 ? conditions : undefined,
  };
}

// ============ Helper Functions ============

function calculateIncomeScore(factors: CreditFactors, scoreFactors: CreditScoreFactor[]): number {
  let score = 0;

  // Higher income = higher score
  if (factors.monthlyIncome >= 20000) {
    score = 100;
    scoreFactors.push({
      category: 'Income',
      factor: 'High income level',
      impact: 'positive',
      weight: 25,
      description: 'Strong income provides good repayment capacity',
    });
  } else if (factors.monthlyIncome >= 10000) {
    score = 80;
    scoreFactors.push({
      category: 'Income',
      factor: 'Good income level',
      impact: 'positive',
      weight: 20,
      description: 'Adequate income for loan repayment',
    });
  } else if (factors.monthlyIncome >= 5000) {
    score = 60;
    scoreFactors.push({
      category: 'Income',
      factor: 'Moderate income',
      impact: 'neutral',
      weight: 15,
      description: 'Income meets minimum requirements',
    });
  } else if (factors.monthlyIncome >= 3000) {
    score = 40;
    scoreFactors.push({
      category: 'Income',
      factor: 'Low income',
      impact: 'negative',
      weight: -10,
      description: 'Income near minimum threshold',
    });
  } else {
    score = 20;
    scoreFactors.push({
      category: 'Income',
      factor: 'Income below minimum',
      impact: 'negative',
      weight: -20,
      description: 'Income does not meet minimum requirements',
    });
  }

  return score;
}

function calculateDTIScore(factors: CreditFactors, scoreFactors: CreditScoreFactor[]): number {
  const dti = calculateDTI(factors);
  let score = 0;

  if (dti <= 20) {
    score = 100;
    scoreFactors.push({
      category: 'Debt',
      factor: 'Excellent debt-to-income ratio',
      impact: 'positive',
      weight: 20,
      description: `DTI of ${dti.toFixed(1)}% indicates strong financial position`,
    });
  } else if (dti <= 30) {
    score = 80;
    scoreFactors.push({
      category: 'Debt',
      factor: 'Good debt-to-income ratio',
      impact: 'positive',
      weight: 15,
      description: `DTI of ${dti.toFixed(1)}% is within acceptable range`,
    });
  } else if (dti <= 40) {
    score = 50;
    scoreFactors.push({
      category: 'Debt',
      factor: 'Moderate debt-to-income ratio',
      impact: 'neutral',
      weight: 0,
      description: `DTI of ${dti.toFixed(1)}% is approaching limits`,
    });
  } else {
    score = 20;
    scoreFactors.push({
      category: 'Debt',
      factor: 'High debt-to-income ratio',
      impact: 'negative',
      weight: -15,
      description: `DTI of ${dti.toFixed(1)}% indicates potential repayment stress`,
    });
  }

  return score;
}

function calculateEmploymentScore(
  factors: CreditFactors,
  scoreFactors: CreditScoreFactor[]
): number {
  let score = 0;

  // Employment status
  if (factors.employmentStatus === 'employed' || factors.employmentStatus === 'self_employed') {
    score += 50;

    // Employment duration
    if (factors.employmentDuration >= 24) {
      score += 50;
      scoreFactors.push({
        category: 'Employment',
        factor: 'Stable employment',
        impact: 'positive',
        weight: 15,
        description: `${Math.floor(factors.employmentDuration / 12)} years at current employer`,
      });
    } else if (factors.employmentDuration >= 12) {
      score += 30;
      scoreFactors.push({
        category: 'Employment',
        factor: 'Good employment history',
        impact: 'positive',
        weight: 10,
        description: '1+ year at current employer',
      });
    } else if (factors.employmentDuration >= 3) {
      score += 15;
      scoreFactors.push({
        category: 'Employment',
        factor: 'Recent employment',
        impact: 'neutral',
        weight: 5,
        description: 'Less than 1 year at current employer',
      });
    } else {
      scoreFactors.push({
        category: 'Employment',
        factor: 'New employment',
        impact: 'negative',
        weight: -5,
        description: 'Less than 3 months at current employer',
      });
    }
  } else {
    scoreFactors.push({
      category: 'Employment',
      factor: factors.employmentStatus === 'unemployed' ? 'Unemployed' : 'Non-standard employment',
      impact: 'negative',
      weight: -10,
      description: 'Employment status affects loan eligibility',
    });
  }

  return score;
}

function calculatePaymentHistoryScore(
  factors: CreditFactors,
  scoreFactors: CreditScoreFactor[]
): number {
  if (factors.previousLoans === 0) {
    scoreFactors.push({
      category: 'History',
      factor: 'No loan history',
      impact: 'neutral',
      weight: 0,
      description: 'First-time borrower',
    });
    return 50; // Neutral score for first-time borrowers
  }

  const onTimeRate = factors.paidOnTime / factors.previousLoans;
  let score = onTimeRate * 100;

  if (factors.defaults > 0) {
    score -= factors.defaults * 30;
    scoreFactors.push({
      category: 'History',
      factor: 'Previous defaults',
      impact: 'negative',
      weight: -25,
      description: `${factors.defaults} default(s) on record`,
    });
  }

  if (factors.latePayments > 0) {
    score -= factors.latePayments * 10;
    scoreFactors.push({
      category: 'History',
      factor: 'Late payments',
      impact: 'negative',
      weight: -10,
      description: `${factors.latePayments} late payment(s) recorded`,
    });
  }

  if (onTimeRate >= 0.95 && factors.defaults === 0) {
    scoreFactors.push({
      category: 'History',
      factor: 'Excellent payment history',
      impact: 'positive',
      weight: 20,
      description: '95%+ payments made on time',
    });
  }

  return Math.max(0, score);
}

function calculateVerificationScore(
  factors: CreditFactors,
  scoreFactors: CreditScoreFactor[]
): number {
  let score = 0;

  if (factors.hasVerifiedId) {
    score += 40;
    scoreFactors.push({
      category: 'Verification',
      factor: 'ID verified',
      impact: 'positive',
      weight: 5,
      description: 'Identity has been verified',
    });
  }

  if (factors.hasVerifiedAddress) {
    score += 30;
  }

  if (factors.hasVerifiedEmployment) {
    score += 30;
    scoreFactors.push({
      category: 'Verification',
      factor: 'Employment verified',
      impact: 'positive',
      weight: 5,
      description: 'Employment has been verified',
    });
  }

  return score;
}

function calculateLoanHistoryScore(
  factors: CreditFactors,
  scoreFactors: CreditScoreFactor[]
): number {
  if (factors.previousLoans === 0) {
    return 50;
  }

  const successfulLoans = factors.paidOnTime;

  if (successfulLoans >= 3 && factors.defaults === 0) {
    scoreFactors.push({
      category: 'Loan History',
      factor: 'Strong loan history',
      impact: 'positive',
      weight: 10,
      description: `${successfulLoans} successfully repaid loans`,
    });
    return 100;
  } else if (successfulLoans >= 1) {
    return 70;
  }

  return 30;
}

function calculateDTI(factors: CreditFactors): number {
  if (factors.monthlyIncome === 0) return 100;

  const proposedPayment = calculateMonthlyPayment(
    factors.requestedAmount,
    BASE_RATE,
    factors.requestedTerm
  );

  const totalDebt = factors.monthlyDebtPayments + proposedPayment;
  return (totalDebt / factors.monthlyIncome) * 100;
}

function calculateAffordability(factors: CreditFactors): number {
  const disposableIncome = factors.monthlyIncome - factors.monthlyDebtPayments;
  const proposedPayment = calculateMonthlyPayment(
    factors.requestedAmount,
    BASE_RATE,
    factors.requestedTerm
  );

  const affordabilityRatio = (disposableIncome - proposedPayment) / factors.monthlyIncome;
  return Math.max(0, Math.min(100, affordabilityRatio * 100));
}

function calculateMaxApprovedAmount(factors: CreditFactors, score: number): number {
  // Base max on income (6x monthly income max)
  let maxAmount = factors.monthlyIncome * 6;

  // Reduce based on existing debt
  maxAmount -= factors.existingDebt;

  // Adjust based on credit score
  if (score >= 750) {
    maxAmount *= 1.2;
  } else if (score >= 670) {
    maxAmount *= 1.0;
  } else if (score >= 580) {
    maxAmount *= 0.7;
  } else {
    maxAmount *= 0.4;
  }

  // Cap at reasonable limits
  return Math.max(500, Math.min(50000, Math.round(maxAmount)));
}

function calculateSuggestedRate(score: number, riskLevel: RiskLevel): number {
  void score;
  let rate = BASE_RATE;

  switch (riskLevel) {
    case 'low':
      rate = BASE_RATE;
      break;
    case 'medium':
      rate = BASE_RATE + 5;
      break;
    case 'high':
      rate = BASE_RATE + 10;
      break;
    case 'very_high':
      rate = MAX_RATE;
      break;
  }

  return Math.min(MAX_RATE, rate);
}

function getScoreRange(score: number): keyof typeof CREDIT_SCORE_RANGES {
  if (score >= CREDIT_SCORE_RANGES.EXCELLENT.min) return 'EXCELLENT';
  if (score >= CREDIT_SCORE_RANGES.GOOD.min) return 'GOOD';
  if (score >= CREDIT_SCORE_RANGES.FAIR.min) return 'FAIR';
  return 'POOR';
}

function getRiskLevel(score: number): RiskLevel {
  if (score >= 750) return 'low';
  if (score >= 670) return 'medium';
  if (score >= 580) return 'high';
  return 'very_high';
}

function generateRecommendations(
  factors: CreditFactors,
  scoreFactors: CreditScoreFactor[],
  score: number
): string[] {
  const recommendations: string[] = [];

  // Check for negative factors and provide recommendations
  const negativeFactors = scoreFactors.filter((f) => f.impact === 'negative');

  for (const factor of negativeFactors) {
    switch (factor.category) {
      case 'Income':
        recommendations.push('Consider providing additional income documentation');
        break;
      case 'Debt':
        recommendations.push('Pay down existing debt to improve your debt-to-income ratio');
        break;
      case 'Employment':
        recommendations.push('Maintain stable employment to improve creditworthiness');
        break;
      case 'History':
        if (factor.factor.includes('default')) {
          recommendations.push('Work on rebuilding credit by making all payments on time');
        } else if (factor.factor.includes('late')) {
          recommendations.push('Set up payment reminders to avoid late payments');
        }
        break;
    }
  }

  // Verification recommendations
  if (!factors.hasVerifiedId) {
    recommendations.push('Complete ID verification to improve your application');
  }
  if (!factors.hasVerifiedEmployment) {
    recommendations.push('Provide employment verification documents');
  }

  // Score-based recommendations
  if (score < 580) {
    recommendations.push('Consider a smaller loan amount to increase approval chances');
    recommendations.push('A longer repayment term may reduce monthly payments');
  }

  return recommendations.slice(0, 5); // Limit to 5 recommendations
}

function calculateMonthlyPayment(
  principal: number,
  annualRate: number,
  termMonths: number
): number {
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) return principal / termMonths;

  return (
    (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
    (Math.pow(1 + monthlyRate, termMonths) - 1)
  );
}

function calculateMaxLoanFromPayment(
  monthlyPayment: number,
  annualRate: number,
  termMonths: number
): number {
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) return monthlyPayment * termMonths;

  return (
    (monthlyPayment * (Math.pow(1 + monthlyRate, termMonths) - 1)) /
    (monthlyRate * Math.pow(1 + monthlyRate, termMonths))
  );
}

function formatCurrency(amount: number): string {
  return `N$${amount.toLocaleString('en-NA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/**
 * Fetch credit factors from user profile and loan history
 */
export async function getCreditFactorsForUser(userId: string): Promise<CreditFactors | null> {
  try {
    // Fetch profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!profile) return null;

    // Fetch loan history
    const { data: loans } = await supabase.from('loans').select('*').eq('user_id', userId);

    // Fetch payments
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .in(
        'loan_id',
        (loans || []).map((l) => l.id)
      );

    // Calculate history metrics
    const previousLoans = loans?.length || 0;
    const completedLoans = loans?.filter((l) => l.status === 'completed').length || 0;
    const defaultedLoans = loans?.filter((l) => l.status === 'defaulted').length || 0;
    const latePayments = payments?.filter((p) => p.status === 'late').length || 0;

    return {
      monthlyIncome: profile.monthly_income || 0,
      employmentStatus: profile.employment_status || 'unknown',
      employmentDuration: profile.employment_duration || 0,
      existingDebt: profile.existing_debt || 0,
      monthlyDebtPayments: profile.monthly_debt_payments || 0,
      requestedAmount: 0, // Set by caller
      requestedTerm: 0, // Set by caller
      hasVerifiedId: profile.verified || false,
      hasVerifiedAddress: profile.address_verified || false,
      hasVerifiedEmployment: profile.employment_verified || false,
      previousLoans,
      paidOnTime: completedLoans,
      defaults: defaultedLoans,
      latePayments,
    };
  } catch (error) {
    console.error('Error fetching credit factors:', error);
    return null;
  }
}

/**
 * Save credit score to database
 */
export async function saveCreditScore(
  userId: string,
  score: CreditScore,
  loanId?: string
): Promise<string | null> {
  try {
    // Mark previous scores as not current
    await supabase
      .from('credit_scores')
      .update({ is_current: false })
      .eq('user_id', userId)
      .eq('is_current', true);

    // Insert new score
    const { data, error } = await supabase
      .from('credit_scores')
      .insert({
        user_id: userId,
        loan_id: loanId,
        score: score.score,
        score_range: score.scoreRange,
        risk_level: score.riskLevel,
        debt_to_income_ratio: score.debtToIncomeRatio,
        affordability_score: score.affordabilityScore,
        max_approved_amount: score.maxApprovedAmount,
        suggested_interest_rate: score.suggestedInterestRate,
        factors: score.factors,
        recommendations: score.recommendations,
        is_current: true,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error saving credit score:', error);
      return null;
    }

    // Save factors
    if (data?.id && score.factors.length > 0) {
      await supabase.from('credit_score_factors').insert(
        score.factors.map((f) => ({
          credit_score_id: data.id,
          category: f.category,
          factor: f.factor,
          impact: f.impact,
          weight: f.weight,
          description: f.description,
        }))
      );
    }

    return data?.id || null;
  } catch (error) {
    console.error('Error in saveCreditScore:', error);
    return null;
  }
}

/**
 * Calculate credit score using database function
 */
export async function calculateCreditScoreDB(
  userId: string,
  loanId?: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('calculate_credit_score', {
      p_user_id: userId,
      p_loan_id: loanId || null,
      p_input_data: {},
    });

    if (error) {
      console.error('Error calculating credit score:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in calculateCreditScoreDB:', error);
    return null;
  }
}

/**
 * Get current credit score from database
 */
export async function getCurrentCreditScore(userId?: string): Promise<CreditScore | null> {
  try {
    const { data, error } = await supabase.rpc('get_current_credit_score', {
      p_user_id: userId || null,
    });

    if (error || !data || data.length === 0) {
      return null;
    }

    const row = data[0];
    return {
      score: row.score,
      scoreRange: row.score_range as keyof typeof CREDIT_SCORE_RANGES,
      riskLevel: row.risk_level as RiskLevel,
      factors: [],
      recommendations: [],
      maxApprovedAmount: row.max_approved_amount,
      suggestedInterestRate: row.suggested_interest_rate,
      debtToIncomeRatio: 0,
      affordabilityScore: 0,
    };
  } catch (error) {
    console.error('Error getting current credit score:', error);
    return null;
  }
}

export default {
  calculateCreditScore,
  getLoanRecommendation,
  getCreditFactorsForUser,
  saveCreditScore,
  calculateCreditScoreDB,
  getCurrentCreditScore,
  CREDIT_SCORE_RANGES,
};
