/**
 * TigerBeetle account registry — shadow ledger account tracking.
 */

import { v } from 'convex/values';
import { mutation, query } from '../_generated/server';
import { assertStaff } from '../lib/auth';

export const getTigerBeetleAccount = query({
  args: {
    entityType: v.string(),
    entityId: v.string(),
  },
  handler: async (ctx, { entityType, entityId }) => {
    await assertStaff(ctx);
    return ctx.db
      .query('tigerBeetleAccounts')
      .withIndex('by_entityId', (q: any) => q.eq('entityType', entityType).eq('entityId', entityId))
      .first();
  },
});

export const createTigerBeetleAccount = mutation({
  args: {
    entityType: v.string(),
    entityId: v.string(),
    tbAccountIdHigh: v.number(),
    tbAccountIdLow: v.number(),
    ledger: v.number(),
    code: v.number(),
  },
  handler: async (ctx, args) => {
    await assertStaff(ctx);
    return ctx.db.insert('tigerBeetleAccounts', {
      ...args,
      status: 'pending',
      createdAt: Date.now(),
    });
  },
});
