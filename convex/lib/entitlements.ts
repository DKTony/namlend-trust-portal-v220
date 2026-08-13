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

import { GenericMutationCtx, GenericQueryCtx } from 'convex/server';
import { ConvexError } from 'convex/values';
import { DataModel, Doc, Id } from '../_generated/dataModel';
import { ALWAYS_ON_FEATURES, isTenantGrantableFeatureKey } from './features';
import { getBooleanRule } from './ruleEvaluator';
import { getCallerInstitution } from './tenancy';

type AnyCtx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>;

const ACTIVE_ROLLOUT = ['enabled', 'pilot'];

/**
 * Manual owner decisions must not depend on Convex collection order. `removal` is the
 * negative form of a manual override in the control plane, so both manual sources outrank
 * plan/add-on/trial rows. Within the same authority tier, the most recently-effective row
 * wins, with stable document metadata breaking ties.
 */
function entitlementAuthority(row: Doc<'tenantEntitlements'>): number {
  return row.source === 'manual_override' || row.source === 'removal' ? 2 : 1;
}

function compareEntitlementPrecedence(
  left: Doc<'tenantEntitlements'>,
  right: Doc<'tenantEntitlements'>
): number {
  return (
    entitlementAuthority(left) - entitlementAuthority(right) ||
    left.effectiveFrom - right.effectiveFrom ||
    left.changedAt - right.changedAt ||
    left._creationTime - right._creationTime ||
    String(left._id).localeCompare(String(right._id))
  );
}

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
  const activeSub = subs
    .filter(
      (s) =>
        ['trial', 'active'].includes(s.status) &&
        s.effectiveFrom <= now &&
        (s.effectiveTo === undefined || s.effectiveTo > now)
    )
    .sort(
      (left, right) =>
        right.effectiveFrom - left.effectiveFrom ||
        right._creationTime - left._creationTime ||
        String(right._id).localeCompare(String(left._id))
    )[0];
  if (activeSub) {
    const plan = await ctx.db
      .query('plans')
      .withIndex('by_planCode', (q) => q.eq('planCode', activeSub.planCode))
      .first();
    if (plan && plan.status === 'active') {
      for (const key of plan.defaultFeatures) {
        if (isTenantGrantableFeatureKey(key)) result.add(key);
      }
    }
  }

  // 2. Per-tenant entitlement overrides (add-ons/trials/removals), temporal + rollout-gated.
  const entitlements = await ctx.db
    .query('tenantEntitlements')
    .withIndex('by_institutionId', (q) => q.eq('institutionId', institutionId))
    .collect();
  const winningOverrides = new Map<string, Doc<'tenantEntitlements'>>();
  for (const e of entitlements) {
    const active = e.effectiveFrom <= now && (e.effectiveTo === undefined || e.effectiveTo > now);
    if (!active) continue;
    if (!isTenantGrantableFeatureKey(e.featureKey)) continue;

    // Historical data may contain revocations that pre-date the always-on invariant. They
    // are deliberately ignored so a legacy row can never disable core lending.
    if (ALWAYS_ON_FEATURES.includes(e.featureKey)) continue;

    const current = winningOverrides.get(e.featureKey);
    if (!current || compareEntitlementPrecedence(e, current) > 0) {
      winningOverrides.set(e.featureKey, e);
    }
  }

  for (const e of winningOverrides.values()) {
    if (e.source === 'removal' || !e.enabled || !ACTIVE_ROLLOUT.includes(e.rolloutState)) {
      result.delete(e.featureKey);
    } else {
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

/**
 * Caller-scoped feature gate — the one-liner used at the entry of gated backoffice functions:
 * `await assertCallerFeatureEnabled(ctx, 'collections')` right after the auth assertion.
 *
 * Inert by default: returns immediately (no institution lookup) unless `ENTITLEMENT_ENFORCEMENT`
 * is on, so it is a no-op in production until the owner flips the flag (Phase 2 go-live).
 * When enforcing, it resolves the caller's tenant and fails closed: an unresolved tenant or an
 * unentitled one is denied. Correct because the operating tenant must own the feature, and staff
 * are bound to their institution by the time enforcement is switched on (post-seed).
 */
export async function assertCallerFeatureEnabled(ctx: AnyCtx, featureKey: string): Promise<void> {
  if (!(await getBooleanRule(ctx, 'ENTITLEMENT_ENFORCEMENT', false))) return; // INERT
  const { institutionId } = await getCallerInstitution(ctx);
  if (!institutionId) {
    throw new ConvexError({
      code: 'FEATURE_NOT_ENABLED',
      message: `Feature '${featureKey}' is not enabled for this tenant.`,
    });
  }
  await assertFeatureEnabled(ctx, institutionId, featureKey);
}

const TENANT_STAFF_ROLES = new Set(['admin', 'tenant_admin', 'loan_officer']);

/**
 * Gate a client-originated write without applying Client Portal surface entitlements to staff.
 * Staff continue to use their own backoffice capabilities and object-level authorization.
 */
export async function assertCallerClientFeatureEnabled(
  ctx: AnyCtx,
  featureKey: string,
  staffFeatureKey?: string
): Promise<void> {
  if (!(await getBooleanRule(ctx, 'ENTITLEMENT_ENFORCEMENT', false))) return;

  const caller = await getCallerInstitution(ctx);
  if (caller.role && TENANT_STAFF_ROLES.has(caller.role)) {
    if (staffFeatureKey) {
      if (!caller.institutionId) {
        throw new ConvexError({
          code: 'FEATURE_NOT_ENABLED',
          message: `Feature '${staffFeatureKey}' is not enabled for this tenant.`,
        });
      }
      await assertFeatureEnabled(ctx, caller.institutionId, staffFeatureKey);
    }
    return;
  }
  if (caller.role !== 'client' || !caller.institutionId) {
    throw new ConvexError({
      code: 'FEATURE_NOT_ENABLED',
      message: `Feature '${featureKey}' is not enabled for this tenant.`,
    });
  }
  await assertFeatureEnabled(ctx, caller.institutionId, featureKey);
}
