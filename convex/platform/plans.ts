/**
 * Plan/tier catalog reads + owner-guarded upsert (Platform Console). Full owner-console CRUD
 * (subscriptions UI, etc.) lands in Phase 4; Phase 0 ships reads + a guarded upsert.
 */

import { ConvexError, v } from 'convex/values';
import { mutation, query } from '../_generated/server';
import { scheduleAuditEntry } from '../lib/audit';
import {
  ALWAYS_ON_FEATURES,
  getMissingFeatureDependencies,
  isTenantGrantableFeatureKey,
} from '../lib/features';
import { assertPlatformOwner, assertPlatformSupport } from '../lib/platformAuth';

/** List plans (platform staff). */
export const listPlans = query({
  args: {},
  handler: async (ctx) => {
    // Public-but-platform: gate via support so tenants can't enumerate the commercial catalog.
    await assertPlatformSupport(ctx);
    return ctx.db.query('plans').collect();
  },
});

/**
 * Create or update a plan (owner only). Enforces the AUTHORITY RULE: every feature key must
 * exist in the code manifest — the DB cannot invent enforceable features.
 */
export const upsertPlan = mutation({
  args: {
    planCode: v.string(),
    name: v.string(),
    defaultFeatures: v.array(v.string()),
    limits: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const ownerId = await assertPlatformOwner(ctx);

    const invalid = args.defaultFeatures.filter((key) => !isTenantGrantableFeatureKey(key));
    if (invalid.length > 0) {
      throw new ConvexError({
        code: 'VALIDATION_ERROR',
        message: `Features are unknown or not tenant-grantable: ${invalid.join(', ')}`,
      });
    }

    const defaultFeatures = [...new Set(args.defaultFeatures)];
    const missingDependencies = getMissingFeatureDependencies([
      ...ALWAYS_ON_FEATURES,
      ...defaultFeatures,
    ]);
    if (missingDependencies.length > 0) {
      const first = missingDependencies[0];
      throw new ConvexError({
        code: 'FEATURE_DEPENDENCY_MISSING',
        message: `Feature '${first.featureKey}' requires '${first.dependency}'.`,
        missingDependencies: missingDependencies.map(({ featureKey, dependency }) => ({
          featureKey,
          dependency,
        })),
      });
    }

    const existing = await ctx.db
      .query('plans')
      .withIndex('by_planCode', (q) => q.eq('planCode', args.planCode))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        defaultFeatures,
        limits: args.limits,
      });
      scheduleAuditEntry(ctx, {
        entityType: 'plans',
        entityId: existing._id,
        action: 'UPDATE_PLAN',
        oldState: {
          name: existing.name,
          defaultFeatures: existing.defaultFeatures,
          limits: existing.limits,
        },
        newState: { name: args.name, defaultFeatures, limits: args.limits },
        userId: ownerId,
      });
      return existing._id;
    }
    const planId = await ctx.db.insert('plans', {
      planCode: args.planCode,
      name: args.name,
      status: 'active',
      defaultFeatures,
      limits: args.limits,
      effectiveFrom: Date.now(),
    });
    scheduleAuditEntry(ctx, {
      entityType: 'plans',
      entityId: planId,
      action: 'CREATE_PLAN',
      newState: { planCode: args.planCode, name: args.name, defaultFeatures },
      userId: ownerId,
    });
    return planId;
  },
});
