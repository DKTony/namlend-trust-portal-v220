/**
 * Platform support access audit.
 *
 * MVP intentionally supports L0/L1 only. L2 break-glass and L3 impersonation require an approval
 * workflow and are not exposed here, so support cannot silently become a cross-tenant super-admin.
 */

import { ConvexError, v } from 'convex/values';
import { Doc, Id } from '../_generated/dataModel';
import { mutation, query } from '../_generated/server';
import { assertPlatformSupport, getPlatformRole } from '../lib/platformAuth';
import { SafeSupportResourceCategory } from '../lib/supportAudit';

const SAFE_RESOURCE_CATEGORY = v.union(
  v.literal('platform_health'),
  v.literal('tenant_metadata'),
  v.literal('rollout_status'),
  v.literal('error_counts'),
  v.literal('subscription_status'),
  v.literal('tenant_entitlements'),
  v.literal('resolved_entitlements')
);

async function requireSupportSessionAccess(
  ctx: any,
  actorUserId: Id<'users'>,
  sessionId: Id<'supportAccessAudit'>
) {
  const session = await ctx.db.get(sessionId);
  if (!session) {
    throw new ConvexError({ code: 'NOT_FOUND', message: 'Support access session not found.' });
  }
  const role = await getPlatformRole(ctx, actorUserId);
  if (session.actorUserId !== actorUserId && role !== 'platform_owner') {
    throw new ConvexError({
      code: 'FORBIDDEN',
      message: 'You may only update your own support access session.',
    });
  }
  return { session, role };
}

function assertL1HasTenant(args: { accessType: 'L0' | 'L1'; institutionId?: Id<'institutions'> }) {
  if (args.accessType === 'L1' && !args.institutionId) {
    throw new ConvexError({
      code: 'VALIDATION_ERROR',
      message: 'L1 support access must be tied to a tenant.',
    });
  }
}

/** Start an audited safe support session. Only L0/L1 are valid in this MVP. */
export const startSupportAccessSession = mutation({
  args: {
    institutionId: v.optional(v.id('institutions')),
    accessType: v.union(v.literal('L0'), v.literal('L1')),
    reason: v.optional(v.string()),
    ticketRef: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actorUserId = await assertPlatformSupport(ctx);
    const platformRole = await getPlatformRole(ctx, actorUserId);
    assertL1HasTenant(args);

    if (args.institutionId) {
      const tenant = await ctx.db.get(args.institutionId);
      if (!tenant) {
        throw new ConvexError({ code: 'NOT_FOUND', message: 'Tenant not found.' });
      }
    }

    const reason = args.reason?.trim();
    if (args.accessType === 'L1' && !reason) {
      throw new ConvexError({
        code: 'VALIDATION_ERROR',
        message: 'L1 support access requires a reason.',
      });
    }

    return ctx.db.insert('supportAccessAudit', {
      actorUserId,
      platformRole: platformRole ?? 'platform_support',
      institutionId: args.institutionId,
      accessType: args.accessType,
      reason,
      startedAt: Date.now(),
      viewedResources: [],
      ticketRef: args.ticketRef,
    });
  },
});

/** Record the safe metadata category viewed during a support session. */
export const recordViewedResourceCategory = mutation({
  args: {
    sessionId: v.id('supportAccessAudit'),
    resourceCategory: SAFE_RESOURCE_CATEGORY,
  },
  handler: async (ctx, { sessionId, resourceCategory }) => {
    const actorUserId = await assertPlatformSupport(ctx);
    const { session } = await requireSupportSessionAccess(ctx, actorUserId, sessionId);
    if (session.endedAt !== undefined) {
      throw new ConvexError({
        code: 'INVALID_STATE',
        message: 'Cannot record viewed resources on an ended support session.',
      });
    }

    const current = session.viewedResources ?? [];
    const next = current.includes(resourceCategory)
      ? current
      : [...current, resourceCategory as SafeSupportResourceCategory];
    await ctx.db.patch(sessionId, { viewedResources: next });
    return sessionId;
  },
});

/** End an active support session. */
export const endSupportAccessSession = mutation({
  args: { sessionId: v.id('supportAccessAudit') },
  handler: async (ctx, { sessionId }) => {
    const actorUserId = await assertPlatformSupport(ctx);
    const { session } = await requireSupportSessionAccess(ctx, actorUserId, sessionId);
    if (session.endedAt !== undefined) return sessionId;
    await ctx.db.patch(sessionId, { endedAt: Date.now() });
    return sessionId;
  },
});

/** List support access sessions. Owners see all; support staff see only their own sessions. */
export const listSupportAccessSessions = query({
  args: {
    institutionId: v.optional(v.id('institutions')),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { institutionId, limit }) => {
    const actorUserId = await assertPlatformSupport(ctx);
    const role = await getPlatformRole(ctx, actorUserId);
    const take = Math.min(limit ?? 100, 250);

    let rows: Doc<'supportAccessAudit'>[];
    if (institutionId) {
      rows = await ctx.db
        .query('supportAccessAudit')
        .withIndex('by_institution', (q) => q.eq('institutionId', institutionId))
        .order('desc')
        .take(take);
    } else if (role === 'platform_owner') {
      rows = await ctx.db.query('supportAccessAudit').order('desc').take(take);
    } else {
      rows = await ctx.db
        .query('supportAccessAudit')
        .withIndex('by_actor', (q) => q.eq('actorUserId', actorUserId))
        .order('desc')
        .take(take);
    }

    return role === 'platform_owner'
      ? rows
      : rows.filter((session) => session.actorUserId === actorUserId);
  },
});
