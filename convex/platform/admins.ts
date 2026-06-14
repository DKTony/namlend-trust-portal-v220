/**
 * Platform-admin management (Platform Console). Phase 0: read + owner-guarded assignment.
 * The FIRST owner is bootstrapped via platform/seed (internal); subsequent platform staff
 * are managed here by an existing owner.
 */

import { v, ConvexError } from 'convex/values';
import { query, mutation } from '../_generated/server';
import { assertAuthenticated } from '../lib/auth';
import { assertPlatformOwner, assertPlatformSupport, getPlatformRole } from '../lib/platformAuth';

/** The caller's platform role, or null if they are not platform staff. Frontend gate. */
export const getMyPlatformRole = query({
  args: {},
  handler: async (ctx) => {
    const userId = await assertAuthenticated(ctx);
    return getPlatformRole(ctx, userId);
  },
});

/** List platform staff (platform staff read). */
export const listPlatformAdmins = query({
  args: {},
  handler: async (ctx) => {
    await assertPlatformSupport(ctx);
    return ctx.db.query('platformAdmins').collect();
  },
});

/** Assign or update a platform role (owner only). */
export const assignPlatformAdmin = mutation({
  args: {
    targetUserId: v.id('users'),
    platformRole: v.union(v.literal('platform_owner'), v.literal('platform_support')),
  },
  handler: async (ctx, { targetUserId, platformRole }) => {
    const ownerId = await assertPlatformOwner(ctx);
    const existing = await ctx.db
      .query('platformAdmins')
      .withIndex('by_userId', (q) => q.eq('userId', targetUserId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        platformRole,
        status: 'active',
        lastReviewedAt: Date.now(),
      });
      return existing._id;
    }
    return ctx.db.insert('platformAdmins', {
      userId: targetUserId,
      platformRole,
      status: 'active',
      createdBy: ownerId,
      createdAt: Date.now(),
    });
  },
});

/** Suspend a platform admin (owner only; never hard-delete — audit retention). */
export const suspendPlatformAdmin = mutation({
  args: { targetUserId: v.id('users') },
  handler: async (ctx, { targetUserId }) => {
    await assertPlatformOwner(ctx);
    const existing = await ctx.db
      .query('platformAdmins')
      .withIndex('by_userId', (q) => q.eq('userId', targetUserId))
      .first();
    if (!existing)
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Platform admin not found.' });
    await ctx.db.patch(existing._id, { status: 'suspended', lastReviewedAt: Date.now() });
  },
});
