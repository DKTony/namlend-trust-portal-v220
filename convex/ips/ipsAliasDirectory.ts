/**
 * IPS Alias Directory — centralized alias registry synced with IPN.
 *
 * Lifecycle: NEW → ACTIVE → INACTIVE → DEREGISTERED → BLOCKED | PORTED
 *
 * Local aliases are created first (syncedWithIps=false), then synced
 * to IPN via the ipsAliasAdapter action (ReqRegMapper).
 */

import { v } from 'convex/values';
import { query, mutation, internalMutation, internalQuery } from '../_generated/server';
import { internal } from '../_generated/api';
import { ConvexError } from 'convex/values';
import { assertAuthenticated, assertStaff, assertOwnerOrStaff } from '../lib/auth';
import { scheduleAuditLog } from '../lib/audit';
import { normalizeNamibianMobile, isValidNamibianMobile } from '../lib/ipsPhoneNormalize';
import { assertAliasAvailable, assertAliasUsable, validateIpsHandle } from '../lib/ipsAliasRules';

const aliasStatus = v.union(
  v.literal('NEW'),
  v.literal('ACTIVE'),
  v.literal('INACTIVE'),
  v.literal('BLOCKED'),
  v.literal('DEREGISTERED'),
  v.literal('PORTED')
);

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Get current user's aliases */
export const getMyAliases = query({
  args: {},
  handler: async (ctx) => {
    const userId = await assertAuthenticated(ctx);
    return ctx.db
      .query('ipsAliasDirectory')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .collect();
  },
});

/** Get a specific alias by address */
export const getAliasByAddr = query({
  args: { addr: v.string() },
  handler: async (ctx, { addr }) => {
    await assertAuthenticated(ctx);
    const alias = await ctx.db
      .query('ipsAliasDirectory')
      .withIndex('by_addr', (q) => q.eq('addr', addr))
      .first();
    if (!alias) return null;

    try {
      await assertOwnerOrStaff(ctx, alias.userId);
      return alias;
    } catch {
      return {
        addr: alias.addr,
        entityType: alias.entityType,
        status: alias.status,
        syncedWithIps: alias.syncedWithIps,
        isDefault: false,
      };
    }
  },
});

/** Staff: list all aliases with optional status filter */
export const adminListAliases = query({
  args: {
    status: v.optional(aliasStatus),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { status, limit }) => {
    await assertStaff(ctx);
    if (status) {
      return ctx.db
        .query('ipsAliasDirectory')
        .withIndex('by_status', (q) => q.eq('status', status))
        .order('desc')
        .take(limit ?? 100);
    }
    return ctx.db
      .query('ipsAliasDirectory')
      .order('desc')
      .take(limit ?? 100);
  },
});

/** Staff: list aliases pending sync */
export const getPendingSyncAliases = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    await assertStaff(ctx);
    return ctx.db
      .query('ipsAliasDirectory')
      .withIndex('by_syncedWithIps', (q) => q.eq('syncedWithIps', false))
      .take(limit ?? 50);
  },
});

// Internal queries (for actions/webhooks)
export const getAliasByAddrInternal = internalQuery({
  args: { addr: v.string() },
  handler: async (ctx, { addr }) => {
    return ctx.db
      .query('ipsAliasDirectory')
      .withIndex('by_addr', (q) => q.eq('addr', addr))
      .first();
  },
});

export const getAliasByIdValueInternal = internalQuery({
  args: { idValue: v.string() },
  handler: async (ctx, { idValue }) => {
    return ctx.db
      .query('ipsAliasDirectory')
      .withIndex('by_idValue', (q) => q.eq('idValue', idValue))
      .first();
  },
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Register a new local alias and schedule IPN sync.
 * The alias starts as NEW + syncedWithIps=false.
 * The ipsAliasAdapter action will sync it to IPN and update the status.
 */
export const registerLocalAlias = mutation({
  args: {
    addr: v.string(),
    entityType: v.union(v.literal('PERSON'), v.literal('ENTITY')),
    idType: v.union(v.literal('MOBILE'), v.literal('NUMERICID')),
    idValue: v.string(),
    linkedAccountRef: v.optional(v.string()),
    linkedBankBic: v.optional(v.string()),
    accountHolderName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);
    const [handlePart, providerPart] = args.addr.split('@');
    if (!handlePart || !providerPart) {
      throw new ConvexError({
        code: 'INVALID_VPA',
        message: 'Payment address must be in handle@provider format.',
      });
    }
    const { handle } = validateIpsHandle(handlePart);
    const normalizedAddr = `${handle}@${providerPart.toLowerCase()}`;

    // Normalize mobile number if idType is MOBILE
    let normalizedIdValue = args.idValue;
    if (args.idType === 'MOBILE') {
      const normalized = normalizeNamibianMobile(args.idValue);
      if (!normalized) {
        throw new ConvexError({
          code: 'INVALID_MOBILE',
          message: 'Invalid Namibian mobile number. Expected format: +264 8X XXX XXXX',
        });
      }
      if (!isValidNamibianMobile(normalized)) {
        throw new ConvexError({
          code: 'INVALID_MOBILE_PREFIX',
          message: 'Mobile number must start with 81 (MTC), 85 (TN Mobile), or 84 (Paratus).',
        });
      }
      normalizedIdValue = normalized;
    }

    // Check for duplicate alias address
    const existing = await ctx.db
      .query('ipsAliasDirectory')
      .withIndex('by_addr', (q) => q.eq('addr', normalizedAddr))
      .first();

    assertAliasAvailable(existing);

    // Check if idValue is already registered by another user (mobile uniqueness)
    if (args.idType === 'MOBILE') {
      const existingMobile = await ctx.db
        .query('ipsAliasDirectory')
        .withIndex('by_idValue', (q) => q.eq('idValue', normalizedIdValue))
        .collect();

      const activeForOther = existingMobile.find(
        (a) => a.userId !== userId && a.status !== 'DEREGISTERED' && a.status !== 'PORTED'
      );
      if (activeForOther) {
        throw new ConvexError({
          code: 'MOBILE_REGISTERED',
          message: 'This mobile number is already registered to another user.',
        });
      }
    }

    // Check if user already has a default — new alias gets isDefault only if first
    const userAliases = await ctx.db
      .query('ipsAliasDirectory')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .collect();
    const hasDefault = userAliases.some((a) => a.isDefault && a.status !== 'DEREGISTERED');

    const now = Date.now();
    const aliasId = await ctx.db.insert('ipsAliasDirectory', {
      userId,
      addr: normalizedAddr,
      entityType: args.entityType,
      idType: args.idType,
      idValue: normalizedIdValue,
      status: 'NEW',
      syncedWithIps: false,
      isDefault: !hasDefault,
      linkedAccountRef: args.linkedAccountRef,
      linkedBankBic: args.linkedBankBic,
      accountHolderName: args.accountHolderName,
      createdAt: now,
      updatedAt: now,
    });

    scheduleAuditLog(ctx, 'ips_alias', aliasId, 'REGISTER', 'none', 'NEW');

    // Schedule IPN sync (ReqRegMapper ADD) via action
    await ctx.scheduler.runAfter(0, internal.actions.ipsAliasAdapter.reqRegMapper, {
      aliasId,
      operation: 'ADD',
      addr: normalizedAddr,
      entityType: args.entityType,
      idType: args.idType,
      idValue: normalizedIdValue,
      linkedAccountRef: args.linkedAccountRef,
      linkedBankBic: args.linkedBankBic,
    });

    return aliasId;
  },
});

/**
 * Update alias from IPN response (called by ipsAliasAdapter after IPN confirms).
 * Internal — no auth guard needed.
 */
export const updateAliasFromIpn = internalMutation({
  args: {
    aliasId: v.id('ipsAliasDirectory'),
    status: aliasStatus,
    cmId: v.optional(v.string()),
    syncError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const alias = await ctx.db.get(args.aliasId);
    if (!alias) return;

    const now = Date.now();
    const updates: Record<string, unknown> = {
      status: args.status,
      updatedAt: now,
    };

    if (args.cmId) {
      updates.cmId = args.cmId;
    }

    if (args.syncError) {
      updates.syncError = args.syncError;
      updates.syncedWithIps = false;
    } else {
      updates.syncedWithIps = true;
      updates.lastSyncAt = now;
      updates.syncError = undefined;
    }

    await ctx.db.patch(args.aliasId, updates);

    scheduleAuditLog(ctx, 'ips_alias', args.aliasId, 'IPN_UPDATE', alias.status, args.status);
  },
});

/**
 * Deregister an alias — marks local as DEREGISTERED and schedules IPN DELETE.
 */
export const deregisterAlias = mutation({
  args: { aliasId: v.id('ipsAliasDirectory') },
  handler: async (ctx, { aliasId }) => {
    await assertAuthenticated(ctx);
    const alias = await ctx.db.get(aliasId);
    if (!alias) throw new ConvexError({ code: 'NOT_FOUND', message: 'Alias not found.' });
    await assertOwnerOrStaff(ctx, alias.userId);

    if (alias.status === 'DEREGISTERED') {
      throw new ConvexError({
        code: 'ALREADY_DEREGISTERED',
        message: 'Alias already deregistered.',
      });
    }

    const now = Date.now();
    await ctx.db.patch(aliasId, {
      status: 'DEREGISTERED',
      updatedAt: now,
    });

    scheduleAuditLog(ctx, 'ips_alias', aliasId, 'DEREGISTER', alias.status, 'DEREGISTERED');

    // Schedule IPN DELETE if it was synced
    if (alias.syncedWithIps && alias.cmId) {
      await ctx.scheduler.runAfter(0, internal.actions.ipsAliasAdapter.reqRegMapper, {
        aliasId,
        operation: 'DELETE',
        addr: alias.addr,
        entityType: alias.entityType,
        idType: alias.idType,
        idValue: alias.idValue,
      });
    }
  },
});

/**
 * Staff: suspend/block an alias.
 */
export const blockAlias = mutation({
  args: {
    aliasId: v.id('ipsAliasDirectory'),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { aliasId, reason }) => {
    await assertStaff(ctx);
    const alias = await ctx.db.get(aliasId);
    if (!alias) throw new ConvexError({ code: 'NOT_FOUND', message: 'Alias not found.' });

    const now = Date.now();
    await ctx.db.patch(aliasId, {
      status: 'BLOCKED',
      updatedAt: now,
    });

    scheduleAuditLog(ctx, 'ips_alias', aliasId, 'BLOCK', alias.status, 'BLOCKED', reason);

    // Schedule IPN BLOCK if synced
    if (alias.syncedWithIps && alias.cmId) {
      await ctx.scheduler.runAfter(0, internal.actions.ipsAliasAdapter.reqRegMapper, {
        aliasId,
        operation: 'BLOCK',
        addr: alias.addr,
        entityType: alias.entityType,
        idType: alias.idType,
        idValue: alias.idValue,
      });
    }
  },
});

/**
 * Set a user's default alias.
 */
export const setDefaultAlias = mutation({
  args: { aliasId: v.id('ipsAliasDirectory') },
  handler: async (ctx, { aliasId }) => {
    const userId = await assertAuthenticated(ctx);
    const alias = await ctx.db.get(aliasId);
    if (!alias) throw new ConvexError({ code: 'NOT_FOUND', message: 'Alias not found.' });
    await assertOwnerOrStaff(ctx, alias.userId);
    assertAliasUsable(alias);

    // Clear existing default
    const userAliases = await ctx.db
      .query('ipsAliasDirectory')
      .withIndex('by_userId', (q) => q.eq('userId', alias.userId))
      .collect();

    const now = Date.now();
    for (const a of userAliases) {
      if (a.isDefault && a._id !== aliasId) {
        await ctx.db.patch(a._id, { isDefault: false, updatedAt: now });
      }
    }

    await ctx.db.patch(aliasId, { isDefault: true, updatedAt: now });
  },
});
