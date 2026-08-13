/**
 * Phase 0 control-plane seed — idempotent, inert.
 *
 * Establishes OG Financial Services as tenant #1 on an all-features plan so production behavior is
 * IDENTICAL after Phase 0: nothing is gated, nothing is removed. Safe to re-run.
 *
 * Run (dev/prod): npx convex run platform/seed:seedControlPlane '{"ownerEmail":"you@example.com"}'
 */

import { v } from 'convex/values';
import { internalMutation } from '../_generated/server';
import { scheduleAuditEntry } from '../lib/audit';
import {
  ALWAYS_ON_FEATURES,
  CLIENT_FEATURES,
  FEATURES,
  getFeatureCatalogMetadata,
  TENANT_GRANTABLE_FEATURES,
  withFeatureDependencyClosure,
} from '../lib/features';

const OG_CODE = 'OGFS';
const LEGACY_CODE = 'NAMLEND';
const OG_PROFILE = {
  name: 'OG Financial Services',
  legalName: 'OG Financial Services CC',
  shortCode: OG_CODE,
  registrationNumber: 'CC/2025/12791',
  regulatoryLicense: '25/11/2366',
  taxIdentificationNumber: '15848714',
  taxType: 'ITX 15848714-011',
  principalOfficer: 'Ornesto Ordiene Goagoseb',
  contactPhone: '+264 81 417 4288',
  contactEmail: 'finance@mgholdingsptyltd.com',
  website: 'https://www.mgholdingsptyltd.com',
  licensedAddress: '791 Crater Street, Windhoek, Namibia',
  contactAddress:
    'Go Works Properties, Block C (Units 62-64), Maerua Mall, Centaurus Road, Windhoek, Namibia',
  regulatoryEffectiveAt: Date.UTC(2026, 3, 20),
  regulatoryExpiresAt: Date.UTC(2027, 3, 19),
  taxEffectiveAt: Date.UTC(2025, 10, 6),
  taxIssuedAt: Date.UTC(2025, 11, 17),
} as const;

async function ensureOgTenant(ctx: any, now: number) {
  let institution = await ctx.db
    .query('institutions')
    .withIndex('by_shortCode', (q: any) => q.eq('shortCode', OG_CODE))
    .first();
  if (!institution) {
    institution = await ctx.db
      .query('institutions')
      .withIndex('by_shortCode', (q: any) => q.eq('shortCode', LEGACY_CODE))
      .first();
  }
  if (institution) {
    await ctx.db.patch(institution._id, {
      ...OG_PROFILE,
      address: OG_PROFILE.licensedAddress,
      metadata: {
        ...(institution.metadata ?? {}),
        jurisdiction: 'Namibia',
        previousShortCode: institution.shortCode === LEGACY_CODE ? LEGACY_CODE : undefined,
      },
      updatedAt: now,
    });
    return institution._id;
  }
  return ctx.db.insert('institutions', {
    ...OG_PROFILE,
    type: 'lender',
    status: 'active',
    address: OG_PROFILE.licensedAddress,
    metadata: { jurisdiction: 'Namibia', seededBy: 'platform/seed' },
    createdAt: now,
    updatedAt: now,
  });
}

const CLIENT_FEATURE_KEYS = CLIENT_FEATURES.map((feature) => feature.key);
const ALL_TENANT_FEATURES = TENANT_GRANTABLE_FEATURES.map((feature) => feature.key);

/** Plan catalog seeded at Phase 0. OG Financial Services uses `all_features`. */
const PLAN_DEFS: Array<{ planCode: string; name: string; features: string[] }> = [
  { planCode: 'all_features', name: 'All Features (internal)', features: ALL_TENANT_FEATURES },
  {
    planCode: 'starter',
    name: 'Starter',
    features: withFeatureDependencyClosure([...ALWAYS_ON_FEATURES, ...CLIENT_FEATURE_KEYS]),
  },
  {
    planCode: 'pro',
    name: 'Pro',
    features: withFeatureDependencyClosure([
      ...ALWAYS_ON_FEATURES,
      ...CLIENT_FEATURE_KEYS,
      'collections',
      'products',
      'advancedAnalytics',
      'creditPolicy',
    ]),
  },
  { planCode: 'enterprise', name: 'Enterprise', features: ALL_TENANT_FEATURES },
];

export const seedControlPlane = internalMutation({
  args: { ownerEmail: v.optional(v.string()), backofficeEmail: v.optional(v.string()) },
  handler: async (ctx, { ownerEmail, backofficeEmail }) => {
    const now = Date.now();
    const report: Record<string, unknown> = {};

    // 1. Ensure OG Financial Services institution (tenant #1), upgrading the legacy row in place.
    const institutionId = await ensureOgTenant(ctx, now);
    report.institutionId = institutionId;

    // 2. Seed featuresCatalog from the code manifest (authority = code).
    let catalogAdded = 0;
    for (const f of FEATURES) {
      const existing = await ctx.db
        .query('featuresCatalog')
        .withIndex('by_featureKey', (q) => q.eq('featureKey', f.key))
        .first();
      if (existing) continue;
      await ctx.db.insert('featuresCatalog', {
        featureKey: f.key,
        name: f.name,
        category: f.category,
        console: f.console,
        metadata: getFeatureCatalogMetadata(f),
        createdAt: now,
        updatedAt: now,
      });
      catalogAdded++;
    }
    report.catalogAdded = catalogAdded;

    // 3. Seed plans. Always keep defaultFeatures in sync with the code manifest so a
    //    re-seed cannot leave OG on a stale catalogue (missing clientBanking, etc.).
    let plansAdded = 0;
    let plansUpdated = 0;
    for (const p of PLAN_DEFS) {
      const existing = await ctx.db
        .query('plans')
        .withIndex('by_planCode', (q) => q.eq('planCode', p.planCode))
        .first();
      if (existing) {
        const sameFeatures =
          existing.status === 'active' &&
          existing.defaultFeatures.length === p.features.length &&
          p.features.every((key) => existing.defaultFeatures.includes(key));
        if (!sameFeatures) {
          await ctx.db.patch(existing._id, {
            name: p.name,
            status: 'active',
            defaultFeatures: p.features,
          });
          plansUpdated++;
        }
        continue;
      }
      await ctx.db.insert('plans', {
        planCode: p.planCode,
        name: p.name,
        status: 'active',
        defaultFeatures: p.features,
        effectiveFrom: now,
      });
      plansAdded++;
    }
    report.plansAdded = plansAdded;
    report.plansUpdated = plansUpdated;

    // 4. Seed platform guardrails (mirror existing global constants).
    const guardrails: Array<{ code: string; valueType: 'number'; value: string }> = [
      { code: 'APR_CAP', valueType: 'number', value: '32' },
      { code: 'RETENTION_YEARS', valueType: 'number', value: '7' },
    ];
    let guardrailsAdded = 0;
    for (const g of guardrails) {
      const existing = await ctx.db
        .query('platformGuardrails')
        .withIndex('by_code', (q) => q.eq('code', g.code))
        .first();
      if (existing) continue;
      await ctx.db.insert('platformGuardrails', { ...g, effectiveFrom: now });
      guardrailsAdded++;
    }
    report.guardrailsAdded = guardrailsAdded;

    // 5. OG Financial Services active subscription on all_features.
    const existingSub = (
      await ctx.db
        .query('tenantSubscriptions')
        .withIndex('by_institutionId', (q) => q.eq('institutionId', institutionId))
        .collect()
    ).find((s) => s.status === 'active');
    if (!existingSub) {
      await ctx.db.insert('tenantSubscriptions', {
        institutionId,
        planCode: 'all_features',
        status: 'active',
        effectiveFrom: now,
        reason: 'Phase 0 seed - OG Financial Services tenant #1',
      });
      report.subscriptionCreated = true;
    } else if (existingSub.planCode !== 'all_features' || existingSub.status !== 'active') {
      await ctx.db.patch(existingSub._id, {
        planCode: 'all_features',
        status: 'active',
        reason: existingSub.reason ?? 'Phase 0 seed - OG Financial Services tenant #1',
      });
      report.subscriptionUpdated = true;
    }

    // 6. Backfill userRoles.institutionId for tenant users; migrate admin → tenant_admin.
    //    Guards accept both roles, so this is behavior-neutral.
    const roles = await ctx.db.query('userRoles').collect();
    let bound = 0;
    let migrated = 0;
    for (const r of roles) {
      const patch: Record<string, unknown> = {};
      if (!r.institutionId) {
        patch.institutionId = institutionId;
        bound++;
      }
      if (r.role === 'admin') {
        patch.role = 'tenant_admin';
        migrated++;
      }
      if (Object.keys(patch).length > 0) await ctx.db.patch(r._id, patch);
    }
    report.boundUsers = bound;
    report.migratedAdmins = migrated;

    // 7. Assign platform_owner (bootstrap) by email, if provided.
    if (ownerEmail) {
      const profile = await ctx.db
        .query('profiles')
        .filter((q) => q.eq(q.field('email'), ownerEmail))
        .first();
      if (profile) {
        const existing = await ctx.db
          .query('platformAdmins')
          .withIndex('by_userId', (q) => q.eq('userId', profile.userId))
          .first();
        if (!existing) {
          await ctx.db.insert('platformAdmins', {
            userId: profile.userId,
            platformRole: 'platform_owner',
            status: 'active',
            createdAt: now,
          });
          report.platformOwnerAssigned = ownerEmail;
        } else {
          report.platformOwnerAssigned = 'already_exists';
        }
      } else {
        report.platformOwnerAssigned = `no_profile_for_${ownerEmail}`;
      }
    }

    // 8. Elevate a backoffice operator to tenant_admin by email (test/provisioning helper).
    //    Mirrors the owner block; only touches an existing profile's role; idempotent.
    if (backofficeEmail) {
      const profile = await ctx.db
        .query('profiles')
        .filter((q) => q.eq(q.field('email'), backofficeEmail))
        .first();
      if (profile) {
        const roleRow = await ctx.db
          .query('userRoles')
          .withIndex('by_userId', (q) => q.eq('userId', profile.userId))
          .first();
        if (roleRow) {
          await ctx.db.patch(roleRow._id, {
            role: 'tenant_admin',
            institutionId: roleRow.institutionId ?? institutionId,
          });
          report.backofficeAssigned = backofficeEmail;
        } else {
          await ctx.db.insert('userRoles', {
            userId: profile.userId,
            role: 'tenant_admin',
            institutionId,
            createdAt: now,
          });
          report.backofficeAssigned = `${backofficeEmail}_new_role`;
        }
      } else {
        report.backofficeAssigned = `no_profile_for_${backofficeEmail}`;
      }
    }

    return report;
  },
});

/**
 * Human-triggered, idempotent production migration for the tenant and public brand defaults.
 * It preserves the tenant ID and temporal configuration history.
 */
export const migrateOgFinancialServices = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const institutionId = await ensureOgTenant(ctx, now);
    const branding = [
      {
        key: 'branding.general',
        value: {
          company_name: 'OG Financial Services',
          company_tagline: 'Finance that moves you forward',
          support_email: 'finance@mgholdingsptyltd.com',
          support_phone: '+264 81 417 4288',
        },
      },
      {
        key: 'branding.colors',
        value: {
          primary_color: '#3F713E',
          secondary_color: '#7CA05C',
          accent_color: '#274F35',
          use_custom_colors: true,
        },
      },
      {
        key: 'branding.assets',
        value: {
          logo_url: '/og-financial-logo-v2.svg',
          favicon_url: '/og-financial-favicon-v2.svg',
          logo_width: 220,
          logo_height: 72,
          show_company_name_with_logo: false,
        },
      },
      {
        key: 'branding.meta',
        value: {
          page_title_template: '{company_name} - {page_name}',
          meta_description:
            'Apply online with OG Financial Services, a NAMFISA-registered Namibian microlender.',
          og_image_url: '/og-financial-social-v2.png',
        },
      },
    ];
    let updated = 0;
    for (const item of branding) {
      const rows = await ctx.db
        .query('systemConfiguration')
        .withIndex('by_key', (q) => q.eq('key', item.key))
        .collect();
      const current = rows.find(
        (row) => !row.deletedAt && (row.effectiveTo === undefined || row.effectiveTo > now)
      );
      if (current && JSON.stringify(current.value) === JSON.stringify(item.value)) continue;
      if (current) await ctx.db.patch(current._id, { effectiveTo: now, updatedAt: now });
      await ctx.db.insert('systemConfiguration', {
        key: item.key,
        value: item.value,
        category: 'branding',
        description: 'OG Financial Services public brand configuration',
        isPublic: true,
        effectiveFrom: now,
        version: (current?.version ?? 0) + 1,
        createdAt: now,
        updatedAt: now,
      });
      updated += 1;
    }
    scheduleAuditEntry(ctx, {
      entityType: 'institutions',
      entityId: institutionId,
      action: 'REBRAND',
      newState: { name: OG_PROFILE.name, shortCode: OG_CODE, brandingConfigsUpdated: updated },
    });
    return { institutionId, brandingConfigsUpdated: updated };
  },
});
