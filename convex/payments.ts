/**
 * Payment processing and schedules.
 * Replaces 8 Supabase RPCs:
 *   record_payment, process_payment, complete_payment, fail_payment,
 *   reverse_payment, get_payment_schedule, mark_schedule_paid, get_overdue_payments
 *
 * Completed financial state enqueues TigerBeetle REPAYMENT outbox entries atomically.
 * FINANCIAL SAFETY: retry: false on all useMutation calls (frontend).
 */

import { v } from 'convex/values';
import { query, mutation, internalMutation } from './_generated/server';
import { internal } from './_generated/api';
import { ConvexError } from 'convex/values';
import { assertAuthenticated, assertStaff, assertOwnerOrStaff } from './lib/auth';
import { scheduleAuditLog, scheduleAuditEntry } from './lib/audit';
import { emitRelationship } from './lib/relationshipEmitter';
import { emitDomainEvent, DOMAIN_EVENTS } from './lib/domainEvents';
import { paymentTxStatus } from './schema';
import { buildRepaymentOutboxPayload } from './lib/repaymentOutbox';
import { enqueueOutboxIdempotent } from './lib/outbox';
import { resolveWriteInstitution, tenantReadScope, applyTenantScope } from './lib/tenancy';

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
    let results;
    if (status) {
      results = await ctx.db
        .query('paymentTransactions')
        .withIndex('by_status', (q) => q.eq('status', status))
        .order('desc')
        .take(limit ?? 100);
    } else {
      results = await ctx.db
        .query('paymentTransactions')
        .order('desc')
        .take(limit ?? 100);
    }

    results = applyTenantScope(results, await tenantReadScope(ctx));

    // Enrich with profile names for admin display
    const enriched = await Promise.all(
      results.map(async (payment) => {
        const profile = await ctx.db
          .query('profiles')
          .withIndex('by_userId', (q) => q.eq('userId', payment.userId))
          .first();
        return {
          ...payment,
          clientName: profile?.fullName || profile?.email?.split('@')[0] || 'Unknown',
        };
      })
    );
    return enriched;
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
 * Creates pending operational state. Ledger posting occurs on completion.
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
    await assertAuthenticated(ctx);
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

    const splitTotal = (args.principalPaid ?? 0) + (args.interestPaid ?? 0) + (args.feesPaid ?? 0);
    if (splitTotal > 0 && Math.abs(splitTotal - args.amount) > 0.01) {
      throw new ConvexError({
        code: 'VALIDATION_ERROR',
        message: 'Payment split must equal the total payment amount.',
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
      userId: loan.userId,
      institutionId: await resolveWriteInstitution(ctx, { loanId: args.loanId }),
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

    scheduleAuditLog(ctx, 'payment', paymentId, 'RECORD', 'none', 'pending');
    emitDomainEvent(ctx, DOMAIN_EVENTS.PAYMENT_RECORDED, 'paymentTransactions', paymentId, {
      loanId: args.loanId,
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
    feesPaid: v.optional(v.number()),
  },
  handler: async (ctx, { paymentId, principalPaid, interestPaid, feesPaid }) => {
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

    const resolvedInterestPaid = interestPaid ?? payment.interestPaid ?? 0;
    const resolvedFeesPaid = feesPaid ?? payment.feesPaid ?? 0;
    const resolvedPrincipalPaid =
      principalPaid ??
      payment.principalPaid ??
      payment.amount - resolvedInterestPaid - resolvedFeesPaid;
    const now = Date.now();

    const outboxPayload = buildRepaymentOutboxPayload({
      loanId: payment.loanId,
      paymentId,
      amount: payment.amount,
      principalPaid: resolvedPrincipalPaid,
      interestPaid: resolvedInterestPaid,
      feesPaid: resolvedFeesPaid,
    });

    await ctx.db.patch(paymentId, {
      status: 'completed',
      principalPaid: resolvedPrincipalPaid,
      interestPaid: resolvedInterestPaid,
      feesPaid: resolvedFeesPaid,
      paymentDate: payment.paymentDate ?? now,
      updatedAt: now,
    });

    await enqueueOutboxIdempotent(ctx, {
      idempotencyKey: `repayment:payment:${paymentId}`,
      eventType: 'REPAYMENT',
      sourceTable: 'paymentTransactions',
      sourceId: paymentId,
      payload: outboxPayload,
    });

    // Update loan balance
    // When no principal/interest split is provided, treat the full payment as principal reduction
    const loan = await ctx.db.get(payment.loanId);
    if (loan) {
      const newBalance = Math.max(
        0,
        (loan.outstandingBalance ?? loan.principal) - resolvedPrincipalPaid
      );
      const newTotalPaid = (loan.totalPaid ?? 0) + payment.amount;
      const updates: Record<string, unknown> = {
        outstandingBalance: newBalance,
        totalPaid: newTotalPaid,
        updatedAt: now,
      };
      if (newBalance === 0) {
        updates.status = 'paid_off';
        updates.completedAt = now;
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

export const applyPaymentWebhook = internalMutation({
  args: {
    gateway: v.string(),
    status: v.union(v.literal('completed'), v.literal('failed')),
    externalTransactionId: v.optional(v.string()),
    referenceNumber: v.optional(v.string()),
    failureReason: v.optional(v.string()),
    amount: v.optional(v.number()),
    currency: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.externalTransactionId && !args.referenceNumber) {
      throw new ConvexError({
        code: 'VALIDATION_ERROR',
        message: 'Webhook must include an external transaction ID or reference number.',
      });
    }

    let payment = args.externalTransactionId
      ? await ctx.db
          .query('paymentTransactions')
          .withIndex('by_externalTransactionId', (q) =>
            q.eq('externalTransactionId', args.externalTransactionId)
          )
          .first()
      : null;

    if (!payment && args.referenceNumber) {
      payment = await ctx.db
        .query('paymentTransactions')
        .withIndex('by_referenceNumber', (q) => q.eq('referenceNumber', args.referenceNumber))
        .first();
    }

    if (!payment) {
      return { ok: false, reason: 'not_found' as const };
    }

    const now = Date.now();
    if (args.status === 'completed') {
      if (payment.status === 'completed') {
        return { ok: true, paymentId: payment._id, idempotent: true };
      }
      if (!['pending', 'processing'].includes(payment.status)) {
        return { ok: false, paymentId: payment._id, reason: 'invalid_state' as const };
      }

      // FINANCIAL RECONCILIATION: a signature-valid webhook must still match the
      // local payment financially. A confirmed amount/currency that disagrees with
      // the recorded payment must never complete it — flag for manual review instead.
      if (args.amount !== undefined && Math.abs(args.amount - payment.amount) > 0.01) {
        scheduleAuditLog(
          ctx,
          'payment',
          payment._id,
          'WEBHOOK_AMOUNT_MISMATCH',
          payment.status,
          payment.status,
          `Gateway ${args.gateway} reported ${args.amount}, local payment is ${payment.amount}`
        );
        return { ok: false, paymentId: payment._id, reason: 'amount_mismatch' as const };
      }
      if (args.currency !== undefined && args.currency.toUpperCase() !== 'NAD') {
        scheduleAuditLog(
          ctx,
          'payment',
          payment._id,
          'WEBHOOK_CURRENCY_MISMATCH',
          payment.status,
          payment.status,
          `Gateway ${args.gateway} reported currency ${args.currency}, expected NAD`
        );
        return { ok: false, paymentId: payment._id, reason: 'currency_mismatch' as const };
      }

      const resolvedInterestPaid = payment.interestPaid ?? 0;
      const resolvedFeesPaid = payment.feesPaid ?? 0;
      const resolvedPrincipalPaid =
        payment.principalPaid ?? payment.amount - resolvedInterestPaid - resolvedFeesPaid;
      const outboxPayload = buildRepaymentOutboxPayload({
        loanId: payment.loanId,
        paymentId: payment._id,
        amount: payment.amount,
        principalPaid: resolvedPrincipalPaid,
        interestPaid: resolvedInterestPaid,
        feesPaid: resolvedFeesPaid,
      });

      await ctx.db.patch(payment._id, {
        status: 'completed',
        principalPaid: resolvedPrincipalPaid,
        interestPaid: resolvedInterestPaid,
        feesPaid: resolvedFeesPaid,
        paymentDate: payment.paymentDate ?? now,
        metadata: {
          ...(payment.metadata ?? {}),
          gateway: args.gateway,
          webhookStatus: args.status,
        },
        updatedAt: now,
      });

      await enqueueOutboxIdempotent(ctx, {
        idempotencyKey: `repayment:payment:${payment._id}`,
        eventType: 'REPAYMENT',
        sourceTable: 'paymentTransactions',
        sourceId: payment._id,
        payload: outboxPayload,
      });

      const loan = await ctx.db.get(payment.loanId);
      if (loan) {
        const newBalance = Math.max(
          0,
          (loan.outstandingBalance ?? loan.principal) - resolvedPrincipalPaid
        );
        const updates: Record<string, unknown> = {
          outstandingBalance: newBalance,
          totalPaid: (loan.totalPaid ?? 0) + payment.amount,
          updatedAt: now,
        };
        if (newBalance === 0) {
          updates.status = 'paid_off';
          updates.completedAt = now;
          scheduleAuditLog(ctx, 'loan', payment.loanId, 'PAID_OFF', loan.status, 'paid_off');
        } else if (loan.status === 'funded') {
          updates.status = 'active';
        }
        await ctx.db.patch(payment.loanId, updates);
      }

      scheduleAuditLog(
        ctx,
        'payment',
        payment._id,
        'COMPLETE_WEBHOOK',
        payment.status,
        'completed'
      );
      emitDomainEvent(ctx, DOMAIN_EVENTS.PAYMENT_COMPLETED, 'paymentTransactions', payment._id, {
        loanId: payment.loanId,
        amount: payment.amount,
        gateway: args.gateway,
      });
      emitRelationship(
        ctx,
        { type: 'paymentTransactions', id: payment._id },
        { type: 'loans', id: payment.loanId },
        'settled_against'
      );
      return { ok: true, paymentId: payment._id, idempotent: false };
    }

    if (payment.status === 'failed') {
      return { ok: true, paymentId: payment._id, idempotent: true };
    }
    if (!['pending', 'processing'].includes(payment.status)) {
      return { ok: false, paymentId: payment._id, reason: 'invalid_state' as const };
    }

    await ctx.db.patch(payment._id, {
      status: 'failed',
      metadata: {
        ...(payment.metadata ?? {}),
        gateway: args.gateway,
        webhookStatus: args.status,
        failureReason: args.failureReason,
      },
      updatedAt: now,
    });
    scheduleAuditLog(
      ctx,
      'payment',
      payment._id,
      'FAIL_WEBHOOK',
      payment.status,
      'failed',
      args.failureReason
    );
    emitDomainEvent(ctx, DOMAIN_EVENTS.PAYMENT_FAILED, 'paymentTransactions', payment._id, {
      reason: args.failureReason,
      gateway: args.gateway,
    });
    return { ok: true, paymentId: payment._id, idempotent: false };
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
