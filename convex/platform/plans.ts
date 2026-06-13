/**
 * Plan/tier catalog reads + owner-guarded upsert (Platform Console). Full owner-console CRUD
 * (subscriptions UI, etc.) lands in Phase 4; Phase 0 ships reads + a guarded upsert.
 */

import { v, ConvexError } from 'convex/values';
import { query, mutation } from '../_generated/server';
import { assertPlatformOwner, assertPlatformSupport } from '../lib/platformAuth';
import { isValidFeatureKey } from '../lib/features';

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
    await assertPlatformOwner(ctx);

    const invalid = args.defaultFeatures.filter((k) => !isValidFeatureKey(k));
    if (invalid.length > 0) {
      throw new ConvexError({
        code: 'VALIDATION_ERROR',
        message: `Unknown feature keys (not in code manifest): ${invalid.join(', ')}`,
      });
    }

    const existing = await ctx.db
      .query('plans')
      .withIndex('by_planCode', (q) => q.eq('planCode', args.planCode))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        defaultFeatures: args.defaultFeatures,
        limits: args.limits,
      });
      return existing._id;
    }
    return ctx.db.insert('plans', {
      planCode: args.planCode,
      name: args.name,
      status: 'active',
      defaultFeatures: args.defaultFeatures,
      limits: args.limits,
      effectiveFrom: Date.now(),
    });
  },
});
