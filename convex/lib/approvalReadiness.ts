/**
 * Loan approval readiness — the single invariant every approval writer must enforce.
 *
 * There are two public paths that can transition a loan to `approved`
 * (`loans.approveLoan` and `approvalWorkflow.processApprovalRequest`). Both MUST
 * delegate to `approveLoanCore` so the same KYC / scoring / DTI / recommendation
 * checks apply identically. Do not patch `status: 'approved'` directly anywhere else.
 */

import { GenericMutationCtx } from 'convex/server';
import { ConvexError } from 'convex/values';
import { DataModel, Doc, Id } from '../_generated/dataModel';
import { assertKycVerifiedForUser } from './kyc';
import { getNumericRule } from './ruleEvaluator';
import { scheduleAuditLog } from './audit';
import { emitDomainEvent, DOMAIN_EVENTS } from './domainEvents';

type MutCtx = GenericMutationCtx<DataModel>;

/** Loan statuses from which an approval transition is permitted. */
const APPROVABLE_STATUSES = ['under_review', 'submitted'];

/**
 * Throws unless the loan can be approved right now. Fail-closed:
 *   - state must be approvable (not already terminal/funded)
 *   - borrower KYC must be verified
 *   - automated scoring must have completed (score, DTI, recommendation present)
 *   - score/DTI must satisfy data-driven thresholds
 *   - the credit recommendation must not be `reject`
 */
export async function assertLoanReadyForApproval(ctx: MutCtx, loan: Doc<'loans'>): Promise<void> {
  if (!APPROVABLE_STATUSES.includes(loan.status)) {
    throw new ConvexError({
      code: 'INVALID_STATE',
      message: `Loan cannot be approved from status '${loan.status}'.`,
    });
  }

  await assertKycVerifiedForUser(ctx, loan.userId, 'approve a loan');

  if (
    loan.creditScore === undefined ||
    loan.debtToIncomeRatio === undefined ||
    loan.recommendation === undefined
  ) {
    throw new ConvexError({
      code: 'SCORING_REQUIRED',
      message:
        'Credit score, debt-to-income ratio, and recommendation are required before approval.',
    });
  }

  const minScore = await getNumericRule(ctx, 'MIN_CREDIT_SCORE', 580);
  if (loan.creditScore < minScore) {
    throw new ConvexError({
      code: 'CREDIT_CHECK_FAILED',
      message: `Credit score ${loan.creditScore} is below minimum threshold of ${minScore}.`,
    });
  }

  const maxDTI = await getNumericRule(ctx, 'MAX_DTI_RATIO', 0.43);
  if (loan.debtToIncomeRatio > maxDTI) {
    throw new ConvexError({
      code: 'DTI_CHECK_FAILED',
      message: `Debt-to-income ratio ${loan.debtToIncomeRatio} exceeds maximum of ${maxDTI}.`,
    });
  }

  if (loan.recommendation === 'reject') {
    throw new ConvexError({
      code: 'RECOMMENDATION_REJECTED',
      message: 'Loan cannot be approved while the credit recommendation is reject.',
    });
  }
}

/**
 * Canonical loan-approval transition. Enforces readiness, then performs the
 * state change, approval record, audit, and domain event. Used by every
 * approval writer. Returns the pre-transition loan (callers may use it for
 * notifications). Throws on any readiness failure — the surrounding mutation
 * rolls back atomically.
 */
export async function approveLoanCore(
  ctx: MutCtx,
  opts: {
    loanId: Id<'loans'>;
    actorUserId: Id<'users'>;
    source: 'direct' | 'approvalWorkflow';
    notes?: string;
  }
): Promise<Doc<'loans'>> {
  const loan = await ctx.db.get(opts.loanId);
  if (!loan) throw new ConvexError({ code: 'NOT_FOUND', message: 'Loan not found.' });

  await assertLoanReadyForApproval(ctx, loan);

  const now = Date.now();
  await ctx.db.patch(opts.loanId, { status: 'approved', updatedAt: now });

  await ctx.db.insert('loanApprovals', {
    loanId: opts.loanId,
    reviewedBy: opts.actorUserId,
    decision: 'approved',
    institutionId: loan.institutionId,
    notes: opts.notes,
    stage: loan.currentStage ?? 'officer_review',
    createdAt: now,
  });

  scheduleAuditLog(ctx, 'loan', opts.loanId, 'APPROVE', loan.status, 'approved', opts.notes);
  emitDomainEvent(
    ctx,
    DOMAIN_EVENTS.LOAN_APPROVED,
    'loans',
    opts.loanId,
    { approvedBy: opts.actorUserId, source: opts.source },
    { actorId: opts.actorUserId, actorType: 'user' }
  );

  return loan;
}
