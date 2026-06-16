/**
 * Tenant credit-policy guardrails and lending-time enforcement.
 *
 * Tenant policy lives in `institutionConfig`, but platform guardrails remain non-negotiable:
 * APR <= 32%, KYC minimums enabled, and effective rates never exceed the configured maximum.
 */

import { GenericMutationCtx, GenericQueryCtx } from 'convex/server';
import { ConvexError, v } from 'convex/values';
import { DataModel, Doc, Id } from '../_generated/dataModel';
import { APR_LIMIT } from './regulatory';

type AnyCtx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>;

export const CREDIT_POLICY_KEY = 'credit.policy';

export const creditPolicyValidator = v.object({
  minLoanAmount: v.number(),
  maxLoanAmount: v.number(),
  minTermMonths: v.number(),
  maxTermMonths: v.number(),
  baseInterestRate: v.number(),
  maxInterestRate: v.number(),
  riskPremiumLow: v.number(),
  riskPremiumMedium: v.number(),
  riskPremiumHigh: v.number(),
  minMonthlyIncome: v.number(),
  maxDebtToIncome: v.number(),
  minEmploymentMonths: v.number(),
  requireVerification: v.boolean(),
  requireDocuments: v.boolean(),
  autoApproveThreshold: v.number(),
  autoRejectThreshold: v.number(),
  manualReviewRequired: v.boolean(),
  originationFeePercent: v.number(),
  latePaymentFeePercent: v.number(),
  gracePeriodDays: v.number(),
});

export interface CreditPolicy {
  minLoanAmount: number;
  maxLoanAmount: number;
  minTermMonths: number;
  maxTermMonths: number;
  baseInterestRate: number;
  maxInterestRate: number;
  riskPremiumLow: number;
  riskPremiumMedium: number;
  riskPremiumHigh: number;
  minMonthlyIncome: number;
  maxDebtToIncome: number;
  minEmploymentMonths: number;
  requireVerification: boolean;
  requireDocuments: boolean;
  autoApproveThreshold: number;
  autoRejectThreshold: number;
  manualReviewRequired: boolean;
  originationFeePercent: number;
  latePaymentFeePercent: number;
  gracePeriodDays: number;
}

export const DEFAULT_CREDIT_POLICY: CreditPolicy = {
  minLoanAmount: 500,
  maxLoanAmount: 50_000,
  minTermMonths: 3,
  maxTermMonths: 24,
  baseInterestRate: 18,
  maxInterestRate: APR_LIMIT,
  riskPremiumLow: 0,
  riskPremiumMedium: 5,
  riskPremiumHigh: 10,
  minMonthlyIncome: 3_000,
  maxDebtToIncome: 40,
  minEmploymentMonths: 3,
  requireVerification: true,
  requireDocuments: true,
  autoApproveThreshold: 80,
  autoRejectThreshold: 30,
  manualReviewRequired: true,
  originationFeePercent: 2,
  latePaymentFeePercent: 5,
  gracePeriodDays: 5,
};

interface LoanPolicyInput {
  principal: number;
  termMonths: number;
  interestRate: number;
  monthlyIncome?: number;
  debtToIncomeRatio?: number;
}

function assertRange(condition: boolean, message: string): void {
  if (!condition) {
    throw new ConvexError({ code: 'GUARDRAIL_VIOLATION', message });
  }
}

function throwPolicyViolation(message: string): never {
  throw new ConvexError({ code: 'CREDIT_POLICY_VIOLATION', message });
}

function normalizeDebtToIncomePercent(value: number): number {
  return value <= 1 ? value * 100 : value;
}

export function validateCreditPolicy(policy: CreditPolicy): void {
  assertRange(policy.minLoanAmount > 0, 'Minimum loan amount must be positive.');
  assertRange(
    policy.maxLoanAmount >= policy.minLoanAmount,
    'Maximum loan amount must be greater than or equal to minimum loan amount.'
  );
  assertRange(policy.minTermMonths > 0, 'Minimum term must be positive.');
  assertRange(
    policy.maxTermMonths >= policy.minTermMonths,
    'Maximum term must be greater than or equal to minimum term.'
  );
  assertRange(policy.baseInterestRate >= 0, 'Base interest rate cannot be negative.');
  assertRange(policy.maxInterestRate >= 0, 'Maximum interest rate cannot be negative.');
  assertRange(
    policy.baseInterestRate <= APR_LIMIT,
    `Base interest rate cannot exceed ${APR_LIMIT}% APR.`
  );
  assertRange(
    policy.maxInterestRate <= APR_LIMIT,
    `Maximum interest rate cannot exceed ${APR_LIMIT}% APR.`
  );
  assertRange(
    policy.baseInterestRate <= policy.maxInterestRate,
    'Base interest rate cannot exceed maximum interest rate.'
  );

  for (const [label, premium] of [
    ['Low risk premium', policy.riskPremiumLow],
    ['Medium risk premium', policy.riskPremiumMedium],
    ['High risk premium', policy.riskPremiumHigh],
  ] as const) {
    assertRange(premium >= 0, `${label} cannot be negative.`);
    assertRange(
      policy.baseInterestRate + premium <= policy.maxInterestRate,
      `${label} pushes the effective rate above the tenant maximum interest rate.`
    );
    assertRange(
      policy.baseInterestRate + premium <= APR_LIMIT,
      `${label} pushes the effective rate above the ${APR_LIMIT}% APR platform cap.`
    );
  }

  assertRange(policy.maxDebtToIncome <= 50, 'Maximum debt-to-income ratio cannot exceed 50%.');
  assertRange(policy.minMonthlyIncome >= 0, 'Minimum monthly income cannot be negative.');
  assertRange(policy.minEmploymentMonths >= 0, 'Minimum employment months cannot be negative.');
  assertRange(policy.requireVerification, 'KYC verification is a platform guardrail.');
  assertRange(policy.requireDocuments, 'KYC document collection is a platform guardrail.');
  assertRange(
    policy.autoApproveThreshold >= policy.autoRejectThreshold,
    'Auto-approve threshold must be greater than or equal to auto-reject threshold.'
  );
  for (const [label, value] of [
    ['Origination fee', policy.originationFeePercent],
    ['Late payment fee', policy.latePaymentFeePercent],
    ['Grace period', policy.gracePeriodDays],
  ] as const) {
    assertRange(value >= 0, `${label} cannot be negative.`);
  }
}

export async function getCurrentCreditPolicyConfig(
  ctx: AnyCtx,
  institutionId: Id<'institutions'>
): Promise<Doc<'institutionConfig'> | null> {
  const rows = await ctx.db
    .query('institutionConfig')
    .withIndex('by_institution_key', (q) =>
      q.eq('institutionId', institutionId).eq('key', CREDIT_POLICY_KEY)
    )
    .collect();
  const now = Date.now();
  return (
    rows
      .filter((r) => r.effectiveFrom <= now && (r.effectiveTo === undefined || r.effectiveTo > now))
      .sort((a, b) => b.version - a.version)[0] ?? null
  );
}

export async function getEffectiveCreditPolicy(
  ctx: AnyCtx,
  institutionId?: Id<'institutions'>
): Promise<CreditPolicy> {
  if (!institutionId) return DEFAULT_CREDIT_POLICY;
  const current = await getCurrentCreditPolicyConfig(ctx, institutionId);
  return (current?.value as CreditPolicy | undefined) ?? DEFAULT_CREDIT_POLICY;
}

export async function assertLoanWithinCreditPolicy(
  ctx: AnyCtx,
  loan: LoanPolicyInput,
  institutionId?: Id<'institutions'>,
  opts: { requireFinancials?: boolean } = {}
): Promise<void> {
  const policy = await getEffectiveCreditPolicy(ctx, institutionId);

  if (loan.principal < policy.minLoanAmount) {
    throwPolicyViolation(
      `Principal N$${loan.principal} is below tenant minimum N$${policy.minLoanAmount}.`
    );
  }
  if (loan.principal > policy.maxLoanAmount) {
    throwPolicyViolation(
      `Principal N$${loan.principal} exceeds tenant maximum N$${policy.maxLoanAmount}.`
    );
  }
  if (loan.termMonths < policy.minTermMonths) {
    throwPolicyViolation(
      `Term ${loan.termMonths}mo is below tenant minimum ${policy.minTermMonths}mo.`
    );
  }
  if (loan.termMonths > policy.maxTermMonths) {
    throwPolicyViolation(
      `Term ${loan.termMonths}mo exceeds tenant maximum ${policy.maxTermMonths}mo.`
    );
  }
  if (loan.interestRate > policy.maxInterestRate) {
    throwPolicyViolation(
      `Interest rate ${loan.interestRate}% exceeds tenant maximum ${policy.maxInterestRate}%.`
    );
  }

  if (!opts.requireFinancials) return;

  if (loan.monthlyIncome === undefined) {
    throwPolicyViolation('Monthly income is required before approval.');
  }
  if (loan.monthlyIncome < policy.minMonthlyIncome) {
    throwPolicyViolation(
      `Monthly income N$${loan.monthlyIncome} is below tenant minimum N$${policy.minMonthlyIncome}.`
    );
  }

  if (loan.debtToIncomeRatio === undefined) {
    throwPolicyViolation('Debt-to-income ratio is required before approval.');
  }
  const dtiPercent = normalizeDebtToIncomePercent(loan.debtToIncomeRatio);
  if (dtiPercent > policy.maxDebtToIncome) {
    throwPolicyViolation(
      `Debt-to-income ratio ${dtiPercent.toFixed(2)}% exceeds tenant maximum ${policy.maxDebtToIncome}%.`
    );
  }
}
