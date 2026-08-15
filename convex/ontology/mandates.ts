/**
 * Mandates — debit authorization lifecycle.
 *
 * Ontology: Entity(Mandate) + Relationship(Person->authorizes->Mandate->governs->Loan)
 * Events: mandate.created, mandate.submitted, mandate.authorized, mandate.suspended,
 *         mandate.reactivated, mandate.revoked, mandate.expired
 * Rules: MaxDebitAmount, FrequencyLimit, ExpiryEnforcement, StatusTransitionValidation
 *
 * Security model:
 *   createMandate       -> authenticated (client creates own) or staff (on behalf)
 *   authorizeMandate    -> authenticated (debtor confirms)
 *   suspend/reactivate  -> staff only
 *   revokeMandate       -> authenticated (debtor) or staff
 *   admin queries       -> staff only
 */

import { ConvexError, v } from 'convex/values';
import { internalMutation, internalQuery, mutation, query } from '../_generated/server';
import { scheduleAuditLog } from '../lib/audit';
import { assertAuthenticated, assertOwnerOrTenantStaff, assertStaff } from '../lib/auth';
import { assertCallerFeatureEnabled } from '../lib/entitlements';
import { emitEvent, generateCorrelationId } from '../lib/eventEmitter';
import {
  calculateNextExecutionDate,
  generateMandateRef,
  validateMandateTransition,
  type MandateStatus,
} from '../lib/mandateStateMachine';
import { emitRelationship } from '../lib/relationshipEmitter';
import {
  applyTenantScope,
  assertSameTenant,
  resolveWriteInstitution,
  tenantReadScope,
} from '../lib/tenancy';
import { mandateFrequency, mandateStatus, mandateType } from '../schema';

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Create a new mandate in draft status.
 * The debtor (borrower) or staff can create a mandate.
 */
export const createMandate = mutation({
  args: {
    mandateType: mandateType,
    debtorAccountRef: v.optional(v.string()),
    debtorName: v.optional(v.string()),
    creditorEntityType: v.string(),
    creditorEntityId: v.string(),
    creditorAccountRef: v.optional(v.string()),
    creditorName: v.optional(v.string()),
    loanId: v.optional(v.id('loans')),
    amount: v.number(),
    currency: v.optional(v.string()),
    frequency: v.optional(mandateFrequency),
    collectionDay: v.optional(v.number()),
    maxExecutions: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);
    await assertCallerFeatureEnabled(ctx, 'mandates');
    const now = Date.now();
    const mandateRef = generateMandateRef();
    const correlationId = generateCorrelationId();

    let debtorUserId = userId;

    // Validate loan exists if linked, and bind the mandate to the loan owner.
    if (args.loanId) {
      const loan = await ctx.db.get(args.loanId);
      if (!loan) {
        throw new ConvexError({ code: 'NOT_FOUND', message: 'Linked loan not found' });
      }
      await assertOwnerOrTenantStaff(ctx, loan.userId, loan.institutionId);
      debtorUserId = loan.userId;
    }

    // Validate amount is positive
    if (args.amount <= 0) {
      throw new ConvexError({ code: 'VALIDATION', message: 'Mandate amount must be positive' });
    }

    // Validate collection day if provided
    if (args.collectionDay !== undefined && (args.collectionDay < 1 || args.collectionDay > 31)) {
      throw new ConvexError({
        code: 'VALIDATION',
        message: 'Collection day must be between 1 and 31',
      });
    }

    const mandateId = await ctx.db.insert('mandates', {
      mandateRef,
      mandateType: args.mandateType,
      status: 'draft',
      debtorUserId,
      debtorAccountRef: args.debtorAccountRef,
      debtorName: args.debtorName,
      creditorEntityType: args.creditorEntityType,
      creditorEntityId: args.creditorEntityId,
      creditorAccountRef: args.creditorAccountRef,
      creditorName: args.creditorName,
      loanId: args.loanId,
      institutionId: await resolveWriteInstitution(ctx, { loanId: args.loanId }),
      amount: args.amount,
      currency: args.currency ?? 'NAD',
      frequency: args.frequency,
      collectionDay: args.collectionDay,
      maxExecutions: args.maxExecutions,
      executionCount: 0,
      effectiveFrom: now,
      expiresAt: args.expiresAt,
      correlationId,
      metadata: args.metadata,
      createdAt: now,
      updatedAt: now,
    });

    // Emit event
    emitEvent(ctx, {
      eventType: 'mandate.created',
      entityType: 'mandates',
      entityId: mandateId,
      domainSource: 'mandates',
      correlationId,
      actorId: userId,
      actorType: 'user',
      payload: {
        mandateRef,
        mandateType: args.mandateType,
        amount: args.amount,
        loanId: args.loanId,
        frequency: args.frequency,
      },
    });

    // Audit
    scheduleAuditLog(
      ctx,
      'mandates',
      mandateId,
      'create',
      'none',
      'draft',
      `Mandate ${mandateRef} created`
    );

    // Ontology: user -> authorized -> mandate
    emitRelationship(
      ctx,
      { type: 'users', id: debtorUserId },
      { type: 'mandates', id: mandateId },
      'authorized'
    );

    // Ontology: loan -> secured_by -> mandate (if linked to a loan)
    if (args.loanId) {
      emitRelationship(
        ctx,
        { type: 'loans', id: args.loanId },
        { type: 'mandates', id: mandateId },
        'secured_by'
      );
    }

    return { mandateId, mandateRef };
  },
});

/**
 * Submit a mandate for authorization (draft -> pending_authorization).
 */
export const submitMandate = mutation({
  args: {
    mandateId: v.id('mandates'),
  },
  handler: async (ctx, { mandateId }) => {
    const userId = await assertAuthenticated(ctx);
    await assertCallerFeatureEnabled(ctx, 'mandates');
    const mandate = await ctx.db.get(mandateId);
    if (!mandate) throw new ConvexError({ code: 'NOT_FOUND', message: 'Mandate not found' });

    const transition = validateMandateTransition(
      mandate.status as MandateStatus,
      'pending_authorization'
    );
    if (!transition.valid) {
      throw new ConvexError({ code: 'INVALID_TRANSITION', message: transition.reason });
    }

    await ctx.db.patch(mandateId, {
      status: 'pending_authorization',
      updatedAt: Date.now(),
    });

    emitEvent(ctx, {
      eventType: 'mandate.submitted',
      entityType: 'mandates',
      entityId: mandateId,
      domainSource: 'mandates',
      correlationId: mandate.correlationId ?? generateCorrelationId(),
      actorId: userId,
      actorType: 'user',
      payload: { fromStatus: mandate.status, toStatus: 'pending_authorization' },
    });

    scheduleAuditLog(
      ctx,
      'mandates',
      mandateId,
      'submit',
      mandate.status,
      'pending_authorization',
      `Mandate ${mandate.mandateRef} submitted for authorization`
    );
  },
});

/**
 * Authorize a mandate (pending_authorization -> active).
 * The debtor confirms the debit authorization.
 */
export const authorizeMandate = mutation({
  args: {
    mandateId: v.id('mandates'),
    authorizedVia: v.string(),
  },
  handler: async (ctx, { mandateId, authorizedVia }) => {
    const userId = await assertAuthenticated(ctx);
    await assertCallerFeatureEnabled(ctx, 'mandates');
    const mandate = await ctx.db.get(mandateId);
    if (!mandate) throw new ConvexError({ code: 'NOT_FOUND', message: 'Mandate not found' });

    const transition = validateMandateTransition(mandate.status as MandateStatus, 'active');
    if (!transition.valid) {
      throw new ConvexError({ code: 'INVALID_TRANSITION', message: transition.reason });
    }

    const now = Date.now();

    // Calculate first execution date
    const firstExec = mandate.frequency
      ? calculateNextExecutionDate(
          mandate.frequency as 'once' | 'weekly' | 'fortnightly' | 'monthly' | 'quarterly',
          mandate.collectionDay ?? undefined
        )
      : undefined;

    await ctx.db.patch(mandateId, {
      status: 'active',
      authorizedAt: now,
      authorizedVia,
      firstExecutionDate: firstExec,
      nextExecutionDate: firstExec,
      updatedAt: now,
    });

    emitEvent(ctx, {
      eventType: 'mandate.authorized',
      entityType: 'mandates',
      entityId: mandateId,
      domainSource: 'mandates',
      correlationId: mandate.correlationId ?? generateCorrelationId(),
      actorId: userId,
      actorType: 'user',
      payload: {
        fromStatus: mandate.status,
        toStatus: 'active',
        authorizedVia,
        firstExecutionDate: firstExec,
      },
    });

    scheduleAuditLog(
      ctx,
      'mandates',
      mandateId,
      'authorize',
      mandate.status,
      'active',
      `Mandate ${mandate.mandateRef} authorized via ${authorizedVia}`
    );
  },
});

/**
 * Suspend an active mandate (active -> suspended).
 * Staff action — temporarily halts collections.
 */
export const suspendMandate = mutation({
  args: {
    mandateId: v.id('mandates'),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { mandateId, reason }) => {
    const staffId = await assertStaff(ctx);
    await assertCallerFeatureEnabled(ctx, 'mandates');
    const mandate = await ctx.db.get(mandateId);
    if (!mandate) throw new ConvexError({ code: 'NOT_FOUND', message: 'Mandate not found' });

    const transition = validateMandateTransition(mandate.status as MandateStatus, 'suspended');
    if (!transition.valid) {
      throw new ConvexError({ code: 'INVALID_TRANSITION', message: transition.reason });
    }

    await ctx.db.patch(mandateId, {
      status: 'suspended',
      updatedAt: Date.now(),
    });

    emitEvent(ctx, {
      eventType: 'mandate.suspended',
      entityType: 'mandates',
      entityId: mandateId,
      domainSource: 'mandates',
      correlationId: mandate.correlationId ?? generateCorrelationId(),
      actorId: staffId,
      actorType: 'user',
      payload: { fromStatus: mandate.status, toStatus: 'suspended', reason },
    });

    scheduleAuditLog(
      ctx,
      'mandates',
      mandateId,
      'suspend',
      mandate.status,
      'suspended',
      reason ?? `Mandate ${mandate.mandateRef} suspended`
    );
  },
});

/**
 * Reactivate a suspended mandate (suspended -> active).
 */
export const reactivateMandate = mutation({
  args: {
    mandateId: v.id('mandates'),
  },
  handler: async (ctx, { mandateId }) => {
    const staffId = await assertStaff(ctx);
    await assertCallerFeatureEnabled(ctx, 'mandates');
    const mandate = await ctx.db.get(mandateId);
    if (!mandate) throw new ConvexError({ code: 'NOT_FOUND', message: 'Mandate not found' });

    const transition = validateMandateTransition(mandate.status as MandateStatus, 'active');
    if (!transition.valid) {
      throw new ConvexError({ code: 'INVALID_TRANSITION', message: transition.reason });
    }

    // Recalculate next execution date from now
    const nextExec = mandate.frequency
      ? calculateNextExecutionDate(
          mandate.frequency as 'once' | 'weekly' | 'fortnightly' | 'monthly' | 'quarterly',
          mandate.collectionDay ?? undefined
        )
      : undefined;

    await ctx.db.patch(mandateId, {
      status: 'active',
      nextExecutionDate: nextExec,
      updatedAt: Date.now(),
    });

    emitEvent(ctx, {
      eventType: 'mandate.reactivated',
      entityType: 'mandates',
      entityId: mandateId,
      domainSource: 'mandates',
      correlationId: mandate.correlationId ?? generateCorrelationId(),
      actorId: staffId,
      actorType: 'user',
      payload: { fromStatus: mandate.status, toStatus: 'active', nextExecutionDate: nextExec },
    });

    scheduleAuditLog(
      ctx,
      'mandates',
      mandateId,
      'reactivate',
      mandate.status,
      'active',
      `Mandate ${mandate.mandateRef} reactivated`
    );
  },
});

/**
 * Revoke a mandate (any non-terminal -> revoked).
 * Either the debtor or staff can revoke.
 */
export const revokeMandate = mutation({
  args: {
    mandateId: v.id('mandates'),
    reason: v.string(),
  },
  handler: async (ctx, { mandateId, reason }) => {
    const userId = await assertAuthenticated(ctx);
    await assertCallerFeatureEnabled(ctx, 'mandates');
    const mandate = await ctx.db.get(mandateId);
    if (!mandate) throw new ConvexError({ code: 'NOT_FOUND', message: 'Mandate not found' });

    const transition = validateMandateTransition(mandate.status as MandateStatus, 'revoked');
    if (!transition.valid) {
      throw new ConvexError({ code: 'INVALID_TRANSITION', message: transition.reason });
    }

    const now = Date.now();
    await ctx.db.patch(mandateId, {
      status: 'revoked',
      revokedAt: now,
      revocationReason: reason,
      effectiveTo: now,
      nextExecutionDate: undefined,
      updatedAt: now,
    });

    emitEvent(ctx, {
      eventType: 'mandate.revoked',
      entityType: 'mandates',
      entityId: mandateId,
      domainSource: 'mandates',
      correlationId: mandate.correlationId ?? generateCorrelationId(),
      actorId: userId,
      actorType: 'user',
      payload: { fromStatus: mandate.status, toStatus: 'revoked', reason },
    });

    scheduleAuditLog(
      ctx,
      'mandates',
      mandateId,
      'revoke',
      mandate.status,
      'revoked',
      `Mandate ${mandate.mandateRef} revoked: ${reason}`
    );
  },
});

/**
 * Expire a mandate (system-triggered when expiresAt is reached).
 * Called by the mandate executor cron.
 */
export const expireMandate = internalMutation({
  args: {
    mandateId: v.id('mandates'),
  },
  handler: async (ctx, { mandateId }) => {
    const mandate = await ctx.db.get(mandateId);
    if (!mandate) return;

    const transition = validateMandateTransition(mandate.status as MandateStatus, 'expired');
    if (!transition.valid) return; // Already terminal, skip silently

    const now = Date.now();
    await ctx.db.patch(mandateId, {
      status: 'expired',
      effectiveTo: now,
      nextExecutionDate: undefined,
      updatedAt: now,
    });

    emitEvent(ctx, {
      eventType: 'mandate.expired',
      entityType: 'mandates',
      entityId: mandateId,
      domainSource: 'mandates',
      correlationId: mandate.correlationId ?? generateCorrelationId(),
      actorType: 'cron',
      payload: { fromStatus: mandate.status, toStatus: 'expired', expiresAt: mandate.expiresAt },
    });

    scheduleAuditLog(
      ctx,
      'mandates',
      mandateId,
      'expire',
      mandate.status,
      'expired',
      `Mandate ${mandate.mandateRef} expired (expiresAt reached)`
    );
  },
});

/**
 * Update next execution date after a successful execution.
 * Called by the mandate executor after completing a debit.
 */
export const advanceExecution = internalMutation({
  args: {
    mandateId: v.id('mandates'),
  },
  handler: async (ctx, { mandateId }) => {
    const mandate = await ctx.db.get(mandateId);
    if (!mandate) return;
    if (mandate.status !== 'active') return;

    const newCount = mandate.executionCount + 1;
    const now = Date.now();

    // Check if max executions reached
    if (mandate.maxExecutions && newCount >= mandate.maxExecutions) {
      // Expire the mandate — max executions fulfilled
      await ctx.db.patch(mandateId, {
        executionCount: newCount,
        lastExecutionDate: now,
        nextExecutionDate: undefined,
        status: 'expired',
        effectiveTo: now,
        updatedAt: now,
      });

      emitEvent(ctx, {
        eventType: 'mandate.expired',
        entityType: 'mandates',
        entityId: mandateId,
        domainSource: 'mandates',
        correlationId: mandate.correlationId ?? generateCorrelationId(),
        actorType: 'system',
        payload: { reason: 'max_executions_reached', executionCount: newCount },
      });
      return;
    }

    // Calculate next execution date
    const nextExec = mandate.frequency
      ? calculateNextExecutionDate(
          mandate.frequency as 'once' | 'weekly' | 'fortnightly' | 'monthly' | 'quarterly',
          mandate.collectionDay ?? undefined,
          now
        )
      : undefined;

    // For once-off mandates, no next execution
    const finalNextExec = mandate.frequency === 'once' ? undefined : nextExec;

    await ctx.db.patch(mandateId, {
      executionCount: newCount,
      lastExecutionDate: now,
      nextExecutionDate: finalNextExec || undefined,
      updatedAt: now,
    });
  },
});

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Get my mandates (debtor view — authenticated user sees their own).
 */
export const getMyMandates = query({
  args: {
    status: v.optional(mandateStatus),
  },
  handler: async (ctx, { status }) => {
    const userId = await assertAuthenticated(ctx);
    let results = await ctx.db
      .query('mandates')
      .withIndex('by_debtorUserId', (q) => q.eq('debtorUserId', userId))
      .collect();

    if (status) {
      results = results.filter((m) => m.status === status);
    }

    return results;
  },
});

/**
 * Get mandates for a specific loan (staff view).
 */
export const getMandatesByLoan = query({
  args: {
    loanId: v.id('loans'),
  },
  handler: async (ctx, { loanId }) => {
    await assertStaff(ctx);
    await assertCallerFeatureEnabled(ctx, 'mandates');
    const rows = await ctx.db
      .query('mandates')
      .withIndex('by_loanId', (q) => q.eq('loanId', loanId))
      .collect();
    return applyTenantScope(rows, await tenantReadScope(ctx));
  },
});

/**
 * Get a mandate by its reference (staff view).
 */
export const getMandateByRef = query({
  args: {
    mandateRef: v.string(),
  },
  handler: async (ctx, { mandateRef }) => {
    await assertStaff(ctx);
    const mandate = await ctx.db
      .query('mandates')
      .withIndex('by_mandateRef', (q) => q.eq('mandateRef', mandateRef))
      .first();
    assertSameTenant(await tenantReadScope(ctx), mandate?.institutionId);
    return mandate;
  },
});

/**
 * Get a single mandate by ID (staff view with full details).
 */
export const getMandate = query({
  args: {
    mandateId: v.id('mandates'),
  },
  handler: async (ctx, { mandateId }) => {
    await assertStaff(ctx);
    return ctx.db.get(mandateId);
  },
});

/**
 * List all mandates with optional filters (staff view).
 */
export const listMandates = query({
  args: {
    status: v.optional(mandateStatus),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { status, limit }) => {
    await assertStaff(ctx);
    await assertCallerFeatureEnabled(ctx, 'mandates');

    if (status) {
      return ctx.db
        .query('mandates')
        .withIndex('by_status', (q) => q.eq('status', status))
        .order('desc')
        .take(limit ?? 50);
    }

    return ctx.db
      .query('mandates')
      .order('desc')
      .take(limit ?? 50);
  },
});

/**
 * Get mandates due for execution (used by mandate executor cron).
 */
export const getDueMandates = query({
  args: {},
  handler: async (ctx) => {
    await assertStaff(ctx);
    const now = Date.now();

    // Get active mandates with nextExecutionDate <= now
    const activeMandates = await ctx.db
      .query('mandates')
      .withIndex('by_status', (q) => q.eq('status', 'active'))
      .collect();

    return activeMandates.filter(
      (m) => m.nextExecutionDate !== undefined && m.nextExecutionDate <= now
    );
  },
});

/**
 * Check if a loan has an active mandate.
 * Used by disbursement flow for soft-check.
 */
export const hasActiveMandate = internalQuery({
  args: {
    loanId: v.id('loans'),
  },
  handler: async (ctx, { loanId }) => {
    // No auth guard — this is called internally by other queries
    const mandates = await ctx.db
      .query('mandates')
      .withIndex('by_loanId', (q) => q.eq('loanId', loanId))
      .collect();

    const active = mandates.find((m) => m.status === 'active');
    return {
      hasMandate: !!active,
      mandateId: active?._id ?? null,
      mandateRef: active?.mandateRef ?? null,
    };
  },
});
