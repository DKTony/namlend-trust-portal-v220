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

/**
 * Look up a VPA by address — checks ipsAliasDirectory first (IPN-synced),
 * falls back to legacy vpaRegistry for backward compatibility.
 */
export const getVpaByAddress = query({
  args: { vpa: v.string() },
  handler: async (ctx, { vpa }) => {
    await assertAuthenticated(ctx);

    // Phase 2: check IPN alias directory first
    const alias = await ctx.db
      .query('ipsAliasDirectory')
      .withIndex('by_addr', (q) => q.eq('addr', vpa))
      .first();

    if (alias && alias.status !== 'DEREGISTERED' && alias.status !== 'PORTED') {
      return {
        _id: alias._id,
        userId: alias.userId,
        vpa: alias.addr,
        vpaType: 'personal' as const,
        bankBic: alias.linkedBankBic,
        accountNumber: alias.linkedAccountRef,
        isDefault: alias.isDefault,
        status:
          alias.status === 'ACTIVE'
            ? ('active' as const)
            : alias.status === 'BLOCKED'
              ? ('suspended' as const)
              : ('active' as const),
        createdAt: alias.createdAt,
        updatedAt: alias.updatedAt,
        // Bridge fields
        _source: 'ipsAliasDirectory' as const,
        syncedWithIps: alias.syncedWithIps,
        cmId: alias.cmId,
      };
    }

    // Fallback: legacy vpaRegistry
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
