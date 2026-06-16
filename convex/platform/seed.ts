/**
 * Phase 0 control-plane seed — idempotent, inert.
 *
 * Establishes NamLend as tenant #1 on an all-features plan so production behavior is
 * IDENTICAL after Phase 0: nothing is gated, nothing is removed. Safe to re-run.
 *
 * Run (dev/prod): npx convex run platform/seed:seedControlPlane '{"ownerEmail":"you@example.com"}'
 */

import { v } from 'convex/values';
import { internalMutation } from '../_generated/server';
import { ALWAYS_ON_FEATURES, FEATURES } from '../lib/features';

const NAMLEND_CODE = 'NAMLEND';

/** Backoffice feature keys a plan can grant (platform-only features are not tenant-grantable). */
const BACKOFFICE_FEATURES = FEATURES.filter((f) => f.console === 'backoffice').map((f) => f.key);

/** Plan catalog seeded at Phase 0. NamLend goes on `all_features`. */
const PLAN_DEFS: Array<{ planCode: string; name: string; features: string[] }> = [
  { planCode: 'all_features', name: 'All Features (internal)', features: BACKOFFICE_FEATURES },
  { planCode: 'starter', name: 'Starter', features: [...ALWAYS_ON_FEATURES] },
  {
    planCode: 'pro',
    name: 'Pro',
    features: [
      ...ALWAYS_ON_FEATURES,
      'collections',
      'ippOnboarding',
      'products',
      'advancedAnalytics',
      'creditPolicy',
    ],
  },
  { planCode: 'enterprise', name: 'Enterprise', features: BACKOFFICE_FEATURES },
];

export const seedControlPlane = internalMutation({
  args: { ownerEmail: v.optional(v.string()), backofficeEmail: v.optional(v.string()) },
  handler: async (ctx, { ownerEmail, backofficeEmail }) => {
    const now = Date.now();
    const report: Record<string, unknown> = {};

    // 1. Ensure NamLend institution (tenant #1).
    let namlend = await ctx.db
      .query('institutions')
      .withIndex('by_shortCode', (q) => q.eq('shortCode', NAMLEND_CODE))
      .first();
    if (!namlend) {
      const id = await ctx.db.insert('institutions', {
        name: 'NamLend Trust',
        shortCode: NAMLEND_CODE,
        type: 'lender',
        status: 'active',
        metadata: { jurisdiction: 'Namibia', seededBy: 'platform/seed' },
        createdAt: now,
        updatedAt: now,
      });
      namlend = await ctx.db.get(id);
    }
    const institutionId = namlend!._id;
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
        createdAt: now,
        updatedAt: now,
      });
      catalogAdded++;
    }
    report.catalogAdded = catalogAdded;

    // 3. Seed plans.
    let plansAdded = 0;
    for (const p of PLAN_DEFS) {
      const existing = await ctx.db
        .query('plans')
        .withIndex('by_planCode', (q) => q.eq('planCode', p.planCode))
        .first();
      if (existing) continue;
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

    // 5. NamLend active subscription on all_features.
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
        reason: 'Phase 0 seed — NamLend tenant #1',
      });
      report.subscriptionCreated = true;
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
