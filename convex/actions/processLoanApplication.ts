'use node';
/**
 * Process Loan Application Action.
 * Replaces the process-loan-application Supabase edge function.
 *
 * Runs background credit scoring and document validation after a loan is submitted.
 * Called from convex/loans.ts submitLoan mutation via ctx.scheduler.runAfter(0, ...).
 */

import { internalAction } from '../_generated/server';
import { internal } from '../_generated/api';
import { v } from 'convex/values';
import { APR_LIMIT } from '../lib/regulatory';

export const processLoanApplication = internalAction({
  args: {
    loanId: v.id('loans'),
    userId: v.id('users'),
    amount: v.number(),
    interestRate: v.number(),
    termMonths: v.number(),
    purpose: v.optional(v.string()),
    monthlyIncome: v.optional(v.number()),
    monthlyExpenses: v.optional(v.number()),
    existingDebt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    console.log(`[processLoanApplication] Starting for loan ${args.loanId}`);

    // Coarse stage tracker so a failure record points at where processing broke.
    let stage: 'scoring' | 'recordScore' | 'approvalRequest' | 'notification' | 'unknown' =
      'scoring';

    try {
      // 1. Fetch profile for credit scoring inputs
      const profile = await ctx.runQuery(internal.users.getProfileByUserId, {
        userId: args.userId,
      });

      if (!profile) {
        // Durable failure instead of a silent return — a missing profile must be visible.
        await ctx.runMutation(internal.loanProcessing.recordProcessingFailure, {
          loanId: args.loanId,
          stage: 'scoring',
          errorMessage: `Profile not found for user ${args.userId}`,
          errorCode: 'PROFILE_NOT_FOUND',
        });
        return;
      }

      // 2. Compute a basic credit score (300–850 range)
      // Prefer submitted financial data from application form; fall back to profile
      const income = args.monthlyIncome ?? profile.monthlyIncome ?? 0;

      const creditScore = computeCreditScore({
        kycStatus: profile.kycStatus,
        employmentStatus: profile.employmentStatus ?? '',
        monthlyIncome: income,
        requestedAmount: args.amount,
        interestRate: args.interestRate,
        termMonths: args.termMonths,
      });

      // 3. Determine initial recommendation
      const monthlyPayment = computeMonthlyPayment(args.amount, args.interestRate, args.termMonths);
      const dti = income > 0 ? monthlyPayment / income : 1;

      let recommendation: 'approve' | 'review' | 'reject' = 'review';
      if (
        creditScore >= 650 &&
        dti <= 0.35 &&
        args.interestRate <= APR_LIMIT &&
        profile.kycStatus === 'verified'
      ) {
        recommendation = 'approve';
      } else if (creditScore < 500 || dti > 0.6 || profile.kycStatus !== 'verified') {
        recommendation = 'reject';
      }

      // 4. Record credit score in loan record
      stage = 'recordScore';
      await ctx.runMutation(internal.loans.recordCreditScore, {
        loanId: args.loanId,
        creditScore,
        monthlyPayment,
        debtToIncomeRatio: dti,
        recommendation,
      });

      // 5. Create approval request for back-office
      stage = 'approvalRequest';
      await ctx.runMutation(internal.approvalWorkflow.createSystemApprovalRequest, {
        entityType: 'loan',
        entityId: args.loanId,
        requestType: 'loan_review',
        priority: recommendation === 'approve' ? 'low' : 'high',
        details: {
          creditScore,
          monthlyPayment,
          dti,
          recommendation,
          amount: args.amount,
          interestRate: args.interestRate,
          termMonths: args.termMonths,
        },
      });

      // Core processing succeeded — clear any prior failure record for this loan.
      await ctx.runMutation(internal.loanProcessing.resolveProcessingFailure, {
        loanId: args.loanId,
      });

      // 6. Send notification to applicant
      stage = 'notification';
      if (profile.phone) {
        await ctx.runAction(internal.actions.sendNotification.sendNotification, {
          userId: args.userId,
          title: 'Application Received',
          message: `Your loan application for N$${args.amount.toLocaleString()} is under review. We'll notify you within 24 hours.`,
          category: 'loan',
          priority: 'normal',
          phone: profile.phone,
          templateCode: 'LOAN_SUBMITTED',
          templateVars: {
            firstName: profile.fullName?.split(' ')[0] ?? 'Applicant',
            amount: `N$${args.amount.toLocaleString()}`,
            reference: String(args.loanId).slice(-8).toUpperCase(),
          },
          loanId: args.loanId,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[processLoanApplication] Error at stage '${stage}':`, error);

      // Durable, observable failure — never swallow.
      const result = await ctx.runMutation(internal.loanProcessing.recordProcessingFailure, {
        loanId: args.loanId,
        stage,
        errorMessage,
      });

      // Auto-retry core processing (scoring/recordScore/approvalRequest) with
      // exponential backoff until dead-lettered. Notification failures are not
      // retried here (they have their own delivery queue) and re-running the full
      // action could duplicate side effects.
      if (stage !== 'notification' && !result.deadLettered) {
        const delayMs = 30_000 * Math.pow(4, result.attemptCount - 1);
        await ctx.scheduler.runAfter(
          delayMs,
          internal.actions.processLoanApplication.processLoanApplication,
          args
        );
      }
    }
  },
});

// ---------------------------------------------------------------------------
// Credit scoring helpers (simplified server-side version)
// Full AI scoring engine lives in src/services/creditScoring.ts on the frontend
// ---------------------------------------------------------------------------

interface ScoringInputs {
  kycStatus: string;
  employmentStatus: string;
  monthlyIncome: number;
  requestedAmount: number;
  interestRate: number;
  termMonths: number;
}

function computeCreditScore(inputs: ScoringInputs): number {
  let score = 500; // Base score

  // KYC status (profiles.kycStatus: pending | submitted | verified | rejected)
  if (inputs.kycStatus === 'verified') score += 100;
  else if (inputs.kycStatus === 'pending' || inputs.kycStatus === 'submitted') score -= 50;
  else score -= 100; // rejected/not_started

  // Employment
  if (inputs.employmentStatus === 'employed') score += 80;
  else if (inputs.employmentStatus === 'self_employed') score += 40;
  else score -= 60;

  // Debt-to-income ratio
  const monthlyPayment = computeMonthlyPayment(
    inputs.requestedAmount,
    inputs.interestRate,
    inputs.termMonths
  );
  if (inputs.monthlyIncome > 0) {
    const dti = monthlyPayment / inputs.monthlyIncome;
    if (dti <= 0.2) score += 100;
    else if (dti <= 0.35) score += 50;
    else if (dti <= 0.5) score -= 50;
    else score -= 150;
  } else {
    score -= 100;
  }

  // APR compliance
  if (inputs.interestRate > APR_LIMIT) score -= 200;

  return Math.max(300, Math.min(850, score));
}

function computeMonthlyPayment(principal: number, annualRate: number, termMonths: number): number {
  if (annualRate === 0) return principal / termMonths;
  const r = annualRate / 100 / 12;
  return (principal * r * Math.pow(1 + r, termMonths)) / (Math.pow(1 + r, termMonths) - 1);
}
