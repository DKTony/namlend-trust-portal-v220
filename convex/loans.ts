/**
 * Loan lifecycle — CRUD, status transitions, APR validation.
 * Replaces: loanService.ts + 8 Supabase RPCs.
 *
 * REGULATORY: Every loan creation/update validates APR <= 32% (Namibian law).
 * AUDIT: Every status change is fire-and-forget logged via scheduleAuditLog().
 */

import { v } from 'convex/values';
import { query, mutation, internalMutation } from './_generated/server';
import { internal } from './_generated/api';
import { ConvexError } from 'convex/values';
import { assertAuthenticated, assertStaff, assertAdmin, assertOwnerOrStaff } from './lib/auth';
import { APR_LIMIT, isValidAPR } from './lib/regulatory';
import { scheduleAuditLog, scheduleAuditEntry } from './lib/audit';
import { emitRelationship } from './lib/relationshipEmitter';
import { emitDomainEvent, DOMAIN_EVENTS } from './lib/domainEvents';
import { getNumericRule } from './lib/ruleEvaluator';
import { emitEvent, generateCorrelationId } from './lib/eventEmitter';
import { loanStatus, loanRecommendation } from './schema';

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Client's own active loans. */
export const getMyLoans = query({
  args: {
    status: v.optional(v.string()),
  },
  handler: async (ctx, { status }) => {
    const userId = await assertAuthenticated(ctx);
    const q = ctx.db.query('loans').withIndex('by_userId', (q) => q.eq('userId', userId));

    const loans = await q.order('desc').collect();
    if (status) {
      return loans.filter((l) => l.status === status);
    }
    return loans;
  },
});

/** Get a single loan by ID (owner or staff). */
export const getLoan = query({
  args: { loanId: v.id('loans') },
  handler: async (ctx, { loanId }) => {
    const loan = await ctx.db.get(loanId);
    if (!loan) return null;
    await assertOwnerOrStaff(ctx, loan.userId);
    return loan;
  },
});

/** List all loans (staff only — admin dashboard). */
export const adminListLoans = query({
  args: {
    status: v.optional(loanStatus),
    userId: v.optional(v.id('users')),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { status, userId, limit }) => {
    await assertStaff(ctx);

    let results;
    if (status) {
      results = await ctx.db
        .query('loans')
        .withIndex('by_status', (q) => q.eq('status', status))
        .order('desc')
        .take(limit ?? 100);
    } else {
      results = await ctx.db
        .query('loans')
        .order('desc')
        .take(limit ?? 100);
    }

    if (userId) {
      results = results.filter((l) => l.userId === userId);
    }
    return results;
  },
});

/** Get loan with full approval history (staff). */
export const getLoanWithHistory = query({
  args: { loanId: v.id('loans') },
  handler: async (ctx, { loanId }) => {
    await assertStaff(ctx);
    const loan = await ctx.db.get(loanId);
    if (!loan) return null;

    const approvals = await ctx.db
      .query('loanApprovals')
      .withIndex('by_loanId', (q) => q.eq('loanId', loanId))
      .order('desc')
      .collect();

    const disbursements = await ctx.db
      .query('disbursements')
      .withIndex('by_loanId', (q) => q.eq('loanId', loanId))
      .collect();

    return { loan, approvals, disbursements };
  },
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Create a new loan application.
 * REGULATORY: Rejects any APR > 32% (APR_LIMIT).
 */
export const createLoan = mutation({
  args: {
    principal: v.number(),
    interestRate: v.number(),
    termMonths: v.number(),
    purpose: v.optional(v.string()),
    monthlyPayment: v.optional(v.number()),
    productVersionId: v.optional(v.id('productVersions')),
  },
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);

    // --- REGULATORY GATE ---
    if (!isValidAPR(args.interestRate)) {
      throw new ConvexError({
        code: 'REGULATORY_VIOLATION',
        message: `Interest rate ${args.interestRate}% exceeds Namibian APR limit of ${APR_LIMIT}%. Loan rejected.`,
      });
    }

    if (args.principal <= 0) {
      throw new ConvexError({
        code: 'VALIDATION_ERROR',
        message: 'Principal amount must be positive.',
      });
    }

    if (args.termMonths < 1 || args.termMonths > 360) {
      throw new ConvexError({
        code: 'VALIDATION_ERROR',
        message: 'Term must be between 1 and 360 months.',
      });
    }

    // --- PRODUCT VALIDATION (Ontology Phase 6) ---
    // If a productVersionId is provided, validate loan params against product config.
    if (args.productVersionId) {
      const version = await ctx.db.get(args.productVersionId);
      if (!version) {
        throw new ConvexError({ code: 'NOT_FOUND', message: 'Product version not found.' });
      }
      if (!version.isCurrentVersion) {
        throw new ConvexError({
          code: 'INVALID_STATE',
          message: 'Cannot create loan against a superseded product version.',
        });
      }
      const cfg = version.config;
      if (cfg.minAmount && args.principal < cfg.minAmount) {
        throw new ConvexError({
          code: 'PRODUCT_VIOLATION',
          message: `Principal N$${args.principal} below product minimum N$${cfg.minAmount}.`,
        });
      }
      if (cfg.maxAmount && args.principal > cfg.maxAmount) {
        throw new ConvexError({
          code: 'PRODUCT_VIOLATION',
          message: `Principal N$${args.principal} exceeds product maximum N$${cfg.maxAmount}.`,
        });
      }
      if (cfg.minTermMonths && args.termMonths < cfg.minTermMonths) {
        throw new ConvexError({
          code: 'PRODUCT_VIOLATION',
          message: `Term ${args.termMonths}mo below product minimum ${cfg.minTermMonths}mo.`,
        });
      }
      if (cfg.maxTermMonths && args.termMonths > cfg.maxTermMonths) {
        throw new ConvexError({
          code: 'PRODUCT_VIOLATION',
          message: `Term ${args.termMonths}mo exceeds product maximum ${cfg.maxTermMonths}mo.`,
        });
      }
      if (cfg.maxInterestRate && args.interestRate > cfg.maxInterestRate) {
        throw new ConvexError({
          code: 'PRODUCT_VIOLATION',
          message: `Interest rate ${args.interestRate}% exceeds product max ${cfg.maxInterestRate}%.`,
        });
      }
    }

    // --- IDEMPOTENCY GUARD ---
    // Prevent duplicate loan creation from double-clicks (5-second window)
    const recentDuplicate = await ctx.db
      .query('loans')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .order('desc')
      .first();
    if (
      recentDuplicate &&
      recentDuplicate.principal === args.principal &&
      recentDuplicate.termMonths === args.termMonths &&
      recentDuplicate.interestRate === args.interestRate &&
      Date.now() - recentDuplicate.createdAt < 5000
    ) {
      return recentDuplicate._id;
    }

    const now = Date.now();
    const loanId = await ctx.db.insert('loans', {
      userId,
      principal: args.principal,
      interestRate: args.interestRate,
      termMonths: args.termMonths,
      monthlyPayment: args.monthlyPayment,
      purpose: args.purpose,
      productVersionId: args.productVersionId,
      status: 'draft',
      outstandingBalance: args.principal,
      totalPaid: 0,
      createdAt: now,
      updatedAt: now,
    });

    scheduleAuditLog(ctx, 'loan', loanId, 'CREATE', 'none', 'draft');
    emitDomainEvent(
      ctx,
      DOMAIN_EVENTS.LOAN_CREATED,
      'loans',
      loanId,
      { principal: args.principal, interestRate: args.interestRate, termMonths: args.termMonths },
      { actorId: userId, actorType: 'user' }
    );

    // Ontology: user -> borrowed -> loan
    emitRelationship(ctx, { type: 'users', id: userId }, { type: 'loans', id: loanId }, 'borrowed');

    // Ontology: loan -> instance_of -> productVersion (if product-backed)
    if (args.productVersionId) {
      emitRelationship(
        ctx,
        { type: 'loans', id: loanId },
        { type: 'productVersions', id: args.productVersionId },
        'instance_of'
      );
      emitEvent(ctx, {
        eventType: 'loan.product_validated',
        entityType: 'loans',
        entityId: loanId,
        domainSource: 'lending',
        correlationId: generateCorrelationId(),
        actorId: userId,
        actorType: 'user',
        payload: { productVersionId: args.productVersionId },
      });
    }

    return loanId;
  },
});

/** Submit a draft loan application for review. */
export const submitLoan = mutation({
  args: { loanId: v.id('loans') },
  handler: async (ctx, { loanId }) => {
    await assertAuthenticated(ctx);
    const loan = await ctx.db.get(loanId);
    if (!loan) throw new ConvexError({ code: 'NOT_FOUND', message: 'Loan not found.' });
    await assertOwnerOrStaff(ctx, loan.userId);

    if (loan.status !== 'draft') {
      throw new ConvexError({
        code: 'INVALID_STATE',
        message: `Loan cannot be submitted from status '${loan.status}'.`,
      });
    }

    await ctx.db.patch(loanId, { status: 'submitted', updatedAt: Date.now() });
    scheduleAuditLog(ctx, 'loan', loanId, 'SUBMIT', 'draft', 'submitted');
    emitDomainEvent(ctx, DOMAIN_EVENTS.LOAN_SUBMITTED, 'loans', loanId, {
      principal: loan.principal,
    });

    ctx.scheduler.runAfter(0, internal.actions.processLoanApplication.processLoanApplication, {
      loanId,
      userId: loan.userId,
      amount: loan.principal,
      interestRate: loan.interestRate,
      termMonths: loan.termMonths,
      purpose: loan.purpose,
    });
  },
});

/**
 * Staff: transition loan to under_review.
 * Replaces the `move_to_review` RPC.
 */
export const moveToReview = mutation({
  args: { loanId: v.id('loans') },
  handler: async (ctx, { loanId }) => {
    await assertStaff(ctx);
    const loan = await ctx.db.get(loanId);
    if (!loan) throw new ConvexError({ code: 'NOT_FOUND', message: 'Loan not found.' });

    if (loan.status !== 'submitted') {
      throw new ConvexError({
        code: 'INVALID_STATE',
        message: `Loan must be in 'submitted' status to move to review. Current: '${loan.status}'.`,
      });
    }

    await ctx.db.patch(loanId, {
      status: 'under_review',
      currentStage: 'officer_review',
      updatedAt: Date.now(),
    });
    scheduleAuditLog(ctx, 'loan', loanId, 'MOVE_TO_REVIEW', 'submitted', 'under_review');
    emitDomainEvent(ctx, DOMAIN_EVENTS.LOAN_UNDER_REVIEW, 'loans', loanId);

    ctx.scheduler
      .runAfter(0, internal.notifications.createNotification, {
        userId: loan.userId,
        title: 'Application Under Review',
        message:
          "Your loan application is now being reviewed by our team. We'll notify you once a decision is made.",
        category: 'loan' as const,
        priority: 'normal' as const,
        actionUrl: `/loans/${loanId}`,
        actionLabel: 'View Application',
      })
      .catch((err: unknown) => console.error('[notification] moveToReview notify failed:', err));
  },
});

/**
 * Staff: approve a loan.
 * Replaces the `approve_loan` RPC.
 */
export const approveLoan = mutation({
  args: {
    loanId: v.id('loans'),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { loanId, notes }) => {
    const staffId = await assertStaff(ctx);
    const loan = await ctx.db.get(loanId);
    if (!loan) throw new ConvexError({ code: 'NOT_FOUND', message: 'Loan not found.' });

    if (!['under_review', 'submitted'].includes(loan.status)) {
      throw new ConvexError({
        code: 'INVALID_STATE',
        message: `Loan cannot be approved from status '${loan.status}'.`,
      });
    }

    // Validate credit score and DTI against data-driven business rules (if scored)
    if (loan.creditScore !== undefined) {
      const minScore = await getNumericRule(ctx, 'MIN_CREDIT_SCORE', 580);
      if (loan.creditScore < minScore) {
        throw new ConvexError({
          code: 'CREDIT_CHECK_FAILED',
          message: `Credit score ${loan.creditScore} is below minimum threshold of ${minScore}.`,
        });
      }
    }
    if (loan.debtToIncomeRatio !== undefined) {
      const maxDTI = await getNumericRule(ctx, 'MAX_DTI_RATIO', 0.43);
      if (loan.debtToIncomeRatio > maxDTI) {
        throw new ConvexError({
          code: 'DTI_CHECK_FAILED',
          message: `Debt-to-income ratio ${loan.debtToIncomeRatio} exceeds maximum of ${maxDTI}.`,
        });
      }
    }

    await ctx.db.patch(loanId, {
      status: 'approved',
      updatedAt: Date.now(),
    });

    await ctx.db.insert('loanApprovals', {
      loanId,
      reviewedBy: staffId,
      decision: 'approved',
      notes,
      stage: loan.currentStage ?? 'officer_review',
      createdAt: Date.now(),
    });

    scheduleAuditLog(ctx, 'loan', loanId, 'APPROVE', loan.status, 'approved', notes);
    emitDomainEvent(
      ctx,
      DOMAIN_EVENTS.LOAN_APPROVED,
      'loans',
      loanId,
      { approvedBy: staffId },
      { actorId: staffId, actorType: 'user' }
    );
  },
});

/**
 * Staff: reject a loan.
 * Replaces the `reject_loan` RPC.
 */
export const rejectLoan = mutation({
  args: {
    loanId: v.id('loans'),
    reason: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { loanId, reason, notes }) => {
    const staffId = await assertStaff(ctx);
    const loan = await ctx.db.get(loanId);
    if (!loan) throw new ConvexError({ code: 'NOT_FOUND', message: 'Loan not found.' });

    await ctx.db.patch(loanId, {
      status: 'rejected',
      rejectionReason: reason,
      rejectedAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.db.insert('loanApprovals', {
      loanId,
      reviewedBy: staffId,
      decision: 'rejected',
      notes: notes ?? reason,
      stage: loan.currentStage ?? 'officer_review',
      createdAt: Date.now(),
    });

    scheduleAuditLog(ctx, 'loan', loanId, 'REJECT', loan.status, 'rejected', reason);
    emitDomainEvent(
      ctx,
      DOMAIN_EVENTS.LOAN_REJECTED,
      'loans',
      loanId,
      { reason },
      { actorId: staffId, actorType: 'user' }
    );
  },
});

/**
 * Mark loan as funded after successful disbursement.
 * INTERNAL — not callable from browser. Called by disbursements.ts via scheduler.
 */
export const markFunded = internalMutation({
  args: { loanId: v.id('loans') },
  handler: async (ctx, { loanId }) => {
    const loan = await ctx.db.get(loanId);
    if (!loan) throw new ConvexError({ code: 'NOT_FOUND', message: 'Loan not found.' });

    await ctx.db.patch(loanId, {
      status: 'funded',
      disbursedAt: Date.now(),
      updatedAt: Date.now(),
    });

    scheduleAuditLog(ctx, 'loan', loanId, 'FUND', 'approved', 'funded');
    emitDomainEvent(ctx, DOMAIN_EVENTS.LOAN_FUNDED, 'loans', loanId, { principal: loan.principal });
  },
});

/**
 * Record credit score result after automated scoring.
 * INTERNAL — called from processLoanApplication action via scheduler.
 */
export const recordCreditScore = internalMutation({
  args: {
    loanId: v.id('loans'),
    creditScore: v.number(),
    monthlyPayment: v.number(),
    debtToIncomeRatio: v.number(),
    recommendation: loanRecommendation,
  },
  handler: async (ctx, args) => {
    const loan = await ctx.db.get(args.loanId);
    await ctx.db.patch(args.loanId, {
      creditScore: args.creditScore,
      monthlyPayment: args.monthlyPayment,
      debtToIncomeRatio: args.debtToIncomeRatio,
      recommendation: args.recommendation,
      updatedAt: Date.now(),
    });
    scheduleAuditEntry(ctx, {
      entityType: 'loans',
      entityId: args.loanId,
      action: 'RECORD_CREDIT_SCORE',
      oldState: { creditScore: loan?.creditScore, debtToIncomeRatio: loan?.debtToIncomeRatio },
      newState: {
        creditScore: args.creditScore,
        debtToIncomeRatio: args.debtToIncomeRatio,
        recommendation: args.recommendation,
      },
    });
  },
});

/**
 * Update loan balance after a payment.
 * INTERNAL — not callable from browser. Called by payments.ts inline.
 */
export const updateLoanBalance = internalMutation({
  args: {
    loanId: v.id('loans'),
    paymentAmount: v.number(),
    principalPaid: v.number(),
  },
  handler: async (ctx, { loanId, paymentAmount, principalPaid }) => {
    const loan = await ctx.db.get(loanId);
    if (!loan) throw new ConvexError({ code: 'NOT_FOUND', message: 'Loan not found.' });

    const newBalance = Math.max(0, (loan.outstandingBalance ?? loan.principal) - principalPaid);
    const newTotalPaid = (loan.totalPaid ?? 0) + paymentAmount;

    const updates: Record<string, unknown> = {
      outstandingBalance: newBalance,
      totalPaid: newTotalPaid,
      updatedAt: Date.now(),
    };

    // Audit every balance update (ontology event journal coverage)
    scheduleAuditLog(
      ctx,
      'loans',
      loanId,
      'BALANCE_UPDATE',
      String(loan.outstandingBalance ?? loan.principal),
      String(newBalance)
    );

    if (newBalance === 0) {
      updates.status = 'paid_off';
      updates.completedAt = Date.now();
      scheduleAuditLog(ctx, 'loans', loanId, 'PAID_OFF', loan.status, 'paid_off');
      emitDomainEvent(ctx, DOMAIN_EVENTS.LOAN_PAID_OFF, 'loans', loanId, {
        totalPaid: loan.totalPaid,
      });
      ctx.scheduler
        .runAfter(0, internal.notifications.createNotification, {
          userId: loan.userId,
          title: 'Loan Fully Repaid',
          message:
            'Congratulations! Your loan has been completely paid off. Thank you for your timely repayments.',
          category: 'payment' as const,
          priority: 'high' as const,
          actionUrl: `/loans/${loanId}`,
          actionLabel: 'View Loan',
        })
        .catch((err: unknown) => console.error('[notification] paid_off notify failed:', err));
    } else if (loan.status === 'funded') {
      updates.status = 'active';
      ctx.scheduler
        .runAfter(0, internal.notifications.createNotification, {
          userId: loan.userId,
          title: 'Loan Account Active',
          message: 'Your loan account is now active. Your regular monthly repayments have begun.',
          category: 'loan' as const,
          priority: 'normal' as const,
          actionUrl: `/loans/${loanId}`,
          actionLabel: 'View Loan',
        })
        .catch((err: unknown) => console.error('[notification] funded→active notify failed:', err));
    }

    await ctx.db.patch(loanId, updates);
  },
});

/**
 * Batch update loan statuses (admin only).
 * Used by BatchOperations admin panel.
 */
export const batchUpdateLoanStatus = mutation({
  args: {
    loanIds: v.array(v.id('loans')),
    newStatus: loanStatus,
  },
  handler: async (ctx, { loanIds, newStatus }) => {
    const adminId = await assertAdmin(ctx);
    const now = Date.now();

    // Block terminal/financial statuses — these require dedicated mutations with ledger housekeeping
    const BATCH_BLOCKED = ['paid_off', 'written_off', 'funded'];
    if (BATCH_BLOCKED.includes(newStatus)) {
      throw new ConvexError({
        code: 'VALIDATION_ERROR',
        message: `Status '${newStatus}' requires the dedicated mutation, not batch update.`,
      });
    }

    let updatedCount = 0;

    for (const loanId of loanIds) {
      const loan = await ctx.db.get(loanId);
      if (!loan) continue;

      const oldStatus = loan.status;
      await ctx.db.patch(loanId, { status: newStatus, updatedAt: now });
      scheduleAuditLog(ctx, 'loan', loanId, 'BATCH_UPDATE', oldStatus, newStatus);
      updatedCount++;
    }

    return { updatedCount };
  },
});
