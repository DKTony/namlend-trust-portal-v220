/**
 * Phase 2 entitlement-gating tests (convex-test harness). Proves:
 *  - INERT: with ENTITLEMENT_ENFORCEMENT off, gated functions behave exactly as before.
 *  - ENFORCED + unentitled: gated write AND gated staff read both throw FEATURE_NOT_ENABLED.
 *  - ENFORCED + entitled (add-on row): the same functions succeed.
 *  - ALWAYS-ON preserved: core lending (createLoan) works under enforcement regardless of plan.
 *  - CORE-LENDING reads preserved: product reads are NOT gated (only product management is).
 *
 * Run: npm run test:convex
 */
import { convexTest } from 'convex-test';
import { describe, expect, test } from 'vitest';
import schema from './schema';
import { api } from './_generated/api';
import type { Id } from './_generated/dataModel';

const modules = import.meta.glob('./**/*.*s');

function asUser(t: ReturnType<typeof convexTest>, userId: Id<'users'>) {
  return t.withIdentity({ subject: `${userId}|testsession` });
}

async function seedInstitution(
  t: ReturnType<typeof convexTest>,
  code: string
): Promise<Id<'institutions'>> {
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

async function seedUser(
  t: ReturnType<typeof convexTest>,
  opts: { role: string; institutionId: Id<'institutions'> }
): Promise<Id<'users'>> {
  return t.run(async (ctx) => {
    const userId = await ctx.db.insert('users', {});
    await ctx.db.insert('profiles', {
      userId,
      email: `${userId}@example.test`,
      kycStatus: 'verified',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await ctx.db.insert('userRoles', {
      userId,
      role: opts.role as 'client' | 'loan_officer' | 'admin' | 'tenant_admin',
      institutionId: opts.institutionId,
      createdAt: Date.now(),
    });
    return userId;
  });
}

async function seedLoanFor(
  t: ReturnType<typeof convexTest>,
  borrower: Id<'users'>,
  institutionId: Id<'institutions'>
): Promise<Id<'loans'>> {
  return t.run(async (ctx) => {
    const now = Date.now();
    return ctx.db.insert('loans', {
      userId: borrower,
      institutionId,
      principal: 1000,
      interestRate: 20,
      termMonths: 6,
      status: 'active',
      outstandingBalance: 1000,
      totalPaid: 0,
      createdAt: now,
      updatedAt: now,
    });
  });
}

async function enableEntitlementEnforcement(t: ReturnType<typeof convexTest>) {
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

async function grantFeature(
  t: ReturnType<typeof convexTest>,
  institutionId: Id<'institutions'>,
  featureKey: string
) {
  await t.run(async (ctx) => {
    await ctx.db.insert('tenantEntitlements', {
      institutionId,
      featureKey,
      source: 'addon',
      enabled: true,
      rolloutState: 'enabled',
      effectiveFrom: Date.now(),
      changedAt: Date.now(),
    });
  });
}

const interaction = (loanId: Id<'loans'>) => ({
  loanId,
  activityType: 'note' as const,
  activityStatus: 'completed' as const,
});

// ---------------------------------------------------------------------------
// Inertness
// ---------------------------------------------------------------------------

describe('entitlement gating — inert', () => {
  test('with enforcement OFF, an unentitled tenant can use gated collections functions', async () => {
    const t = convexTest(schema, modules);
    const inst = await seedInstitution(t, 'INERT');
    const staff = await seedUser(t, { role: 'tenant_admin', institutionId: inst });
    const borrower = await seedUser(t, { role: 'client', institutionId: inst });
    const loan = await seedLoanFor(t, borrower, inst);

    // No ENTITLEMENT_ENFORCEMENT rule → guard is a no-op.
    await expect(
      asUser(t, staff).query(api.collections.getCollectionsQueue, {})
    ).resolves.toBeDefined();
    await expect(
      asUser(t, staff).mutation(api.collections.recordInteraction, interaction(loan))
    ).resolves.toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Enforced
// ---------------------------------------------------------------------------

describe('entitlement gating — enforced', () => {
  test('unentitled tenant is denied on a gated write AND a gated read', async () => {
    const t = convexTest(schema, modules);
    const inst = await seedInstitution(t, 'DENY');
    const staff = await seedUser(t, { role: 'tenant_admin', institutionId: inst });
    const borrower = await seedUser(t, { role: 'client', institutionId: inst });
    const loan = await seedLoanFor(t, borrower, inst);
    await enableEntitlementEnforcement(t);

    await expect(
      asUser(t, staff).query(api.collections.getCollectionsQueue, {})
    ).rejects.toMatchObject({ data: { code: 'FEATURE_NOT_ENABLED' } });
    await expect(
      asUser(t, staff).mutation(api.collections.recordInteraction, interaction(loan))
    ).rejects.toMatchObject({ data: { code: 'FEATURE_NOT_ENABLED' } });
  });

  test('granting the feature (add-on) unblocks the same functions', async () => {
    const t = convexTest(schema, modules);
    const inst = await seedInstitution(t, 'GRANT');
    const staff = await seedUser(t, { role: 'tenant_admin', institutionId: inst });
    const borrower = await seedUser(t, { role: 'client', institutionId: inst });
    const loan = await seedLoanFor(t, borrower, inst);
    await enableEntitlementEnforcement(t);
    await grantFeature(t, inst, 'collections');

    await expect(
      asUser(t, staff).query(api.collections.getCollectionsQueue, {})
    ).resolves.toBeDefined();
    await expect(
      asUser(t, staff).mutation(api.collections.recordInteraction, interaction(loan))
    ).resolves.toBeDefined();
  });

  test('always-on core lending is never gated (createLoan works under enforcement)', async () => {
    const t = convexTest(schema, modules);
    const inst = await seedInstitution(t, 'CORE');
    const borrower = await seedUser(t, { role: 'client', institutionId: inst });
    await enableEntitlementEnforcement(t);

    const loanId = await asUser(t, borrower).mutation(api.loans.createLoan, {
      principal: 5000,
      interestRate: 20,
      termMonths: 12,
    });
    expect(loanId).toBeDefined();
  });

  test('core-lending product reads stay open even when unentitled to the products feature', async () => {
    const t = convexTest(schema, modules);
    const inst = await seedInstitution(t, 'PROD');
    const staff = await seedUser(t, { role: 'tenant_admin', institutionId: inst });
    await enableEntitlementEnforcement(t);

    // Product READS are not gated (only create/update/version are) — must not throw.
    await expect(
      asUser(t, staff).query(api.ontology.products.listProducts, {})
    ).resolves.toBeDefined();
  });
});
