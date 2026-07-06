/**
 * Payment processing and schedules.
 * Replaces 8 Supabase RPCs:
 *   record_payment, process_payment, complete_payment, fail_payment,
 *   reverse_payment, get_payment_schedule, mark_schedule_paid, get_overdue_payments
 *
 * Completed financial state enqueues TigerBeetle REPAYMENT outbox entries atomically.
 * FINANCIAL SAFETY: retry: false on all useMutation calls (frontend).
 */

import { ConvexError, v } from 'convex/values';
import { internalMutation, mutation, query } from './_generated/server';
import { fromCents, toCents } from './lib/amortization';
import { scheduleAuditEntry, scheduleAuditLog } from './lib/audit';
import { assertAdmin, assertAuthenticated, assertOwnerOrStaff, assertStaff } from './lib/auth';
import { DOMAIN_EVENTS, emitDomainEvent } from './lib/domainEvents';
import { enqueueOutboxIdempotent } from './lib/outbox';
import { computePayoffQuoteNAD, decomposePaidAmount } from './lib/paymentAllocation';
import { emitRelationship } from './lib/relationshipEmitter';
import { applyCompletedRepayment } from './lib/repaymentApplication';
import { buildRepaymentReversalPayloadFromCents } from './lib/repaymentOutbox';
import { ensurePaymentSchedule } from './lib/scheduleGeneration';
import { applyTenantScope, resolveWriteInstitution, tenantReadScope } from './lib/tenancy';
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
        let clientName = profile?.fullName || profile?.email?.split('@')[0];
        if (!clientName) {
          // Profile row may not exist yet — fall back to the auth user doc
          const user = await ctx.db.get(payment.userId);
          clientName = user?.name || user?.email?.split('@')[0];
        }
        return {
          ...payment,
          clientName: clientName || 'Unknown',
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
    const scope = await tenantReadScope(ctx);
    // partially_paid is sticky (never cron-flipped to 'overdue'), so past-due
    // partially paid installments must be surfaced here explicitly.
    const [scheduled, partiallyPaid] = await Promise.all([
      ctx.db
        .query('paymentSchedules')
        .withIndex('by_status', (q) => q.eq('status', 'scheduled'))
        .collect(),
      ctx.db
        .query('paymentSchedules')
        .withIndex('by_status', (q) => q.eq('status', 'partially_paid'))
        .collect(),
    ]);
    return applyTenantScope([...scheduled, ...partiallyPaid], scope)
      .filter((s) => s.dueDate < now)
      .sort((a, b) => a.dueDate - b.dueDate)
      .slice(0, limit ?? 100);
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

    const now = Date.now();
    const resolvedFeesPaid = feesPaid ?? payment.feesPaid ?? 0;

    // Splits are DERIVED from the schedule allocation (interest-first / payoff
    // rebate — see lib/paymentAllocation). Explicit principal/interest args are
    // advisory; if they diverge from the derived split we audit the override.
    const result = await applyCompletedRepayment(ctx, {
      payment,
      feesPaidNAD: resolvedFeesPaid,
      now,
    });

    const advisoryPrincipal = principalPaid ?? payment.principalPaid;
    const advisoryInterest = interestPaid ?? payment.interestPaid;
    if (
      (advisoryPrincipal != null &&
        Math.round(advisoryPrincipal * 100) !== result.totals.principalCents) ||
      (advisoryInterest != null &&
        Math.round(advisoryInterest * 100) !== result.totals.interestCents)
    ) {
      scheduleAuditLog(
        ctx,
        'payment',
        paymentId,
        'SPLIT_OVERRIDDEN_BY_ALLOCATION',
        'pending',
        'completed'
      );
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

      // Shared completion routine: derived splits, schedule allocation,
      // cents-exact loan update, single REPAYMENT outbox entry.
      await applyCompletedRepayment(ctx, {
        payment,
        feesPaidNAD: payment.feesPaid ?? 0,
        now,
      });

      // Gateway provenance on top of the routine's patch
      await ctx.db.patch(payment._id, {
        metadata: {
          ...(((await ctx.db.get(payment._id))?.metadata as Record<string, unknown>) ?? {}),
          gateway: args.gateway,
          webhookStatus: args.status,
        },
        updatedAt: now,
      });

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
        institutionId: loan.institutionId,
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
    const row = await ctx.db.get(scheduleId);
    if (!row) throw new ConvexError({ code: 'NOT_FOUND', message: 'Schedule row not found.' });
    if (paidAmount <= 0) {
      throw new ConvexError({ code: 'VALIDATION_ERROR', message: 'Paid amount must be positive.' });
    }

    // Accumulate on top of any prior partials; interest-first decomposition
    // within the row keeps the ledger derivation consistent with the allocator.
    const prior = decomposePaidAmount(row);
    const addCents = Math.round(paidAmount * 100);
    const interestOutstanding = Math.max(
      0,
      Math.round(row.interestDue * 100) - prior.interestPaidCents
    );
    const interestAdd = Math.min(addCents, interestOutstanding);
    const principalAdd = addCents - interestAdd;

    const newPaidCents = Math.round((row.paidAmount ?? 0) * 100) + addCents;
    const fullyPaid = newPaidCents >= Math.round(row.totalDue * 100);
    const newStatus = fullyPaid ? 'paid' : 'partially_paid';
    const now = Date.now();

    await ctx.db.patch(scheduleId, {
      status: newStatus,
      paidAmount: newPaidCents / 100,
      principalPaidAmount: (prior.principalPaidCents + principalAdd) / 100,
      interestPaidAmount: (prior.interestPaidCents + interestAdd) / 100,
      ...(fullyPaid ? { paidAt: now } : {}),
    });
    scheduleAuditLog(
      ctx,
      'paymentSchedules',
      scheduleId,
      fullyPaid ? 'MARK_PAID' : 'MARK_PARTIALLY_PAID',
      row.status,
      newStatus
    );
  },
});

/**
 * Reverse a completed payment — the exact inverse of applyCompletedRepayment.
 *
 * Reads the paymentAllocations ledger for cent-exact per-installment
 * un-allocation (subtract decomposition, recompute status, un-waive rebated
 * rows), restores the loan balance in integer cents, and enqueues a
 * REPAYMENT_REVERSAL outbox entry whose transfers mirror the originally
 * posted legs (accounts swapped, codes 2101/5101/5102). No hard deletes —
 * allocations are stamped reversedAt, never removed.
 */
export const reversePayment = mutation({
  args: {
    paymentId: v.id('paymentTransactions'),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { paymentId, reason }) => {
    await assertAdmin(ctx);
    const payment = await ctx.db.get(paymentId);
    if (!payment) throw new ConvexError({ code: 'NOT_FOUND', message: 'Payment not found.' });
    if (payment.status === 'reversed') return; // idempotent
    if (payment.status !== 'completed') {
      throw new ConvexError({
        code: 'INVALID_STATE',
        message: `Only completed payments can be reversed (current: '${payment.status}').`,
      });
    }
    const now = Date.now();

    const allocations = (
      await ctx.db
        .query('paymentAllocations')
        .withIndex('by_paymentId', (q) => q.eq('paymentId', paymentId))
        .collect()
    ).filter((a) => !a.reversedAt);

    const amountCents = toCents(payment.amount);
    const feeCents = Math.min(amountCents, Math.max(0, toCents(payment.feesPaid ?? 0)));
    let principalCents = 0;
    let interestCents = 0;

    if (allocations.length > 0) {
      // Cent-exact un-allocation from the allocation ledger
      for (const alloc of allocations) {
        principalCents += alloc.principalCents;
        interestCents += alloc.interestCents;
        // Direct-principal allocations (no schedule row) only restore balance
        const scheduleId = alloc.scheduleId;
        const row = scheduleId ? await ctx.db.get(scheduleId) : null;
        if (!scheduleId || !row) {
          await ctx.db.patch(alloc._id, { reversedAt: now });
          continue;
        }

        const prior = decomposePaidAmount(row);
        const newPaidCents = Math.max(
          0,
          toCents(row.paidAmount ?? 0) - alloc.principalCents - alloc.interestCents
        );
        const newPrincipalPaidCents = Math.max(0, prior.principalPaidCents - alloc.principalCents);
        const newInterestPaidCents = Math.max(0, prior.interestPaidCents - alloc.interestCents);

        // Recompute status; a row waived by this payment's settlement rebate
        // is un-waived back into the live schedule.
        let newStatus: 'scheduled' | 'overdue' | 'partially_paid' | 'paid';
        if (newPaidCents >= toCents(row.totalDue)) newStatus = 'paid';
        else if (newPaidCents > 0) newStatus = 'partially_paid';
        else newStatus = row.dueDate < now ? 'overdue' : 'scheduled';

        await ctx.db.patch(scheduleId, {
          status: newStatus,
          paidAmount: fromCents(newPaidCents),
          principalPaidAmount: fromCents(newPrincipalPaidCents),
          interestPaidAmount: fromCents(newInterestPaidCents),
          paidAt: newStatus === 'paid' ? row.paidAt : undefined,
        });
        await ctx.db.patch(alloc._id, { reversedAt: now });
        scheduleAuditLog(
          ctx,
          'paymentSchedules',
          scheduleId,
          'REVERSE_ALLOCATION',
          row.status,
          newStatus
        );
      }
    } else {
      // Legacy payment completed before the allocation ledger existed: restore
      // the loan from the payment's stored splits; schedule rows cannot be
      // exactly un-marked without allocation data, so they are left untouched
      // (flagged in the audit trail below).
      interestCents = Math.max(0, toCents(payment.interestPaid ?? 0));
      principalCents =
        payment.principalPaid != null
          ? Math.max(0, toCents(payment.principalPaid))
          : Math.max(0, amountCents - interestCents - feeCents);
      scheduleAuditLog(
        ctx,
        'payment',
        paymentId,
        'REVERSE_WITHOUT_ALLOCATIONS',
        'completed',
        'reversed',
        'Pre-allocation-ledger payment: schedule rows not adjusted'
      );
    }

    // Restore the loan in integer cents
    const loan = await ctx.db.get(payment.loanId);
    if (loan) {
      const restoredBalanceCents = toCents(loan.outstandingBalance ?? 0) + principalCents;
      const updates: Record<string, unknown> = {
        outstandingBalance: fromCents(restoredBalanceCents),
        totalPaid: fromCents(Math.max(0, toCents(loan.totalPaid ?? 0) - amountCents)),
        updatedAt: now,
      };
      if (loan.status === 'paid_off' && restoredBalanceCents > 0) {
        updates.status = 'active';
        updates.completedAt = undefined;
        scheduleAuditLog(ctx, 'loan', payment.loanId, 'REVERSE_PAID_OFF', 'paid_off', 'active');
      }
      await ctx.db.patch(payment.loanId, updates);
    }

    await ctx.db.patch(paymentId, {
      status: 'reversed',
      metadata: {
        ...((payment.metadata as Record<string, unknown>) ?? {}),
        reversalReason: reason,
        reversedAt: now,
      },
      updatedAt: now,
    });

    // Mirror only what was actually posted to the ledger (allocated cents +
    // fees). Surplus cents never generated transfers, so nothing to reverse.
    const postedCents = principalCents + interestCents + feeCents;
    if (postedCents > 0) {
      await enqueueOutboxIdempotent(ctx, {
        idempotencyKey: `repayment-reversal:payment:${paymentId}`,
        eventType: 'REPAYMENT_REVERSAL',
        sourceTable: 'paymentTransactions',
        sourceId: paymentId,
        payload: buildRepaymentReversalPayloadFromCents({
          loanId: payment.loanId,
          paymentId,
          amountCents: postedCents,
          principalCents,
          interestCents,
          feeCents,
          reason,
        }),
      });
    }

    scheduleAuditLog(ctx, 'payment', paymentId, 'REVERSE', 'completed', 'reversed', reason);
    emitDomainEvent(ctx, DOMAIN_EVENTS.PAYMENT_REVERSED, 'paymentTransactions', paymentId, {
      loanId: payment.loanId,
      amount: payment.amount,
      reason,
    });
  },
});

/**
 * Full-settlement quote for a loan: outstanding principal plus interest
 * already due (or partially paid). Unearned future interest is excluded —
 * it is rebated on early settlement.
 */
export const getPayoffQuote = query({
  args: { loanId: v.id('loans') },
  handler: async (ctx, { loanId }) => {
    const loan = await ctx.db.get(loanId);
    if (!loan) return null;
    await assertOwnerOrStaff(ctx, loan.userId);
    const rows = await ctx.db
      .query('paymentSchedules')
      .withIndex('by_loanId', (q) => q.eq('loanId', loanId))
      .collect();
    const outstanding = loan.outstandingBalance ?? loan.principal ?? 0;
    return {
      payoffQuote: computePayoffQuoteNAD(rows, outstanding, Date.now()),
      outstandingBalance: outstanding,
    };
  },
});

/**
 * One-off backfill: generate amortization schedules for funded/active loans
 * that predate automatic generation in completeDisbursement.
 * Run manually: `npx convex run payments:backfillPaymentSchedules`
 */
export const backfillPaymentSchedules = internalMutation({
  args: {},
  handler: async (ctx) => {
    const candidates = [
      ...(await ctx.db
        .query('loans')
        .withIndex('by_status', (q) => q.eq('status', 'funded'))
        .collect()),
      ...(await ctx.db
        .query('loans')
        .withIndex('by_status', (q) => q.eq('status', 'active'))
        .collect()),
    ];

    let backfilled = 0;
    for (const loan of candidates) {
      const installments = await ensurePaymentSchedule(
        ctx,
        loan,
        loan.disbursedAt ?? loan.createdAt
      );
      if (installments > 0) {
        backfilled++;
        scheduleAuditLog(
          ctx,
          'paymentSchedules',
          loan._id,
          'GENERATE_SCHEDULE',
          'none',
          'scheduled'
        );
        emitDomainEvent(ctx, DOMAIN_EVENTS.SCHEDULE_GENERATED, 'loans', loan._id, {
          loanId: loan._id,
          installments,
          termMonths: loan.termMonths,
          backfill: true,
        });
      }
    }
    console.log(`[backfillPaymentSchedules] Generated schedules for ${backfilled} loan(s)`);
    return backfilled;
  },
});
