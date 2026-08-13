/**
 * Tenant provisioning + subscription management (Platform Console, owner-guarded).
 *
 * The Phase-0 seed created the first tenant; Phase 4 lets the owner provision new tenants and
 * assign/change plans from the console. `tenantSubscriptions` is the plan binding the entitlement
 * resolver reads (`convex/lib/entitlements.ts::resolveEntitlements`), so assigning a plan here is
 * what actually changes a tenant's feature set when enforcement is on.
 */

import { ConvexError, v } from 'convex/values';
import { Id } from '../_generated/dataModel';
import { mutation, query } from '../_generated/server';
import { resolveEntitlements } from '../lib/entitlements';
import { assertPlatformOwner, assertPlatformSupport } from '../lib/platformAuth';
import { assertTenantSupportReadAccess } from '../lib/supportAudit';
import { institutionType } from '../schema';

const DAY_MS = 86_400_000;

/** The tenant's currently-effective trial/active subscription, if any. */
async function currentSubscription(ctx: any, institutionId: Id<'institutions'>) {
  const subs = await ctx.db
    .query('tenantSubscriptions')
    .withIndex('by_institutionId', (q: any) => q.eq('institutionId', institutionId))
    .collect();
  const now = Date.now();
  return subs.find(
    (s: any) =>
      ['trial', 'active'].includes(s.status) &&
      s.effectiveFrom <= now &&
      (s.effectiveTo === undefined || s.effectiveTo > now)
  );
}

async function assertPlanExists(ctx: any, planCode: string) {
  const plan = await ctx.db
    .query('plans')
    .withIndex('by_planCode', (q: any) => q.eq('planCode', planCode))
    .first();
  if (!plan || plan.status !== 'active') {
    throw new ConvexError({
      code: 'VALIDATION_ERROR',
      message: `Unknown or inactive plan: ${planCode}`,
    });
  }
}

/** Provision a new tenant: institution shell + optional initial subscription. Owner only. */
export const provisionTenant = mutation({
  args: {
    name: v.string(),
    shortCode: v.string(),
    type: v.optional(institutionType),
    planCode: v.optional(v.string()),
    trialDays: v.optional(v.number()),
    contactEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const ownerId = await assertPlatformOwner(ctx);
    const now = Date.now();

    const existing = await ctx.db
      .query('institutions')
      .withIndex('by_shortCode', (q) => q.eq('shortCode', args.shortCode))
      .first();
    if (existing) {
      throw new ConvexError({
        code: 'DUPLICATE',
        message: `Institution with shortCode "${args.shortCode}" already exists.`,
      });
    }

    const institutionId = await ctx.db.insert('institutions', {
      name: args.name,
      shortCode: args.shortCode,
      type: args.type ?? 'lender',
      status: 'active',
      contactEmail: args.contactEmail,
      createdAt: now,
      updatedAt: now,
    });

    if (args.planCode) {
      await assertPlanExists(ctx, args.planCode);
      await ctx.db.insert('tenantSubscriptions', {
        institutionId,
        planCode: args.planCode,
        status: args.trialDays ? 'trial' : 'active',
        effectiveFrom: now,
        effectiveTo: args.trialDays ? now + args.trialDays * DAY_MS : undefined,
        createdBy: ownerId,
        reason: 'Provisioned via Platform Console',
      });
    }

    return institutionId;
  },
});

/**
 * Assign/change a tenant's plan, or start/end a trial. Closes the current subscription
 * (effectiveTo=now) and opens a new one — temporal, never destructive. Owner only.
 */
export const setTenantSubscription = mutation({
  args: {
    institutionId: v.id('institutions'),
    planCode: v.string(),
    status: v.union(v.literal('trial'), v.literal('active')),
    trialDays: v.optional(v.number()),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const ownerId = await assertPlatformOwner(ctx);
    await assertPlanExists(ctx, args.planCode);
    const now = Date.now();

    const current = await currentSubscription(ctx, args.institutionId);
    if (current) {
      await ctx.db.patch(current._id, { effectiveTo: now });
    }

    return ctx.db.insert('tenantSubscriptions', {
      institutionId: args.institutionId,
      planCode: args.planCode,
      status: args.status,
      effectiveFrom: now,
      effectiveTo:
        args.status === 'trial' && args.trialDays ? now + args.trialDays * DAY_MS : undefined,
      createdBy: ownerId,
      reason: args.reason,
    });
  },
});

/** All tenants with their current plan + resolved feature count. Platform staff. */
export const listTenants = query({
  args: {},
  handler: async (ctx) => {
    await assertPlatformSupport(ctx);
    const institutions = await ctx.db.query('institutions').collect();
    institutions.sort((left, right) => {
      if (left.shortCode === 'OGFS') return -1;
      if (right.shortCode === 'OGFS') return 1;
      return left.name.localeCompare(right.name);
    });
    return Promise.all(
      institutions.map(async (inst) => {
        const sub = await currentSubscription(ctx, inst._id);
        const features = await resolveEntitlements(ctx, inst._id);
        return {
          _id: inst._id,
          name: inst.name,
          shortCode: inst.shortCode,
          type: inst.type,
          status: inst.status,
          planCode: sub?.planCode ?? null,
          subscriptionStatus: sub?.status ?? null,
          featureCount: features.size,
        };
      })
    );
  },
});

/** A tenant's current active/trial subscription (or null). Platform staff. */
export const getTenantSubscription = query({
  args: { institutionId: v.id('institutions') },
  handler: async (ctx, { institutionId }) => {
    await assertTenantSupportReadAccess(ctx, institutionId, 'subscription_status');
    return (await currentSubscription(ctx, institutionId)) ?? null;
  },
});
