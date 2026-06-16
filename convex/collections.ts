/**
 * Collections — debt recovery interactions, promise-to-pay, overdue management.
 * Replaces collectionsService.ts Supabase calls.
 */

import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { scheduleAuditLog } from './lib/audit';
import { assertStaff } from './lib/auth';
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

    // Fetch overdue payment schedules to build queue
    const overdueRaw = await ctx.db
      .query('paymentSchedules')
      .withIndex('by_status', (q) => q.eq('status', 'overdue'))
      .order('asc')
      .take(limit ?? 100);
    const overdue = applyTenantScope(overdueRaw, await tenantReadScope(ctx));

    const now = Date.now();
    const MS_PER_DAY = 86_400_000;

    const enriched = overdue
      .map((s) => ({
        ...s,
        daysOverdue: Math.floor((now - s.dueDate) / MS_PER_DAY),
      }))
      .filter((s) => (minDaysOverdue !== undefined ? s.daysOverdue >= minDaysOverdue : true))
      .sort((a, b) => b.daysOverdue - a.daysOverdue);

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

    const [overdueRaw, ptpsRaw, interactionsRaw] = await Promise.all([
      ctx.db
        .query('paymentSchedules')
        .withIndex('by_status', (q) => q.eq('status', 'overdue'))
        .collect(),
      ctx.db.query('promiseToPay').collect(),
      ctx.db.query('collectionsInteractions').collect(),
    ]);
    const overdue = applyTenantScope(overdueRaw, scope);
    const ptps = applyTenantScope(ptpsRaw, scope);
    const interactions = applyTenantScope(interactionsRaw, scope);

    const now = Date.now();
    const MS_PER_DAY = 86_400_000;

    return {
      overdue: {
        count: overdue.length,
        totalAmount: overdue.reduce((s, o) => s + (o.totalDue ?? 0), 0),
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
