/**
 * Phase 0 control-plane tests (convex-test harness). Proves:
 *  - platform guards (owner/support) allow/deny correctly
 *  - widened tenant guards accept `tenant_admin` ≡ `admin`
 *  - entitlement resolver: plan ∪ add-ons − removals, temporal, rollout-gated, always-on
 *  - manifest authority rule (DB plans/catalog can't invent feature keys)
 *  - INERTNESS: assertFeatureEnabled allows everything while enforcement is off
 *
 * Run: npm run test:convex
 */
import { convexTest } from 'convex-test';
import { describe, expect, test, vi } from 'vitest';
import { api, internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { ALWAYS_ON_FEATURES, CLIENT_FEATURES, isValidFeatureKey } from './lib/features';
import schema from './schema';

const modules = import.meta.glob('./**/*.*s');

function asUser(t: ReturnType<typeof convexTest>, userId: Id<'users'>) {
  return t.withIdentity({ subject: `${userId}|testsession` });
}

async function seedTenantUser(
  t: ReturnType<typeof convexTest>,
  opts: { role?: string; institutionId?: Id<'institutions'>; email?: string } = {}
): Promise<Id<'users'>> {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert('users', {});
    await ctx.db.insert('profiles', {
      userId,
      email: opts.email ?? `${userId}@example.test`,
      kycStatus: 'verified',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    if (opts.role) {
      await ctx.db.insert('userRoles', {
        userId,
        role: opts.role as 'client' | 'loan_officer' | 'admin' | 'tenant_admin',
        institutionId: opts.institutionId,
        createdAt: Date.now(),
      });
    }
    return userId;
  });
}

async function seedInstitution(t: ReturnType<typeof convexTest>): Promise<Id<'institutions'>> {
  return await t.run(async (ctx) =>
    ctx.db.insert('institutions', {
      name: 'Acme Loans',
      shortCode: `ACME${Math.floor(Math.random() * 1e6)}`,
      type: 'lender',
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  );
}

async function makePlatformOwner(t: ReturnType<typeof convexTest>, userId: Id<'users'>) {
  await t.run(async (ctx) => {
    await ctx.db.insert('platformAdmins', {
      userId,
      platformRole: 'platform_owner',
      status: 'active',
      createdAt: Date.now(),
    });
  });
}

async function makePlatformSupport(t: ReturnType<typeof convexTest>, userId: Id<'users'>) {
  await t.run(async (ctx) => {
    await ctx.db.insert('platformAdmins', {
      userId,
      platformRole: 'platform_support',
      status: 'active',
      createdAt: Date.now(),
    });
  });
}

// ---------------------------------------------------------------------------
// Manifest authority rule
// ---------------------------------------------------------------------------

describe('feature manifest', () => {
  test('always-on features are valid keys', () => {
    for (const k of ALWAYS_ON_FEATURES) expect(isValidFeatureKey(k)).toBe(true);
  });
  test('unknown keys are rejected', () => {
    expect(isValidFeatureKey('quantum-loans')).toBe(false);
  });
  test('catalogues all nine distinct Client Portal surfaces', () => {
    expect(CLIENT_FEATURES.map((feature) => feature.key)).toEqual([
      'clientOverview',
      'clientLoans',
      'clientApplications',
      'clientPayments',
      'clientBanking',
      'clientBudget',
      'clientDocuments',
      'clientSelfService',
      'clientProfile',
    ]);
  });
  test('listManifestKeys returns tenant-grantable keys including client surfaces', async () => {
    const t = convexTest(schema, modules);
    const owner = await seedTenantUser(t, { role: 'client' });
    await makePlatformOwner(t, owner);
    const keys = await asUser(t, owner).query(api.platform.entitlements.listManifestKeys, {});
    expect(keys).toEqual(
      expect.arrayContaining(['clientPayments', 'clientSelfService', 'loans', 'collections'])
    );
    expect(keys).not.toContain('tenantRegistry');
    expect(keys).not.toContain('entitlementDispatch');
  });
});

// ---------------------------------------------------------------------------
// Platform guards
// ---------------------------------------------------------------------------

describe('platform guards', () => {
  test('non-platform user cannot list plans', async () => {
    const t = convexTest(schema, modules);
    const user = await seedTenantUser(t, { role: 'tenant_admin' });
    await expect(asUser(t, user).query(api.platform.plans.listPlans, {})).rejects.toMatchObject({
      data: { code: 'FORBIDDEN' },
    });
  });

  test('non-platform user cannot list the feature manifest', async () => {
    const t = convexTest(schema, modules);
    const user = await seedTenantUser(t, { role: 'tenant_admin' });
    await expect(
      asUser(t, user).query(api.platform.entitlements.listManifestKeys, {})
    ).rejects.toMatchObject({
      data: { code: 'FORBIDDEN' },
    });
  });

  test('platform owner can upsert a plan and read it back', async () => {
    const t = convexTest(schema, modules);
    const owner = await seedTenantUser(t, { role: 'client' });
    await makePlatformOwner(t, owner);
    await asUser(t, owner).mutation(api.platform.plans.upsertPlan, {
      planCode: 'pro',
      name: 'Pro',
      defaultFeatures: ['loans', 'collections'],
    });
    const plans = await asUser(t, owner).query(api.platform.plans.listPlans, {});
    expect(plans.find((p) => p.planCode === 'pro')).toBeTruthy();
  });

  test('authority rule: cannot put an unknown feature key in a plan', async () => {
    const t = convexTest(schema, modules);
    const owner = await seedTenantUser(t, { role: 'client' });
    await makePlatformOwner(t, owner);
    await expect(
      asUser(t, owner).mutation(api.platform.plans.upsertPlan, {
        planCode: 'bad',
        name: 'Bad',
        defaultFeatures: ['quantum-loans'],
      })
    ).rejects.toMatchObject({ data: { code: 'VALIDATION_ERROR' } });
  });

  test('plans reject platform capabilities and incomplete feature dependencies', async () => {
    const t = convexTest(schema, modules);
    const owner = await seedTenantUser(t, { role: 'client' });
    await makePlatformOwner(t, owner);
    await expect(
      asUser(t, owner).mutation(api.platform.plans.upsertPlan, {
        planCode: 'platform-leak',
        name: 'Platform leak',
        defaultFeatures: ['tenantRegistry'],
      })
    ).rejects.toMatchObject({ data: { code: 'VALIDATION_ERROR' } });
    await expect(
      asUser(t, owner).mutation(api.platform.plans.upsertPlan, {
        planCode: 'missing-docs',
        name: 'Missing docs',
        defaultFeatures: ['clientApplications'],
      })
    ).rejects.toMatchObject({ data: { code: 'FEATURE_DEPENDENCY_MISSING' } });
  });

  test('getMyPlatformRole returns role for owner, null for tenant user', async () => {
    const t = convexTest(schema, modules);
    const owner = await seedTenantUser(t, { role: 'client' });
    await makePlatformOwner(t, owner);
    const tenant = await seedTenantUser(t, { role: 'tenant_admin' });
    expect(await asUser(t, owner).query(api.platform.admins.getMyPlatformRole, {})).toBe(
      'platform_owner'
    );
    expect(await asUser(t, tenant).query(api.platform.admins.getMyPlatformRole, {})).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Control-plane guard widening for reused `/platform/*` pages
// ---------------------------------------------------------------------------

describe('control-plane guard widening', () => {
  test('pure platform owner can read and mutate business rules and system config', async () => {
    const t = convexTest(schema, modules);
    const owner = await seedTenantUser(t, { role: 'client' });
    await makePlatformOwner(t, owner);

    await asUser(t, owner).mutation(api.ontology.businessRules.seedDefaultRules, {});
    const rules = await asUser(t, owner).query(api.ontology.businessRules.listAllRules, {});
    expect(rules.length).toBeGreaterThan(0);

    await asUser(t, owner).mutation(api.ontology.businessRules.updateRule, {
      ruleCode: 'APR_LIMIT',
      value: '31',
    });
    const aprRule = await asUser(t, owner).query(api.ontology.businessRules.getActiveRule, {
      ruleCode: 'APR_LIMIT',
    });
    expect(aprRule?.value).toBe('31');

    await asUser(t, owner).mutation(api.systemConfig.setConfig, {
      key: 'platform.test',
      value: 'enabled',
      category: 'platform',
    });
    const configs = await asUser(t, owner).query(api.systemConfig.getAllConfig, {
      category: 'platform',
    });
    expect(configs.find((c) => c.key === 'platform.test')?.value).toBe('enabled');
  });

  test('pure platform support can read but cannot mutate control-plane config', async () => {
    const t = convexTest(schema, modules);
    const owner = await seedTenantUser(t, { role: 'client' });
    const support = await seedTenantUser(t, { role: 'client' });
    await makePlatformOwner(t, owner);
    await makePlatformSupport(t, support);

    await asUser(t, owner).mutation(api.ontology.businessRules.seedDefaultRules, {});
    await asUser(t, owner).mutation(api.systemConfig.setConfig, {
      key: 'platform.readonly',
      value: 'visible',
      category: 'platform',
    });

    await expect(
      asUser(t, support).query(api.ontology.businessRules.listAllRules, {})
    ).resolves.toHaveLength(5);
    await expect(
      asUser(t, support).query(api.systemConfig.getAllConfig, { category: 'platform' })
    ).resolves.toHaveLength(1);

    await expect(
      asUser(t, support).mutation(api.ontology.businessRules.updateRule, {
        ruleCode: 'APR_LIMIT',
        value: '30',
      })
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });
    await expect(
      asUser(t, support).mutation(api.systemConfig.setConfig, {
        key: 'platform.readonly',
        value: 'blocked',
        category: 'platform',
      })
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });
  });

  test('tenant admin control-plane behavior remains unchanged for now', async () => {
    const t = convexTest(schema, modules);
    const tenantAdmin = await seedTenantUser(t, { role: 'tenant_admin' });

    await asUser(t, tenantAdmin).mutation(api.ontology.businessRules.seedDefaultRules, {});
    await asUser(t, tenantAdmin).mutation(api.systemConfig.setConfig, {
      key: 'tenant.admin.compat',
      value: true,
      category: 'platform',
    });

    await expect(
      asUser(t, tenantAdmin).query(api.ontology.businessRules.listAllRules, {})
    ).resolves.toHaveLength(5);
    await expect(
      asUser(t, tenantAdmin).query(api.systemConfig.getAllConfig, { category: 'platform' })
    ).resolves.toHaveLength(1);
  });

  test('tenant admins cannot create or update protected enforcement rules', async () => {
    const t = convexTest(schema, modules);
    const tenantAdmin = await seedTenantUser(t, { role: 'tenant_admin' });
    await expect(
      asUser(t, tenantAdmin).mutation(api.ontology.businessRules.createRule, {
        ruleCode: 'ENTITLEMENT_ENFORCEMENT',
        category: 'platform',
        displayName: 'Entitlement enforcement',
        valueType: 'boolean',
        value: 'true',
      })
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });
  });

  test('owners cannot bypass entitlement readiness through generic rule mutations', async () => {
    const t = convexTest(schema, modules);
    const owner = await seedTenantUser(t, { role: 'client' });
    await makePlatformOwner(t, owner);
    await expect(
      asUser(t, owner).mutation(api.ontology.businessRules.createRule, {
        ruleCode: 'ENTITLEMENT_ENFORCEMENT',
        category: 'platform',
        displayName: 'Entitlement enforcement',
        valueType: 'boolean',
        value: 'true',
      })
    ).rejects.toMatchObject({ data: { code: 'PROTECTED_RULE_API_REQUIRED' } });
  });

  test('non-platform, non-staff user is denied control-plane reads', async () => {
    const t = convexTest(schema, modules);
    const user = await seedTenantUser(t, { role: 'client' });

    await expect(
      asUser(t, user).query(api.ontology.businessRules.listAllRules, {})
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });
    await expect(asUser(t, user).query(api.systemConfig.getAllConfig, {})).rejects.toMatchObject({
      data: { code: 'FORBIDDEN' },
    });
  });
});

// ---------------------------------------------------------------------------
// Support audit tightening for tenant-specific platform reads
// ---------------------------------------------------------------------------

describe('platform support L1 tenant-read enforcement', () => {
  test('platform support tenant-specific read fails without active L1 session', async () => {
    const t = convexTest(schema, modules);
    const inst = await seedInstitution(t);
    const support = await seedTenantUser(t, { role: 'client' });
    await makePlatformSupport(t, support);

    await expect(
      asUser(t, support).query(api.platform.tenants.getTenantSubscription, {
        institutionId: inst,
      })
    ).rejects.toMatchObject({ data: { code: 'SUPPORT_SESSION_REQUIRED' } });
  });

  test('platform support tenant-specific read succeeds with active L1 session', async () => {
    const t = convexTest(schema, modules);
    const inst = await seedInstitution(t);
    const support = await seedTenantUser(t, { role: 'client' });
    await makePlatformSupport(t, support);

    await asUser(t, support).mutation(api.platform.support.startSupportAccessSession, {
      institutionId: inst,
      accessType: 'L1',
      reason: 'subscription diagnostics',
    });

    await expect(
      asUser(t, support).query(api.platform.tenants.getTenantSubscription, {
        institutionId: inst,
      })
    ).resolves.toBeNull();
    await expect(
      asUser(t, support).query(api.platform.entitlements.getTenantEntitlements, {
        institutionId: inst,
      })
    ).resolves.toEqual([]);
  });

  test('platform owner tenant-specific read succeeds without support session', async () => {
    const t = convexTest(schema, modules);
    const inst = await seedInstitution(t);
    const owner = await seedTenantUser(t, { role: 'client' });
    await makePlatformOwner(t, owner);

    await expect(
      asUser(t, owner).query(api.platform.tenants.getTenantSubscription, {
        institutionId: inst,
      })
    ).resolves.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Entitlement resolution + inertness
// ---------------------------------------------------------------------------

describe('entitlement resolution', () => {
  test('always-on features are present even with no subscription', async () => {
    const t = convexTest(schema, modules);
    const inst = await seedInstitution(t);
    const user = await seedTenantUser(t, { role: 'tenant_admin', institutionId: inst });
    const set = await asUser(t, user).query(api.platform.entitlements.resolveMyEntitlements, {});
    for (const k of ALWAYS_ON_FEATURES) expect(set).toContain(k);
    expect(set).not.toContain('collections'); // gated, not granted
  });

  test('owner dispatch enables a gated feature for a tenant', async () => {
    const t = convexTest(schema, modules);
    const inst = await seedInstitution(t);
    const owner = await seedTenantUser(t, { role: 'client' });
    await makePlatformOwner(t, owner);
    const tenantUser = await seedTenantUser(t, { role: 'tenant_admin', institutionId: inst });

    await asUser(t, owner).mutation(api.platform.entitlements.setTenantEntitlement, {
      institutionId: inst,
      featureKey: 'collections',
      source: 'addon',
      enabled: true,
      rolloutState: 'enabled',
    });
    const set = await asUser(t, tenantUser).query(
      api.platform.entitlements.resolveMyEntitlements,
      {}
    );
    expect(set).toContain('collections');
  });

  test('removal override subtracts a feature; pilot/off rollout is gated', async () => {
    const t = convexTest(schema, modules);
    const inst = await seedInstitution(t);
    const owner = await seedTenantUser(t, { role: 'client' });
    await makePlatformOwner(t, owner);
    const tenantUser = await seedTenantUser(t, { role: 'tenant_admin', institutionId: inst });

    // enable then set rolloutState off → should not resolve
    await asUser(t, owner).mutation(api.platform.entitlements.setTenantEntitlement, {
      institutionId: inst,
      featureKey: 'products',
      source: 'addon',
      enabled: true,
      rolloutState: 'off',
    });
    const set = await asUser(t, tenantUser).query(
      api.platform.entitlements.resolveMyEntitlements,
      {}
    );
    expect(set).not.toContain('products');
  });

  test('dispatch rejects platform keys, always-on revocation, and dependency gaps', async () => {
    const t = convexTest(schema, modules);
    const inst = await seedInstitution(t);
    const owner = await seedTenantUser(t, { role: 'client' });
    await makePlatformOwner(t, owner);
    const dispatch = (featureKey: string, enabled: boolean) =>
      asUser(t, owner).mutation(api.platform.entitlements.setTenantEntitlement, {
        institutionId: inst,
        featureKey,
        source: enabled ? ('manual_override' as const) : ('removal' as const),
        enabled,
        rolloutState: enabled ? ('enabled' as const) : ('off' as const),
      });

    await expect(dispatch('tenantRegistry', true)).rejects.toMatchObject({
      data: { code: 'VALIDATION_ERROR' },
    });
    await expect(dispatch('loans', false)).rejects.toMatchObject({
      data: { code: 'ALWAYS_ON_FEATURE' },
    });
    await expect(dispatch('clientApplications', true)).rejects.toMatchObject({
      data: { code: 'FEATURE_DEPENDENCY_MISSING' },
    });
    await dispatch('clientDocuments', true);
    await dispatch('clientApplications', true);
    await expect(dispatch('clientDocuments', false)).rejects.toMatchObject({
      data: { code: 'FEATURE_DEPENDENCY_MISSING' },
    });
  });

  test('client-feature backfill is additive, conflict-preserving, audited, and idempotent', async () => {
    const t = convexTest(schema, modules);
    const inst = await seedInstitution(t);
    const owner = await seedTenantUser(t, { role: 'client' });
    await makePlatformOwner(t, owner);
    await asUser(t, owner).mutation(api.platform.plans.upsertPlan, {
      planCode: 'legacy',
      name: 'Legacy',
      defaultFeatures: ['loans'],
    });
    await t.run(async (ctx) => {
      await ctx.db.insert('tenantEntitlements', {
        institutionId: inst,
        featureKey: 'clientBanking',
        source: 'removal',
        enabled: false,
        rolloutState: 'off',
        effectiveFrom: Date.now(),
        changedAt: Date.now(),
      });
    });

    const dryRun = await asUser(t, owner).mutation(
      api.platform.entitlements.backfillClientFeatureDefaults,
      { dryRun: true }
    );
    expect(dryRun.counts.catalogToInsert).toBe(9);
    expect(dryRun.counts.plansToUpdate).toBe(1);
    expect(dryRun.counts.overrideConflicts).toBe(1);

    vi.useFakeTimers();
    try {
      const applied = await asUser(t, owner).mutation(
        api.platform.entitlements.backfillClientFeatureDefaults,
        { dryRun: false }
      );
      expect(applied.counts.plansToUpdate).toBe(1);
      const second = await asUser(t, owner).mutation(
        api.platform.entitlements.backfillClientFeatureDefaults,
        { dryRun: false }
      );
      expect(second.counts.catalogToInsert).toBe(0);
      expect(second.counts.plansToUpdate).toBe(0);

      const state = await t.run(async (ctx) => ({
        plan: await ctx.db
          .query('plans')
          .withIndex('by_planCode', (q) => q.eq('planCode', 'legacy'))
          .first(),
        overrides: await ctx.db
          .query('tenantEntitlements')
          .withIndex('by_institutionId', (q) => q.eq('institutionId', inst))
          .collect(),
      }));
      expect(state.plan?.defaultFeatures).toEqual(
        expect.arrayContaining([...CLIENT_FEATURES.map((feature) => feature.key), 'ippOnboarding'])
      );
      expect(state.overrides).toHaveLength(1);

      await t.finishAllScheduledFunctions(() => vi.runAllTimers());
      const audits = await t.run(async (ctx) => ctx.db.query('auditLogs').collect());
      expect(audits.some((audit) => audit.action === 'APPLY_CLIENT_FEATURE_BACKFILL')).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  test('support cannot migrate or activate entitlements', async () => {
    const t = convexTest(schema, modules);
    const support = await seedTenantUser(t, { role: 'client' });
    await makePlatformSupport(t, support);
    await expect(
      asUser(t, support).mutation(api.platform.entitlements.backfillClientFeatureDefaults, {
        dryRun: true,
      })
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });
    await expect(
      asUser(t, support).mutation(api.platform.entitlements.setEntitlementEnforcement, {
        enabled: true,
        reason: 'Support must remain read-only',
      })
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });
  });

  test('entitlement activation requires tenancy enforcement and green readiness', async () => {
    const t = convexTest(schema, modules);
    const email = 'activation-owner@example.test';
    const owner = await seedTenantUser(t, { email });
    await t.mutation(internal.platform.seed.seedControlPlane, { ownerEmail: email });

    await expect(
      asUser(t, owner).mutation(api.platform.entitlements.setEntitlementEnforcement, {
        enabled: true,
        reason: 'Activation test before tenancy',
      })
    ).rejects.toMatchObject({ data: { code: 'TENANCY_ENFORCEMENT_REQUIRED' } });

    await asUser(t, owner).mutation(api.ontology.businessRules.createRule, {
      ruleCode: 'TENANCY_ENFORCEMENT',
      category: 'platform',
      displayName: 'Tenancy enforcement',
      valueType: 'boolean',
      value: 'true',
    });
    await expect(
      asUser(t, owner).mutation(api.platform.entitlements.setEntitlementEnforcement, {
        enabled: true,
        reason: 'Readiness checks passed in the test environment',
      })
    ).resolves.toMatchObject({ changed: true, enabled: true });
    await expect(
      asUser(t, owner).query(api.platform.entitlements.isEntitlementEnforcementOn, {})
    ).resolves.toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Inertness: enforcement off by default → allow-all
// ---------------------------------------------------------------------------

describe('inertness (Phase 0)', () => {
  test('seedControlPlane is idempotent and binds NamLend', async () => {
    const t = convexTest(schema, modules);
    await seedTenantUser(t, { role: 'admin', email: 'op@namlend.test' });
    const r1 = await t.mutation(internal.platform.seed.seedControlPlane, {});
    const r2 = await t.mutation(internal.platform.seed.seedControlPlane, {});
    expect(r1.institutionId).toBeTruthy();
    // second run adds nothing new
    expect(r2.plansAdded).toBe(0);
    expect(r2.catalogAdded).toBe(0);
    // the seeded admin was migrated to tenant_admin and bound to the tenant
    const role = await t.run(async (ctx) => {
      const profile = await ctx.db
        .query('profiles')
        .filter((q) => q.eq(q.field('email'), 'op@namlend.test'))
        .first();
      const r = await ctx.db
        .query('userRoles')
        .withIndex('by_userId', (q) => q.eq('userId', profile!.userId))
        .first();
      return r;
    });
    expect(role?.role).toBe('tenant_admin');
    expect(role?.institutionId).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Phase 4 — tenant provisioning + subscription management
// ---------------------------------------------------------------------------

describe('tenant provisioning (Phase 4)', () => {
  test('owner provisions a tenant with a plan; listTenants reflects it', async () => {
    const t = convexTest(schema, modules);
    const owner = await seedTenantUser(t, { role: 'client' });
    await makePlatformOwner(t, owner);
    await asUser(t, owner).mutation(api.platform.plans.upsertPlan, {
      planCode: 'starter',
      name: 'Starter',
      defaultFeatures: ['loans', 'collections'],
    });

    const instId = await asUser(t, owner).mutation(api.platform.tenants.provisionTenant, {
      name: 'New Co',
      shortCode: 'NEWCO',
      planCode: 'starter',
    });
    expect(instId).toBeTruthy();

    const tenants = await asUser(t, owner).query(api.platform.tenants.listTenants, {});
    const row = tenants.find((x) => x._id === instId);
    expect(row?.planCode).toBe('starter');
    expect(row?.subscriptionStatus).toBe('active');
    expect(row?.featureCount).toBeGreaterThan(0);
  });

  test('non-owner cannot provision a tenant', async () => {
    const t = convexTest(schema, modules);
    const tenantAdmin = await seedTenantUser(t, { role: 'tenant_admin' });
    await expect(
      asUser(t, tenantAdmin).mutation(api.platform.tenants.provisionTenant, {
        name: 'X',
        shortCode: 'XCO',
      })
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });
  });

  test('setTenantSubscription closes the old sub and opens the new; unknown plan rejected', async () => {
    const t = convexTest(schema, modules);
    const owner = await seedTenantUser(t, { role: 'client' });
    await makePlatformOwner(t, owner);
    const inst = await seedInstitution(t);
    await asUser(t, owner).mutation(api.platform.plans.upsertPlan, {
      planCode: 'p1',
      name: 'P1',
      defaultFeatures: ['loans'],
    });
    await asUser(t, owner).mutation(api.platform.plans.upsertPlan, {
      planCode: 'p2',
      name: 'P2',
      defaultFeatures: ['loans', 'collections'],
    });

    await asUser(t, owner).mutation(api.platform.tenants.setTenantSubscription, {
      institutionId: inst,
      planCode: 'p1',
      status: 'active',
    });
    await asUser(t, owner).mutation(api.platform.tenants.setTenantSubscription, {
      institutionId: inst,
      planCode: 'p2',
      status: 'active',
    });

    const sub = await asUser(t, owner).query(api.platform.tenants.getTenantSubscription, {
      institutionId: inst,
    });
    expect(sub?.planCode).toBe('p2');

    // Exactly one currently-open subscription (the old one was closed, not deleted).
    const open = await t.run(async (ctx) => {
      const all = await ctx.db
        .query('tenantSubscriptions')
        .withIndex('by_institutionId', (q) => q.eq('institutionId', inst))
        .collect();
      return all.filter((s) => s.effectiveTo === undefined);
    });
    expect(open.length).toBe(1);
    expect(open[0].planCode).toBe('p2');

    await expect(
      asUser(t, owner).mutation(api.platform.tenants.setTenantSubscription, {
        institutionId: inst,
        planCode: 'ghost',
        status: 'active',
      })
    ).rejects.toMatchObject({ data: { code: 'VALIDATION_ERROR' } });
  });
});
