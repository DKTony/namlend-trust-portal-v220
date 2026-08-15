/**
 * IPS Alerts — transaction threshold monitoring.
 */

import { ConvexError, v } from 'convex/values';
import { mutation, query } from '../_generated/server';
import { assertOwnerOrTenantStaff, assertStaff, assertTenantStaff } from '../lib/auth';

export const getActiveAlerts = query({
  args: {},
  handler: async (ctx) => {
    await assertStaff(ctx);
    return ctx.db
      .query('ipsAlerts')
      .withIndex('by_isResolved', (q) => q.eq('isResolved', false))
      .order('desc')
      .collect();
  },
});

export const createAlert = mutation({
  args: {
    transactionId: v.optional(v.id('ipsTransactions')),
    alertType: v.string(),
    severity: v.union(v.literal('info'), v.literal('warning'), v.literal('critical')),
    message: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await assertStaff(ctx);
    if (args.transactionId) {
      const tx = await ctx.db.get(args.transactionId);
      if (!tx) {
        throw new ConvexError({ code: 'NOT_FOUND', message: 'IPS transaction not found.' });
      }
      if (tx.userId) {
        await assertOwnerOrTenantStaff(ctx, tx.userId, tx.institutionId);
      } else if (tx.institutionId) {
        await assertTenantStaff(ctx, tx.institutionId);
      }
    }
    return ctx.db.insert('ipsAlerts', {
      ...args,
      isResolved: false,
      createdAt: Date.now(),
    });
  },
});

export const resolveAlert = mutation({
  args: { alertId: v.id('ipsAlerts') },
  handler: async (ctx, { alertId }) => {
    const staffId = await assertStaff(ctx);
    await ctx.db.patch(alertId, {
      isResolved: true,
      resolvedAt: Date.now(),
      resolvedBy: staffId,
    });
  },
});
