/**
 * Consent Records — POPIA-aligned consent tracking.
 *
 * Ontology: Entity(ConsentRecord) + Rule(DataProtection)
 * Events: consent.granted, consent.withdrawn, consent.expired
 *
 * POPIA (Protection of Personal Information Act) requires:
 *   - Record of what the person consented to
 *   - When and how consent was given
 *   - Ability to withdraw consent
 *   - Expiry tracking for time-limited consents
 *
 * Security model:
 *   grantConsent     -> authenticated (user grants own consent)
 *   withdrawConsent  -> authenticated (user withdraws own) or staff
 *   getMyConsents    -> authenticated (own consents)
 *   checkConsent     -> internal (used by other mutations)
 *   admin queries    -> staff only
 */

import { v } from 'convex/values';
import { mutation, query, internalQuery } from '../_generated/server';
import { ConvexError } from 'convex/values';
import { assertAuthenticated, assertStaff } from '../lib/auth';
import { emitEvent, generateCorrelationId } from '../lib/eventEmitter';
import { scheduleAuditLog } from '../lib/audit';
import { emitRelationship } from '../lib/relationshipEmitter';
import { consentType, consentStatus } from '../schema';

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Grant consent for a specific type.
 * The user must be authenticated and grants their own consent.
 */
export const grantConsent = mutation({
  args: {
    consentType: consentType,
    description: v.string(),
    entityType: v.optional(v.string()),
    entityId: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    legalBasis: v.optional(v.string()),
    collectionMethod: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);
    const now = Date.now();

    // Check for existing active consent of the same type
    const existing = await ctx.db
      .query('consentRecords')
      .withIndex('by_userId_type', (q) =>
        q.eq('userId', userId).eq('consentType', args.consentType)
      )
      .collect();

    const activeExisting = existing.find((c) => c.status === 'granted');
    if (activeExisting) {
      // Already has active consent of this type — return existing
      return activeExisting._id;
    }

    const consentId = await ctx.db.insert('consentRecords', {
      userId,
      consentType: args.consentType,
      status: 'granted',
      description: args.description,
      entityType: args.entityType,
      entityId: args.entityId,
      grantedAt: now,
      expiresAt: args.expiresAt,
      legalBasis: args.legalBasis,
      collectionMethod: args.collectionMethod,
      metadata: args.metadata,
      createdAt: now,
    });

    emitEvent(ctx, {
      eventType: 'consent.granted',
      entityType: 'consentRecords',
      entityId: consentId,
      domainSource: 'mandates',
      correlationId: generateCorrelationId(),
      actorId: userId,
      actorType: 'user',
      payload: {
        consentType: args.consentType,
        legalBasis: args.legalBasis,
        expiresAt: args.expiresAt,
      },
    });

    scheduleAuditLog(
      ctx,
      'consentRecords',
      consentId,
      'grant',
      'none',
      'granted',
      `Consent granted: ${args.consentType}`
    );
    emitRelationship(
      ctx,
      { type: 'users', id: userId },
      { type: 'consentRecords', id: consentId },
      'has_consent'
    );

    return consentId;
  },
});

/**
 * Withdraw (revoke) a consent.
 * The user can withdraw their own consent, or staff can withdraw on behalf.
 */
export const withdrawConsent = mutation({
  args: {
    consentId: v.id('consentRecords'),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { consentId, reason }) => {
    const userId = await assertAuthenticated(ctx);
    const consent = await ctx.db.get(consentId);

    if (!consent) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Consent record not found' });
    }
    if (consent.status !== 'granted') {
      throw new ConvexError({
        code: 'INVALID_STATE',
        message: `Consent is already ${consent.status}`,
      });
    }

    // Only the owner or staff can withdraw
    if (consent.userId !== userId) {
      await assertStaff(ctx); // Will throw if not staff
    }

    const now = Date.now();
    await ctx.db.patch(consentId, {
      status: 'withdrawn',
      withdrawnAt: now,
    });

    emitEvent(ctx, {
      eventType: 'consent.withdrawn',
      entityType: 'consentRecords',
      entityId: consentId,
      domainSource: 'mandates',
      correlationId: generateCorrelationId(),
      actorId: userId,
      actorType: 'user',
      payload: { consentType: consent.consentType, reason },
    });

    scheduleAuditLog(
      ctx,
      'consentRecords',
      consentId,
      'withdraw',
      'granted',
      'withdrawn',
      reason ?? `Consent withdrawn: ${consent.consentType}`
    );
  },
});

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Get my consent records (authenticated user sees their own).
 */
export const getMyConsents = query({
  args: {
    status: v.optional(consentStatus),
  },
  handler: async (ctx, { status }) => {
    const userId = await assertAuthenticated(ctx);
    let results = await ctx.db
      .query('consentRecords')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .collect();

    if (status) {
      results = results.filter((c) => c.status === status);
    }

    return results;
  },
});

/**
 * Check if a user has active consent of a specific type.
 * Used internally by other mutations to enforce consent requirements.
 */
export const checkConsent = internalQuery({
  args: {
    userId: v.id('users'),
    consentType: consentType,
  },
  handler: async (ctx, { userId, consentType: cType }) => {
    const records = await ctx.db
      .query('consentRecords')
      .withIndex('by_userId_type', (q) => q.eq('userId', userId).eq('consentType', cType))
      .collect();

    const now = Date.now();
    const active = records.find((c) => {
      if (c.status !== 'granted') return false;
      if (c.expiresAt && c.expiresAt <= now) return false;
      return true;
    });

    return {
      hasConsent: !!active,
      consentId: active?._id ?? null,
      grantedAt: active?.grantedAt ?? null,
      expiresAt: active?.expiresAt ?? null,
    };
  },
});

/**
 * List all consent records for a user (staff view).
 */
export const getConsentsByUser = query({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, { userId }) => {
    await assertStaff(ctx);
    return ctx.db
      .query('consentRecords')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .collect();
  },
});

/**
 * List all consents with optional filters (staff view, for compliance auditing).
 */
export const listConsents = query({
  args: {
    status: v.optional(consentStatus),
    consentType: v.optional(consentType),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { status, consentType: cType, limit }) => {
    await assertStaff(ctx);

    if (status) {
      const results = await ctx.db
        .query('consentRecords')
        .withIndex('by_status', (q) => q.eq('status', status))
        .order('desc')
        .take(limit ?? 50);

      if (cType) return results.filter((c) => c.consentType === cType);
      return results;
    }

    const results = await ctx.db
      .query('consentRecords')
      .order('desc')
      .take(limit ?? 50);

    if (cType) return results.filter((c) => c.consentType === cType);
    return results;
  },
});
