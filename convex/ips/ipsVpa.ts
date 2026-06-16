/**
 * IPS VPA bridge for client-facing hooks.
 *
 * The live source of truth is `ipsAliasDirectory`. `vpaRegistry` remains a
 * compatibility fallback so older saved records still appear in the UI while
 * the repo finishes migrating away from the legacy registry model.
 */

import { getAuthUserId } from '@convex-dev/auth/server';
import { ConvexError, v } from 'convex/values';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { action, mutation, query } from '../_generated/server';
import { assertAuthenticated } from '../lib/auth';
import { getAliasAvailabilityReason, isAliasUsable } from '../lib/ipsResponseParsers';
import { resolveWriteInstitution } from '../lib/tenancy';

function maskReference(value?: string) {
  if (!value) return undefined;
  if (/[X*]{2,}/.test(value)) return value;
  const trimmed = value.replace(/\s+/g, '');
  const tail = trimmed.slice(-4);
  return tail ? `****${tail}` : undefined;
}

function normalizeAliasRecord(alias: any) {
  const usable = isAliasUsable(alias.status, alias.syncedWithIps);
  return {
    id: String(alias._id),
    vpa_address: alias.addr,
    vpa_type: 'HANDLE' as const,
    provider_code: alias.linkedBankBic ?? null,
    provider_name: alias.linkedBankBic ?? null,
    account_masked: maskReference(alias.linkedAccountRef) ?? null,
    account_holder_name: alias.accountHolderName ?? null,
    ifsc_code: alias.linkedBankBic ?? null,
    is_validated: usable,
    is_default: Boolean(alias.isDefault),
    display_name: alias.accountHolderName ?? alias.addr,
    status: alias.status,
    source: 'alias_directory' as const,
    synced_with_ips: Boolean(alias.syncedWithIps),
    is_usable: usable,
    unavailable_reason: getAliasAvailabilityReason(alias.status, alias.syncedWithIps) ?? null,
    created_at: new Date(alias.createdAt).toISOString(),
  };
}

function normalizeLegacyRecord(record: any) {
  return {
    id: String(record._id),
    vpa_address: record.vpa,
    vpa_type: 'HANDLE' as const,
    provider_code: record.bankBic ?? null,
    provider_name: record.bankBic ?? null,
    account_masked: maskReference(record.accountNumber) ?? null,
    account_holder_name: null,
    ifsc_code: record.bankBic ?? null,
    is_validated: false,
    is_default: Boolean(record.isDefault),
    display_name: record.vpa,
    status: record.status,
    source: 'legacy_registry' as const,
    synced_with_ips: false,
    is_usable: false,
    unavailable_reason: 'Legacy saved VPA must be re-registered and confirmed by IPS.',
    created_at: new Date(record.createdAt).toISOString(),
  };
}

export const getMySavedVpas = query({
  args: {},
  handler: async (ctx) => {
    const userId = await assertAuthenticated(ctx);

    const [aliases, legacy] = await Promise.all([
      ctx.db
        .query('ipsAliasDirectory')
        .withIndex('by_userId', (q) => q.eq('userId', userId))
        .collect(),
      ctx.db
        .query('vpaRegistry')
        .withIndex('by_userId', (q) => q.eq('userId', userId))
        .collect(),
    ]);

    const aliasRows = aliases
      .filter((alias) => !['DEREGISTERED', 'PORTED'].includes(alias.status))
      .map(normalizeAliasRecord);

    const seen = new Set(aliasRows.map((item) => item.vpa_address.toLowerCase()));
    const legacyRows = legacy
      .filter((record) => record.status === 'active' && !seen.has(record.vpa.toLowerCase()))
      .map(normalizeLegacyRecord);

    const vpas = [...aliasRows, ...legacyRows].sort((left, right) => {
      if (left.is_default !== right.is_default) {
        return left.is_default ? -1 : 1;
      }
      return right.created_at.localeCompare(left.created_at);
    });

    return { success: true, vpas };
  },
});

export const upsertVpa = mutation({
  args: {
    vpaAddress: v.string(),
    displayName: v.optional(v.string()),
    setDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);
    const normalizedVpa = args.vpaAddress.trim().toLowerCase();

    if (!/^[a-z0-9._-]+@[a-z0-9.-]+$/i.test(normalizedVpa)) {
      throw new ConvexError({
        code: 'INVALID_VPA',
        message: 'Payment address must be in the format username@provider.',
      });
    }

    const existingLegacy = await ctx.db
      .query('vpaRegistry')
      .withIndex('by_vpa', (q) => q.eq('vpa', normalizedVpa))
      .first();

    const now = Date.now();

    if (existingLegacy) {
      if (existingLegacy.userId !== userId) {
        throw new ConvexError({
          code: 'VPA_EXISTS',
          message: 'That payment address is already stored by another user.',
        });
      }

      await ctx.db.patch(existingLegacy._id, {
        status: 'active',
        isDefault: args.setDefault ?? existingLegacy.isDefault,
        updatedAt: now,
      });

      if (args.setDefault) {
        const others = await ctx.db
          .query('vpaRegistry')
          .withIndex('by_userId', (q) => q.eq('userId', userId))
          .collect();
        for (const record of others) {
          if (record._id !== existingLegacy._id && record.isDefault) {
            await ctx.db.patch(record._id, { isDefault: false, updatedAt: now });
          }
        }
      }

      return {
        success: true,
        vpa_id: String(existingLegacy._id),
        vpa_address: normalizedVpa,
        is_default: args.setDefault ?? existingLegacy.isDefault,
        message: args.displayName ? `Saved as ${args.displayName}.` : 'VPA updated.',
      };
    }

    const hasDefault = (
      await ctx.db
        .query('vpaRegistry')
        .withIndex('by_userId', (q) => q.eq('userId', userId))
        .collect()
    ).some((record) => record.isDefault && record.status === 'active');

    const vpaId = await ctx.db.insert('vpaRegistry', {
      userId,
      institutionId: await resolveWriteInstitution(ctx, { userId }),
      vpa: normalizedVpa,
      vpaType: 'personal',
      isDefault: args.setDefault ?? !hasDefault,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });

    if (args.setDefault) {
      const others = await ctx.db
        .query('vpaRegistry')
        .withIndex('by_userId', (q) => q.eq('userId', userId))
        .collect();
      for (const record of others) {
        if (record._id !== vpaId && record.isDefault) {
          await ctx.db.patch(record._id, { isDefault: false, updatedAt: now });
        }
      }
    }

    return {
      success: true,
      vpa_id: String(vpaId),
      vpa_address: normalizedVpa,
      is_default: args.setDefault ?? !hasDefault,
      message: args.displayName ? `Saved as ${args.displayName}.` : 'VPA saved.',
    };
  },
});

export const deleteVpa = mutation({
  args: {
    vpaId: v.string(),
    source: v.optional(v.union(v.literal('alias_directory'), v.literal('legacy_registry'))),
  },
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);
    const now = Date.now();

    if (args.source !== 'legacy_registry') {
      const alias = await ctx.db.get(args.vpaId as Id<'ipsAliasDirectory'>);
      if (alias) {
        if (alias.userId !== userId) {
          throw new ConvexError({ code: 'FORBIDDEN', message: 'Alias not found.' });
        }

        await ctx.db.patch(alias._id, {
          status: 'DEREGISTERED',
          updatedAt: now,
        });

        if (alias.syncedWithIps && alias.cmId) {
          await ctx.scheduler.runAfter(0, internal.actions.ipsAliasAdapter.reqRegMapper, {
            aliasId: alias._id,
            operation: 'DELETE',
            addr: alias.addr,
            entityType: alias.entityType,
            idType: alias.idType,
            idValue: alias.idValue,
          });
        }

        return { success: true };
      }
    }

    const legacy = await ctx.db.get(args.vpaId as Id<'vpaRegistry'>);
    if (!legacy || legacy.userId !== userId) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'VPA not found.' });
    }

    await ctx.db.patch(legacy._id, {
      status: 'inactive',
      isDefault: false,
      updatedAt: now,
    });

    return { success: true };
  },
});

export const setDefaultVpa = mutation({
  args: {
    vpaId: v.string(),
    source: v.optional(v.union(v.literal('alias_directory'), v.literal('legacy_registry'))),
  },
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);
    const now = Date.now();

    const [aliases, legacy] = await Promise.all([
      ctx.db
        .query('ipsAliasDirectory')
        .withIndex('by_userId', (q) => q.eq('userId', userId))
        .collect(),
      ctx.db
        .query('vpaRegistry')
        .withIndex('by_userId', (q) => q.eq('userId', userId))
        .collect(),
    ]);

    let matched = false;

    for (const alias of aliases) {
      const nextDefault = args.source !== 'legacy_registry' && String(alias._id) === args.vpaId;
      if (nextDefault && !isAliasUsable(alias.status, alias.syncedWithIps)) {
        throw new ConvexError({
          code: 'ALIAS_NOT_USABLE',
          message:
            getAliasAvailabilityReason(alias.status, alias.syncedWithIps) ??
            'Alias is not usable yet.',
        });
      }
      if (alias.isDefault !== nextDefault) {
        await ctx.db.patch(alias._id, { isDefault: nextDefault, updatedAt: now });
      }
      matched = matched || nextDefault;
    }

    for (const record of legacy) {
      const nextDefault = args.source === 'legacy_registry' && String(record._id) === args.vpaId;
      if (record.isDefault !== nextDefault) {
        await ctx.db.patch(record._id, { isDefault: nextDefault, updatedAt: now });
      }
      matched = matched || nextDefault;
    }

    if (!matched) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'VPA not found.' });
    }

    return { success: true };
  },
});

export const validateVpa = action({
  args: {
    vpa: v.string(),
  },
  handler: async (ctx, { vpa }): Promise<Record<string, unknown>> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError({
        code: 'UNAUTHENTICATED',
        message: 'You must be signed in to validate a payment address.',
      });
    }

    const normalizedVpa = vpa.trim().toLowerCase();

    if (!/^[a-z0-9._-]+@[a-z0-9.-]+$/i.test(normalizedVpa)) {
      return {
        success: false,
        isValid: false,
        error: 'INVALID_VPA',
        errorCode: 'INVALID_VPA',
        errorMessage: 'Payment address must be in the format username@provider.',
      };
    }

    const localAlias: any = await ctx.runQuery(
      internal.ips.ipsAliasDirectory.getAliasByAddrInternal,
      {
        addr: normalizedVpa,
      }
    );

    if (localAlias && isAliasUsable(localAlias.status, localAlias.syncedWithIps)) {
      return {
        success: true,
        isValid: true,
        validationStatus: 'validated' as const,
        accountHolderName: localAlias.accountHolderName,
        ifscCode: localAlias.linkedBankBic,
        providerCode: localAlias.linkedBankBic,
        providerName: localAlias.linkedBankBic,
        resolvedVpa: localAlias.addr,
        status: localAlias.status,
        entityType: localAlias.entityType,
        source: 'local',
      };
    }

    if (localAlias) {
      return {
        success: true,
        isValid: false,
        validationStatus:
          localAlias.status === 'ACTIVE' ? ('pending' as const) : ('invalid' as const),
        resolvedVpa: localAlias.addr,
        status: localAlias.status,
        entityType: localAlias.entityType,
        source: 'local',
        error: 'ALIAS_NOT_USABLE',
        errorCode: 'ALIAS_NOT_USABLE',
        errorMessage:
          getAliasAvailabilityReason(localAlias.status, localAlias.syncedWithIps) ??
          'Alias is not available for payments yet.',
      };
    }

    const validation: any = await ctx.runAction(internal.actions.ipsAdapter.validateVpa, {
      addr: normalizedVpa,
      correlationId: normalizedVpa,
    });

    return {
      success: validation.validationStatus !== 'invalid',
      isValid: Boolean(validation.valid),
      validationStatus: validation.validationStatus,
      accountHolderName: validation.accountHolderName,
      ifscCode: validation.ifscCode,
      providerCode: validation.providerCode,
      providerName: validation.providerName,
      resolvedVpa: validation.resolvedAddr ?? normalizedVpa,
      entityType: validation.entityType,
      source: 'ips',
      cmId: validation.cmId,
      error: validation.valid ? undefined : validation.errorCode,
      errorCode: validation.errorCode,
      errorMessage: validation.errorDescription,
    };
  },
});
