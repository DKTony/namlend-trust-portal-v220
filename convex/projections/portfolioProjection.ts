/**
 * Portfolio Projections — incrementally updated by domain events.
 *
 * Each handler is idempotent: it checks lastEventId to skip duplicate
 * deliveries. Metrics are upsert-style: create on first use, patch thereafter.
 *
 * Metric keys:
 *   active_loan_count, approved_loan_count, approved_loan_amount,
 *   total_disbursed, total_repaid, completed_payment_count,
 *   paid_off_loan_count
 */

import { GenericMutationCtx } from 'convex/server';
import { v } from 'convex/values';
import { DataModel } from '../_generated/dataModel';
import { internalMutation } from '../_generated/server';

type MutCtx = GenericMutationCtx<DataModel>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function upsertMetric(ctx: MutCtx, metricKey: string, delta: number, eventId: string) {
  const existing = await ctx.db
    .query('portfolioMetrics')
    .withIndex('by_metricKey', (q) => q.eq('metricKey', metricKey))
    .first();

  if (existing) {
    // Idempotency: skip if already processed this event for this metric
    if (existing.lastEventId === eventId) return;
    await ctx.db.patch(existing._id, {
      value: existing.value + delta,
      lastEventId: eventId,
      updatedAt: Date.now(),
    });
  } else {
    await ctx.db.insert('portfolioMetrics', {
      metricKey,
      value: delta,
      lastEventId: eventId,
      updatedAt: Date.now(),
    });
  }
}

async function decrementMetricIfPositive(ctx: MutCtx, metricKey: string, eventId: string) {
  const existing = await ctx.db
    .query('portfolioMetrics')
    .withIndex('by_metricKey', (q) => q.eq('metricKey', metricKey))
    .first();
  if (!existing || existing.lastEventId === eventId) return;
  await ctx.db.patch(existing._id, {
    value: Math.max(0, existing.value - 1),
    lastEventId: eventId,
    updatedAt: Date.now(),
  });
}

// ---------------------------------------------------------------------------
// Projection Handlers (internalMutation — called via scheduler)
// ---------------------------------------------------------------------------

/** loan.approved → increment approved count + amount */
export const onLoanApproved = internalMutation({
  args: {
    eventId: v.string(),
    loanId: v.string(),
    amount: v.optional(v.number()),
  },
  handler: async (ctx, { eventId, amount }) => {
    await upsertMetric(ctx, 'approved_loan_count', 1, eventId);
    if (amount && amount > 0) {
      await upsertMetric(ctx, 'approved_loan_amount', amount, eventId + ':amount');
    }
  },
});

/** loan.funded → increment active loan count */
export const onLoanFunded = internalMutation({
  args: {
    eventId: v.string(),
    loanId: v.string(),
  },
  handler: async (ctx, { eventId }) => {
    await upsertMetric(ctx, 'active_loan_count', 1, eventId);
  },
});

/** payment.completed → increment totals */
export const onPaymentCompleted = internalMutation({
  args: {
    eventId: v.string(),
    amount: v.optional(v.number()),
  },
  handler: async (ctx, { eventId, amount }) => {
    await upsertMetric(ctx, 'completed_payment_count', 1, eventId);
    if (amount && amount > 0) {
      await upsertMetric(ctx, 'total_repaid', amount, eventId + ':amount');
    }
  },
});

/** loan.paid_off → decrement active, increment paid-off */
export const onLoanPaidOff = internalMutation({
  args: {
    eventId: v.string(),
    loanId: v.string(),
  },
  handler: async (ctx, { eventId }) => {
    await upsertMetric(ctx, 'paid_off_loan_count', 1, eventId);
    await decrementMetricIfPositive(ctx, 'active_loan_count', eventId + ':active');
  },
});

/** disbursement.completed → update disbursement totals */
export const onDisbursementCompleted = internalMutation({
  args: {
    eventId: v.string(),
    amount: v.optional(v.number()),
  },
  handler: async (ctx, { eventId, amount }) => {
    if (amount && amount > 0) {
      await upsertMetric(ctx, 'total_disbursed', amount, eventId);
    }
  },
});

/** loan.created → increment pending loan count */
export const onLoanCreated = internalMutation({
  args: {
    eventId: v.string(),
    amount: v.optional(v.number()),
  },
  handler: async (ctx, { eventId, amount }) => {
    await upsertMetric(ctx, 'pending_loan_count', 1, eventId);
    if (amount && amount > 0) {
      await upsertMetric(ctx, 'pending_loan_amount', amount, eventId + ':amount');
    }
  },
});

/** loan.submitted → increment submitted loan count */
export const onLoanSubmitted = internalMutation({
  args: {
    eventId: v.string(),
  },
  handler: async (ctx, { eventId }) => {
    await upsertMetric(ctx, 'submitted_loan_count', 1, eventId);
  },
});

/** loan.rejected → increment rejected loan count */
export const onLoanRejected = internalMutation({
  args: {
    eventId: v.string(),
  },
  handler: async (ctx, { eventId }) => {
    await upsertMetric(ctx, 'rejected_loan_count', 1, eventId);
  },
});

/** disbursement.failed → increment failed disbursement count */
export const onDisbursementFailed = internalMutation({
  args: {
    eventId: v.string(),
  },
  handler: async (ctx, { eventId }) => {
    await upsertMetric(ctx, 'failed_disbursement_count', 1, eventId);
  },
});

/** payment.failed → increment failed payment count */
export const onPaymentFailed = internalMutation({
  args: {
    eventId: v.string(),
  },
  handler: async (ctx, { eventId }) => {
    await upsertMetric(ctx, 'failed_payment_count', 1, eventId);
  },
});
