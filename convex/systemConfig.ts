/**
 * System Configuration — key/value store for runtime settings.
 * Replaces the system_configuration table Supabase queries.
 * All writes require admin role; reads require staff.
 */

import { v } from 'convex/values';
import { query, mutation } from './_generated/server';
import { assertStaff, assertAdmin } from './lib/auth';
import { scheduleAuditLog } from './lib/audit';

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getConfig = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    await assertStaff(ctx);
    const entry = await ctx.db
      .query('systemConfiguration')
      .withIndex('by_key', (q) => q.eq('key', key))
      .first();
    return entry ?? null;
  },
});

export const getAllConfig = query({
  args: { category: v.optional(v.string()) },
  handler: async (ctx, { category }) => {
    await assertStaff(ctx);
    let results = await ctx.db.query('systemConfiguration').collect();
    // Exclude soft-deleted entries
    results = results.filter((c) => !c.deletedAt);
    if (category) {
      results = results.filter((c) => c.category === category);
    }
    return results;
  },
});

/**
 * Get configuration value as a typed result.
 * Returns null if key not found, preserving default handling on the client.
 */
export const getConfigValue = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    await assertStaff(ctx);
    const entry = await ctx.db
      .query('systemConfiguration')
      .withIndex('by_key', (q) => q.eq('key', key))
      .first();
    return entry?.value ?? null;
  },
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export const setConfig = mutation({
  args: {
    key: v.string(),
    value: v.any(),
    category: v.optional(v.string()),
    description: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);

    const existing = await ctx.db
      .query('systemConfiguration')
      .withIndex('by_key', (q) => q.eq('key', args.key))
      .first();

    const now = Date.now();

    if (existing) {
      const oldValue = existing.value;
      await ctx.db.patch(existing._id, {
        value: args.value,
        category: args.category ?? existing.category,
        description: args.description ?? existing.description,
        isPublic: args.isPublic ?? existing.isPublic,
        updatedAt: now,
      });

      scheduleAuditLog(
        ctx,
        'systemConfiguration',
        existing._id,
        'update_config',
        JSON.stringify(oldValue),
        JSON.stringify(args.value),
        `Updated key: ${args.key}`
      );

      return existing._id;
    } else {
      const configId = await ctx.db.insert('systemConfiguration', {
        key: args.key,
        value: args.value,
        category: args.category ?? 'general',
        description: args.description,
        isPublic: args.isPublic ?? false,
        createdAt: now,
        updatedAt: now,
      });

      scheduleAuditLog(
        ctx,
        'systemConfiguration',
        configId,
        'create_config',
        'none',
        JSON.stringify(args.value),
        `Created key: ${args.key}`
      );

      return configId;
    }
  },
});

export const deleteConfig = mutation({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    await assertAdmin(ctx);

    const existing = await ctx.db
      .query('systemConfiguration')
      .withIndex('by_key', (q) => q.eq('key', key))
      .first();

    if (!existing) throw new Error(`Config key not found: ${key}`);

    scheduleAuditLog(
      ctx,
      'systemConfiguration',
      existing._id,
      'delete_config',
      JSON.stringify(existing.value),
      'deleted',
      `Soft-deleted key: ${key}`
    );

    // Soft-delete: patch with deletedAt timestamp (7-year data retention rule)
    await ctx.db.patch(existing._id, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// ---------------------------------------------------------------------------
// Bulk seed (admin only — for initial setup)
// ---------------------------------------------------------------------------

export const seedDefaultConfig = mutation({
  args: {},
  handler: async (ctx) => {
    await assertAdmin(ctx);

    const defaults = [
      {
        key: 'apr_limit',
        value: 32,
        category: 'regulatory',
        description: 'Maximum annual percentage rate (Namibian law)',
        isPublic: true,
      },
      {
        key: 'currency_code',
        value: 'NAD',
        category: 'regulatory',
        description: 'ISO 4217 currency code',
        isPublic: true,
      },
      {
        key: 'data_retention_years',
        value: 7,
        category: 'regulatory',
        description: 'Financial record retention period (years)',
        isPublic: false,
      },
      {
        key: 'kyc_required',
        value: true,
        category: 'compliance',
        description: 'Require KYC before loan approval',
        isPublic: false,
      },
      {
        key: 'max_loan_amount',
        value: 500_000,
        category: 'credit',
        description: 'Maximum single loan amount (NAD)',
        isPublic: true,
      },
      {
        key: 'min_loan_amount',
        value: 1_000,
        category: 'credit',
        description: 'Minimum single loan amount (NAD)',
        isPublic: true,
      },
      {
        key: 'settlement_cutoff_time',
        value: '14:00',
        category: 'settlement',
        description: 'Daily IPS settlement cutoff time (UTC)',
        isPublic: false,
      },
    ];

    const now = Date.now();
    let created = 0;

    for (const config of defaults) {
      const existing = await ctx.db
        .query('systemConfiguration')
        .withIndex('by_key', (q) => q.eq('key', config.key))
        .first();

      if (!existing) {
        await ctx.db.insert('systemConfiguration', {
          ...config,
          createdAt: now,
          updatedAt: now,
        });
        created++;
      }
    }

    return { created, skipped: defaults.length - created };
  },
});
