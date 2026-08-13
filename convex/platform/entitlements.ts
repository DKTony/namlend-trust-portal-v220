/**
 * Entitlement reads + owner-guarded dispatch.
 *
 * `resolveMyEntitlements` is what the Backoffice Console (`useEntitlements`) will read to
 * filter nav/routes in Phase 3. `setTenantEntitlement` is the owner's dispatch lever.
 */

import { ConvexError, v } from 'convex/values';
import type { Id } from '../_generated/dataModel';
import { mutation, query, type MutationCtx } from '../_generated/server';
import { scheduleAuditEntry } from '../lib/audit';
import { resolveEntitlements } from '../lib/entitlements';
import {
  ALWAYS_ON_FEATURES,
  CLIENT_FEATURES,
  getFeature,
  getFeatureCatalogMetadata,
  getMissingFeatureDependencies,
  isTenantGrantableFeatureKey,
  withFeatureDependencyClosure,
} from '../lib/features';
import { assertPlatformOwner } from '../lib/platformAuth';
import { getBooleanRule } from '../lib/ruleEvaluator';
import { assertTenantSupportReadAccess } from '../lib/supportAudit';
import { getCallerInstitution } from '../lib/tenancy';
import { calculateEnforcementReadiness } from './readiness';

/** Resolve the caller's tenant feature set (or always-on only if unbound). Frontend gate. */
export const resolveMyEntitlements = query({
  args: {},
  handler: async (ctx) => {
    const tenant = await getCallerInstitution(ctx);
    if (!tenant.institutionId) return [...ALWAYS_ON_FEATURES];
    return [...(await resolveEntitlements(ctx, tenant.institutionId))];
  },
});

/**
 * Whether tenant entitlement enforcement is switched on (the `ENTITLEMENT_ENFORCEMENT`
 * kill-switch, default false → inert). The Backoffice nav reads this so feature-based
 * hiding stays dormant until the owner flips the flag in Phase 2 — no later code change.
 */
export const isEntitlementEnforcementOn = query({
  args: {},
  handler: async (ctx) => {
    return getBooleanRule(ctx, 'ENTITLEMENT_ENFORCEMENT', false);
  },
});

/** Inspect a tenant's raw entitlement rows (platform staff). */
export const getTenantEntitlements = query({
  args: { institutionId: v.id('institutions') },
  handler: async (ctx, { institutionId }) => {
    await assertTenantSupportReadAccess(ctx, institutionId, 'tenant_entitlements');
    return ctx.db
      .query('tenantEntitlements')
      .withIndex('by_institutionId', (q) => q.eq('institutionId', institutionId))
      .collect();
  },
});

/** Inspect a tenant's resolved feature set (platform staff). */
export const getResolvedEntitlements = query({
  args: { institutionId: v.id('institutions') },
  handler: async (ctx, { institutionId }) => {
    await assertTenantSupportReadAccess(ctx, institutionId, 'resolved_entitlements');
    return [...(await resolveEntitlements(ctx, institutionId))];
  },
});

/**
 * Validate dependency closure for every future entitlement/subscription transition. Checking
 * only `Date.now()` would allow, for example, `clientBanking` to outlive a time-limited
 * `ippOnboarding` grant. The mutation has already applied its candidate row when this runs;
 * throwing rolls the Convex transaction back atomically.
 */
async function assertDependencyClosureAcrossTimeline(
  ctx: MutationCtx,
  institutionId: Id<'institutions'>,
  now: number
) {
  const [entitlements, subscriptions] = await Promise.all([
    ctx.db
      .query('tenantEntitlements')
      .withIndex('by_institutionId', (q) => q.eq('institutionId', institutionId))
      .collect(),
    ctx.db
      .query('tenantSubscriptions')
      .withIndex('by_institutionId', (q) => q.eq('institutionId', institutionId))
      .collect(),
  ]);

  const boundaries = new Set<number>([now]);
  for (const row of [...entitlements, ...subscriptions]) {
    if (Number.isFinite(row.effectiveFrom) && row.effectiveFrom >= now) {
      boundaries.add(row.effectiveFrom);
    }
    if (
      row.effectiveTo !== undefined &&
      Number.isFinite(row.effectiveTo) &&
      row.effectiveTo >= now
    ) {
      boundaries.add(row.effectiveTo);
    }
  }

  for (const boundary of [...boundaries].sort((left, right) => left - right)) {
    const resolved = await resolveEntitlements(ctx, institutionId, boundary);
    const missingDependencies = getMissingFeatureDependencies(resolved);
    if (missingDependencies.length === 0) continue;

    const first = missingDependencies[0];
    throw new ConvexError({
      code: 'FEATURE_DEPENDENCY_MISSING',
      message: `Feature '${first.featureKey}' requires '${first.dependency}' at ${new Date(boundary).toISOString()}.`,
      effectiveAt: boundary,
      missingDependencies: missingDependencies.map(({ featureKey, dependency }) => ({
        featureKey,
        dependency,
      })),
    });
  }
}

/**
 * Owner dispatch: enable/disable/override a feature for a tenant (the "deploy a feature"
 * lever). Upserts a `tenantEntitlements` row; audited via changedBy.
 */
export const setTenantEntitlement = mutation({
  args: {
    institutionId: v.id('institutions'),
    featureKey: v.string(),
    source: v.union(
      v.literal('addon'),
      v.literal('trial'),
      v.literal('manual_override'),
      v.literal('removal')
    ),
    enabled: v.boolean(),
    rolloutState: v.union(
      v.literal('off'),
      v.literal('internal'),
      v.literal('pilot'),
      v.literal('enabled'),
      v.literal('deprecated')
    ),
    effectiveTo: v.optional(v.number()),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const ownerId = await assertPlatformOwner(ctx);
    const feature = getFeature(args.featureKey);
    if (!feature || !isTenantGrantableFeatureKey(args.featureKey)) {
      throw new ConvexError({
        code: 'VALIDATION_ERROR',
        message: `Feature is unknown or not tenant-grantable: ${args.featureKey}`,
      });
    }
    if (feature.alwaysOn && (args.source === 'removal' || !args.enabled)) {
      throw new ConvexError({
        code: 'ALWAYS_ON_FEATURE',
        message: `Always-on feature '${args.featureKey}' cannot be revoked.`,
      });
    }
    const now = Date.now();
    if (args.effectiveTo !== undefined && args.effectiveTo <= now) {
      throw new ConvexError({
        code: 'VALIDATION_ERROR',
        message: 'effectiveTo must be in the future.',
      });
    }
    const existing = (
      await ctx.db
        .query('tenantEntitlements')
        .withIndex('by_institution_feature', (q) =>
          q.eq('institutionId', args.institutionId).eq('featureKey', args.featureKey)
        )
        .collect()
    ).find((e) => e.effectiveTo === undefined);

    if (existing) {
      await ctx.db.patch(existing._id, {
        source: args.source,
        enabled: args.enabled,
        rolloutState: args.rolloutState,
        effectiveFrom: now,
        effectiveTo: args.effectiveTo,
        reason: args.reason,
        changedBy: ownerId,
        changedAt: now,
      });
      await assertDependencyClosureAcrossTimeline(ctx, args.institutionId, now);
      scheduleAuditEntry(ctx, {
        entityType: 'tenantEntitlements',
        entityId: existing._id,
        action: 'UPDATE_TENANT_ENTITLEMENT',
        oldState: {
          institutionId: existing.institutionId,
          featureKey: existing.featureKey,
          source: existing.source,
          enabled: existing.enabled,
          rolloutState: existing.rolloutState,
          effectiveFrom: existing.effectiveFrom,
          effectiveTo: existing.effectiveTo,
          reason: existing.reason,
        },
        newState: {
          institutionId: args.institutionId,
          featureKey: args.featureKey,
          source: args.source,
          enabled: args.enabled,
          rolloutState: args.rolloutState,
          effectiveFrom: now,
          effectiveTo: args.effectiveTo,
          reason: args.reason,
        },
        userId: ownerId,
      });
      return existing._id;
    }
    const entitlementId = await ctx.db.insert('tenantEntitlements', {
      institutionId: args.institutionId,
      featureKey: args.featureKey,
      source: args.source,
      enabled: args.enabled,
      rolloutState: args.rolloutState,
      effectiveFrom: now,
      effectiveTo: args.effectiveTo,
      reason: args.reason,
      changedBy: ownerId,
      changedAt: now,
    });
    await assertDependencyClosureAcrossTimeline(ctx, args.institutionId, now);
    scheduleAuditEntry(ctx, {
      entityType: 'tenantEntitlements',
      entityId: entitlementId,
      action: 'CREATE_TENANT_ENTITLEMENT',
      newState: {
        institutionId: args.institutionId,
        featureKey: args.featureKey,
        source: args.source,
        enabled: args.enabled,
        rolloutState: args.rolloutState,
        effectiveFrom: now,
        effectiveTo: args.effectiveTo,
        reason: args.reason,
      },
      userId: ownerId,
    });
    return entitlementId;
  },
});

/**
 * Add the Client Portal catalogue and defaults without removing or rewriting any existing
 * plan grants or tenant overrides. Safe to dry-run and safe to re-run.
 */
export const backfillClientFeatureDefaults = mutation({
  args: { dryRun: v.boolean() },
  handler: async (ctx, { dryRun }) => {
    const ownerId = await assertPlatformOwner(ctx);
    const now = Date.now();
    const clientFeatureKeys = CLIENT_FEATURES.map((feature) => feature.key);
    const requiredDefaults = withFeatureDependencyClosure(clientFeatureKeys);

    const catalogToInsert = [];
    for (const feature of CLIENT_FEATURES) {
      const existing = await ctx.db
        .query('featuresCatalog')
        .withIndex('by_featureKey', (q) => q.eq('featureKey', feature.key))
        .first();
      if (!existing) catalogToInsert.push(feature);
    }

    const activePlans = (await ctx.db.query('plans').collect()).filter(
      (plan) => plan.status === 'active'
    );
    const planChanges = activePlans
      .map((plan) => {
        const expanded = withFeatureDependencyClosure([
          ...plan.defaultFeatures,
          ...requiredDefaults,
        ]);
        const addedFeatures = expanded.filter(
          (featureKey) => !plan.defaultFeatures.includes(featureKey)
        );
        return { plan, expanded, addedFeatures };
      })
      .filter((change) => change.addedFeatures.length > 0);

    const entitlementRows = await ctx.db.query('tenantEntitlements').collect();
    const overrideConflicts = entitlementRows
      .filter(
        (row) =>
          row.effectiveFrom <= now &&
          (row.effectiveTo === undefined || row.effectiveTo > now) &&
          requiredDefaults.includes(row.featureKey) &&
          (row.source === 'removal' || !row.enabled)
      )
      .map((row) => ({
        entitlementId: row._id,
        institutionId: row.institutionId,
        featureKey: row.featureKey,
        source: row.source,
        enabled: row.enabled,
        rolloutState: row.rolloutState,
        reason: row.reason,
      }));

    if (!dryRun) {
      for (const feature of catalogToInsert) {
        await ctx.db.insert('featuresCatalog', {
          featureKey: feature.key,
          name: feature.name,
          category: feature.category,
          console: feature.console,
          metadata: getFeatureCatalogMetadata(feature),
          createdAt: now,
          updatedAt: now,
        });
      }

      for (const { plan, expanded, addedFeatures } of planChanges) {
        await ctx.db.patch(plan._id, { defaultFeatures: expanded });
        scheduleAuditEntry(ctx, {
          entityType: 'plans',
          entityId: plan._id,
          action: 'BACKFILL_CLIENT_FEATURE_DEFAULTS',
          oldState: { defaultFeatures: plan.defaultFeatures },
          newState: { defaultFeatures: expanded, addedFeatures },
          userId: ownerId,
        });
      }

      scheduleAuditEntry(ctx, {
        entityType: 'featureMigration',
        entityId: 'client-feature-defaults-v1',
        action: 'APPLY_CLIENT_FEATURE_BACKFILL',
        newState: {
          catalogInserted: catalogToInsert.map((feature) => feature.key),
          plansUpdated: planChanges.map(({ plan, addedFeatures }) => ({
            planCode: plan.planCode,
            addedFeatures,
          })),
          overrideConflictCount: overrideConflicts.length,
        },
        userId: ownerId,
      });
    }

    return {
      dryRun,
      catalogFeatures: catalogToInsert.map((feature) => feature.key),
      plans: planChanges.map(({ plan, addedFeatures }) => ({
        planId: plan._id,
        planCode: plan.planCode,
        addedFeatures,
      })),
      overrideConflicts,
      counts: {
        catalogToInsert: catalogToInsert.length,
        plansToUpdate: planChanges.length,
        overrideConflicts: overrideConflicts.length,
      },
    };
  },
});

/** Owner-only protected activation. Production rollout still requires the runbook approvals. */
export const setEntitlementEnforcement = mutation({
  args: { enabled: v.boolean(), reason: v.string() },
  handler: async (ctx, { enabled, reason }) => {
    const ownerId = await assertPlatformOwner(ctx);
    const normalizedReason = reason.trim();
    if (!normalizedReason) {
      throw new ConvexError({
        code: 'VALIDATION_ERROR',
        message: 'A reason is required when changing entitlement enforcement.',
      });
    }

    if (enabled) {
      const readiness = await calculateEnforcementReadiness(ctx, false);
      if (!readiness.flags.tenancyEnforced) {
        throw new ConvexError({
          code: 'TENANCY_ENFORCEMENT_REQUIRED',
          message: 'Tenancy enforcement must be active before entitlement enforcement.',
        });
      }
      if (!readiness.readyForEntitlements) {
        throw new ConvexError({
          code: 'ENFORCEMENT_NOT_READY',
          message: readiness.blockers.join(' ') || 'Entitlement readiness checks are not green.',
          blockers: readiness.blockers,
        });
      }
    }

    const now = Date.now();
    const rules = await ctx.db
      .query('businessRules')
      .withIndex('by_ruleCode', (q) => q.eq('ruleCode', 'ENTITLEMENT_ENFORCEMENT'))
      .collect();
    const current = rules.find((rule) => rule.effectiveTo === undefined);
    const nextValue = String(enabled);
    if (current?.value === nextValue) {
      return { changed: false, enabled, ruleId: current._id };
    }
    if (current) await ctx.db.patch(current._id, { effectiveTo: now });

    const ruleId = await ctx.db.insert('businessRules', {
      ruleCode: 'ENTITLEMENT_ENFORCEMENT',
      category: 'platform',
      displayName: 'Entitlement Enforcement',
      description: normalizedReason,
      valueType: 'boolean',
      value: nextValue,
      effectiveFrom: now,
      version: (current?.version ?? 0) + 1,
      createdBy: ownerId,
      createdAt: now,
    });
    scheduleAuditEntry(ctx, {
      entityType: 'businessRules',
      entityId: ruleId,
      action: enabled ? 'ACTIVATE_ENTITLEMENT_ENFORCEMENT' : 'DEACTIVATE_ENTITLEMENT_ENFORCEMENT',
      oldState: current
        ? { value: current.value, version: current.version, ruleId: current._id }
        : undefined,
      newState: {
        value: nextValue,
        version: (current?.version ?? 0) + 1,
        reason: normalizedReason,
      },
      userId: ownerId,
    });

    return { changed: true, enabled, ruleId };
  },
});
