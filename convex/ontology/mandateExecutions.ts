/**
 * Mandate Executions — tracking each debit execution against a mandate.
 *
 * Ontology: Event(MandateExecuted) — each execution is a financial event.
 * Events: mandate.execution.initiated, mandate.execution.completed, mandate.execution.failed
 *
 * Security model:
 *   executeMandateDebit → internalMutation (called by cron or system)
 *   completeExecution   → internalMutation (called after payment succeeds)
 *   failExecution       → internalMutation (called after payment fails)
 *   queries             - staff-only
 */

import { v } from 'convex/values';
import { internal } from '../_generated/api';
import { internalMutation, internalQuery, query } from '../_generated/server';
import { scheduleAuditLog } from '../lib/audit';
import { assertStaff } from '../lib/auth';
import { emitEvent, generateCorrelationId } from '../lib/eventEmitter';
import { emitRelationship } from '../lib/relationshipEmitter';
import { resolveWriteInstitution } from '../lib/tenancy';

// ---------------------------------------------------------------------------
// Internal mutations (called by cron / system)
// ---------------------------------------------------------------------------

/**
 * Initiate a debit execution against a mandate.
 * Called by the mandate executor cron when a mandate is due.
 *
 * Flow: Create execution record → create payment transaction → enqueue TB outbox
 */
export const executeMandateDebit = internalMutation({
  args: {
    mandateId: v.id('mandates'),
  },
  handler: async (ctx, { mandateId }) => {
    const mandate = await ctx.db.get(mandateId);
    if (!mandate) return null;
    if (mandate.status !== 'active') return null;
    if (!mandate.loanId) return null;

    // Check if max executions already reached
    if (mandate.maxExecutions && mandate.executionCount >= mandate.maxExecutions) {
      // Expire the mandate
      await ctx.scheduler
        .runAfter(0, internal.ontology.mandates.expireMandate, { mandateId })
        .catch(console.error);
      return null;
    }

    const now = Date.now();
    const executionNumber = mandate.executionCount + 1;
    const correlationId = mandate.correlationId ?? generateCorrelationId();

    // Create execution record
    const executionId = await ctx.db.insert('mandateExecutions', {
      mandateId,
      institutionId: mandate.institutionId,
      executionNumber,
      amount: mandate.amount,
      status: 'pending',
      executedAt: now,
      correlationId,
      createdAt: now,
      updatedAt: now,
    });

    // Create the payment transaction (same atomic transaction)
    const paymentId = await ctx.db.insert('paymentTransactions', {
      loanId: mandate.loanId!,
      userId: mandate.debtorUserId,
      institutionId:
        mandate.institutionId ?? (await resolveWriteInstitution(ctx, { loanId: mandate.loanId! })),
      amount: mandate.amount,
      method: 'debit_order',
      status: 'pending',
      referenceNumber: `MDT-EXEC-${executionNumber}-${mandate.mandateRef}`,
      metadata: {
        mandateId,
        mandateRef: mandate.mandateRef,
        executionId,
        executionNumber,
        source: 'mandate_execution',
      },
      createdAt: now,
      updatedAt: now,
    });

    // Link execution to payment transaction
    await ctx.db.patch(executionId, {
      paymentTransactionId: paymentId,
      status: 'processing',
      updatedAt: Date.now(),
    });

    // NOTE: No ledger (tigerBeetleOutbox) entry is enqueued here. Repayment posting
    // must occur only on confirmed completion, not at initiation — see the
    // outbox money-movement map. When the mandate-execution completion lifecycle is
    // wired (completeExecution driven by payment confirmation), the REPAYMENT outbox
    // row is enqueued there via buildRepaymentOutboxPayload + enqueueOutboxIdempotent.
    // Auto-debit is currently disabled (MANDATE_AUTODEBIT_ENABLED=false), so this
    // mutation is inert in production.

    // Emit relationship: mandate -> executed_via -> execution
    emitRelationship(
      ctx,
      { type: 'mandates', id: mandateId },
      { type: 'mandateExecutions', id: executionId },
      'executed_via'
    );

    // Emit event
    emitEvent(ctx, {
      eventType: 'mandate.execution.initiated',
      entityType: 'mandateExecutions',
      entityId: executionId,
      domainSource: 'mandates',
      correlationId,
      actorType: 'cron',
      payload: {
        mandateId,
        mandateRef: mandate.mandateRef,
        executionNumber,
        amount: mandate.amount,
        paymentTransactionId: paymentId,
      },
    });

    scheduleAuditLog(
      ctx,
      'mandateExecutions',
      executionId,
      'execute',
      'none',
      'processing',
      `Mandate ${mandate.mandateRef} execution #${executionNumber} initiated`
    );

    return { executionId, paymentId };
  },
});

/**
 * Mark an execution as completed (called after payment confirmation).
 */
export const completeExecution = internalMutation({
  args: {
    executionId: v.id('mandateExecutions'),
  },
  handler: async (ctx, { executionId }) => {
    const execution = await ctx.db.get(executionId);
    if (!execution) return;
    if (execution.status === 'completed') return; // Idempotent

    const now = Date.now();
    await ctx.db.patch(executionId, {
      status: 'completed',
      completedAt: now,
      updatedAt: now,
    });

    // Advance the mandate execution counter and calculate next date
    await ctx.scheduler
      .runAfter(0, internal.ontology.mandates.advanceExecution, {
        mandateId: execution.mandateId,
      })
      .catch(console.error);

    emitEvent(ctx, {
      eventType: 'mandate.execution.completed',
      entityType: 'mandateExecutions',
      entityId: executionId,
      domainSource: 'mandates',
      correlationId: execution.correlationId ?? generateCorrelationId(),
      actorType: 'system',
      payload: {
        mandateId: execution.mandateId,
        executionNumber: execution.executionNumber,
        amount: execution.amount,
      },
    });

    scheduleAuditLog(
      ctx,
      'mandateExecutions',
      executionId,
      'complete',
      'processing',
      'completed',
      `Execution #${execution.executionNumber} completed`
    );
  },
});

/**
 * Mark an execution as failed (called when payment fails).
 */
export const failExecution = internalMutation({
  args: {
    executionId: v.id('mandateExecutions'),
    failureReason: v.string(),
  },
  handler: async (ctx, { executionId, failureReason }) => {
    const execution = await ctx.db.get(executionId);
    if (!execution) return;

    await ctx.db.patch(executionId, {
      status: 'failed',
      failureReason,
      updatedAt: Date.now(),
    });

    emitEvent(ctx, {
      eventType: 'mandate.execution.failed',
      entityType: 'mandateExecutions',
      entityId: executionId,
      domainSource: 'mandates',
      correlationId: execution.correlationId ?? generateCorrelationId(),
      actorType: 'system',
      payload: {
        mandateId: execution.mandateId,
        executionNumber: execution.executionNumber,
        failureReason,
      },
    });

    scheduleAuditLog(
      ctx,
      'mandateExecutions',
      executionId,
      'fail',
      'processing',
      'failed',
      `Execution #${execution.executionNumber} failed: ${failureReason}`
    );
  },
});

// ---------------------------------------------------------------------------
// Queries (staff only)
// ---------------------------------------------------------------------------

/**
 * Get executions for a specific mandate.
 */
export const getExecutionsByMandate = query({
  args: {
    mandateId: v.id('mandates'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { mandateId, limit }) => {
    await assertStaff(ctx);
    return ctx.db
      .query('mandateExecutions')
      .withIndex('by_mandateId', (q) => q.eq('mandateId', mandateId))
      .order('desc')
      .take(limit ?? 50);
  },
});

/**
 * Get pending/processing executions (for monitoring).
 */
export const getPendingExecutions = query({
  args: {},
  handler: async (ctx) => {
    await assertStaff(ctx);
    const pending = await ctx.db
      .query('mandateExecutions')
      .withIndex('by_status', (q) => q.eq('status', 'pending'))
      .take(100);
    const processing = await ctx.db
      .query('mandateExecutions')
      .withIndex('by_status', (q) => q.eq('status', 'processing'))
      .take(100);
    return [...pending, ...processing];
  },
});

// ---------------------------------------------------------------------------
// Internal queries (used by cron / system)
// ---------------------------------------------------------------------------

/**
 * Get all active mandates — used by the mandate executor cron.
 * No auth guard needed (internal only).
 */
export const getActiveMandatesInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    return ctx.db
      .query('mandates')
      .withIndex('by_status', (q) => q.eq('status', 'active'))
      .collect();
  },
});
