/**
 * Payment Rails -- first-class payment infrastructure entities.
 *
 * Ontology: Entity(PaymentRail) with cost, availability, health, and retry semantics.
 * Events: rail.created, rail.updated, rail.health_check, rail.status_changed
 *
 * Security model:
 *   createRail / updateRail / seedDefaultRails - admin only
 *   updateHealth                               - internal (cron)
 *   queries                                    - staff-only
 */

import { ConvexError, v } from 'convex/values';
import { internalMutation, mutation, query } from '../_generated/server';
import { scheduleAuditLog } from '../lib/audit';
import { emitEvent, generateCorrelationId } from '../lib/eventEmitter';
import { assertAdminOrPlatformOwner, assertStaffOrPlatformSupport } from '../lib/platformAuth';
import { paymentRailStatus } from '../schema';

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Create a new payment rail.
 */
export const createRail = mutation({
  args: {
    railCode: v.string(),
    displayName: v.string(),
    provider: v.optional(v.string()),
    availability: v.object({
      businessHoursOnly: v.boolean(),
      startTime: v.optional(v.string()),
      endTime: v.optional(v.string()),
      excludeWeekends: v.boolean(),
      excludeHolidays: v.boolean(),
    }),
    costModel: v.object({
      fixedFeeNAD: v.optional(v.number()),
      percentageFee: v.optional(v.number()),
      minFeeNAD: v.optional(v.number()),
      maxFeeNAD: v.optional(v.number()),
    }),
    settlementLatencyMinutes: v.optional(v.number()),
    retryPolicy: v.object({
      maxRetries: v.number(),
      backoffMultiplier: v.number(),
      initialDelayMs: v.number(),
    }),
    supportedDirections: v.array(
      v.union(v.literal('disbursement'), v.literal('collection'), v.literal('both'))
    ),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const adminId = await assertAdminOrPlatformOwner(ctx);
    const now = Date.now();

    // Uniqueness check
    const existing = await ctx.db
      .query('paymentRails')
      .withIndex('by_railCode', (q) => q.eq('railCode', args.railCode))
      .first();
    if (existing) {
      throw new ConvexError({
        code: 'DUPLICATE',
        message: `Rail with code "${args.railCode}" already exists.`,
      });
    }

    const railId = await ctx.db.insert('paymentRails', {
      ...args,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });

    emitEvent(ctx, {
      eventType: 'rail.created',
      entityType: 'paymentRails',
      entityId: railId,
      domainSource: 'payments',
      correlationId: generateCorrelationId(),
      actorId: adminId,
      actorType: 'user',
      payload: { railCode: args.railCode, displayName: args.displayName },
    });

    scheduleAuditLog(ctx, 'paymentRails', railId, 'CREATE', 'none', 'active');
    return railId;
  },
});

/**
 * Update rail configuration or status.
 */
export const updateRail = mutation({
  args: {
    railId: v.id('paymentRails'),
    displayName: v.optional(v.string()),
    provider: v.optional(v.string()),
    status: v.optional(paymentRailStatus),
    availability: v.optional(
      v.object({
        businessHoursOnly: v.boolean(),
        startTime: v.optional(v.string()),
        endTime: v.optional(v.string()),
        excludeWeekends: v.boolean(),
        excludeHolidays: v.boolean(),
      })
    ),
    costModel: v.optional(
      v.object({
        fixedFeeNAD: v.optional(v.number()),
        percentageFee: v.optional(v.number()),
        minFeeNAD: v.optional(v.number()),
        maxFeeNAD: v.optional(v.number()),
      })
    ),
    settlementLatencyMinutes: v.optional(v.number()),
    retryPolicy: v.optional(
      v.object({
        maxRetries: v.number(),
        backoffMultiplier: v.number(),
        initialDelayMs: v.number(),
      })
    ),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const adminId = await assertAdminOrPlatformOwner(ctx);
    const rail = await ctx.db.get(args.railId);
    if (!rail) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Payment rail not found.' });
    }

    const oldStatus = rail.status;
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.displayName !== undefined) updates.displayName = args.displayName;
    if (args.provider !== undefined) updates.provider = args.provider;
    if (args.status !== undefined) updates.status = args.status;
    if (args.availability !== undefined) updates.availability = args.availability;
    if (args.costModel !== undefined) updates.costModel = args.costModel;
    if (args.settlementLatencyMinutes !== undefined)
      updates.settlementLatencyMinutes = args.settlementLatencyMinutes;
    if (args.retryPolicy !== undefined) updates.retryPolicy = args.retryPolicy;
    if (args.metadata !== undefined) updates.metadata = args.metadata;

    await ctx.db.patch(args.railId, updates);

    if (args.status && args.status !== oldStatus) {
      emitEvent(ctx, {
        eventType: 'rail.status_changed',
        entityType: 'paymentRails',
        entityId: args.railId,
        domainSource: 'payments',
        correlationId: generateCorrelationId(),
        actorId: adminId,
        actorType: 'user',
        payload: { railCode: rail.railCode, from: oldStatus, to: args.status },
      });
    }

    scheduleAuditLog(
      ctx,
      'paymentRails',
      args.railId,
      'UPDATE',
      oldStatus,
      (args.status ?? oldStatus) as string
    );
  },
});

/**
 * Update rail health status (called by health monitor cron).
 */
export const updateRailHealth = internalMutation({
  args: {
    railId: v.id('paymentRails'),
    healthStatus: v.string(),
    newStatus: v.optional(paymentRailStatus),
  },
  handler: async (ctx, { railId, healthStatus, newStatus }) => {
    const rail = await ctx.db.get(railId);
    if (!rail) return;

    const now = Date.now();
    const updates: Record<string, unknown> = {
      lastHealthCheck: now,
      lastHealthStatus: healthStatus,
      updatedAt: now,
    };

    if (newStatus && newStatus !== rail.status) {
      updates.status = newStatus;
      emitEvent(ctx, {
        eventType: 'rail.status_changed',
        entityType: 'paymentRails',
        entityId: railId,
        domainSource: 'payments',
        correlationId: generateCorrelationId(),
        actorType: 'system',
        payload: {
          railCode: rail.railCode,
          from: rail.status,
          to: newStatus,
          trigger: 'health_check',
          healthStatus,
        },
      });
    }

    emitEvent(ctx, {
      eventType: 'rail.health_check',
      entityType: 'paymentRails',
      entityId: railId,
      domainSource: 'payments',
      correlationId: generateCorrelationId(),
      actorType: 'system',
      payload: { railCode: rail.railCode, healthStatus },
    });

    await ctx.db.patch(railId, updates);
  },
});

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Get a single rail by ID.
 */
export const getRail = query({
  args: { railId: v.id('paymentRails') },
  handler: async (ctx, { railId }) => {
    await assertStaffOrPlatformSupport(ctx);
    return ctx.db.get(railId);
  },
});

/**
 * Get rail by code (e.g. "ips").
 */
export const getRailByCode = query({
  args: { railCode: v.string() },
  handler: async (ctx, { railCode }) => {
    await assertStaffOrPlatformSupport(ctx);
    return ctx.db
      .query('paymentRails')
      .withIndex('by_railCode', (q) => q.eq('railCode', railCode))
      .first();
  },
});

/**
 * List all rails, optionally filtered by status.
 */
export const listRails = query({
  args: {
    status: v.optional(paymentRailStatus),
  },
  handler: async (ctx, { status }) => {
    await assertStaffOrPlatformSupport(ctx);
    if (status) {
      return ctx.db
        .query('paymentRails')
        .withIndex('by_status', (q) => q.eq('status', status))
        .collect();
    }
    return ctx.db.query('paymentRails').collect();
  },
});

/**
 * Get all active rails (used by rail selector).
 */
export const getActiveRails = query({
  args: {},
  handler: async (ctx) => {
    await assertStaffOrPlatformSupport(ctx);
    return ctx.db
      .query('paymentRails')
      .withIndex('by_status', (q) => q.eq('status', 'active'))
      .collect();
  },
});

// ---------------------------------------------------------------------------
// Admin: Seed default rails (one-time)
// ---------------------------------------------------------------------------

/**
 * Seed the 5 default Namibian payment rails.
 * Idempotent -- checks before inserting each rail.
 */
export const seedDefaultRails = mutation({
  args: {},
  handler: async (ctx) => {
    await assertAdminOrPlatformOwner(ctx);
    const now = Date.now();
    let created = 0;

    const defaults = [
      {
        railCode: 'ips',
        displayName: 'Interbank Payment System (IPS)',
        provider: 'Namclear / Bank of Namibia',
        availability: {
          businessHoursOnly: true,
          startTime: '07:00',
          endTime: '17:00',
          excludeWeekends: true,
          excludeHolidays: true,
        },
        costModel: {
          fixedFeeNAD: 5.0,
          percentageFee: 0,
        },
        settlementLatencyMinutes: 15,
        retryPolicy: { maxRetries: 3, backoffMultiplier: 2, initialDelayMs: 5000 },
        supportedDirections: ['both' as const],
      },
      {
        railCode: 'bank_transfer',
        displayName: 'Bank Transfer (EFT)',
        provider: 'Commercial Banks',
        availability: {
          businessHoursOnly: true,
          startTime: '08:00',
          endTime: '15:30',
          excludeWeekends: true,
          excludeHolidays: true,
        },
        costModel: {
          fixedFeeNAD: 15.0,
          percentageFee: 0,
        },
        settlementLatencyMinutes: 1440, // 24 hours
        retryPolicy: { maxRetries: 2, backoffMultiplier: 2, initialDelayMs: 10000 },
        supportedDirections: ['both' as const],
      },
      {
        railCode: 'mobile_money',
        displayName: 'Mobile Money',
        provider: 'MTC / TN Mobile',
        availability: {
          businessHoursOnly: false,
          excludeWeekends: false,
          excludeHolidays: false,
        },
        costModel: {
          percentageFee: 1.5,
          minFeeNAD: 2.0,
          maxFeeNAD: 50.0,
        },
        settlementLatencyMinutes: 5,
        retryPolicy: { maxRetries: 3, backoffMultiplier: 1.5, initialDelayMs: 3000 },
        supportedDirections: ['both' as const],
      },
      {
        railCode: 'cash',
        displayName: 'Cash (In-Branch)',
        availability: {
          businessHoursOnly: true,
          startTime: '08:00',
          endTime: '16:00',
          excludeWeekends: true,
          excludeHolidays: true,
        },
        costModel: {
          fixedFeeNAD: 0,
        },
        settlementLatencyMinutes: 0,
        retryPolicy: { maxRetries: 0, backoffMultiplier: 1, initialDelayMs: 0 },
        supportedDirections: ['both' as const],
      },
      {
        railCode: 'cheque',
        displayName: 'Cheque',
        availability: {
          businessHoursOnly: true,
          startTime: '08:00',
          endTime: '15:00',
          excludeWeekends: true,
          excludeHolidays: true,
        },
        costModel: {
          fixedFeeNAD: 25.0,
        },
        settlementLatencyMinutes: 4320, // 3 days
        retryPolicy: { maxRetries: 0, backoffMultiplier: 1, initialDelayMs: 0 },
        supportedDirections: ['disbursement' as const],
      },
    ];

    for (const rail of defaults) {
      const existing = await ctx.db
        .query('paymentRails')
        .withIndex('by_railCode', (q) => q.eq('railCode', rail.railCode))
        .first();
      if (existing) continue;

      await ctx.db.insert('paymentRails', {
        ...rail,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      });
      created++;
    }

    return { created };
  },
});
