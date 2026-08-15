/**
 * Client budget tracker — owner-scoped entries, category limits, and savings goals.
 */

import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { scheduleAuditLog } from './lib/audit';
import { assertAuthenticated, assertOwner } from './lib/auth';

const entryType = v.union(v.literal('in'), v.literal('out'));

const budgetEntryReturn = v.object({
  _id: v.id('budgetEntries'),
  date: v.string(),
  description: v.string(),
  category: v.string(),
  type: entryType,
  amount: v.number(),
  source: v.string(),
  createdAt: v.number(),
});

export const listMyBudgetEntries = query({
  args: {},
  returns: v.array(budgetEntryReturn),
  handler: async (ctx) => {
    const userId = await assertAuthenticated(ctx);
    const rows = await ctx.db
      .query('budgetEntries')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .order('desc')
      .take(500);
    return rows.map((row) => ({
      _id: row._id,
      date: row.date,
      description: row.description,
      category: row.category,
      type: row.type,
      amount: row.amount,
      source: row.source,
      createdAt: row.createdAt,
    }));
  },
});

export const listMySavingsGoals = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('savingsGoals'),
      name: v.string(),
      targetAmount: v.number(),
      currentAmount: v.number(),
      deadline: v.optional(v.string()),
      icon: v.optional(v.string()),
    })
  ),
  handler: async (ctx) => {
    const userId = await assertAuthenticated(ctx);
    const rows = await ctx.db
      .query('savingsGoals')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .take(100);
    return rows.map((row) => ({
      _id: row._id,
      name: row.name,
      targetAmount: row.targetAmount,
      currentAmount: row.currentAmount,
      deadline: row.deadline,
      icon: row.icon,
    }));
  },
});

export const listMyBudgetLimits = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('budgetLimits'),
      category: v.string(),
      limit: v.number(),
      color: v.optional(v.string()),
    })
  ),
  handler: async (ctx) => {
    const userId = await assertAuthenticated(ctx);
    const rows = await ctx.db
      .query('budgetLimits')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .take(50);
    return rows.map((row) => ({
      _id: row._id,
      category: row.category,
      limit: row.limit,
      color: row.color,
    }));
  },
});

export const createBudgetEntry = mutation({
  args: {
    date: v.string(),
    description: v.string(),
    category: v.string(),
    type: entryType,
    amount: v.number(),
    source: v.optional(v.string()),
  },
  returns: v.id('budgetEntries'),
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);
    if (!args.description.trim()) {
      throw new ConvexError({ code: 'VALIDATION_ERROR', message: 'Description is required.' });
    }
    if (!(args.amount > 0)) {
      throw new ConvexError({ code: 'VALIDATION_ERROR', message: 'Amount must be positive.' });
    }
    const id = await ctx.db.insert('budgetEntries', {
      userId,
      date: args.date,
      description: args.description.trim(),
      category: args.category.trim() || 'Other',
      type: args.type,
      amount: args.amount,
      source: args.source?.trim() || 'Manual',
      createdAt: Date.now(),
    });
    scheduleAuditLog(ctx, 'budgetEntries', id, 'CREATE', 'none', 'created');
    return id;
  },
});

export const importBudgetEntries = mutation({
  args: {
    entries: v.array(
      v.object({
        date: v.string(),
        description: v.string(),
        category: v.string(),
        type: entryType,
        amount: v.number(),
        source: v.optional(v.string()),
      })
    ),
  },
  returns: v.object({ imported: v.number() }),
  handler: async (ctx, { entries }) => {
    const userId = await assertAuthenticated(ctx);
    if (entries.length === 0) {
      throw new ConvexError({ code: 'VALIDATION_ERROR', message: 'No entries to import.' });
    }
    if (entries.length > 200) {
      throw new ConvexError({
        code: 'VALIDATION_ERROR',
        message: 'Import is limited to 200 rows at a time.',
      });
    }
    let imported = 0;
    for (const entry of entries) {
      if (!(entry.amount > 0) || !entry.description.trim()) continue;
      await ctx.db.insert('budgetEntries', {
        userId,
        date: entry.date,
        description: entry.description.trim(),
        category: entry.category.trim() || 'Other',
        type: entry.type,
        amount: entry.amount,
        source: entry.source?.trim() || 'Statement Upload',
        createdAt: Date.now(),
      });
      imported += 1;
    }
    return { imported };
  },
});

export const createSavingsGoal = mutation({
  args: {
    name: v.string(),
    targetAmount: v.number(),
    deadline: v.optional(v.string()),
    icon: v.optional(v.string()),
  },
  returns: v.id('savingsGoals'),
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);
    if (!args.name.trim()) {
      throw new ConvexError({ code: 'VALIDATION_ERROR', message: 'Goal name is required.' });
    }
    if (!(args.targetAmount > 0)) {
      throw new ConvexError({
        code: 'VALIDATION_ERROR',
        message: 'Target amount must be positive.',
      });
    }
    const now = Date.now();
    const id = await ctx.db.insert('savingsGoals', {
      userId,
      name: args.name.trim(),
      targetAmount: args.targetAmount,
      currentAmount: 0,
      deadline: args.deadline?.trim() || undefined,
      icon: args.icon,
      createdAt: now,
      updatedAt: now,
    });
    scheduleAuditLog(ctx, 'savingsGoals', id, 'CREATE', 'none', 'created');
    return id;
  },
});

export const addFundsToGoal = mutation({
  args: {
    goalId: v.id('savingsGoals'),
    amount: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, { goalId, amount }) => {
    const userId = await assertAuthenticated(ctx);
    const goal = await ctx.db.get(goalId);
    if (!goal) throw new ConvexError({ code: 'NOT_FOUND', message: 'Savings goal not found.' });
    await assertOwner(ctx, goal.userId);
    if (goal.userId !== userId) {
      throw new ConvexError({ code: 'FORBIDDEN', message: 'You do not own this savings goal.' });
    }
    if (!(amount > 0)) {
      throw new ConvexError({ code: 'VALIDATION_ERROR', message: 'Amount must be positive.' });
    }
    await ctx.db.patch(goalId, {
      currentAmount: goal.currentAmount + amount,
      updatedAt: Date.now(),
    });
    scheduleAuditLog(
      ctx,
      'savingsGoals',
      goalId,
      'ADD_FUNDS',
      String(goal.currentAmount),
      'updated'
    );
    return null;
  },
});

export const upsertBudgetLimit = mutation({
  args: {
    category: v.string(),
    limit: v.number(),
    color: v.optional(v.string()),
  },
  returns: v.id('budgetLimits'),
  handler: async (ctx, args) => {
    const userId = await assertAuthenticated(ctx);
    if (!(args.limit > 0)) {
      throw new ConvexError({ code: 'VALIDATION_ERROR', message: 'Limit must be positive.' });
    }
    const existing = (
      await ctx.db
        .query('budgetLimits')
        .withIndex('by_userId', (q) => q.eq('userId', userId))
        .take(50)
    ).find((row) => row.category === args.category);
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        limit: args.limit,
        color: args.color ?? existing.color,
        updatedAt: now,
      });
      return existing._id;
    }
    return ctx.db.insert('budgetLimits', {
      userId,
      category: args.category,
      limit: args.limit,
      color: args.color,
      createdAt: now,
      updatedAt: now,
    });
  },
});
