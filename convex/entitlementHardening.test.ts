import { convexTest } from 'convex-test';
import { describe, expect, test, vi } from 'vitest';
import { api, internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { resolveEntitlements } from './lib/entitlements';
import schema from './schema';

const modules = import.meta.glob('./**/*.*s');
type TestCtx = ReturnType<typeof convexTest>;

function asUser(t: TestCtx, userId: Id<'users'>) {
  return t.withIdentity({ subject: `${userId}|testsession` });
}

async function seedInstitution(
  t: TestCtx,
  shortCode: string,
  type: 'lender' | 'regulator' = 'lender'
): Promise<Id<'institutions'>> {
  return t.run((ctx) =>
    ctx.db.insert('institutions', {
      name: shortCode,
      shortCode,
      type,
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  );
}

async function seedUser(
  t: TestCtx,
  options: {
    role?: 'client' | 'loan_officer' | 'admin' | 'tenant_admin';
    institutionId?: Id<'institutions'>;
    platformOwner?: boolean;
  } = {}
): Promise<Id<'users'>> {
  return t.run(async (ctx) => {
    const userId = await ctx.db.insert('users', {});
    await ctx.db.insert('profiles', {
      userId,
      institutionId: options.institutionId,
      email: `${userId}@example.test`,
      kycStatus: 'verified',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    if (options.role) {
      await ctx.db.insert('userRoles', {
        userId,
        role: options.role,
        institutionId: options.institutionId,
        createdAt: Date.now(),
      });
    }
    if (options.platformOwner) {
      await ctx.db.insert('platformAdmins', {
        userId,
        platformRole: 'platform_owner',
        status: 'active',
        createdAt: Date.now(),
      });
    }
    return userId;
  });
}

async function enableEnforcement(t: TestCtx) {
  await t.run((ctx) =>
    ctx.db.insert('businessRules', {
      ruleCode: 'ENTITLEMENT_ENFORCEMENT',
      category: 'platform',
      displayName: 'Entitlement enforcement',
      valueType: 'boolean',
      value: 'true',
      effectiveFrom: Date.now(),
      version: 1,
      createdAt: Date.now(),
    })
  );
}

async function grantFeature(t: TestCtx, institutionId: Id<'institutions'>, featureKey: string) {
  await t.run((ctx) =>
    ctx.db.insert('tenantEntitlements', {
      institutionId,
      featureKey,
      source: 'addon',
      enabled: true,
      rolloutState: 'enabled',
      effectiveFrom: Date.now(),
      changedAt: Date.now(),
    })
  );
}

describe('entitlement resolution hardening', () => {
  test('manual decisions deterministically outrank add-ons and legacy core revocations', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-13T08:00:00.000Z'));
    try {
      const t = convexTest(schema, modules);
      const institutionId = await seedInstitution(t, 'PRECEDENCE');
      const tenantUser = await seedUser(t, { role: 'tenant_admin', institutionId });
      const now = Date.now();

      await t.run(async (ctx) => {
        await ctx.db.insert('tenantEntitlements', {
          institutionId,
          featureKey: 'products',
          source: 'removal',
          enabled: false,
          rolloutState: 'off',
          effectiveFrom: now - 200,
          changedAt: now - 200,
        });
        await ctx.db.insert('tenantEntitlements', {
          institutionId,
          featureKey: 'products',
          source: 'addon',
          enabled: true,
          rolloutState: 'enabled',
          effectiveFrom: now - 100,
          changedAt: now - 100,
        });
        await ctx.db.insert('tenantEntitlements', {
          institutionId,
          featureKey: 'loans',
          source: 'removal',
          enabled: false,
          rolloutState: 'off',
          effectiveFrom: now - 50,
          changedAt: now - 50,
        });
      });

      const removed = await asUser(t, tenantUser).query(
        api.platform.entitlements.resolveMyEntitlements,
        {}
      );
      expect(removed).not.toContain('products');
      expect(removed).toContain('loans');

      await t.run((ctx) =>
        ctx.db.insert('tenantEntitlements', {
          institutionId,
          featureKey: 'products',
          source: 'manual_override',
          enabled: true,
          rolloutState: 'enabled',
          effectiveFrom: now - 25,
          changedAt: now - 25,
        })
      );
      const restored = await asUser(t, tenantUser).query(
        api.platform.entitlements.resolveMyEntitlements,
        {}
      );
      expect(restored).toContain('products');
    } finally {
      vi.useRealTimers();
    }
  });

  test('owner dispatch rejects a dependent feature that outlives its dependency', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-13T08:00:00.000Z'));
    try {
      const t = convexTest(schema, modules);
      const institutionId = await seedInstitution(t, 'TIMELINE');
      const owner = await seedUser(t, { platformOwner: true });
      const now = Date.now();

      await asUser(t, owner).mutation(api.platform.entitlements.setTenantEntitlement, {
        institutionId,
        featureKey: 'ippOnboarding',
        source: 'manual_override',
        enabled: true,
        rolloutState: 'enabled',
        effectiveTo: now + 1_000,
      });
      await expect(
        asUser(t, owner).mutation(api.platform.entitlements.setTenantEntitlement, {
          institutionId,
          featureKey: 'clientBanking',
          source: 'manual_override',
          enabled: true,
          rolloutState: 'enabled',
          effectiveTo: now + 2_000,
        })
      ).rejects.toMatchObject({ data: { code: 'FEATURE_DEPENDENCY_MISSING' } });
      await expect(
        asUser(t, owner).mutation(api.platform.entitlements.setTenantEntitlement, {
          institutionId,
          featureKey: 'clientBanking',
          source: 'manual_override',
          enabled: true,
          rolloutState: 'enabled',
          effectiveTo: now + 500,
        })
      ).resolves.toBeDefined();
    } finally {
      vi.useRealTimers();
    }
  });

  test('readiness excludes active regulator institutions from commercial subscription checks', async () => {
    const t = convexTest(schema, modules);
    await seedInstitution(t, 'BON', 'regulator');
    const owner = await seedUser(t, { platformOwner: true });

    const readiness = await asUser(t, owner).query(api.platform.readiness.getEnforcementReadiness, {
      includeSamples: true,
    });
    expect(readiness.counts.activeTenants).toBe(0);
    expect(readiness.counts.tenantsWithoutActiveSubscription).toBe(0);
    expect(readiness.tenantsWithoutActiveSubscription).toEqual([]);
  });

  test('readiness reports legacy attempts to revoke always-on features', async () => {
    const t = convexTest(schema, modules);
    const institutionId = await seedInstitution(t, 'LEGACY_CORE_REVOKE');
    const owner = await seedUser(t, { platformOwner: true });
    await t.run((ctx) =>
      ctx.db.insert('tenantEntitlements', {
        institutionId,
        featureKey: 'loans',
        source: 'removal',
        enabled: false,
        rolloutState: 'off',
        effectiveFrom: Date.now(),
        changedAt: Date.now(),
      })
    );

    const readiness = await asUser(t, owner).query(api.platform.readiness.getEnforcementReadiness, {
      includeSamples: true,
    });
    expect(readiness.counts.alwaysOnRevocations).toBe(1);
    expect(readiness.alwaysOnRevocations).toEqual([
      expect.objectContaining({ institutionId, featureKey: 'loans' }),
    ]);
    expect(readiness.readyForEntitlements).toBe(false);
  });
});

describe('gated write and tenant-boundary hardening', () => {
  test('all saved-VPA mutations require IPP plus the client Banking feature', async () => {
    const t = convexTest(schema, modules);
    const institutionId = await seedInstitution(t, 'VPA');
    const client = await seedUser(t, { role: 'client', institutionId });
    await enableEnforcement(t);

    const upsert = () =>
      asUser(t, client).mutation(api.ips.ipsVpa.upsertVpa, {
        vpaAddress: 'client@ogfs',
        setDefault: true,
      });
    await expect(upsert()).rejects.toMatchObject({ data: { code: 'FEATURE_NOT_ENABLED' } });
    await grantFeature(t, institutionId, 'ippOnboarding');
    await expect(upsert()).rejects.toMatchObject({ data: { code: 'FEATURE_NOT_ENABLED' } });
    await grantFeature(t, institutionId, 'clientBanking');
    const saved = await upsert();

    await t.run((ctx) =>
      ctx.db.insert('tenantEntitlements', {
        institutionId,
        featureKey: 'clientBanking',
        source: 'removal',
        enabled: false,
        rolloutState: 'off',
        effectiveFrom: Date.now(),
        changedAt: Date.now(),
      })
    );
    await expect(
      asUser(t, client).mutation(api.ips.ipsVpa.setDefaultVpa, {
        vpaId: saved.vpa_id,
        source: 'legacy_registry',
      })
    ).rejects.toMatchObject({ data: { code: 'FEATURE_NOT_ENABLED' } });
    await expect(
      asUser(t, client).mutation(api.ips.ipsVpa.deleteVpa, {
        vpaId: saved.vpa_id,
        source: 'legacy_registry',
      })
    ).rejects.toMatchObject({ data: { code: 'FEATURE_NOT_ENABLED' } });
  });

  test('collections review paths are gated and staff cannot act across tenants', async () => {
    const t = convexTest(schema, modules);
    const institutionA = await seedInstitution(t, 'COLL_A');
    const institutionB = await seedInstitution(t, 'COLL_B');
    const clientA = await seedUser(t, { role: 'client', institutionId: institutionA });
    const staffA = await seedUser(t, { role: 'tenant_admin', institutionId: institutionA });
    const staffB = await seedUser(t, { role: 'tenant_admin', institutionId: institutionB });
    const { loanId, requestId } = await t.run(async (ctx) => {
      const now = Date.now();
      const loanId = await ctx.db.insert('loans', {
        userId: clientA,
        institutionId: institutionA,
        principal: 1_000,
        interestRate: 20,
        termMonths: 6,
        status: 'active',
        outstandingBalance: 1_000,
        totalPaid: 0,
        createdAt: now,
        updatedAt: now,
      });
      const requestId = await ctx.db.insert('rescheduleRequests', {
        institutionId: institutionA,
        userId: clientA,
        loanId,
        originalDueDate: '2026-08-30',
        requestedDate: '2026-09-15',
        reason: 'Cash-flow interruption',
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      });
      return { loanId, requestId };
    });
    await enableEnforcement(t);

    await expect(
      asUser(t, staffA).query(api.collections.listRescheduleRequests, {})
    ).rejects.toMatchObject({ data: { code: 'FEATURE_NOT_ENABLED' } });
    await grantFeature(t, institutionA, 'collections');
    await grantFeature(t, institutionB, 'collections');
    await expect(
      asUser(t, staffA).query(api.collections.listRescheduleRequests, {})
    ).resolves.toHaveLength(1);

    await expect(
      asUser(t, staffB).mutation(api.collections.requestReschedule, {
        loanId,
        originalDueDate: '2026-08-30',
        requestedDate: '2026-09-30',
        reason: 'Cross-tenant attempt',
      })
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });
    await expect(
      asUser(t, staffB).mutation(api.collections.reviewRescheduleRequest, {
        requestId,
        decision: 'approved',
      })
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });
  });

  test('the product seeder is entitlement-gated like other product mutations', async () => {
    const t = convexTest(schema, modules);
    const institutionId = await seedInstitution(t, 'PRODUCT_SEED');
    const admin = await seedUser(t, { role: 'tenant_admin', institutionId });
    await enableEnforcement(t);

    await expect(
      asUser(t, admin).mutation(api.ontology.products.seedPersonalLoan, { institutionId })
    ).rejects.toMatchObject({ data: { code: 'FEATURE_NOT_ENABLED' } });
    await grantFeature(t, institutionId, 'products');
    await expect(
      asUser(t, admin).mutation(api.ontology.products.seedPersonalLoan, { institutionId })
    ).resolves.toMatchObject({ alreadyExists: false });
  });

  test('product mutations cannot target another tenant', async () => {
    const t = convexTest(schema, modules);
    const institutionA = await seedInstitution(t, 'PRODUCT_A');
    const institutionB = await seedInstitution(t, 'PRODUCT_B');
    const adminA = await seedUser(t, { role: 'tenant_admin', institutionId: institutionA });
    await enableEnforcement(t);
    await grantFeature(t, institutionA, 'products');

    await expect(
      asUser(t, adminA).mutation(api.ontology.products.createProduct, {
        productCode: 'cross_tenant_product',
        name: 'Cross-tenant product',
        category: 'loan',
        institutionId: institutionB,
      })
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });
    await expect(
      asUser(t, adminA).mutation(api.ontology.products.seedPersonalLoan, {
        institutionId: institutionB,
      })
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });
  });
});

describe('control-plane audit attribution', () => {
  test('business-rule create and update audits retain the actor userId', async () => {
    vi.useFakeTimers();
    try {
      const t = convexTest(schema, modules);
      const owner = await seedUser(t, { platformOwner: true });
      await asUser(t, owner).mutation(api.ontology.businessRules.createRule, {
        ruleCode: 'AUDIT_ATTRIBUTION_TEST',
        category: 'platform',
        displayName: 'Audit attribution',
        valueType: 'boolean',
        value: 'false',
      });
      await asUser(t, owner).mutation(api.ontology.businessRules.updateRule, {
        ruleCode: 'AUDIT_ATTRIBUTION_TEST',
        value: 'true',
      });

      await t.finishAllScheduledFunctions(() => vi.runAllTimers());
      const audits = await t.run((ctx) =>
        ctx.db
          .query('auditLogs')
          .filter((q) => q.eq(q.field('entityType'), 'businessRules'))
          .collect()
      );
      expect(audits.map((audit) => audit.action)).toEqual(
        expect.arrayContaining(['CREATE_RULE', 'UPDATE_RULE'])
      );
      expect(audits.every((audit) => audit.userId === owner)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('disposable preview fixture', () => {
  test('enables both protected gates only through the internal preview seed helper', async () => {
    const t = convexTest(schema, modules);

    await t.mutation(internal.seedMutations.enableDisposableE2EEnforcement, {});

    const rules = await t.run((ctx) =>
      ctx.db
        .query('businessRules')
        .filter((q) =>
          q.or(
            q.eq(q.field('ruleCode'), 'TENANCY_ENFORCEMENT'),
            q.eq(q.field('ruleCode'), 'ENTITLEMENT_ENFORCEMENT')
          )
        )
        .collect()
    );
    expect(rules).toHaveLength(2);
    expect(rules.every((rule) => rule.valueType === 'boolean' && rule.value === 'true')).toBe(true);
    expect(rules.every((rule) => /Disposable Convex preview/.test(rule.description ?? ''))).toBe(
      true
    );
  });

  test('all_features plus enforcement keeps OG entitled for gated E2E surfaces', async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.platform.seed.migrateOgFinancialServices, {});
    await t.mutation(internal.platform.seed.seedControlPlane, {});
    await t.mutation(internal.seedMutations.enableDisposableE2EEnforcement, {});

    const proof = await t.query(internal.seedMutations.assertDisposablePreviewEntitlements, {});
    expect(proof.hasClientBanking).toBe(true);
    expect(proof.hasIppOnboarding).toBe(true);

    const keys = await t.run(async (ctx) => {
      const og = await ctx.db
        .query('institutions')
        .withIndex('by_shortCode', (q) => q.eq('shortCode', 'OGFS'))
        .first();
      if (!og) throw new Error('OG tenant missing');
      return [...(await resolveEntitlements(ctx, og._id))];
    });

    expect(keys).toEqual(
      expect.arrayContaining([
        'clientBudget',
        'clientDocuments',
        'clientBanking',
        'collections',
        'ippOnboarding',
        'advancedAnalytics',
        'whiteLabelBranding',
        'creditPolicy',
        'products',
        'mandates',
        'popiaConsent',
        'workflows',
      ])
    );
  });
});
