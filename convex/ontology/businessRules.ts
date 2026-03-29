/**
 * Business Rules — CRUD for declarative rules stored as data.
 *
 * Rules use close-and-insert versioning: updating a rule closes the current
 * version (sets effectiveTo) and inserts a new row. This provides a complete
 * audit trail of every value a rule has ever had.
 */

import { v } from 'convex/values';
import { query, mutation } from '../_generated/server';
import { ConvexError } from 'convex/values';
import { assertStaff, assertAdmin } from '../lib/auth';
import { scheduleAuditEntry } from '../lib/audit';

const ruleValueType = v.union(
  v.literal('number'),
  v.literal('json'),
  v.literal('string'),
  v.literal('boolean')
);

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Get the currently active rule for a given ruleCode. */
export const getActiveRule = query({
  args: { ruleCode: v.string() },
  handler: async (ctx, { ruleCode }) => {
    await assertStaff(ctx);
    const rules = await ctx.db
      .query('businessRules')
      .withIndex('by_ruleCode', (q) => q.eq('ruleCode', ruleCode))
      .collect();
    return rules.find((r) => r.effectiveTo === undefined) ?? null;
  },
});

/** Get all active rules in a category. */
export const getActiveRules = query({
  args: { category: v.string() },
  handler: async (ctx, { category }) => {
    await assertStaff(ctx);
    const rules = await ctx.db
      .query('businessRules')
      .withIndex('by_category', (q) => q.eq('category', category))
      .collect();
    return rules.filter((r) => r.effectiveTo === undefined);
  },
});

/** Get all rules (active + historical). */
export const listAllRules = query({
  args: {},
  handler: async (ctx) => {
    await assertStaff(ctx);
    const rules = await ctx.db.query('businessRules').collect();
    return rules;
  },
});

/** Get version history for a specific rule. */
export const listRuleHistory = query({
  args: { ruleCode: v.string() },
  handler: async (ctx, { ruleCode }) => {
    await assertStaff(ctx);
    return ctx.db
      .query('businessRules')
      .withIndex('by_ruleCode', (q) => q.eq('ruleCode', ruleCode))
      .collect();
  },
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** Create a new rule (first version). */
export const createRule = mutation({
  args: {
    ruleCode: v.string(),
    category: v.string(),
    displayName: v.string(),
    description: v.optional(v.string()),
    valueType: ruleValueType,
    value: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await assertAdmin(ctx);

    // Check for existing active rule
    const existing = await ctx.db
      .query('businessRules')
      .withIndex('by_ruleCode', (q) => q.eq('ruleCode', args.ruleCode))
      .collect();
    const active = existing.find((r) => r.effectiveTo === undefined);
    if (active) {
      throw new ConvexError({
        code: 'DUPLICATE',
        message: `Rule '${args.ruleCode}' already exists. Use updateRule to modify.`,
      });
    }

    const now = Date.now();
    const ruleId = await ctx.db.insert('businessRules', {
      ...args,
      effectiveFrom: now,
      version: 1,
      createdBy: userId,
      createdAt: now,
    });

    scheduleAuditEntry(ctx, {
      entityType: 'businessRules',
      entityId: ruleId,
      action: 'CREATE_RULE',
      newState: { ruleCode: args.ruleCode, value: args.value, version: 1 },
    });

    return ruleId;
  },
});

/** Update a rule: close current version and insert new one. */
export const updateRule = mutation({
  args: {
    ruleCode: v.string(),
    value: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, { ruleCode, value, description }) => {
    const userId = await assertAdmin(ctx);

    const existing = await ctx.db
      .query('businessRules')
      .withIndex('by_ruleCode', (q) => q.eq('ruleCode', ruleCode))
      .collect();
    const current = existing.find((r) => r.effectiveTo === undefined);

    if (!current) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: `No active rule found for '${ruleCode}'.`,
      });
    }

    const now = Date.now();

    // Close current version
    await ctx.db.patch(current._id, { effectiveTo: now });

    // Insert new version
    const newRuleId = await ctx.db.insert('businessRules', {
      ruleCode: current.ruleCode,
      category: current.category,
      displayName: current.displayName,
      description: description ?? current.description,
      valueType: current.valueType,
      value,
      effectiveFrom: now,
      version: current.version + 1,
      createdBy: userId,
      createdAt: now,
    });

    scheduleAuditEntry(ctx, {
      entityType: 'businessRules',
      entityId: newRuleId,
      action: 'UPDATE_RULE',
      previousState: { value: current.value, version: current.version },
      newState: { value, version: current.version + 1 },
    });

    return newRuleId;
  },
});

/** Seed default rules (idempotent — skips rules that already exist). */
export const seedDefaultRules = mutation({
  args: {},
  handler: async (ctx) => {
    await assertAdmin(ctx);

    const defaults = [
      {
        ruleCode: 'APR_LIMIT',
        category: 'regulatory',
        displayName: 'Maximum APR',
        description: 'Maximum annual percentage rate allowed under Namibian law',
        valueType: 'number' as const,
        value: '32',
      },
      {
        ruleCode: 'RAIL_WEIGHTS',
        category: 'payments',
        displayName: 'Payment Rail Selection Weights',
        description: 'Weights for cost, speed, availability, and reliability in rail scoring',
        valueType: 'json' as const,
        value: JSON.stringify({ cost: 0.4, speed: 0.3, availability: 0.2, reliability: 0.1 }),
      },
      {
        ruleCode: 'MIN_CREDIT_SCORE',
        category: 'scoring',
        displayName: 'Minimum Credit Score for Auto-Approval',
        description: 'Loans with credit scores below this threshold require manual review',
        valueType: 'number' as const,
        value: '580',
      },
      {
        ruleCode: 'MAX_DTI_RATIO',
        category: 'scoring',
        displayName: 'Maximum Debt-to-Income Ratio',
        description: 'Loans with DTI above this threshold are flagged for review',
        valueType: 'number' as const,
        value: '0.43',
      },
      {
        ruleCode: 'DATA_RETENTION_YEARS',
        category: 'regulatory',
        displayName: 'Data Retention Period',
        description: 'Minimum years financial records must be retained (Namibian law)',
        valueType: 'number' as const,
        value: '7',
      },
    ];

    const now = Date.now();
    let seeded = 0;

    for (const rule of defaults) {
      const existing = await ctx.db
        .query('businessRules')
        .withIndex('by_ruleCode', (q) => q.eq('ruleCode', rule.ruleCode))
        .collect();
      if (existing.some((r) => r.effectiveTo === undefined)) continue;

      await ctx.db.insert('businessRules', {
        ...rule,
        effectiveFrom: now,
        version: 1,
        createdAt: now,
      });
      seeded++;
    }

    return { seeded, total: defaults.length };
  },
});
