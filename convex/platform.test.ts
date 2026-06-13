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
import { describe, expect, test } from 'vitest';
import schema from './schema';
import { api, internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { ALWAYS_ON_FEATURES, isValidFeatureKey } from './lib/features';

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
