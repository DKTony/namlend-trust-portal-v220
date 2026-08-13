import { convexTest } from 'convex-test';
import { describe, expect, test } from 'vitest';
import { api } from './_generated/api';
import type { Id } from './_generated/dataModel';
import schema from './schema';

const modules = import.meta.glob('./**/*.*s');
type TestCtx = ReturnType<typeof convexTest>;

function asUser(t: TestCtx, userId: Id<'users'>) {
  return t.withIdentity({ subject: `${userId}|testsession` });
}

async function seedTenantUser(
  t: TestCtx,
  code: string,
  role: 'client' | 'loan_officer' | 'admin' | 'tenant_admin' = 'tenant_admin'
) {
  return t.run(async (ctx) => {
    const now = Date.now();
    const institutionId = await ctx.db.insert('institutions', {
      name: code,
      shortCode: code,
      type: 'lender',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });
    const userId = await ctx.db.insert('users', {});
    await ctx.db.insert('profiles', {
      userId,
      institutionId,
      email: `${code.toLowerCase()}@example.test`,
      kycStatus: 'verified',
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert('userRoles', { userId, institutionId, role, createdAt: now });
    return { institutionId, userId };
  });
}

function branding(companyName: string) {
  return {
    general: {
      company_name: companyName,
      company_tagline: 'Tenant lending',
      support_email: 'support@example.test',
      support_phone: '+264 61 000 0000',
    },
    colors: {
      primary_color: '#3F713E',
      secondary_color: '#7CA05C',
      accent_color: '#274F35',
      use_custom_colors: true,
    },
    assets: {
      logoStorageId: null,
      faviconStorageId: null,
      logo_width: 220,
      logo_height: 72,
      show_company_name_with_logo: true,
    },
    meta: {
      page_title_template: '{company_name} - {page_name}',
      meta_description: `${companyName} lending portal`,
      og_image_url: '/og-financial-social-v2.png',
    },
  };
}

describe('tenant white-label branding', () => {
  test('isolates configuration by institution and retains OG-compatible defaults', async () => {
    const t = convexTest(schema, modules);
    const tenantA = await seedTenantUser(t, 'TENANT_A');
    const tenantB = await seedTenantUser(t, 'TENANT_B');

    await asUser(t, tenantA.userId).mutation(
      api.systemConfig.saveTenantBranding,
      branding('Tenant A Finance')
    );
    await asUser(t, tenantB.userId).mutation(
      api.systemConfig.saveTenantBranding,
      branding('Tenant B Credit')
    );

    const [configA, configB] = await Promise.all([
      asUser(t, tenantA.userId).query(api.systemConfig.getTenantBranding, {}),
      asUser(t, tenantB.userId).query(api.systemConfig.getTenantBranding, {}),
    ]);
    expect(configA?.config.general).toMatchObject({ company_name: 'Tenant A Finance' });
    expect(configB?.config.general).toMatchObject({ company_name: 'Tenant B Credit' });
    expect(configA?.institutionId).toBe(tenantA.institutionId);
    expect(configB?.institutionId).toBe(tenantB.institutionId);

    const rows = await t.run(async (ctx) => ctx.db.query('institutionConfig').collect());
    expect(rows.map((row) => row.institutionId)).toEqual(
      expect.arrayContaining([tenantA.institutionId, tenantB.institutionId])
    );
  });

  test('allows only tenant admins to save and validates approved fields', async () => {
    const t = convexTest(schema, modules);
    const officer = await seedTenantUser(t, 'OFFICER', 'loan_officer');
    await expect(
      asUser(t, officer.userId).mutation(
        api.systemConfig.saveTenantBranding,
        branding('Officer Override')
      )
    ).rejects.toThrow();

    const admin = await seedTenantUser(t, 'ADMIN');
    const invalid = branding('Admin Brand');
    invalid.colors.primary_color = 'javascript:alert(1)';
    await expect(
      asUser(t, admin.userId).mutation(api.systemConfig.saveTenantBranding, invalid)
    ).rejects.toMatchObject({ data: { code: 'VALIDATION_ERROR' } });
  });

  test('denies an unentitled tenant when enforcement is active', async () => {
    const t = convexTest(schema, modules);
    const tenant = await seedTenantUser(t, 'UNENTITLED');
    await t.run(async (ctx) => {
      const now = Date.now();
      await ctx.db.insert('businessRules', {
        ruleCode: 'ENTITLEMENT_ENFORCEMENT',
        category: 'platform',
        displayName: 'Entitlement enforcement',
        valueType: 'boolean',
        value: 'true',
        version: 1,
        effectiveFrom: now,
        createdAt: now,
      });
    });

    await expect(
      asUser(t, tenant.userId).query(api.systemConfig.getTenantBranding, {})
    ).rejects.toMatchObject({ data: { code: 'FEATURE_NOT_ENABLED' } });
    await expect(
      asUser(t, tenant.userId).mutation(
        api.systemConfig.saveTenantBranding,
        branding('Not Allowed')
      )
    ).rejects.toMatchObject({ data: { code: 'FEATURE_NOT_ENABLED' } });
  });

  test('never exposes legacy global branding through the public config query', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const now = Date.now();
      await ctx.db.insert('systemConfiguration', {
        key: 'branding.company_name',
        value: 'Legacy Global Brand',
        category: 'branding',
        isPublic: true,
        effectiveFrom: now,
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert('systemConfiguration', {
        key: 'currency_code',
        value: 'NAD',
        category: 'regulatory',
        isPublic: true,
        effectiveFrom: now,
        createdAt: now,
        updatedAt: now,
      });
    });

    const publicRows = await t.query(api.systemConfig.getPublicConfig, {});
    expect(publicRows.map((row) => row.key)).toEqual(['currency_code']);
  });
});
