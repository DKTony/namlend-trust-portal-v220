/**
 * Entitlement resolution + enforcement guard.
 *
 * Resolution model (blueprint §4):
 *   resolved(tenant) = active-subscription plan.defaultFeatures
 *                      ∪ add-ons ∪ active trials
 *                      − removals
 *                      ∩ rolloutState ∈ {enabled, pilot}
 *   ∪ ALWAYS_ON_FEATURES   (core lending, every tenant)
 *
 * Phase 0 is INERT: `assertFeatureEnabled` only blocks when the kill-switch
 * `ENTITLEMENT_ENFORCEMENT` businessRule is `true`. Default (unseeded) = allow-all, so no
 * existing behavior changes. Phase 2 flips the switch after the gating tests pass.
 */

import { ConvexError } from 'convex/values';
import { GenericMutationCtx, GenericQueryCtx } from 'convex/server';
import { DataModel, Id } from '../_generated/dataModel';
import { ALWAYS_ON_FEATURES, isValidFeatureKey } from './features';
import { getBooleanRule } from './ruleEvaluator';

type AnyCtx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>;

const ACTIVE_ROLLOUT = ['enabled', 'pilot'];

/**
 * Resolve the set of feature keys currently available to a tenant. Pure read; deterministic.
 */
export async function resolveEntitlements(
  ctx: AnyCtx,
  institutionId: Id<'institutions'>,
  now: number = Date.now()
): Promise<Set<string>> {
  const result = new Set<string>(ALWAYS_ON_FEATURES);

  // 1. Active subscription → plan default features.
  const subs = await ctx.db
    .query('tenantSubscriptions')
    .withIndex('by_institutionId', (q) => q.eq('institutionId', institutionId))
    .collect();
  const activeSub = subs.find(
    (s) =>
      ['trial', 'active'].includes(s.status) &&
      s.effectiveFrom <= now &&
      (s.effectiveTo === undefined || s.effectiveTo > now)
  );
  if (activeSub) {
    const plan = await ctx.db
      .query('plans')
      .withIndex('by_planCode', (q) => q.eq('planCode', activeSub.planCode))
      .first();
    if (plan && plan.status === 'active') {
      for (const key of plan.defaultFeatures) {
        if (isValidFeatureKey(key)) result.add(key);
      }
    }
  }

  // 2. Per-tenant entitlement overrides (add-ons/trials/removals), temporal + rollout-gated.
  const entitlements = await ctx.db
    .query('tenantEntitlements')
    .withIndex('by_institutionId', (q) => q.eq('institutionId', institutionId))
    .collect();
  for (const e of entitlements) {
    const active = e.effectiveFrom <= now && (e.effectiveTo === undefined || e.effectiveTo > now);
    if (!active) continue;
    if (e.source === 'removal' || !e.enabled) {
      result.delete(e.featureKey);
      continue;
    }
    if (ACTIVE_ROLLOUT.includes(e.rolloutState) && isValidFeatureKey(e.featureKey)) {
      result.add(e.featureKey);
    }
  }

  return result;
}

/** Is a specific feature enabled for a tenant right now? */
export async function isFeatureEnabled(
  ctx: AnyCtx,
  institutionId: Id<'institutions'>,
  featureKey: string
): Promise<boolean> {
  if (ALWAYS_ON_FEATURES.includes(featureKey)) return true;
  const set = await resolveEntitlements(ctx, institutionId);
  return set.has(featureKey);
}

/**
 * Enforcement guard. Throws `FEATURE_NOT_ENABLED` only when entitlement enforcement is
 * switched on (Phase 2+). In Phase 0 the kill-switch defaults off → allow-all → inert.
 */
export async function assertFeatureEnabled(
  ctx: AnyCtx,
  institutionId: Id<'institutions'>,
  featureKey: string
): Promise<void> {
  const enforcement = await getBooleanRule(ctx, 'ENTITLEMENT_ENFORCEMENT', false);
  if (!enforcement) return; // INERT (Phase 0)
  if (!(await isFeatureEnabled(ctx, institutionId, featureKey))) {
    throw new ConvexError({
      code: 'FEATURE_NOT_ENABLED',
      message: `Feature '${featureKey}' is not enabled for this tenant.`,
    });
  }
}
