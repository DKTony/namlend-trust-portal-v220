/**
 * System Configuration — key/value store for runtime settings.
 * Replaces the system_configuration table Supabase queries.
 * All writes require admin role; reads require staff.
 */

import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { scheduleAuditLog } from './lib/audit';
import { assertAdminOrPlatformOwner, assertStaffOrPlatformSupport } from './lib/platformAuth';

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Get the currently effective configuration for a key.
 * Filters by effectiveFrom/effectiveTo if temporal versioning is active,
 * otherwise falls back to the first matching non-deleted record.
 */
export const getConfig = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    await assertStaffOrPlatformSupport(ctx);
    const entries = await ctx.db
      .query('systemConfiguration')
      .withIndex('by_key', (q) => q.eq('key', key))
      .collect();

    // Filter out soft-deleted entries
    const active = entries.filter((e) => !e.deletedAt);

    // If temporal versioning is present, find the currently effective record
    const now = Date.now();
    const temporalMatch = active.find((e) => {
      if (e.effectiveFrom === undefined) return true; // Legacy record without temporal fields
      const from = e.effectiveFrom;
      const to = e.effectiveTo ?? Infinity;
      return from <= now && now < to;
    });

    return temporalMatch ?? active[0] ?? null;
  },
});

/**
 * Get all currently effective configurations.
 * Filters out soft-deleted and superseded (effectiveTo in past) records.
 */
export const getAllConfig = query({
  args: {
    category: v.optional(v.string()),
    includeHistory: v.optional(v.boolean()),
  },
  handler: async (ctx, { category, includeHistory }) => {
    await assertStaffOrPlatformSupport(ctx);
    let results = await ctx.db.query('systemConfiguration').collect();

    // Exclude soft-deleted entries
    results = results.filter((c) => !c.deletedAt);

    // Unless history requested, show only currently effective records
    if (!includeHistory) {
      const now = Date.now();
      results = results.filter((c) => {
        if (c.effectiveTo !== undefined && c.effectiveTo <= now) return false;
        return true;
      });
    }

    if (category) {
      results = results.filter((c) => c.category === category);
    }
    return results;
  },
});

/**
 * Get public configuration values. No auth guard because only records explicitly
 * marked isPublic=true are returned.
 */
export const getPublicConfig = query({
  args: {
    category: v.optional(v.string()),
  },
  handler: async (ctx, { category }) => {
    let results = await ctx.db.query('systemConfiguration').collect();
    const now = Date.now();

    results = results.filter((c) => {
      if (!c.isPublic || c.deletedAt) return false;
      if (c.effectiveTo !== undefined && c.effectiveTo <= now) return false;
      if (category && c.category !== category) return false;
      return true;
    });

    return results;
  },
});

/**
 * Get configuration value as a typed result.
 * Returns the currently effective value, or null if not found.
 */
export const getConfigValue = query({
  args: {
    key: v.string(),
    asOf: v.optional(v.number()),
  },
  handler: async (ctx, { key, asOf }) => {
    await assertStaffOrPlatformSupport(ctx);
    const entries = await ctx.db
      .query('systemConfiguration')
      .withIndex('by_key', (q) => q.eq('key', key))
      .collect();

    const active = entries.filter((e) => !e.deletedAt);
    const pointInTime = asOf ?? Date.now();

    const match = active.find((e) => {
      if (e.effectiveFrom === undefined) return true; // Legacy record
      const from = e.effectiveFrom;
      const to = e.effectiveTo ?? Infinity;
      return from <= pointInTime && pointInTime < to;
    });

    return match?.value ?? active[0]?.value ?? null;
  },
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Set a configuration value with temporal versioning.
 *
 * Instead of overwriting, this mutation "closes" the old record by setting
 * effectiveTo = now, then inserts a new record with effectiveFrom = now.
 * This preserves the full history of configuration changes for regulatory reporting.
 */
export const setConfig = mutation({
  args: {
    key: v.string(),
    value: v.any(),
    category: v.optional(v.string()),
    description: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await assertAdminOrPlatformOwner(ctx);

    const now = Date.now();

    // Find all records for this key (may have temporal history)
    const allEntries = await ctx.db
      .query('systemConfiguration')
      .withIndex('by_key', (q) => q.eq('key', args.key))
      .collect();

    // Find the currently effective record (no effectiveTo, or effectiveTo in future)
    const current = allEntries.find((e) => {
      if (e.deletedAt) return false;
      if (e.effectiveTo !== undefined && e.effectiveTo <= now) return false;
      return true;
    });

    if (current) {
      const oldValue = current.value;
      const oldVersion = current.version ?? 0;

      // Close the current record
      await ctx.db.patch(current._id, {
        effectiveTo: now,
        updatedAt: now,
      });

      // Insert new versioned record
      const configId = await ctx.db.insert('systemConfiguration', {
        key: args.key,
        value: args.value,
        category: args.category ?? current.category,
        description: args.description ?? current.description,
        isPublic: args.isPublic ?? current.isPublic,
        effectiveFrom: now,
        version: oldVersion + 1,
        createdAt: now,
        updatedAt: now,
      });

      scheduleAuditLog(
        ctx,
        'systemConfiguration',
        configId,
        'update_config',
        JSON.stringify(oldValue),
        JSON.stringify(args.value),
        `Updated key: ${args.key} (v${oldVersion} → v${oldVersion + 1})`
      );

      return configId;
    } else {
      // No existing record — create initial version
      const configId = await ctx.db.insert('systemConfiguration', {
        key: args.key,
        value: args.value,
        category: args.category ?? 'general',
        description: args.description,
        isPublic: args.isPublic ?? false,
        effectiveFrom: now,
        version: 1,
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
        `Created key: ${args.key} (v1)`
      );

      return configId;
    }
  },
});

export const deleteConfig = mutation({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    await assertAdminOrPlatformOwner(ctx);

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
    await assertAdminOrPlatformOwner(ctx);

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
