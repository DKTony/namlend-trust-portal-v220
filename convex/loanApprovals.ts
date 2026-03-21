/**
 * Loan approval history queries.
 * Simple read-only access to the loanApprovals table.
 * Writes happen inside loans.ts (approveLoan / rejectLoan).
 */

import { v } from 'convex/values';
import { query } from './_generated/server';
import { assertOwnerOrStaff, assertStaff } from './lib/auth';

export const getLoanApprovals = query({
  args: { loanId: v.id('loans') },
  handler: async (ctx, { loanId }) => {
    const loan = await ctx.db.get(loanId);
    if (!loan) return [];
    await assertOwnerOrStaff(ctx, loan.userId);

    return ctx.db
      .query('loanApprovals')
      .withIndex('by_loanId', (q) => q.eq('loanId', loanId))
      .order('desc')
      .collect();
  },
});

export const adminListApprovalDecisions = query({
  args: {
    decision: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { decision, limit }) => {
    await assertStaff(ctx);
    const all = await ctx.db
      .query('loanApprovals')
      .order('desc')
      .take(limit ?? 100);
    if (decision) {
      return all.filter((a) => a.decision === decision);
    }
    return all;
  },
});
