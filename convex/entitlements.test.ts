/**
 * Phase 2 entitlement-gating tests (convex-test harness). Proves:
 *  - INERT: with ENTITLEMENT_ENFORCEMENT off, all gated feature entry points behave as before.
 *  - ENFORCED + unentitled: all commercial feature entry points throw FEATURE_NOT_ENABLED.
 *  - ENFORCED + entitled (add-on row): the same entry points succeed.
 *  - ALWAYS-ON preserved: core lending, payment, approval, product-read/eligibility, and POPIA
 *    consent paths work under enforcement regardless of plan.
 *
 * Run: npm run test:convex
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

async function seedUser(
  t: TestCtx,
  opts: { role: string; institutionId: Id<'institutions'> }
): Promise<Id<'users'>> {
  return t.run(async (ctx) => {
    const userId = await ctx.db.insert('users', {});
    await ctx.db.insert('profiles', {
      userId,
      institutionId: opts.institutionId,
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
  t: TestCtx,
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

async function seedApprovalRequestFor(
  t: TestCtx,
  requester: Id<'users'>,
  institutionId: Id<'institutions'>
): Promise<Id<'approvalRequests'>> {
  return t.run(async (ctx) => {
    const now = Date.now();
    return ctx.db.insert('approvalRequests', {
      entityType: 'manual',
      entityId: 'manual-review',
      requestType: 'manual_review',
      status: 'pending',
      requestedBy: requester,
      institutionId,
      priority: 'medium',
      createdAt: now,
      updatedAt: now,
    });
  });
}

async function seedProductVersion(
  t: TestCtx,
  institutionId: Id<'institutions'>
): Promise<Id<'productVersions'>> {
  return t.run(async (ctx) => {
    const now = Date.now();
    const productId = await ctx.db.insert('productDefinitions', {
      productCode: `eligibility_${institutionId}`,
      name: 'Eligibility Test Product',
      category: 'loan',
      status: 'active',
      institutionId,
      createdAt: now,
      updatedAt: now,
    });
    return ctx.db.insert('productVersions', {
      productId,
      versionNumber: 1,
      isCurrentVersion: true,
      config: {
        minAmount: 100,
        maxAmount: 5000,
        minTermMonths: 1,
        maxTermMonths: 24,
        maxInterestRate: 32,
        eligibilityCriteria: {
          minMonthlyIncome: 1000,
          requiresEmployment: true,
        },
      },
      effectiveFrom: now,
      createdAt: now,
    });
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

async function grantFeature(t: TestCtx, institutionId: Id<'institutions'>, featureKey: string) {
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

type FeatureCase = {
  featureKey: string;
  label: string;
  call: (
    t: TestCtx,
    staff: Id<'users'>,
    institutionId: Id<'institutions'>,
    suffix: string
  ) => Promise<unknown>;
};

const gatedFeatureCases: FeatureCase[] = [
  {
    featureKey: 'collections',
    label: 'collections queue',
    call: async (t, staff) => asUser(t, staff).query(api.collections.getCollectionsQueue, {}),
  },
  {
    featureKey: 'tenantReconciliation',
    label: 'tenant reconciliation',
    call: async (t, staff) => asUser(t, staff).query(api.reconciliation.listBankTransactions, {}),
  },
  {
    featureKey: 'advancedAnalytics',
    label: 'advanced analytics',
    call: async (t, staff) => asUser(t, staff).query(api.analytics.getRiskMetrics, {}),
  },
  {
    featureKey: 'mandates',
    label: 'mandates',
    call: async (t, staff) => asUser(t, staff).query(api.ontology.mandates.listMandates, {}),
  },
  {
    featureKey: 'products',
    label: 'product management',
    call: async (t, staff, institutionId, suffix) =>
      asUser(t, staff).mutation(api.ontology.products.createProduct, {
        productCode: `prod_${suffix}_${institutionId}`,
        name: `Product ${suffix}`,
        category: 'loan',
        institutionId,
      }),
  },
  {
    featureKey: 'workflows',
    label: 'workflow definitions',
    call: async (t, staff, _institutionId, suffix) =>
      asUser(t, staff).mutation(api.approvalWorkflow.createWorkflowDefinition, {
        name: `Workflow ${suffix}`,
        entityType: 'loan',
        stages: [
          {
            name: 'Review',
            order: 1,
            requiredRole: 'tenant_admin',
            actions: ['approve', 'reject'],
          },
        ],
      }),
  },
  {
    featureKey: 'ippOnboarding',
    label: 'IPP onboarding',
    call: async (t, staff) => asUser(t, staff).query(api.ips.ipsOnboarding.adminListOnboarding, {}),
  },
];

async function setupFeatureCase(label: string) {
  const t = convexTest(schema, modules);
  const inst = await seedInstitution(t, label);
  const staff = await seedUser(t, { role: 'tenant_admin', institutionId: inst });
  return { t, inst, staff };
}

describe('entitlement gating — enforced', () => {
  test.each(gatedFeatureCases)(
    'with enforcement OFF, unentitled tenant can use $label',
    async ({ call }, index) => {
      const { t, inst, staff } = await setupFeatureCase(`INERT_${index}`);
      // No ENTITLEMENT_ENFORCEMENT rule -> guard is a no-op.
      await expect(call(t, staff, inst, `inert_${index}`)).resolves.toBeDefined();
    }
  );

  test.each(gatedFeatureCases)(
    'with enforcement ON, unentitled tenant is denied on $label',
    async ({ call }, index) => {
      const { t, inst, staff } = await setupFeatureCase(`DENY_${index}`);
      await enableEntitlementEnforcement(t);
      await expect(call(t, staff, inst, `deny_${index}`)).rejects.toMatchObject({
        data: { code: 'FEATURE_NOT_ENABLED' },
      });
    }
  );

  test.each(gatedFeatureCases)(
    'with enforcement ON, entitled tenant can use $label',
    async ({ featureKey, call }, index) => {
      const { t, inst, staff } = await setupFeatureCase(`GRANT_${index}`);
      await enableEntitlementEnforcement(t);
      await grantFeature(t, inst, featureKey);
      await expect(call(t, staff, inst, `grant_${index}`)).resolves.toBeDefined();
    }
  );

  test('collections gated write still follows the same entitlement contract', async () => {
    const t = convexTest(schema, modules);
    const inst = await seedInstitution(t, 'COLL_WRITE');
    const staff = await seedUser(t, { role: 'tenant_admin', institutionId: inst });
    const borrower = await seedUser(t, { role: 'client', institutionId: inst });
    const loan = await seedLoanFor(t, borrower, inst);
    await enableEntitlementEnforcement(t);

    await expect(
      asUser(t, staff).mutation(api.collections.recordInteraction, interaction(loan))
    ).rejects.toMatchObject({ data: { code: 'FEATURE_NOT_ENABLED' } });

    await grantFeature(t, inst, 'collections');
    await expect(
      asUser(t, staff).mutation(api.collections.recordInteraction, interaction(loan))
    ).resolves.toBeDefined();
  });
});

describe('entitlement gating — always-on preservation', () => {
  test('client application writes require the client surface while core loan reads remain available', async () => {
    const t = convexTest(schema, modules);
    const inst = await seedInstitution(t, 'CORE');
    const borrower = await seedUser(t, { role: 'client', institutionId: inst });
    const staff = await seedUser(t, { role: 'tenant_admin', institutionId: inst });
    await enableEntitlementEnforcement(t);

    await expect(
      asUser(t, borrower).mutation(api.loans.createLoan, {
        principal: 5000,
        interestRate: 20,
        termMonths: 12,
      })
    ).rejects.toMatchObject({ data: { code: 'FEATURE_NOT_ENABLED' } });

    await grantFeature(t, inst, 'clientDocuments');
    await grantFeature(t, inst, 'clientApplications');
    await expect(
      asUser(t, staff).mutation(api.loans.createLoan, {
        principal: 5000,
        interestRate: 20,
        termMonths: 12,
      })
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });
    const loanId = await asUser(t, borrower).mutation(api.loans.createLoan, {
      principal: 5000,
      interestRate: 20,
      termMonths: 12,
    });
    expect(loanId).toBeDefined();
    await expect(asUser(t, borrower).query(api.loans.getMyLoans, {})).rejects.toMatchObject({
      data: { code: 'FEATURE_NOT_ENABLED' },
    });
    await expect(
      asUser(t, borrower).query(api.loans.getMyPortfolioSummary, {})
    ).rejects.toMatchObject({ data: { code: 'FEATURE_NOT_ENABLED' } });
    await expect(asUser(t, borrower).query(api.loans.getLoan, { loanId })).rejects.toMatchObject({
      data: { code: 'FEATURE_NOT_ENABLED' },
    });
    await expect(asUser(t, staff).query(api.loans.getLoan, { loanId })).resolves.toMatchObject({
      _id: loanId,
    });
    await grantFeature(t, inst, 'clientLoans');
    await expect(asUser(t, borrower).query(api.loans.getMyLoans, {})).resolves.toHaveLength(1);
    await expect(
      asUser(t, borrower).query(api.loans.getMyPortfolioSummary, {})
    ).resolves.toMatchObject({ activeLoanCount: expect.any(Number) });
  });

  test('client document writes are gated but staff workflows bypass Client Portal keys', async () => {
    const t = convexTest(schema, modules);
    const inst = await seedInstitution(t, 'CLIENT_DOCS');
    const borrower = await seedUser(t, { role: 'client', institutionId: inst });
    const staff = await seedUser(t, { role: 'tenant_admin', institutionId: inst });
    await enableEntitlementEnforcement(t);

    await expect(
      asUser(t, borrower).mutation(api.kycDocuments.generateUploadUrl, {})
    ).rejects.toMatchObject({ data: { code: 'FEATURE_NOT_ENABLED' } });
    await expect(
      asUser(t, staff).mutation(api.kycDocuments.generateUploadUrl, {})
    ).resolves.toBeTypeOf('string');
  });

  test('self-service reschedule writes require clientSelfService', async () => {
    const t = convexTest(schema, modules);
    const inst = await seedInstitution(t, 'SELF_SERVICE');
    const borrower = await seedUser(t, { role: 'client', institutionId: inst });
    const loanId = await seedLoanFor(t, borrower, inst);
    await enableEntitlementEnforcement(t);
    const request = {
      loanId,
      originalDueDate: '2026-08-30',
      requestedDate: '2026-09-15',
      reason: 'Temporary cash-flow interruption',
    };

    await expect(
      asUser(t, borrower).mutation(api.collections.requestReschedule, request)
    ).rejects.toMatchObject({ data: { code: 'FEATURE_NOT_ENABLED' } });
    await grantFeature(t, inst, 'clientSelfService');
    await expect(
      asUser(t, borrower).mutation(api.collections.requestReschedule, request)
    ).resolves.toBeDefined();
  });

  test('staff reschedule workflows bypass clientSelfService but still require collections', async () => {
    const t = convexTest(schema, modules);
    const inst = await seedInstitution(t, 'STAFF_RESCHEDULE');
    const borrower = await seedUser(t, { role: 'client', institutionId: inst });
    const staff = await seedUser(t, { role: 'tenant_admin', institutionId: inst });
    const loanId = await seedLoanFor(t, borrower, inst);
    await enableEntitlementEnforcement(t);
    const request = {
      loanId,
      originalDueDate: '2026-08-30',
      requestedDate: '2026-09-15',
      reason: 'Staff-assisted reschedule',
    };

    await expect(
      asUser(t, staff).mutation(api.collections.requestReschedule, request)
    ).rejects.toMatchObject({ data: { code: 'FEATURE_NOT_ENABLED' } });
    await grantFeature(t, inst, 'collections');
    await expect(
      asUser(t, staff).mutation(api.collections.requestReschedule, request)
    ).resolves.toBeDefined();
  });

  test('client banking writes require both IPP and the clientBanking surface', async () => {
    const t = convexTest(schema, modules);
    const inst = await seedInstitution(t, 'CLIENT_BANKING');
    const borrower = await seedUser(t, { role: 'client', institutionId: inst });
    await enableEntitlementEnforcement(t);

    await grantFeature(t, inst, 'ippOnboarding');
    await expect(
      asUser(t, borrower).mutation(api.ips.ipsOnboarding.startOnboarding, {})
    ).rejects.toMatchObject({ data: { code: 'FEATURE_NOT_ENABLED' } });
    await grantFeature(t, inst, 'clientBanking');
    await expect(
      asUser(t, borrower).mutation(api.ips.ipsOnboarding.startOnboarding, {})
    ).resolves.toBeDefined();
  });

  test('IPP staff bypass never crosses the caller tenant boundary', async () => {
    const t = convexTest(schema, modules);
    const tenantA = await seedInstitution(t, 'IPP_TENANT_A');
    const tenantB = await seedInstitution(t, 'IPP_TENANT_B');
    const staffA = await seedUser(t, { role: 'tenant_admin', institutionId: tenantA });
    const borrowerB = await seedUser(t, { role: 'client', institutionId: tenantB });
    const loanB = await seedLoanFor(t, borrowerB, tenantB);

    await expect(
      asUser(t, staffA).query(api.ips.ipsTransactions.getTransactionsByLoan, { loanId: loanB })
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });
    await expect(
      asUser(t, staffA).mutation(api.ips.ipsTransactions.initiateIpsRepayment, {
        loanId: loanB,
        amount: 100,
      })
    ).rejects.toMatchObject({ data: { code: 'FORBIDDEN' } });
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

  test('payment recording is never blocked by commercial entitlement enforcement', async () => {
    const t = convexTest(schema, modules);
    const inst = await seedInstitution(t, 'PAY');
    const borrower = await seedUser(t, { role: 'client', institutionId: inst });
    const loan = await seedLoanFor(t, borrower, inst);
    await enableEntitlementEnforcement(t);

    await expect(
      asUser(t, borrower).mutation(api.payments.recordPayment, {
        loanId: loan,
        amount: 100,
        method: 'cash',
      })
    ).resolves.toBeDefined();
  });

  test('approval processing is never blocked by commercial entitlement enforcement', async () => {
    const t = convexTest(schema, modules);
    const inst = await seedInstitution(t, 'APPROVAL');
    const staff = await seedUser(t, { role: 'tenant_admin', institutionId: inst });
    const requester = await seedUser(t, { role: 'client', institutionId: inst });
    const request = await seedApprovalRequestFor(t, requester, inst);
    await enableEntitlementEnforcement(t);

    await expect(
      asUser(t, staff).mutation(api.approvalWorkflow.processApprovalRequest, {
        requestId: request,
        action: 'approve',
        notes: 'Approved by test',
      })
    ).resolves.toBeNull();
  });

  test('product eligibility reads stay open even when unentitled to product management', async () => {
    const t = convexTest(schema, modules);
    const inst = await seedInstitution(t, 'ELIG');
    const borrower = await seedUser(t, { role: 'client', institutionId: inst });
    const productVersionId = await seedProductVersion(t, inst);
    await enableEntitlementEnforcement(t);

    await expect(
      asUser(t, borrower).query(api.ontology.products.checkEligibility, {
        productVersionId,
        applicant: {
          monthlyIncome: 2500,
          isEmployed: true,
        },
        requestedAmount: 1000,
        requestedTermMonths: 6,
      })
    ).resolves.toMatchObject({ eligible: true });
  });

  test('POPIA consent primitives are never blocked by commercial entitlement enforcement', async () => {
    const t = convexTest(schema, modules);
    const inst = await seedInstitution(t, 'POPIA');
    const borrower = await seedUser(t, { role: 'client', institutionId: inst });
    await enableEntitlementEnforcement(t);

    await expect(
      asUser(t, borrower).mutation(api.ontology.consentRecords.grantConsent, {
        consentType: 'data_processing',
        description: 'I consent to data processing for lending compliance.',
        collectionMethod: 'digital_acceptance',
      })
    ).resolves.toBeDefined();
  });
});
