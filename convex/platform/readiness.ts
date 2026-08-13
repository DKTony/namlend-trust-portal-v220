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
import {
  ALWAYS_ON_FEATURES,
  CLIENT_FEATURES,
  FEATURES,
  getFeature,
  isTenantGrantableFeatureKey,
  withFeatureDependencyClosure,
} from '../lib/features';
import { assertPlatformSupport } from '../lib/platformAuth';
import { getBooleanRule } from '../lib/ruleEvaluator';
import { isCommercialTenantInstitution } from '../lib/tenancy';
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
const REQUIRED_CLIENT_PLAN_DEFAULTS = withFeatureDependencyClosure(
  CLIENT_FEATURES.map((feature) => feature.key)
);

async function countMissingInstitutionId(ctx: any, table: TenantOwnedTable) {
  let rows = await ctx.db
    .query(table)
    .filter((q: any) => q.eq(q.field('institutionId'), undefined))
    .take(1000);
  // Platform-only identities still have auth profiles but do not belong to a tenant. They are
  // intentionally exempt; only tenant data profiles must be stamped before enforcement.
  if (table === 'profiles' && rows.length > 0) {
    const platformUserIds = new Set(
      (await ctx.db.query('platformAdmins').collect()).map((admin: any) => admin.userId)
    );
    rows = rows.filter((profile: any) => !platformUserIds.has(profile.userId));
  }
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

/** Shared server-side readiness calculation used by diagnostics and protected activation. */
export async function calculateEnforcementReadiness(ctx: any, includeSamples = false) {
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
  const activeTenantInstitutions = institutions.filter(
    (institution: any) =>
      institution.status === 'active' && isCommercialTenantInstitution(institution)
  );
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

  const catalogRows = await ctx.db.query('featuresCatalog').collect();
  const catalogKeys = new Set(catalogRows.map((row: any) => row.featureKey));
  const missingClientCatalogFeatures = CLIENT_FEATURES.filter(
    (feature) => !catalogKeys.has(feature.key)
  ).map((feature) => feature.key);
  const activePlans = (await ctx.db.query('plans').collect()).filter(
    (plan: any) => plan.status === 'active'
  );
  const plansMissingClientDefaults = activePlans
    .map((plan: any) => ({
      planId: plan._id,
      planCode: plan.planCode,
      missingFeatures: REQUIRED_CLIENT_PLAN_DEFAULTS.filter(
        (featureKey) => !plan.defaultFeatures.includes(featureKey)
      ),
    }))
    .filter((plan: any) => plan.missingFeatures.length > 0);
  const plansWithInvalidDefaults = activePlans
    .map((plan: any) => ({
      planId: plan._id,
      planCode: plan.planCode,
      invalidFeatures: plan.defaultFeatures.filter(
        (featureKey: string) => !isTenantGrantableFeatureKey(featureKey)
      ),
    }))
    .filter((plan: any) => plan.invalidFeatures.length > 0);

  const now = Date.now();
  const entitlementRows = await ctx.db.query('tenantEntitlements').collect();
  const invalidEntitlementKeys = entitlementRows
    .filter((e: any) => !isTenantGrantableFeatureKey(e.featureKey))
    .map((e: any) => ({
      entitlementId: e._id,
      institutionId: e.institutionId,
      featureKey: e.featureKey,
    }));

  const alwaysOnRevocationRows = entitlementRows
    .filter(
      (row: any) =>
        ALWAYS_ON_FEATURES.includes(row.featureKey) &&
        row.effectiveFrom <= now &&
        (row.effectiveTo === undefined || row.effectiveTo > now) &&
        (row.source === 'removal' || !row.enabled)
    )
    .map((row: any) => ({
      entitlementId: row._id,
      institutionId: row.institutionId,
      featureKey: row.featureKey,
      source: row.source,
    }));

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
    missingClientCatalogFeatures.length === 0 &&
    plansMissingClientDefaults.length === 0 &&
    plansWithInvalidDefaults.length === 0 &&
    invalidEntitlementKeys.length === 0 &&
    alwaysOnRevocationRows.length === 0 &&
    unmetDependencies.length === 0;

  return {
    flags: { tenancyEnforced, entitlementEnforced },
    readyForTenancy,
    readyForEntitlements,
    counts: {
      tenantUserRoles: userRoleRows.filter((r: any) => TENANT_ROLES.has(r.role)).length,
      usersWithoutInstitution: usersWithoutInstitution.length,
      tenantRowsMissingInstitution: missingTenantRowsTotal,
      activeTenants: activeTenantInstitutions.length,
      tenantsWithoutActiveSubscription: tenantsWithoutActiveSubscription.length,
      missingClientCatalogFeatures: missingClientCatalogFeatures.length,
      plansMissingClientDefaults: plansMissingClientDefaults.length,
      plansWithInvalidDefaults: plansWithInvalidDefaults.length,
      invalidEntitlementKeys: invalidEntitlementKeys.length,
      alwaysOnRevocations: alwaysOnRevocationRows.length,
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
    alwaysOnRevocations: includeSamples
      ? alwaysOnRevocationRows
      : alwaysOnRevocationRows.slice(0, 20),
    unmetDependencies: includeSamples ? unmetDependencies : unmetDependencies.slice(0, 20),
    missingClientCatalogFeatures,
    plansMissingClientDefaults: includeSamples
      ? plansMissingClientDefaults
      : plansMissingClientDefaults.slice(0, 20),
    plansWithInvalidDefaults: includeSamples
      ? plansWithInvalidDefaults
      : plansWithInvalidDefaults.slice(0, 20),
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
      ...(missingClientCatalogFeatures.length > 0
        ? [`${missingClientCatalogFeatures.length} Client Portal catalogue rows are missing.`]
        : []),
      ...(plansMissingClientDefaults.length > 0
        ? [`${plansMissingClientDefaults.length} active plans are missing Client Portal defaults.`]
        : []),
      ...(plansWithInvalidDefaults.length > 0
        ? [
            `${plansWithInvalidDefaults.length} active plans reference unknown or platform-only feature keys.`,
          ]
        : []),
      ...(invalidEntitlementKeys.length > 0
        ? [
            `${invalidEntitlementKeys.length} entitlement rows reference unknown or platform-only feature keys.`,
          ]
        : []),
      ...(alwaysOnRevocationRows.length > 0
        ? [
            `${alwaysOnRevocationRows.length} legacy entitlement rows attempt to revoke always-on features.`,
          ]
        : []),
      ...(unmetDependencies.length > 0
        ? [`${unmetDependencies.length} entitlement dependency gaps exist.`]
        : []),
    ],
  };
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
    return calculateEnforcementReadiness(ctx, includeSamples);
  },
});
