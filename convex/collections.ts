/**
 * Collections — debt recovery interactions, promise-to-pay, overdue management.
 * Replaces collectionsService.ts Supabase calls.
 */

import { ConvexError, v } from 'convex/values';
import { internal } from './_generated/api';
import { mutation, query } from './_generated/server';
import { scheduleAuditLog } from './lib/audit';
import { assertAuthenticated, assertStaff } from './lib/auth';
import { emitDomainEvent } from './lib/domainEvents';
import { assertCallerFeatureEnabled } from './lib/entitlements';
import { deactivateRelationship, emitRelationship } from './lib/relationshipEmitter';
import { applyTenantScope, resolveWriteInstitution, tenantReadScope } from './lib/tenancy';

const activityType = v.union(
  v.literal('call_attempt'),
  v.literal('sms_sent'),
  v.literal('email_sent'),
  v.literal('promise_to_pay'),
  v.literal('payment_received'),
  v.literal('escalation'),
  v.literal('legal_notice'),
  v.literal('note'),
  v.literal('field_visit'),
  v.literal('letter_sent'),
  v.literal('whatsapp_sent')
);

const contactMethod = v.union(
  v.literal('phone'),
  v.literal('sms'),
  v.literal('email'),
  v.literal('in_person'),
  v.literal('letter'),
  v.literal('whatsapp')
);

// ---------------------------------------------------------------------------
// Collections Queue (overdue loans)
// ---------------------------------------------------------------------------

export const getCollectionsQueue = query({
  args: {
    minDaysOverdue: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { minDaysOverdue, limit }) => {
    await assertStaff(ctx);
    await assertCallerFeatureEnabled(ctx, 'collections');

    // Fetch overdue payment schedules to build queue. partially_paid is
    // sticky (never cron-flipped to 'overdue'), so past-due partially paid
    // installments are pulled in explicitly with their remaining amount owed.
    const now = Date.now();
    const [overdueRaw, partiallyPaidRaw] = await Promise.all([
      ctx.db
        .query('paymentSchedules')
        .withIndex('by_status', (q) => q.eq('status', 'overdue'))
        .order('asc')
        .take(limit ?? 100),
      ctx.db
        .query('paymentSchedules')
        .withIndex('by_status', (q) => q.eq('status', 'partially_paid'))
        .order('asc')
        .take(limit ?? 100),
    ]);
    const scope = await tenantReadScope(ctx);
    const overdue = applyTenantScope(
      [...overdueRaw, ...partiallyPaidRaw.filter((s) => s.dueDate < now)],
      scope
    );

    const MS_PER_DAY = 86_400_000;

    const enriched = overdue
      .map((s) => ({
        ...s,
        amountOwed: Math.max(0, Math.round((s.totalDue - (s.paidAmount ?? 0)) * 100)) / 100,
        daysOverdue: Math.floor((now - s.dueDate) / MS_PER_DAY),
      }))
      .filter((s) => (minDaysOverdue !== undefined ? s.daysOverdue >= minDaysOverdue : true))
      .sort((a, b) => b.daysOverdue - a.daysOverdue)
      .slice(0, limit ?? 100);

    // Enrich with mandate status for collections routing (Ontology Phase 2)
    // Loans with active mandates → automatic debit path (hard collection)
    // Loans without mandates → manual follow-up path (soft collection)
    const loanIds = [...new Set(enriched.map((s) => s.loanId))];
    const mandateMap: Record<string, { hasMandate: boolean; mandateRef?: string }> = {};

    for (const loanId of loanIds) {
      const mandates = await ctx.db
        .query('mandates')
        .withIndex('by_loanId', (q) => q.eq('loanId', loanId))
        .collect();
      const active = mandates.find((m) => m.status === 'active');
      mandateMap[loanId] = {
        hasMandate: !!active,
        mandateRef: active?.mandateRef,
      };
    }

    return enriched.map((item) => ({
      ...item,
      mandateStatus: mandateMap[item.loanId] ?? { hasMandate: false },
    }));
  },
});

// ---------------------------------------------------------------------------
// Interactions / Activity Log
// ---------------------------------------------------------------------------

export const listInteractionsByLoan = query({
  args: { loanId: v.id('loans') },
  handler: async (ctx, { loanId }) => {
    await assertStaff(ctx);
    await assertCallerFeatureEnabled(ctx, 'collections');
    return ctx.db
      .query('collectionsInteractions')
      .withIndex('by_loanId', (q) => q.eq('loanId', loanId))
      .order('desc')
      .collect();
  },
});

export const recordInteraction = mutation({
  args: {
    loanId: v.id('loans'),
    activityType,
    activityStatus: v.union(
      v.literal('completed'),
      v.literal('pending'),
      v.literal('failed'),
      v.literal('scheduled')
    ),
    contactMethod: v.optional(contactMethod),
    outcome: v.optional(v.string()),
    notes: v.optional(v.string()),
    promiseDate: v.optional(v.number()),
    promiseAmount: v.optional(v.number()),
    nextActionDate: v.optional(v.number()),
    nextActionType: v.optional(v.string()),
    assignedTo: v.optional(v.id('users')),
  },
  handler: async (ctx, args) => {
    await assertStaff(ctx);
    await assertCallerFeatureEnabled(ctx, 'collections');

    const interactionId = await ctx.db.insert('collectionsInteractions', {
      ...args,
      institutionId: await resolveWriteInstitution(ctx, { loanId: args.loanId }),
      promiseFulfilled: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    scheduleAuditLog(
      ctx,
      'collectionsInteractions',
      interactionId,
      `collections_${args.activityType}`,
      'none',
      args.activityStatus,
      args.notes
    );
    emitRelationship(
      ctx,
      { type: 'loans', id: args.loanId },
      { type: 'collectionsInteractions', id: interactionId },
      'has_interaction'
    );
    emitDomainEvent(
      ctx,
      'collection.interaction_recorded',
      'collectionsInteractions',
      interactionId,
      {
        loanId: args.loanId,
        activityType: args.activityType,
        activityStatus: args.activityStatus,
      }
    );

    return interactionId;
  },
});

// ---------------------------------------------------------------------------
// Promise-to-Pay
// ---------------------------------------------------------------------------

export const listPromisesToPay = query({
  args: {
    loanId: v.optional(v.id('loans')),
    status: v.optional(v.string()),
  },
  handler: async (ctx, { loanId, status }) => {
    await assertStaff(ctx);
    await assertCallerFeatureEnabled(ctx, 'collections');

    let results = applyTenantScope(
      await ctx.db.query('promiseToPay').collect(),
      await tenantReadScope(ctx)
    );
    if (loanId) results = results.filter((p) => p.loanId === loanId);
    if (status) results = results.filter((p) => p.status === status);
    return results;
  },
});

export const createPromiseToPay = mutation({
  args: {
    loanId: v.id('loans'),
    // userId is resolved server-side from the loan record — no client coercion needed
    promiseDate: v.number(),
    promiseAmount: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const staffId = await assertStaff(ctx);
    await assertCallerFeatureEnabled(ctx, 'collections');
    const now = Date.now();

    const loan = await ctx.db.get(args.loanId);
    if (!loan) throw new ConvexError({ code: 'NOT_FOUND', message: 'Loan not found.' });

    const ptpId = await ctx.db.insert('promiseToPay', {
      loanId: args.loanId,
      userId: loan.userId,
      institutionId: loan.institutionId,
      amount: args.promiseAmount,
      promiseDate: args.promiseDate,
      status: 'pending',
      notes: args.notes,
      createdBy: staffId,
      createdAt: now,
      updatedAt: now,
    });

    scheduleAuditLog(
      ctx,
      'promiseToPay',
      ptpId,
      'create_promise_to_pay',
      'none',
      'pending',
      args.notes
    );
    emitRelationship(
      ctx,
      { type: 'loans', id: args.loanId },
      { type: 'promiseToPay', id: ptpId },
      'has_promise'
    );
    emitDomainEvent(ctx, 'collection.promise_recorded', 'promiseToPay', ptpId, {
      loanId: args.loanId,
      promiseAmount: args.promiseAmount,
      promiseDate: args.promiseDate,
    });

    return ptpId;
  },
});

export const markPromiseFulfilled = mutation({
  args: {
    ptpId: v.id('promiseToPay'),
    paymentId: v.optional(v.id('paymentTransactions')),
  },
  handler: async (ctx, { ptpId, paymentId }) => {
    await assertStaff(ctx);
    await assertCallerFeatureEnabled(ctx, 'collections');

    const ptp = await ctx.db.get(ptpId);
    if (!ptp) throw new Error('Promise-to-pay not found');

    await ctx.db.patch(ptpId, {
      status: 'kept',
      updatedAt: Date.now(),
    });

    scheduleAuditLog(ctx, 'promiseToPay', ptpId, 'fulfill_promise', 'pending', 'kept');
    deactivateRelationship(
      ctx,
      { type: 'loans', id: ptp.loanId },
      { type: 'promiseToPay', id: ptpId },
      'has_promise'
    );
    emitDomainEvent(ctx, 'collection.promise_fulfilled', 'promiseToPay', ptpId, {
      loanId: ptp.loanId,
      amount: ptp.amount,
      paymentId,
    });
  },
});

// ---------------------------------------------------------------------------
// Overdue Reminders
// ---------------------------------------------------------------------------

export const listOverdueReminders = query({
  args: {
    loanId: v.optional(v.id('loans')),
    sent: v.optional(v.boolean()),
  },
  handler: async (ctx, { loanId, sent }) => {
    await assertStaff(ctx);
    await assertCallerFeatureEnabled(ctx, 'collections');
    let results = applyTenantScope(
      await ctx.db.query('overdueReminders').collect(),
      await tenantReadScope(ctx)
    );
    if (loanId) results = results.filter((r) => r.loanId === loanId);
    if (sent !== undefined) results = results.filter((r) => r.sent === sent);
    return results;
  },
});

export const markReminderSent = mutation({
  args: { reminderId: v.id('overdueReminders') },
  handler: async (ctx, { reminderId }) => {
    await assertStaff(ctx);
    await assertCallerFeatureEnabled(ctx, 'collections');
    await ctx.db.patch(reminderId, {
      sent: true,
      sentAt: Date.now(),
      updatedAt: Date.now(),
    });
    scheduleAuditLog(ctx, 'overdueReminders', reminderId, 'SEND', 'pending', 'sent');
  },
});

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

export const getCollectionsStats = query({
  args: {},
  handler: async (ctx) => {
    await assertStaff(ctx);
    await assertCallerFeatureEnabled(ctx, 'collections');
    const scope = await tenantReadScope(ctx);

    const [overdueRaw, partiallyPaidRaw, ptpsRaw, interactionsRaw] = await Promise.all([
      ctx.db
        .query('paymentSchedules')
        .withIndex('by_status', (q) => q.eq('status', 'overdue'))
        .collect(),
      ctx.db
        .query('paymentSchedules')
        .withIndex('by_status', (q) => q.eq('status', 'partially_paid'))
        .collect(),
      ctx.db.query('promiseToPay').collect(),
      ctx.db.query('collectionsInteractions').collect(),
    ]);
    const now = Date.now();
    // Sticky partially_paid rows past due count with their remaining amount.
    const overdue = applyTenantScope(
      [...overdueRaw, ...partiallyPaidRaw.filter((s) => s.dueDate < now)],
      scope
    );
    const ptps = applyTenantScope(ptpsRaw, scope);
    const interactions = applyTenantScope(interactionsRaw, scope);

    const MS_PER_DAY = 86_400_000;

    return {
      overdue: {
        count: overdue.length,
        totalAmount:
          overdue.reduce(
            (s, o) => s + Math.max(0, Math.round(((o.totalDue ?? 0) - (o.paidAmount ?? 0)) * 100)),
            0
          ) / 100,
        over30Days: overdue.filter((o) => (now - o.dueDate) / MS_PER_DAY > 30).length,
        over90Days: overdue.filter((o) => (now - o.dueDate) / MS_PER_DAY > 90).length,
      },
      promiseToPay: {
        pending: ptps.filter((p) => p.status === 'pending').length,
        fulfilled: ptps.filter((p) => p.status === 'kept').length,
        broken: ptps.filter((p) => p.status === 'broken').length,
      },
      interactions: {
        total: interactions.length,
        thisWeek: interactions.filter((i) => i.createdAt > now - 7 * MS_PER_DAY).length,
      },
    };
  },
});

// ---------------------------------------------------------------------------
// Payment reschedule requests (client self-service → staff review)
// ---------------------------------------------------------------------------

/** Client: submit a payment-reschedule request for an owned active loan. */
export const requestReschedule = mutation({
  args: {
    loanId: v.id('loans'),
    originalDueDate: v.string(),
    requestedDate: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);
    const loan = await ctx.db.get(args.loanId);
    if (!loan) throw new ConvexError({ code: 'NOT_FOUND', message: 'Loan not found.' });
    if (loan.userId !== userId) {
      // Staff may also file on a client's behalf
      await assertStaff(ctx);
    }
    if (!args.reason.trim()) {
      throw new ConvexError({ code: 'VALIDATION_ERROR', message: 'A reason is required.' });
    }
    if (!['active', 'funded'].includes(loan.status)) {
      throw new ConvexError({
        code: 'INVALID_STATE',
        message: 'Reschedules can only be requested for active loans.',
      });
    }

    const now = Date.now();
    const requestId = await ctx.db.insert('rescheduleRequests', {
      institutionId: loan.institutionId,
      userId: loan.userId,
      loanId: args.loanId,
      originalDueDate: args.originalDueDate,
      requestedDate: args.requestedDate,
      reason: args.reason.trim(),
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });
    scheduleAuditLog(ctx, 'rescheduleRequests', requestId, 'REQUEST', 'none', 'pending');
    return requestId;
  },
});

/** Client: own reschedule requests, newest first. */
export const getMyRescheduleRequests = query({
  args: {},
  handler: async (ctx) => {
    const userId = await assertAuthenticated(ctx);
    return (
      await ctx.db
        .query('rescheduleRequests')
        .withIndex('by_userId', (q) => q.eq('userId', userId))
        .collect()
    ).sort((a, b) => b.createdAt - a.createdAt);
  },
});

/** Staff: pending reschedule requests for review. */
export const listRescheduleRequests = query({
  args: {
    status: v.optional(v.union(v.literal('pending'), v.literal('approved'), v.literal('rejected'))),
  },
  handler: async (ctx, { status }) => {
    await assertStaff(ctx);
    const rows = applyTenantScope(
      status
        ? await ctx.db
            .query('rescheduleRequests')
            .withIndex('by_status', (q) => q.eq('status', status))
            .collect()
        : await ctx.db.query('rescheduleRequests').order('desc').take(200),
      await tenantReadScope(ctx)
    );
    // Enrich with client name + loan context for the admin review panel.
    return Promise.all(
      rows
        .sort((a, b) => b.createdAt - a.createdAt)
        .map(async (row) => {
          const profile = await ctx.db
            .query('profiles')
            .withIndex('by_userId', (q) => q.eq('userId', row.userId))
            .first();
          const loan = await ctx.db.get(row.loanId);
          return {
            ...row,
            clientName: profile?.fullName || profile?.email?.split('@')[0] || 'Unknown',
            loanPrincipal: loan?.principal ?? null,
            loanPurpose: loan?.purpose ?? null,
          };
        })
    );
  },
});

/** Staff: approve or reject a reschedule request; the client is notified. */
export const reviewRescheduleRequest = mutation({
  args: {
    requestId: v.id('rescheduleRequests'),
    decision: v.union(v.literal('approved'), v.literal('rejected')),
    adminNotes: v.optional(v.string()),
  },
  handler: async (ctx, { requestId, decision, adminNotes }) => {
    const staffId = await assertStaff(ctx);
    const request = await ctx.db.get(requestId);
    if (!request) throw new ConvexError({ code: 'NOT_FOUND', message: 'Request not found.' });
    if (request.status !== 'pending') return; // idempotent

    const now = Date.now();
    await ctx.db.patch(requestId, {
      status: decision,
      adminNotes,
      reviewedBy: staffId,
      reviewedAt: now,
      updatedAt: now,
    });
    ctx.scheduler
      .runAfter(0, internal.notifications.createNotification, {
        userId: request.userId,
        title: `Reschedule request ${decision}`,
        message:
          adminNotes ??
          (decision === 'approved'
            ? `Your payment has been rescheduled to ${request.requestedDate}.`
            : 'Your reschedule request was not approved. Contact support for options.'),
        category: 'payment' as const,
        priority: 'high' as const,
      })
      .catch((err: unknown) => console.error('[reschedule] notify failed:', err));
    scheduleAuditLog(ctx, 'rescheduleRequests', requestId, 'REVIEW', 'pending', decision);
  },
});
