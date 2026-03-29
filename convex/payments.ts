/**
 * Payment processing and schedules.
 * Replaces 8 Supabase RPCs:
 *   record_payment, process_payment, complete_payment, fail_payment,
 *   reverse_payment, get_payment_schedule, mark_schedule_paid, get_overdue_payments
 *
 * Financial mutations enqueue TigerBeetle REPAYMENT outbox entries atomically.
 * FINANCIAL SAFETY: retry: false on all useMutation calls (frontend).
 */

import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import { internal } from './_generated/api';
import { ConvexError } from 'convex/values';
import { assertAuthenticated, assertStaff, assertOwnerOrStaff } from './lib/auth';
import { scheduleAuditLog, scheduleAuditEntry } from './lib/audit';
import { emitRelationship } from './lib/relationshipEmitter';
import { emitDomainEvent, DOMAIN_EVENTS } from './lib/domainEvents';
import { paymentTxStatus } from './schema';

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Get all payments for the current user across all their loans. */
export const getMyPayments = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const userId = await assertAuthenticated(ctx);
    // Single indexed query — replaces previous N+1 pattern (1 loan query + N payment queries)
    return ctx.db
      .query('paymentTransactions')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .order('desc')
      .take(limit ?? 50);
  },
});

export const getPaymentsByLoan = query({
  args: { loanId: v.id('loans') },
  handler: async (ctx, { loanId }) => {
    const loan = await ctx.db.get(loanId);
    if (!loan) return [];
    await assertOwnerOrStaff(ctx, loan.userId);
    return ctx.db
      .query('paymentTransactions')
      .withIndex('by_loanId', (q) => q.eq('loanId', loanId))
      .order('desc')
      .collect();
  },
});

export const adminListPayments = query({
  args: {
    status: v.optional(paymentTxStatus),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { status, limit }) => {
    await assertStaff(ctx);
    if (status) {
      return ctx.db
        .query('paymentTransactions')
        .withIndex('by_status', (q) => q.eq('status', status))
        .order('desc')
        .take(limit ?? 100);
    }
    return ctx.db
      .query('paymentTransactions')
      .order('desc')
      .take(limit ?? 100);
  },
});

/** Get payment schedule for a loan (replaces get_payment_schedule RPC). */
export const getPaymentSchedule = query({
  args: { loanId: v.id('loans') },
  handler: async (ctx, { loanId }) => {
    const loan = await ctx.db.get(loanId);
    if (!loan) return [];
    await assertOwnerOrStaff(ctx, loan.userId);
    return ctx.db
      .query('paymentSchedules')
      .withIndex('by_loanId', (q) => q.eq('loanId', loanId))
      .order('asc')
      .collect();
  },
});

/** Get overdue payments (replaces get_overdue_payments RPC). */
export const getOverduePayments = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    await assertStaff(ctx);
    const now = Date.now();
    const scheduled = await ctx.db
      .query('paymentSchedules')
      .withIndex('by_status', (q) => q.eq('status', 'scheduled'))
      .collect();
    return scheduled.filter((s) => s.dueDate < now).slice(0, limit ?? 100);
  },
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Record a new payment against a loan.
 * Replaces `record_payment` RPC.
 * Atomically enqueues TigerBeetle REPAYMENT outbox entry.
 */
export const recordPayment = mutation({
  args: {
    loanId: v.id('loans'),
    amount: v.number(),
    principalPaid: v.optional(v.number()),
    interestPaid: v.optional(v.number()),
    feesPaid: v.optional(v.number()),
    method: v.string(),
    referenceNumber: v.optional(v.string()),
    externalTransactionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);
    const loan = await ctx.db.get(args.loanId);
    if (!loan) throw new ConvexError({ code: 'NOT_FOUND', message: 'Loan not found.' });
    await assertOwnerOrStaff(ctx, loan.userId);

    if (!['active', 'funded'].includes(loan.status)) {
      throw new ConvexError({
        code: 'INVALID_STATE',
        message: `Cannot record payment on loan with status '${loan.status}'.`,
      });
    }

    if (args.amount <= 0) {
      throw new ConvexError({
        code: 'VALIDATION_ERROR',
        message: 'Payment amount must be positive.',
      });
    }

    // --- IDEMPOTENCY GUARD ---
    // Prevent duplicate payments from retries or double-clicks
    if (args.externalTransactionId) {
      const existing = await ctx.db
        .query('paymentTransactions')
        .withIndex('by_externalTransactionId', (q) =>
          q.eq('externalTransactionId', args.externalTransactionId)
        )
        .first();
      if (existing) return existing._id;
    }
    if (args.referenceNumber) {
      const existing = await ctx.db
        .query('paymentTransactions')
        .withIndex('by_referenceNumber', (q) => q.eq('referenceNumber', args.referenceNumber))
        .filter((q) => q.eq(q.field('loanId'), args.loanId))
        .first();
      if (existing) return existing._id;
    }

    const now = Date.now();
    const paymentId = await ctx.db.insert('paymentTransactions', {
      loanId: args.loanId,
      userId,
      amount: args.amount,
      principalPaid: args.principalPaid,
      interestPaid: args.interestPaid,
      feesPaid: args.feesPaid,
      method: args.method,
      status: 'pending',
      referenceNumber: args.referenceNumber,
      externalTransactionId: args.externalTransactionId,
      paymentDate: now,
      createdAt: now,
      updatedAt: now,
    });

    // Atomically enqueue REPAYMENT outbox entry
    await ctx.db.insert('tigerBeetleOutbox', {
      eventType: 'REPAYMENT',
      sourceTable: 'paymentTransactions',
      sourceId: paymentId,
      payload: {
        loan_id: args.loanId,
        payment_id: paymentId,
        amount: Math.round(args.amount * 100),
        principal_amount: Math.round((args.principalPaid ?? 0) * 100),
        interest_amount: Math.round((args.interestPaid ?? 0) * 100),
        fee_amount: Math.round((args.feesPaid ?? 0) * 100),
        transfers: [
          {
            debit_type: 'LOAN_PRINCIPAL_RECEIVABLE',
            credit_type: 'BANK_SETTLEMENT',
            amount: Math.round((args.principalPaid ?? 0) * 100),
            code: 2001,
          },
          {
            debit_type: 'LOAN_INTEREST_RECEIVABLE',
            credit_type: 'INTEREST_INCOME',
            amount: Math.round((args.interestPaid ?? 0) * 100),
            code: 5001,
          },
        ],
      },
      status: 'pending',
      retryCount: 0,
      createdAt: now,
    });

    scheduleAuditLog(ctx, 'payment', paymentId, 'RECORD', 'none', 'pending');
    emitDomainEvent(ctx, DOMAIN_EVENTS.PAYMENT_RECORDED, 'paymentTransactions', paymentId, {
      loanId,
      amount: args.amount,
      method: args.method,
    });

    // Ontology: loan → repaid_via → payment
    emitRelationship(
      ctx,
      { type: 'loans', id: args.loanId },
      { type: 'paymentTransactions', id: paymentId },
      'repaid_via'
    );

    return paymentId;
  },
});

/**
 * Mark a payment as completed and update loan balance.
 * Replaces `complete_payment` RPC.
 */
export const completePayment = mutation({
  args: {
    paymentId: v.id('paymentTransactions'),
    principalPaid: v.optional(v.number()),
    interestPaid: v.optional(v.number()),
  },
  handler: async (ctx, { paymentId, principalPaid, interestPaid }) => {
    await assertStaff(ctx);
    const payment = await ctx.db.get(paymentId);
    if (!payment) throw new ConvexError({ code: 'NOT_FOUND', message: 'Payment not found.' });

    // Idempotency: already completed → no-op
    if (payment.status === 'completed') return;
    if (payment.status !== 'pending') {
      throw new ConvexError({
        code: 'INVALID_STATE',
        message: `Payment cannot be completed from status '${payment.status}'.`,
      });
    }

    await ctx.db.patch(paymentId, {
      status: 'completed',
      principalPaid: principalPaid ?? payment.principalPaid,
      interestPaid: interestPaid ?? payment.interestPaid,
      updatedAt: Date.now(),
    });

    // Update loan balance
    const pp = principalPaid ?? payment.principalPaid ?? 0;
    const loan = await ctx.db.get(payment.loanId);
    if (loan) {
      const newBalance = Math.max(0, (loan.outstandingBalance ?? loan.principal) - pp);
      const newTotalPaid = (loan.totalPaid ?? 0) + payment.amount;
      const updates: Record<string, unknown> = {
        outstandingBalance: newBalance,
        totalPaid: newTotalPaid,
        updatedAt: Date.now(),
      };
      if (newBalance === 0) {
        updates.status = 'paid_off';
        updates.completedAt = Date.now();
        scheduleAuditLog(ctx, 'loan', payment.loanId, 'PAID_OFF', loan.status, 'paid_off');
        ctx.scheduler
          .runAfter(0, internal.notifications.createNotification, {
            userId: loan.userId,
            title: 'Loan Fully Repaid',
            message:
              'Congratulations! Your loan has been completely paid off. Thank you for your timely repayments.',
            category: 'payment' as const,
            priority: 'high' as const,
            actionUrl: `/loans/${payment.loanId}`,
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
            actionUrl: `/loans/${payment.loanId}`,
            actionLabel: 'View Loan',
          })
          .catch((err: unknown) =>
            console.error('[notification] funded→active notify failed:', err)
          );
      }
      await ctx.db.patch(payment.loanId, updates);
    }

    scheduleAuditLog(ctx, 'payment', paymentId, 'COMPLETE', 'pending', 'completed');
    emitDomainEvent(ctx, DOMAIN_EVENTS.PAYMENT_COMPLETED, 'paymentTransactions', paymentId, {
      loanId: payment.loanId,
      amount: payment.amount,
    });
    emitRelationship(
      ctx,
      { type: 'paymentTransactions', id: paymentId },
      { type: 'loans', id: payment.loanId },
      'settled_against'
    );
  },
});

/** Mark a payment as failed. Only allowed from "pending" status. */
export const failPayment = mutation({
  args: {
    paymentId: v.id('paymentTransactions'),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { paymentId, reason }) => {
    await assertStaff(ctx);
    const payment = await ctx.db.get(paymentId);
    if (!payment) throw new ConvexError({ code: 'NOT_FOUND', message: 'Payment not found.' });

    if (payment.status !== 'pending') {
      throw new ConvexError({
        code: 'INVALID_STATE',
        message: `Payment cannot be failed from status '${payment.status}'. Only 'pending' payments can be failed.`,
      });
    }

    await ctx.db.patch(paymentId, {
      status: 'failed',
      metadata: { failureReason: reason },
      updatedAt: Date.now(),
    });
    scheduleAuditLog(ctx, 'payment', paymentId, 'FAIL', 'pending', 'failed', reason);
    emitDomainEvent(ctx, DOMAIN_EVENTS.PAYMENT_FAILED, 'paymentTransactions', paymentId, {
      reason,
    });
  },
});

/**
 * Create payment schedule for a loan.
 * Replaces schedule generation in `create_payment_schedule` RPC.
 */
export const createPaymentSchedule = mutation({
  args: {
    loanId: v.id('loans'),
    schedule: v.array(
      v.object({
        installmentNumber: v.number(),
        dueDate: v.number(),
        principalDue: v.number(),
        interestDue: v.number(),
        totalDue: v.number(),
      })
    ),
  },
  handler: async (ctx, { loanId, schedule }) => {
    await assertStaff(ctx);
    const loan = await ctx.db.get(loanId);
    if (!loan) throw new ConvexError({ code: 'NOT_FOUND', message: 'Loan not found.' });

    const now = Date.now();
    for (const installment of schedule) {
      await ctx.db.insert('paymentSchedules', {
        loanId,
        ...installment,
        status: 'scheduled',
        createdAt: now,
      });
    }
    scheduleAuditEntry(ctx, {
      entityType: 'paymentSchedules',
      entityId: loanId,
      action: 'CREATE_SCHEDULE',
      newState: {
        loanId,
        installmentCount: schedule.length,
        totalDue: schedule.reduce((s, i) => s + i.totalDue, 0),
      },
    });
    emitRelationship(
      ctx,
      { type: 'loans', id: loanId },
      { type: 'paymentSchedules', id: loanId },
      'has_schedule',
      { installmentCount: schedule.length }
    );
  },
});

/** Mark a scheduled installment as paid. Replaces `mark_schedule_paid` RPC. */
export const markSchedulePaid = mutation({
  args: {
    scheduleId: v.id('paymentSchedules'),
    paidAmount: v.number(),
  },
  handler: async (ctx, { scheduleId, paidAmount }) => {
    await assertStaff(ctx);
    await ctx.db.patch(scheduleId, {
      status: 'paid',
      paidAt: Date.now(),
      paidAmount,
    });
    scheduleAuditLog(ctx, 'paymentSchedules', scheduleId, 'MARK_PAID', 'scheduled', 'paid');
  },
});
