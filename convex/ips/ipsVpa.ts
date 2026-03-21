/**
 * VPA Registry — Virtual Payment Address management.
 */

import { v } from 'convex/values';
import { query, mutation } from '../_generated/server';
import { ConvexError } from 'convex/values';
import { assertAuthenticated, assertOwnerOrStaff, assertStaff } from '../lib/auth';

export const getMyVpas = query({
  args: {},
  handler: async (ctx) => {
    const userId = await assertAuthenticated(ctx);
    return ctx.db
      .query('vpaRegistry')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .collect();
  },
});

export const getVpaByAddress = query({
  args: { vpa: v.string() },
  handler: async (ctx, { vpa }) => {
    await assertAuthenticated(ctx);
    return ctx.db
      .query('vpaRegistry')
      .withIndex('by_vpa', (q) => q.eq('vpa', vpa))
      .first();
  },
});

export const registerVpa = mutation({
  args: {
    vpa: v.string(),
    vpaType: v.union(v.literal('collection'), v.literal('disbursement'), v.literal('personal')),
    bankBic: v.optional(v.string()),
    accountNumber: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);

    // Verify VPA not already taken
    const existing = await ctx.db
      .query('vpaRegistry')
      .withIndex('by_vpa', (q) => q.eq('vpa', args.vpa))
      .first();
    if (existing) {
      throw new ConvexError({
        code: 'DUPLICATE_VPA',
        message: `VPA '${args.vpa}' is already registered.`,
      });
    }

    const now = Date.now();
    return ctx.db.insert('vpaRegistry', {
      userId: userId,
      vpa: args.vpa,
      vpaType: args.vpaType,
      bankBic: args.bankBic,
      accountNumber: args.accountNumber,
      isDefault: args.isDefault ?? false,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const suspendVpa = mutation({
  args: { vpaId: v.id('vpaRegistry') },
  handler: async (ctx, { vpaId }) => {
    await assertStaff(ctx);
    await ctx.db.patch(vpaId, { status: 'suspended', updatedAt: Date.now() });
  },
});
