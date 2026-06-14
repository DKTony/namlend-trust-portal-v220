/**
 * Entitlement reads + owner-guarded dispatch.
 *
 * `resolveMyEntitlements` is what the Backoffice Console (`useEntitlements`) will read to
 * filter nav/routes in Phase 3. `setTenantEntitlement` is the owner's dispatch lever.
 */

import { v, ConvexError } from 'convex/values';
import { query, mutation } from '../_generated/server';
import { getCallerInstitution } from '../lib/tenancy';
import { resolveEntitlements } from '../lib/entitlements';
import { assertPlatformOwner, assertPlatformSupport } from '../lib/platformAuth';
import { ALWAYS_ON_FEATURES, isValidFeatureKey } from '../lib/features';
import { getBooleanRule } from '../lib/ruleEvaluator';

/** Resolve the caller's tenant feature set (or always-on only if unbound). Frontend gate. */
export const resolveMyEntitlements = query({
  args: {},
  handler: async (ctx) => {
    const tenant = await getCallerInstitution(ctx);
    if (!tenant.institutionId) return [...ALWAYS_ON_FEATURES];
    return [...(await resolveEntitlements(ctx, tenant.institutionId))];
  },
});

/**
 * Whether tenant entitlement enforcement is switched on (the `ENTITLEMENT_ENFORCEMENT`
 * kill-switch, default false → inert). The Backoffice nav reads this so feature-based
 * hiding stays dormant until the owner flips the flag in Phase 2 — no later code change.
 */
export const isEntitlementEnforcementOn = query({
  args: {},
  handler: async (ctx) => {
    return getBooleanRule(ctx, 'ENTITLEMENT_ENFORCEMENT', false);
  },
});

/** Inspect a tenant's raw entitlement rows (platform staff). */
export const getTenantEntitlements = query({
  args: { institutionId: v.id('institutions') },
  handler: async (ctx, { institutionId }) => {
    await assertPlatformSupport(ctx);
    return ctx.db
      .query('tenantEntitlements')
      .withIndex('by_institutionId', (q) => q.eq('institutionId', institutionId))
      .collect();
  },
});

/** Inspect a tenant's resolved feature set (platform staff). */
export const getResolvedEntitlements = query({
  args: { institutionId: v.id('institutions') },
  handler: async (ctx, { institutionId }) => {
    await assertPlatformSupport(ctx);
    return [...(await resolveEntitlements(ctx, institutionId))];
  },
});

/**
 * Owner dispatch: enable/disable/override a feature for a tenant (the "deploy a feature"
 * lever). Upserts a `tenantEntitlements` row; audited via changedBy.
 */
export const setTenantEntitlement = mutation({
  args: {
    institutionId: v.id('institutions'),
    featureKey: v.string(),
    source: v.union(
      v.literal('addon'),
      v.literal('trial'),
      v.literal('manual_override'),
      v.literal('removal')
    ),
    enabled: v.boolean(),
    rolloutState: v.union(
      v.literal('off'),
      v.literal('internal'),
      v.literal('pilot'),
      v.literal('enabled'),
      v.literal('deprecated')
    ),
    effectiveTo: v.optional(v.number()),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const ownerId = await assertPlatformOwner(ctx);
    if (!isValidFeatureKey(args.featureKey)) {
      throw new ConvexError({
        code: 'VALIDATION_ERROR',
        message: `Unknown feature key (not in code manifest): ${args.featureKey}`,
      });
    }
    const now = Date.now();
    const existing = (
      await ctx.db
        .query('tenantEntitlements')
        .withIndex('by_institution_feature', (q) =>
          q.eq('institutionId', args.institutionId).eq('featureKey', args.featureKey)
        )
        .collect()
    ).find((e) => e.effectiveTo === undefined);

    if (existing) {
      await ctx.db.patch(existing._id, {
        source: args.source,
        enabled: args.enabled,
        rolloutState: args.rolloutState,
        effectiveTo: args.effectiveTo,
        reason: args.reason,
        changedBy: ownerId,
        changedAt: now,
      });
      return existing._id;
    }
    return ctx.db.insert('tenantEntitlements', {
      institutionId: args.institutionId,
      featureKey: args.featureKey,
      source: args.source,
      enabled: args.enabled,
      rolloutState: args.rolloutState,
      effectiveFrom: now,
      effectiveTo: args.effectiveTo,
      reason: args.reason,
      changedBy: ownerId,
      changedAt: now,
    });
  },
});
