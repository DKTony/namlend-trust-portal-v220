/**
 * Enforcement activation readiness checks.
 *
 * Read-only Platform Console diagnostics used before flipping TENANCY_ENFORCEMENT or
 * ENTITLEMENT_ENFORCEMENT. This avoids manual database inspection and keeps go-live as an
 * operational procedure rather than an ad hoc mutation.
 */

import { v } from 'convex/values';
import { Id } from '../_generated/dataModel';
import { query } from '../_generated/server';
import { resolveEntitlements } from '../lib/entitlements';
import { FEATURES, getFeature, isValidFeatureKey } from '../lib/features';
import { assertPlatformSupport } from '../lib/platformAuth';
import { getBooleanRule } from '../lib/ruleEvaluator';
import { CORE_TABLES } from './backfill';

type TenantOwnedTable = (typeof CORE_TABLES)[number];
type TenantWithoutActiveSubscription = {
  institutionId: Id<'institutions'>;
  name: string;
  shortCode: string;
  status: string;
};
type UnmetEntitlementDependency = {
  institutionId: Id<'institutions'>;
  featureKey: string;
  dependency: string;
  featureName: string;
};

const TENANT_ROLES = new Set(['client', 'loan_officer', 'admin', 'tenant_admin']);
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['trial', 'active']);
const ACTIVE_ROLLOUT_STATES = new Set(['enabled', 'pilot']);
const FEATURE_KEYS_WITH_DEPENDENCIES = FEATURES.filter((f) => f.dependsOn?.length);

async function countMissingInstitutionId(ctx: any, table: TenantOwnedTable) {
  const rows = await ctx.db
    .query(table)
    .filter((q: any) => q.eq(q.field('institutionId'), undefined))
    .take(1000);
  return {
    table,
    missingInstitutionId: rows.length,
    truncated: rows.length === 1000,
  };
}

async function activeSubscriptionFor(ctx: any, institutionId: Id<'institutions'>) {
  const now = Date.now();
  const subs = await ctx.db
    .query('tenantSubscriptions')
    .withIndex('by_institutionId', (q: any) => q.eq('institutionId', institutionId))
    .collect();
  return subs.find(
    (s: any) =>
      ACTIVE_SUBSCRIPTION_STATUSES.has(s.status) &&
      s.effectiveFrom <= now &&
      (s.effectiveTo === undefined || s.effectiveTo > now)
  );
}

/**
 * Dry-run/check query for activation readiness.
 *
 * Returns counts and concrete blockers for the owner/support team:
 * - tenant users without institutionId,
 * - tenant-owned rows without institutionId,
 * - active tenants without active/trial subscriptions,
 * - unknown entitlement keys,
 * - entitlement dependency gaps.
 */
export const getEnforcementReadiness = query({
  args: { includeSamples: v.optional(v.boolean()) },
  handler: async (ctx, { includeSamples }) => {
    await assertPlatformSupport(ctx);

    const [tenancyEnforced, entitlementEnforced] = await Promise.all([
      getBooleanRule(ctx, 'TENANCY_ENFORCEMENT', false),
      getBooleanRule(ctx, 'ENTITLEMENT_ENFORCEMENT', false),
    ]);

    const userRoleRows = await ctx.db.query('userRoles').collect();
    const usersWithoutInstitution = userRoleRows.filter(
      (r: any) => TENANT_ROLES.has(r.role) && r.institutionId === undefined
    );

    const tenantRowsMissingInstitution = await Promise.all(
      CORE_TABLES.map((table) => countMissingInstitutionId(ctx, table))
    );

    const institutions = await ctx.db.query('institutions').collect();
    const activeTenantInstitutions = institutions.filter((i: any) => i.status === 'active');
    const tenantsWithoutActiveSubscription: TenantWithoutActiveSubscription[] = [];
    for (const institution of activeTenantInstitutions) {
      const subscription = await activeSubscriptionFor(ctx, institution._id);
      if (!subscription) {
        tenantsWithoutActiveSubscription.push({
          institutionId: institution._id,
          name: institution.name,
          shortCode: institution.shortCode,
          status: institution.status,
        });
      }
    }

    const entitlementRows = await ctx.db.query('tenantEntitlements').collect();
    const invalidEntitlementKeys = entitlementRows
      .filter((e: any) => !isValidFeatureKey(e.featureKey))
      .map((e: any) => ({
        entitlementId: e._id,
        institutionId: e.institutionId,
        featureKey: e.featureKey,
      }));

    const now = Date.now();
    const unmetDependencies: UnmetEntitlementDependency[] = [];
    for (const institution of activeTenantInstitutions) {
      const resolved = await resolveEntitlements(ctx, institution._id, now);
      for (const feature of FEATURE_KEYS_WITH_DEPENDENCIES) {
        if (!resolved.has(feature.key)) continue;
        for (const dependency of feature.dependsOn ?? []) {
          if (!resolved.has(dependency)) {
            unmetDependencies.push({
              institutionId: institution._id,
              featureKey: feature.key,
              dependency,
              featureName: getFeature(feature.key)?.name ?? feature.key,
            });
          }
        }
      }
    }

    const entitlementRowsWithInactiveRollout = entitlementRows.filter(
      (e: any) =>
        e.enabled &&
        e.effectiveFrom <= now &&
        (e.effectiveTo === undefined || e.effectiveTo > now) &&
        !ACTIVE_ROLLOUT_STATES.has(e.rolloutState)
    );

    const missingTenantRowsTotal = tenantRowsMissingInstitution.reduce(
      (sum, row) => sum + row.missingInstitutionId,
      0
    );
    const readyForTenancy = usersWithoutInstitution.length === 0 && missingTenantRowsTotal === 0;
    const readyForEntitlements =
      readyForTenancy &&
      tenantsWithoutActiveSubscription.length === 0 &&
      invalidEntitlementKeys.length === 0 &&
      unmetDependencies.length === 0;

    return {
      flags: {
        tenancyEnforced,
        entitlementEnforced,
      },
      readyForTenancy,
      readyForEntitlements,
      counts: {
        tenantUserRoles: userRoleRows.filter((r: any) => TENANT_ROLES.has(r.role)).length,
        usersWithoutInstitution: usersWithoutInstitution.length,
        tenantRowsMissingInstitution: missingTenantRowsTotal,
        activeTenants: activeTenantInstitutions.length,
        tenantsWithoutActiveSubscription: tenantsWithoutActiveSubscription.length,
        invalidEntitlementKeys: invalidEntitlementKeys.length,
        unmetDependencies: unmetDependencies.length,
        entitledButNotRolledOut: entitlementRowsWithInactiveRollout.length,
      },
      tenantRowsMissingInstitution,
      tenantsWithoutActiveSubscription: includeSamples
        ? tenantsWithoutActiveSubscription
        : tenantsWithoutActiveSubscription.slice(0, 20),
      invalidEntitlementKeys: includeSamples
        ? invalidEntitlementKeys
        : invalidEntitlementKeys.slice(0, 20),
      unmetDependencies: includeSamples ? unmetDependencies : unmetDependencies.slice(0, 20),
      blockers: [
        ...(usersWithoutInstitution.length > 0
          ? [`${usersWithoutInstitution.length} tenant user roles are missing institutionId.`]
          : []),
        ...(missingTenantRowsTotal > 0
          ? [`${missingTenantRowsTotal} tenant-owned rows are missing institutionId.`]
          : []),
        ...(tenantsWithoutActiveSubscription.length > 0
          ? [
              `${tenantsWithoutActiveSubscription.length} active tenants have no active/trial subscription.`,
            ]
          : []),
        ...(invalidEntitlementKeys.length > 0
          ? [`${invalidEntitlementKeys.length} entitlement rows reference unknown feature keys.`]
          : []),
        ...(unmetDependencies.length > 0
          ? [`${unmetDependencies.length} entitlement dependency gaps exist.`]
          : []),
      ],
    };
  },
});
