/**
 * Rule Evaluator — reads business rules from the database with typed fallbacks.
 *
 * Usage:
 *   const aprLimit = await getNumericRule(ctx, 'APR_LIMIT', 32);
 *   const weights = await getJsonRule<RailWeights>(ctx, 'RAIL_WEIGHTS', DEFAULT_WEIGHTS);
 *
 * If no rule is seeded for the given ruleCode, the fallback value is returned.
 * This ensures the system works identically to hardcoded behavior before
 * any rules are populated.
 */

import { GenericMutationCtx, GenericQueryCtx } from 'convex/server';
import { v } from 'convex/values';
import { DataModel } from '../_generated/dataModel';
import { internalQuery } from '../_generated/server';

type Ctx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>;

/**
 * Get the currently active rule row for a ruleCode.
 * Active = effectiveTo is undefined (not yet superseded).
 */
async function getActiveRuleRow(ctx: Ctx, ruleCode: string) {
  // Query rules where effectiveTo is undefined (active)
  const rules = await ctx.db
    .query('businessRules')
    .withIndex('by_ruleCode', (q) => q.eq('ruleCode', ruleCode))
    .collect();

  // Find the one with no effectiveTo (currently active)
  return rules.find((r) => r.effectiveTo === undefined) ?? null;
}

/** Read a numeric rule, returning fallback if not seeded. */
export async function getNumericRule(
  ctx: Ctx,
  ruleCode: string,
  fallback: number
): Promise<number> {
  const row = await getActiveRuleRow(ctx, ruleCode);
  if (!row || row.valueType !== 'number') return fallback;
  const parsed = parseFloat(row.value);
  return isNaN(parsed) ? fallback : parsed;
}

/** Read a JSON-structured rule, returning fallback if not seeded. */
export async function getJsonRule<T>(ctx: Ctx, ruleCode: string, fallback: T): Promise<T> {
  const row = await getActiveRuleRow(ctx, ruleCode);
  if (!row || row.valueType !== 'json') return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
}

/** Read a string rule, returning fallback if not seeded. */
export async function getStringRule(ctx: Ctx, ruleCode: string, fallback: string): Promise<string> {
  const row = await getActiveRuleRow(ctx, ruleCode);
  if (!row || row.valueType !== 'string') return fallback;
  return row.value;
}

/** Read a boolean rule, returning fallback if not seeded. */
export async function getBooleanRule(
  ctx: Ctx,
  ruleCode: string,
  fallback: boolean
): Promise<boolean> {
  const row = await getActiveRuleRow(ctx, ruleCode);
  if (!row || row.valueType !== 'boolean') return fallback;
  return row.value === 'true';
}

// ---------------------------------------------------------------------------
// Internal query wrappers — callable from actions via ctx.runQuery()
// ---------------------------------------------------------------------------

/** Internal query wrapper for getStringRule (used by actions like ipsAdapter) */
export const getStringRuleQuery = internalQuery({
  args: { ruleCode: v.string(), fallback: v.string() },
  handler: async (ctx, { ruleCode, fallback }) => {
    return getStringRule(ctx, ruleCode, fallback);
  },
});

/** Internal query wrapper for getBooleanRule (used by scheduled actions for feature flags) */
export const getBooleanRuleQuery = internalQuery({
  args: { ruleCode: v.string(), fallback: v.boolean() },
  handler: async (ctx, { ruleCode, fallback }) => {
    return getBooleanRule(ctx, ruleCode, fallback);
  },
});
