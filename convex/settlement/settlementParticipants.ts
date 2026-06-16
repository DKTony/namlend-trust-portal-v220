/**
 * Settlement participants, windows, holidays, fee rules.
 */

import { v } from 'convex/values';
import { internalQuery, mutation, query } from '../_generated/server';
import { assertAdmin, assertStaff } from '../lib/auth';

export const listParticipants = query({
  args: {},
  handler: async (ctx) => {
    await assertStaff(ctx);
    return ctx.db.query('settlementParticipants').collect();
  },
});

export const getParticipant = query({
  args: { participantId: v.id('settlementParticipants') },
  handler: async (ctx, { participantId }) => {
    await assertStaff(ctx);
    return ctx.db.get(participantId);
  },
});

export const listActiveParticipantsInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    return ctx.db
      .query('settlementParticipants')
      .collect()
      .then((rows) => rows.filter((row) => row.status === 'active'));
  },
});

export const createParticipant = mutation({
  args: {
    routingCode: v.string(),
    swiftBic: v.string(),
    name: v.string(),
    participantType: v.union(v.literal('direct'), v.literal('sponsored')),
    sponsorId: v.optional(v.id('settlementParticipants')),
    nissAccountRef: v.optional(v.string()),
    isOperator: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    const now = Date.now();
    return ctx.db.insert('settlementParticipants', {
      ...args,
      isOperator: args.isOperator ?? false,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const listSettlementWindows = query({
  args: {},
  handler: async (ctx) => {
    await assertStaff(ctx);
    return ctx.db.query('settlementWindows').collect();
  },
});

export const listHolidays = query({
  args: {},
  handler: async (ctx) => {
    await assertStaff(ctx);
    return ctx.db.query('settlementHolidays').collect();
  },
});

export const listFeeRules = query({
  args: {},
  handler: async (ctx) => {
    await assertStaff(ctx);
    return ctx.db.query('settlementFeeRules').collect();
  },
});
