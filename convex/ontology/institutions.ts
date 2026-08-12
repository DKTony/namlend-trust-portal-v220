/**
 * Institutions -- multi-tenancy backbone for the Financial Ontology Engine.
 *
 * Ontology: Entity(Institution) + Relationship(Institution -> licensed_by -> BON)
 * Events: institution.created, institution.updated, institution.suspended
 *
 * Security model:
 *   createInstitution    - admin only
 *   updateInstitution    - admin only
 *   getInstitution       - staff (own institution or admin)
 *   listInstitutions     - admin only
 *   config mutations     - admin only
 *   seedOgFinancialServices - admin only (one-time)
 *   backfillInstitution  - admin only (one-time)
 */

import { ConvexError, v } from 'convex/values';
import { mutation, query } from '../_generated/server';
import { scheduleAuditLog } from '../lib/audit';
import { assertAdmin, assertStaff } from '../lib/auth';
import { emitEvent, generateCorrelationId } from '../lib/eventEmitter';
import { emitRelationship } from '../lib/relationshipEmitter';
import { effectiveAt } from '../lib/temporal';
import { institutionStatus, institutionType } from '../schema';

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Create a new institution.
 * Admin-only -- this is a platform-level operation.
 */
export const createInstitution = mutation({
  args: {
    name: v.string(),
    shortCode: v.string(),
    type: institutionType,
    registrationNumber: v.optional(v.string()),
    regulatoryLicense: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    address: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const adminId = await assertAdmin(ctx);
    const now = Date.now();
    const correlationId = generateCorrelationId();

    // Uniqueness check on shortCode
    const existing = await ctx.db
      .query('institutions')
      .withIndex('by_shortCode', (q) => q.eq('shortCode', args.shortCode))
      .first();
    if (existing) {
      throw new ConvexError({
        code: 'DUPLICATE',
        message: `Institution with shortCode "${args.shortCode}" already exists.`,
      });
    }

    const institutionId = await ctx.db.insert('institutions', {
      name: args.name,
      shortCode: args.shortCode,
      type: args.type,
      registrationNumber: args.registrationNumber,
      regulatoryLicense: args.regulatoryLicense,
      status: 'active',
      contactEmail: args.contactEmail,
      contactPhone: args.contactPhone,
      address: args.address,
      metadata: args.metadata,
      createdAt: now,
      updatedAt: now,
    });

    emitEvent(ctx, {
      eventType: 'institution.created',
      entityType: 'institutions',
      entityId: institutionId,
      domainSource: 'institutions',
      correlationId,
      actorId: adminId,
      actorType: 'user',
      payload: {
        name: args.name,
        shortCode: args.shortCode,
        type: args.type,
      },
    });

    scheduleAuditLog(ctx, 'institutions', institutionId, 'CREATE', 'none', 'active');

    return institutionId;
  },
});

/**
 * Update institution details.
 */
export const updateInstitution = mutation({
  args: {
    institutionId: v.id('institutions'),
    name: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    address: v.optional(v.string()),
    status: v.optional(institutionStatus),
    regulatoryLicense: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const adminId = await assertAdmin(ctx);
    const inst = await ctx.db.get(args.institutionId);
    if (!inst) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Institution not found.' });
    }

    const oldStatus = inst.status;
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.contactEmail !== undefined) updates.contactEmail = args.contactEmail;
    if (args.contactPhone !== undefined) updates.contactPhone = args.contactPhone;
    if (args.address !== undefined) updates.address = args.address;
    if (args.status !== undefined) updates.status = args.status;
    if (args.regulatoryLicense !== undefined) updates.regulatoryLicense = args.regulatoryLicense;
    if (args.metadata !== undefined) updates.metadata = args.metadata;

    await ctx.db.patch(args.institutionId, updates);

    if (args.status && args.status !== oldStatus) {
      emitEvent(ctx, {
        eventType: `institution.${args.status}`,
        entityType: 'institutions',
        entityId: args.institutionId,
        domainSource: 'institutions',
        correlationId: generateCorrelationId(),
        actorId: adminId,
        actorType: 'user',
        payload: { from: oldStatus, to: args.status },
      });
    }

    scheduleAuditLog(
      ctx,
      'institutions',
      args.institutionId,
      'UPDATE',
      oldStatus,
      (args.status ?? oldStatus) as string
    );
  },
});

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Get a single institution by ID.
 */
export const getInstitution = query({
  args: { institutionId: v.id('institutions') },
  handler: async (ctx, { institutionId }) => {
    await assertStaff(ctx);
    return ctx.db.get(institutionId);
  },
});

/**
 * Get institution by shortCode (e.g. "OGFS").
 */
export const getInstitutionByCode = query({
  args: { shortCode: v.string() },
  handler: async (ctx, { shortCode }) => {
    await assertStaff(ctx);
    return ctx.db
      .query('institutions')
      .withIndex('by_shortCode', (q) => q.eq('shortCode', shortCode))
      .first();
  },
});

/**
 * List all institutions (staff view).
 */
export const listInstitutions = query({
  args: {
    status: v.optional(institutionStatus),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { status, limit }) => {
    await assertStaff(ctx);
    if (status) {
      return ctx.db
        .query('institutions')
        .withIndex('by_status', (q) => q.eq('status', status))
        .take(limit ?? 100);
    }
    return ctx.db.query('institutions').take(limit ?? 100);
  },
});

// ---------------------------------------------------------------------------
// Institution Configuration (temporally versioned)
// ---------------------------------------------------------------------------

/**
 * Set a configuration value for an institution.
 * Uses close-and-insert pattern: closes the old record, inserts a new one.
 */
export const setInstitutionConfig = mutation({
  args: {
    institutionId: v.id('institutions'),
    key: v.string(),
    value: v.any(),
  },
  handler: async (ctx, args) => {
    const adminId = await assertAdmin(ctx);
    const now = Date.now();

    const inst = await ctx.db.get(args.institutionId);
    if (!inst) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Institution not found.' });
    }

    // Find current effective config for this key
    const configs = await ctx.db
      .query('institutionConfig')
      .withIndex('by_institution_key', (q) =>
        q.eq('institutionId', args.institutionId).eq('key', args.key)
      )
      .collect();

    const current = effectiveAt(configs, now);
    const nextVersion = current ? (current as { version: number }).version + 1 : 1;

    // Close the old record
    if (current) {
      await ctx.db.patch((current as { _id: string })._id as never, {
        effectiveTo: now,
      });
    }

    // Insert new versioned record
    const configId = await ctx.db.insert('institutionConfig', {
      institutionId: args.institutionId,
      key: args.key,
      value: args.value,
      effectiveFrom: now,
      version: nextVersion,
      updatedBy: adminId,
      createdAt: now,
    });

    scheduleAuditLog(ctx, 'institutionConfig', configId, 'SET', 'none', 'active');
    return configId;
  },
});

/**
 * Get current effective config for an institution key.
 */
export const getInstitutionConfig = query({
  args: {
    institutionId: v.id('institutions'),
    key: v.string(),
    asOf: v.optional(v.number()),
  },
  handler: async (ctx, { institutionId, key, asOf }) => {
    await assertStaff(ctx);

    const configs = await ctx.db
      .query('institutionConfig')
      .withIndex('by_institution_key', (q) => q.eq('institutionId', institutionId).eq('key', key))
      .collect();

    const effective = effectiveAt(configs, asOf ?? Date.now());
    return effective ? (effective as { value: unknown }).value : null;
  },
});

/**
 * Get all current config for an institution.
 */
export const getAllInstitutionConfig = query({
  args: {
    institutionId: v.id('institutions'),
  },
  handler: async (ctx, { institutionId }) => {
    await assertStaff(ctx);

    const allConfigs = await ctx.db
      .query('institutionConfig')
      .withIndex('by_institution_key', (q) => q.eq('institutionId', institutionId))
      .collect();

    // Group by key, return only currently effective
    const now = Date.now();
    const byKey: Record<string, unknown> = {};
    const grouped: Record<string, Array<{ effectiveFrom: number; effectiveTo?: number }>> = {};

    for (const c of allConfigs) {
      if (!grouped[c.key]) grouped[c.key] = [];
      grouped[c.key].push(c);
    }

    for (const [key, records] of Object.entries(grouped)) {
      const eff = effectiveAt(records, now);
      if (eff) byKey[key] = (eff as unknown as { value: unknown }).value;
    }

    return byKey;
  },
});

// ---------------------------------------------------------------------------
// Admin: Seed OG Financial Services (one-time)
// ---------------------------------------------------------------------------

/**
 * Seed OG Financial Services and its NAMFISA regulator relationship.
 * Idempotent -- checks before inserting.
 */
export const seedOgFinancialServices = mutation({
  args: {},
  handler: async (ctx) => {
    const adminId = await assertAdmin(ctx);
    const now = Date.now();

    // Idempotency check
    const existing = await ctx.db
      .query('institutions')
      .withIndex('by_shortCode', (q) => q.eq('shortCode', 'OGFS'))
      .first();
    if (existing) return { institutionId: existing._id, alreadyExists: true };

    const institutionId = await ctx.db.insert('institutions', {
      name: 'OG Financial Services',
      legalName: 'OG Financial Services CC',
      shortCode: 'OGFS',
      type: 'lender',
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
      status: 'active',
      metadata: {
        jurisdiction: 'Namibia',
        regulator: 'NAMFISA',
      },
      createdAt: now,
      updatedAt: now,
    });

    let namfisa = await ctx.db
      .query('institutions')
      .withIndex('by_shortCode', (q) => q.eq('shortCode', 'NAMFISA'))
      .first();
    if (!namfisa) {
      const namfisaId = await ctx.db.insert('institutions', {
        name: 'Namibia Financial Institutions Supervisory Authority',
        shortCode: 'NAMFISA',
        type: 'regulator',
        status: 'active',
        metadata: { role: 'Non-bank financial institutions regulator' },
        createdAt: now,
        updatedAt: now,
      });
      namfisa = await ctx.db.get(namfisaId);
    }

    // Ontology: OG Financial Services -> licensed_by -> NAMFISA
    emitRelationship(
      ctx,
      { type: 'institutions', id: institutionId },
      { type: 'institutions', id: namfisa!._id },
      'licensed_by'
    );

    emitEvent(ctx, {
      eventType: 'institution.created',
      entityType: 'institutions',
      entityId: institutionId,
      domainSource: 'institutions',
      correlationId: generateCorrelationId(),
      actorId: adminId,
      actorType: 'user',
      payload: { name: 'OG Financial Services', shortCode: 'OGFS', seeded: true },
    });

    // Seed default institution config
    const defaults: Array<[string, unknown]> = [
      ['max_apr', 32],
      ['currency', 'NAD'],
      ['min_loan_amount', 500],
      ['max_loan_amount', 500000],
      ['min_term_months', 1],
      ['max_term_months', 360],
      ['data_retention_years', 7],
      ['mandate_required_for_disbursement', false],
    ];

    for (const [key, value] of defaults) {
      await ctx.db.insert('institutionConfig', {
        institutionId,
        key,
        value,
        effectiveFrom: now,
        version: 1,
        updatedBy: adminId,
        createdAt: now,
      });
    }

    scheduleAuditLog(
      ctx,
      'institutions',
      institutionId,
      'SEED',
      'none',
      'active',
      'OG Financial Services seeded'
    );

    return { institutionId, regulatorId: namfisa!._id, alreadyExists: false };
  },
});

// ---------------------------------------------------------------------------
// Admin: Backfill existing records with institutionId
// ---------------------------------------------------------------------------

/**
 * Backfill all existing records with the primary tenant institutionId.
 * Idempotent -- skips records that already have an institutionId.
 * Run once after seedOgFinancialServices().
 */
export const backfillInstitutionId = mutation({
  args: {
    institutionId: v.id('institutions'),
  },
  handler: async (ctx, { institutionId }) => {
    await assertAdmin(ctx);

    const inst = await ctx.db.get(institutionId);
    if (!inst) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Institution not found.' });
    }

    let updated = 0;
    const BATCH = 5000;

    // Backfill loans
    const loans = await ctx.db.query('loans').take(BATCH);
    for (const loan of loans) {
      if (!loan.institutionId) {
        await ctx.db.patch(loan._id, { institutionId });
        updated++;
      }
    }

    // Backfill disbursements
    const disbursements = await ctx.db.query('disbursements').take(BATCH);
    for (const d of disbursements) {
      if (!d.institutionId) {
        await ctx.db.patch(d._id, { institutionId });
        updated++;
      }
    }

    // Backfill payments
    const payments = await ctx.db.query('paymentTransactions').take(BATCH);
    for (const p of payments) {
      if (!p.institutionId) {
        await ctx.db.patch(p._id, { institutionId });
        updated++;
      }
    }

    // Backfill approval requests
    const approvals = await ctx.db.query('approvalRequests').take(BATCH);
    for (const a of approvals) {
      if (!a.institutionId) {
        await ctx.db.patch(a._id, { institutionId });
        updated++;
      }
    }

    // Backfill mandates
    const mandates = await ctx.db.query('mandates').take(BATCH);
    for (const m of mandates) {
      if (!m.institutionId) {
        await ctx.db.patch(m._id, { institutionId });
        updated++;
      }
    }

    scheduleAuditLog(
      ctx,
      'institutions',
      institutionId,
      'BACKFILL',
      'none',
      'active',
      `Backfilled ${updated} records`
    );

    return { updated, institutionId: inst.shortCode };
  },
});
