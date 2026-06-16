/**
 * Tenant config guardrail tests.
 *
 * Credit policy is tenant-owned configuration, but platform guardrails remain non-negotiable:
 * APR <= 32%, KYC document/verification requirements cannot be disabled, and the feature is
 * entitlement-gated when ENTITLEMENT_ENFORCEMENT is active.
 */

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

async function seedInstitution(t: TestCtx, code: string): Promise<Id<'institutions'>> {
  return t.run(async (ctx) =>
    ctx.db.insert('institutions', {
      name: code,
      shortCode: code,
      type: 'lender',
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  );
}

async function seedTenantAdmin(
  t: TestCtx,
  institutionId: Id<'institutions'>
): Promise<Id<'users'>> {
  return t.run(async (ctx) => {
    const userId = await ctx.db.insert('users', {});
    await ctx.db.insert('profiles', {
      userId,
      institutionId,
      email: `${userId}@example.test`,
      kycStatus: 'verified',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await ctx.db.insert('userRoles', {
      userId,
      role: 'tenant_admin',
      institutionId,
      createdAt: Date.now(),
    });
    return userId;
  });
}

async function enableEntitlementEnforcement(t: TestCtx) {
  await t.run(async (ctx) => {
    await ctx.db.insert('businessRules', {
      ruleCode: 'ENTITLEMENT_ENFORCEMENT',
      category: 'platform',
      displayName: 'Entitlement enforcement',
      valueType: 'boolean',
      value: 'true',
      version: 1,
      effectiveFrom: Date.now(),
      createdAt: Date.now(),
    });
  });
}

async function grantCreditPolicy(t: TestCtx, institutionId: Id<'institutions'>) {
  await t.run(async (ctx) => {
    await ctx.db.insert('tenantEntitlements', {
      institutionId,
      featureKey: 'creditPolicy',
      source: 'addon',
      enabled: true,
      rolloutState: 'enabled',
      effectiveFrom: Date.now(),
      changedAt: Date.now(),
    });
  });
}

const validPolicy = {
  minLoanAmount: 500,
  maxLoanAmount: 50_000,
  minTermMonths: 3,
  maxTermMonths: 24,
  baseInterestRate: 18,
  maxInterestRate: 32,
  riskPremiumLow: 0,
  riskPremiumMedium: 5,
  riskPremiumHigh: 10,
  minMonthlyIncome: 3_000,
  maxDebtToIncome: 40,
  minEmploymentMonths: 3,
  requireVerification: true,
  requireDocuments: true,
  autoApproveThreshold: 80,
  autoRejectThreshold: 30,
  manualReviewRequired: true,
  originationFeePercent: 2,
  latePaymentFeePercent: 5,
  gracePeriodDays: 5,
};

describe('tenant credit policy config', () => {
  test('saves and reads tenant-scoped credit policy while enforcement is inert', async () => {
    const t = convexTest(schema, modules);
    const inst = await seedInstitution(t, 'CFG_INERT');
    const admin = await seedTenantAdmin(t, inst);

    await expect(
      asUser(t, admin).mutation(api.tenantConfig.setMyCreditPolicy, {
        policy: { ...validPolicy, maxLoanAmount: 75_000 },
      })
    ).resolves.toBeDefined();

    await expect(
      asUser(t, admin).query(api.tenantConfig.getMyCreditPolicy, {})
    ).resolves.toMatchObject({
      source: 'tenant',
      institutionId: inst,
      policy: { maxLoanAmount: 75_000, maxInterestRate: 32 },
    });
  });

  test('blocks credit policy writes when enforcement is on and tenant is unentitled', async () => {
    const t = convexTest(schema, modules);
    const inst = await seedInstitution(t, 'CFG_DENY');
    const admin = await seedTenantAdmin(t, inst);
    await enableEntitlementEnforcement(t);

    await expect(
      asUser(t, admin).mutation(api.tenantConfig.setMyCreditPolicy, { policy: validPolicy })
    ).rejects.toMatchObject({ data: { code: 'FEATURE_NOT_ENABLED' } });
  });

  test('enforces the 32% APR platform guardrail server-side', async () => {
    const t = convexTest(schema, modules);
    const inst = await seedInstitution(t, 'CFG_APR');
    const admin = await seedTenantAdmin(t, inst);
    await enableEntitlementEnforcement(t);
    await grantCreditPolicy(t, inst);

    await expect(
      asUser(t, admin).mutation(api.tenantConfig.setMyCreditPolicy, {
        policy: { ...validPolicy, maxInterestRate: 35 },
      })
    ).rejects.toMatchObject({ data: { code: 'GUARDRAIL_VIOLATION' } });
  });

  test('rejects effective high-risk rate above the 32% APR platform cap', async () => {
    const t = convexTest(schema, modules);
    const inst = await seedInstitution(t, 'CFG_RISK_APR');
    const admin = await seedTenantAdmin(t, inst);

    await expect(
      asUser(t, admin).mutation(api.tenantConfig.setMyCreditPolicy, {
        policy: { ...validPolicy, baseInterestRate: 25, maxInterestRate: 32, riskPremiumHigh: 8 },
      })
    ).rejects.toMatchObject({ data: { code: 'GUARDRAIL_VIOLATION' } });
  });

  test('rejects effective high-risk rate above tenant maximum interest rate', async () => {
    const t = convexTest(schema, modules);
    const inst = await seedInstitution(t, 'CFG_RISK_MAX');
    const admin = await seedTenantAdmin(t, inst);

    await expect(
      asUser(t, admin).mutation(api.tenantConfig.setMyCreditPolicy, {
        policy: { ...validPolicy, baseInterestRate: 20, maxInterestRate: 25, riskPremiumHigh: 8 },
      })
    ).rejects.toMatchObject({ data: { code: 'GUARDRAIL_VIOLATION' } });
  });

  test('prevents tenant config from relaxing KYC minimums', async () => {
    const t = convexTest(schema, modules);
    const inst = await seedInstitution(t, 'CFG_KYC');
    const admin = await seedTenantAdmin(t, inst);
    await enableEntitlementEnforcement(t);
    await grantCreditPolicy(t, inst);

    await expect(
      asUser(t, admin).mutation(api.tenantConfig.setMyCreditPolicy, {
        policy: { ...validPolicy, requireVerification: false },
      })
    ).rejects.toMatchObject({ data: { code: 'GUARDRAIL_VIOLATION' } });
  });
});
