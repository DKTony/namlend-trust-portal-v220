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
  },
  handler: async (ctx, args) => {
    console.log(`[processLoanApplication] Starting for loan ${args.loanId}`);

    try {
      // 1. Fetch profile for credit scoring inputs
      const profile = await ctx.runQuery(internal.users.getProfileByUserId, {
        userId: args.userId,
      });

      if (!profile) {
        console.error(`[processLoanApplication] Profile not found for user ${args.userId}`);
        return;
      }

      // 2. Compute a basic credit score (300–850 range)
      // Full AI scoring is in src/services/creditScoring.ts — this is the server-side version.
      const creditScore = computeCreditScore({
        kycStatus: profile.kycStatus,
        employmentStatus: profile.employmentStatus ?? '',
        monthlyIncome: profile.monthlyIncome ?? 0,
        requestedAmount: args.amount,
        interestRate: args.interestRate,
        termMonths: args.termMonths,
      });

      // 3. Determine initial recommendation
      const monthlyPayment = computeMonthlyPayment(args.amount, args.interestRate, args.termMonths);
      const dti = profile.monthlyIncome ? monthlyPayment / profile.monthlyIncome : 1;

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
      await ctx.runMutation(internal.loans.recordCreditScore, {
        loanId: args.loanId,
        creditScore,
        monthlyPayment,
        debtToIncomeRatio: dti,
        recommendation,
      });

      // 5. Create approval request for back-office
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

      // 6. Send notification to applicant
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
      console.error('[processLoanApplication] Error:', error);
      // Non-fatal — loan was already created and user notified via RPC response
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
