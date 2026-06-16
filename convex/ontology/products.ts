/**
 * Financial Products -- configurable product engine.
 *
 * Ontology: Entity(Product) + Entity(ProductVersion) -- immutable versioned configs.
 * Events: product.created, product.version_created, product.discontinued
 * Rules: EligibilityCriteria, AmountLimits, TermLimits, APRCap
 *
 * Security model:
 *   createProduct / createVersion / seed  - admin only
 *   updateProduct                         - admin only
 *   queries                               - staff-only (except getActiveProducts)
 *   checkEligibility                      - authenticated
 */

import { ConvexError, v } from 'convex/values';
import { mutation, query } from '../_generated/server';
import { scheduleAuditLog } from '../lib/audit';
import { assertAdmin, assertAuthenticated, assertStaff } from '../lib/auth';
import { assertCallerFeatureEnabled } from '../lib/entitlements';
import { emitEvent, generateCorrelationId } from '../lib/eventEmitter';
import { APR_LIMIT } from '../lib/regulatory';
import { emitRelationship } from '../lib/relationshipEmitter';
import { productCategory, productStatus } from '../schema';

// ---------------------------------------------------------------------------
// Product Definitions
// ---------------------------------------------------------------------------

/**
 * Create a new financial product.
 */
export const createProduct = mutation({
  args: {
    productCode: v.string(),
    name: v.string(),
    category: productCategory,
    description: v.optional(v.string()),
    institutionId: v.optional(v.id('institutions')),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const adminId = await assertAdmin(ctx);
    await assertCallerFeatureEnabled(ctx, 'products');
    const now = Date.now();

    // Uniqueness check
    const existing = await ctx.db
      .query('productDefinitions')
      .withIndex('by_productCode', (q) => q.eq('productCode', args.productCode))
      .first();
    if (existing) {
      throw new ConvexError({
        code: 'DUPLICATE',
        message: `Product with code "${args.productCode}" already exists.`,
      });
    }

    const productId = await ctx.db.insert('productDefinitions', {
      productCode: args.productCode,
      name: args.name,
      category: args.category,
      status: 'draft',
      description: args.description,
      institutionId: args.institutionId,
      metadata: args.metadata,
      createdAt: now,
      updatedAt: now,
    });

    emitEvent(ctx, {
      eventType: 'product.created',
      entityType: 'productDefinitions',
      entityId: productId,
      domainSource: 'products',
      correlationId: generateCorrelationId(),
      actorId: adminId,
      actorType: 'user',
      payload: { productCode: args.productCode, name: args.name, category: args.category },
    });

    scheduleAuditLog(ctx, 'productDefinitions', productId, 'CREATE', 'none', 'draft');

    // Ontology: institution -> offers -> product (if linked)
    if (args.institutionId) {
      emitRelationship(
        ctx,
        { type: 'institutions', id: args.institutionId },
        { type: 'productDefinitions', id: productId },
        'offers'
      );
    }

    return productId;
  },
});

/**
 * Update product metadata or status.
 */
export const updateProduct = mutation({
  args: {
    productId: v.id('productDefinitions'),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(productStatus),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const adminId = await assertAdmin(ctx);
    await assertCallerFeatureEnabled(ctx, 'products');
    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Product not found.' });
    }

    const oldStatus = product.status;
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.status !== undefined) updates.status = args.status;
    if (args.metadata !== undefined) updates.metadata = args.metadata;

    await ctx.db.patch(args.productId, updates);

    if (args.status && args.status !== oldStatus) {
      emitEvent(ctx, {
        eventType: `product.${args.status}`,
        entityType: 'productDefinitions',
        entityId: args.productId,
        domainSource: 'products',
        correlationId: generateCorrelationId(),
        actorId: adminId,
        actorType: 'user',
        payload: { from: oldStatus, to: args.status },
      });
    }

    scheduleAuditLog(
      ctx,
      'productDefinitions',
      args.productId,
      'UPDATE',
      oldStatus,
      (args.status ?? oldStatus) as string
    );
  },
});

// ---------------------------------------------------------------------------
// Product Versions (immutable once created)
// ---------------------------------------------------------------------------

/**
 * Create a new version for a product.
 * Marks the previous current version as non-current.
 * Validates APR cap against Namibian regulatory limit.
 */
export const createVersion = mutation({
  args: {
    productId: v.id('productDefinitions'),
    config: v.object({
      minAmount: v.optional(v.number()),
      maxAmount: v.optional(v.number()),
      minTermMonths: v.optional(v.number()),
      maxTermMonths: v.optional(v.number()),
      defaultInterestRate: v.optional(v.number()),
      maxInterestRate: v.optional(v.number()),
      fees: v.optional(v.any()),
      eligibilityCriteria: v.optional(v.any()),
      allowedRails: v.optional(v.array(v.string())),
      requiresMandate: v.optional(v.boolean()),
      requiresKYC: v.optional(v.boolean()),
    }),
    changeReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const adminId = await assertAdmin(ctx);
    await assertCallerFeatureEnabled(ctx, 'products');
    const now = Date.now();

    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Product not found.' });
    }

    // Regulatory validation: maxInterestRate must not exceed APR_LIMIT
    if (args.config.maxInterestRate !== undefined && args.config.maxInterestRate > APR_LIMIT) {
      throw new ConvexError({
        code: 'REGULATORY_VIOLATION',
        message: `maxInterestRate (${args.config.maxInterestRate}%) exceeds Namibian APR limit of ${APR_LIMIT}%.`,
      });
    }

    // Find current version to determine next version number
    const currentVersions = await ctx.db
      .query('productVersions')
      .withIndex('by_productId_current', (q) =>
        q.eq('productId', args.productId).eq('isCurrentVersion', true)
      )
      .collect();

    const nextVersionNumber =
      currentVersions.length > 0 ? Math.max(...currentVersions.map((v) => v.versionNumber)) + 1 : 1;

    // Mark previous current versions as non-current
    for (const prev of currentVersions) {
      await ctx.db.patch(prev._id, {
        isCurrentVersion: false,
        effectiveTo: now,
      });
    }

    // Insert new immutable version
    const versionId = await ctx.db.insert('productVersions', {
      productId: args.productId,
      versionNumber: nextVersionNumber,
      isCurrentVersion: true,
      config: args.config,
      effectiveFrom: now,
      approvedBy: adminId,
      changeReason: args.changeReason,
      createdAt: now,
    });

    // If this is v1 and product is draft, activate it
    if (nextVersionNumber === 1 && product.status === 'draft') {
      await ctx.db.patch(args.productId, { status: 'active', updatedAt: now });
    }

    const correlationId = generateCorrelationId();
    emitEvent(ctx, {
      eventType: 'product.version_created',
      entityType: 'productVersions',
      entityId: versionId,
      domainSource: 'products',
      correlationId,
      actorId: adminId,
      actorType: 'user',
      payload: {
        productId: args.productId,
        productCode: product.productCode,
        versionNumber: nextVersionNumber,
        changeReason: args.changeReason,
      },
    });

    scheduleAuditLog(ctx, 'productVersions', versionId, 'CREATE', 'none', 'active');

    return { versionId, versionNumber: nextVersionNumber };
  },
});

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Get a product by ID.
 */
export const getProduct = query({
  args: { productId: v.id('productDefinitions') },
  handler: async (ctx, { productId }) => {
    await assertStaff(ctx);
    return ctx.db.get(productId);
  },
});

/**
 * Get product by code (e.g. "personal_loan").
 */
export const getProductByCode = query({
  args: { productCode: v.string() },
  handler: async (ctx, { productCode }) => {
    await assertStaff(ctx);
    return ctx.db
      .query('productDefinitions')
      .withIndex('by_productCode', (q) => q.eq('productCode', productCode))
      .first();
  },
});

/**
 * List all products, optionally filtered.
 */
export const listProducts = query({
  args: {
    status: v.optional(productStatus),
    category: v.optional(productCategory),
  },
  handler: async (ctx, { status, category }) => {
    await assertStaff(ctx);
    if (status) {
      return ctx.db
        .query('productDefinitions')
        .withIndex('by_status', (q) => q.eq('status', status))
        .collect();
    }
    if (category) {
      return ctx.db
        .query('productDefinitions')
        .withIndex('by_category', (q) => q.eq('category', category))
        .collect();
    }
    return ctx.db.query('productDefinitions').collect();
  },
});

/**
 * Get active products (for client-facing product catalog).
 */
export const getActiveProducts = query({
  args: {},
  handler: async (ctx) => {
    await assertAuthenticated(ctx);
    return ctx.db
      .query('productDefinitions')
      .withIndex('by_status', (q) => q.eq('status', 'active'))
      .collect();
  },
});

/**
 * Get the current version of a product.
 */
export const getCurrentVersion = query({
  args: { productId: v.id('productDefinitions') },
  handler: async (ctx, { productId }) => {
    await assertStaff(ctx);
    return ctx.db
      .query('productVersions')
      .withIndex('by_productId_current', (q) =>
        q.eq('productId', productId).eq('isCurrentVersion', true)
      )
      .first();
  },
});

/**
 * Get full version history for a product.
 */
export const getVersionHistory = query({
  args: { productId: v.id('productDefinitions') },
  handler: async (ctx, { productId }) => {
    await assertStaff(ctx);
    return ctx.db
      .query('productVersions')
      .withIndex('by_productId', (q) => q.eq('productId', productId))
      .collect();
  },
});

// ---------------------------------------------------------------------------
// Eligibility Engine
// ---------------------------------------------------------------------------

/**
 * Check if an applicant is eligible for a product.
 * Returns eligibility result with reasons -- does NOT block loan creation.
 *
 * The eligibility criteria in productVersion.config.eligibilityCriteria is
 * a flexible object:
 *   {
 *     minCreditScore?: number,
 *     maxDebtToIncomeRatio?: number,
 *     minMonthlyIncome?: number,
 *     minAge?: number,
 *     requiresEmployment?: boolean,
 *     requiredKYCLevel?: string,
 *   }
 */
export const checkEligibility = query({
  args: {
    productVersionId: v.id('productVersions'),
    applicant: v.object({
      creditScore: v.optional(v.number()),
      debtToIncomeRatio: v.optional(v.number()),
      monthlyIncome: v.optional(v.number()),
      age: v.optional(v.number()),
      isEmployed: v.optional(v.boolean()),
      kycLevel: v.optional(v.string()),
    }),
    requestedAmount: v.optional(v.number()),
    requestedTermMonths: v.optional(v.number()),
  },
  handler: async (ctx, { productVersionId, applicant, requestedAmount, requestedTermMonths }) => {
    await assertAuthenticated(ctx);

    const version = await ctx.db.get(productVersionId);
    if (!version) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Product version not found.' });
    }

    const config = version.config;
    const criteria = config.eligibilityCriteria as Record<string, unknown> | undefined;
    const reasons: string[] = [];
    let eligible = true;

    // Amount range check
    if (requestedAmount !== undefined) {
      if (config.minAmount && requestedAmount < config.minAmount) {
        reasons.push(`Amount N$${requestedAmount} below minimum N$${config.minAmount}`);
        eligible = false;
      }
      if (config.maxAmount && requestedAmount > config.maxAmount) {
        reasons.push(`Amount N$${requestedAmount} exceeds maximum N$${config.maxAmount}`);
        eligible = false;
      }
    }

    // Term range check
    if (requestedTermMonths !== undefined) {
      if (config.minTermMonths && requestedTermMonths < config.minTermMonths) {
        reasons.push(`Term ${requestedTermMonths}mo below minimum ${config.minTermMonths}mo`);
        eligible = false;
      }
      if (config.maxTermMonths && requestedTermMonths > config.maxTermMonths) {
        reasons.push(`Term ${requestedTermMonths}mo exceeds maximum ${config.maxTermMonths}mo`);
        eligible = false;
      }
    }

    // Eligibility criteria checks
    if (criteria) {
      const minCreditScore = criteria.minCreditScore as number | undefined;
      if (minCreditScore && applicant.creditScore !== undefined) {
        if (applicant.creditScore < minCreditScore) {
          reasons.push(`Credit score ${applicant.creditScore} below required ${minCreditScore}`);
          eligible = false;
        }
      }

      const maxDTI = criteria.maxDebtToIncomeRatio as number | undefined;
      if (maxDTI && applicant.debtToIncomeRatio !== undefined) {
        if (applicant.debtToIncomeRatio > maxDTI) {
          reasons.push(`DTI ratio ${applicant.debtToIncomeRatio}% exceeds max ${maxDTI}%`);
          eligible = false;
        }
      }

      const minIncome = criteria.minMonthlyIncome as number | undefined;
      if (minIncome && applicant.monthlyIncome !== undefined) {
        if (applicant.monthlyIncome < minIncome) {
          reasons.push(`Monthly income N$${applicant.monthlyIncome} below required N$${minIncome}`);
          eligible = false;
        }
      }

      const minAge = criteria.minAge as number | undefined;
      if (minAge && applicant.age !== undefined) {
        if (applicant.age < minAge) {
          reasons.push(`Age ${applicant.age} below minimum ${minAge}`);
          eligible = false;
        }
      }

      const requiresEmployment = criteria.requiresEmployment as boolean | undefined;
      if (requiresEmployment && applicant.isEmployed === false) {
        reasons.push('Employment required');
        eligible = false;
      }
    }

    // KYC requirement check
    if (config.requiresKYC && !applicant.kycLevel) {
      reasons.push('KYC verification required');
      eligible = false;
    }

    return {
      eligible,
      reasons,
      productVersionId,
      versionNumber: version.versionNumber,
      checkedAt: Date.now(),
    };
  },
});

// ---------------------------------------------------------------------------
// Admin: Seed Personal Loan product (one-time)
// ---------------------------------------------------------------------------

/**
 * Seed the "Personal Loan" product with current hardcoded parameters.
 * This extracts NamLend's existing loan parameters into a configurable product.
 * Idempotent -- checks before inserting.
 */
export const seedPersonalLoan = mutation({
  args: {
    institutionId: v.optional(v.id('institutions')),
  },
  handler: async (ctx, { institutionId }) => {
    const adminId = await assertAdmin(ctx);
    const now = Date.now();

    // Idempotency check
    const existing = await ctx.db
      .query('productDefinitions')
      .withIndex('by_productCode', (q) => q.eq('productCode', 'personal_loan'))
      .first();
    if (existing) {
      // Check if it has a version
      const version = await ctx.db
        .query('productVersions')
        .withIndex('by_productId_current', (q) =>
          q.eq('productId', existing._id).eq('isCurrentVersion', true)
        )
        .first();
      return { productId: existing._id, versionId: version?._id, alreadyExists: true };
    }

    // Create the product definition
    const productId = await ctx.db.insert('productDefinitions', {
      productCode: 'personal_loan',
      name: 'Personal Loan',
      category: 'loan',
      status: 'active',
      description:
        'Standard personal loan for Namibian residents. Variable term, competitive rates.',
      institutionId,
      createdAt: now,
      updatedAt: now,
    });

    // Create v1 with current hardcoded parameters
    const versionId = await ctx.db.insert('productVersions', {
      productId,
      versionNumber: 1,
      isCurrentVersion: true,
      config: {
        minAmount: 500,
        maxAmount: 500000,
        minTermMonths: 1,
        maxTermMonths: 360,
        defaultInterestRate: 18,
        maxInterestRate: 32, // APR_LIMIT
        fees: {
          initiation: { type: 'percentage', value: 1.5, minNAD: 50, maxNAD: 2500 },
          serviceMonthly: { type: 'fixed', value: 69 },
          insurance: { type: 'percentage', value: 0.5 },
        },
        eligibilityCriteria: {
          minCreditScore: 500,
          maxDebtToIncomeRatio: 50,
          minMonthlyIncome: 3000,
          minAge: 18,
          requiresEmployment: true,
        },
        allowedRails: ['ips', 'bank_transfer', 'mobile_money', 'cash', 'cheque'],
        requiresMandate: false,
        requiresKYC: true,
      },
      effectiveFrom: now,
      approvedBy: adminId,
      changeReason: 'Initial product configuration extracted from hardcoded parameters',
      createdAt: now,
    });

    emitEvent(ctx, {
      eventType: 'product.created',
      entityType: 'productDefinitions',
      entityId: productId,
      domainSource: 'products',
      correlationId: generateCorrelationId(),
      actorId: adminId,
      actorType: 'user',
      payload: { productCode: 'personal_loan', seeded: true, versionNumber: 1 },
    });

    scheduleAuditLog(
      ctx,
      'productDefinitions',
      productId,
      'SEED',
      'none',
      'active',
      'Personal Loan seeded'
    );

    // Ontology: institution -> offers -> product
    if (institutionId) {
      emitRelationship(
        ctx,
        { type: 'institutions', id: institutionId },
        { type: 'productDefinitions', id: productId },
        'offers'
      );
    }

    return { productId, versionId, alreadyExists: false };
  },
});
