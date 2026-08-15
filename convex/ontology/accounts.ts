/**
 * Accounts -- generalized ledger accounts for any financial product.
 *
 * Ontology: Entity(Account) -- balances for loan principal, interest, fees,
 * savings, clearing, income, and suspense accounts.
 * Events: account.created, account.credited, account.debited, account.closed
 *
 * These accounts parallel TigerBeetle's double-entry ledger but live in
 * Convex for queryability. TigerBeetle remains the authoritative ledger;
 * these are the "readable" counterparts.
 *
 * Security model:
 *   createAccount     - internal (created by system during disbursement/product setup)
 *   credit/debit      - internal (called by payment/disbursement mutations)
 *   getAccount         - staff or owner
 *   listAccounts       - staff
 */

import { ConvexError, v } from 'convex/values';
import { internalMutation, mutation, query } from '../_generated/server';
import { scheduleAuditLog } from '../lib/audit';
import {
  assertAdmin,
  assertOwnerOrTenantStaff,
  assertOwnerOrTenantStaffForUser,
  assertStaff,
} from '../lib/auth';
import { emitEvent, generateCorrelationId } from '../lib/eventEmitter';
import { emitRelationship } from '../lib/relationshipEmitter';
import { accountStatus, accountType } from '../schema';

// ---------------------------------------------------------------------------
// Account number generation
// ---------------------------------------------------------------------------

/**
 * Generate a unique account number.
 * Format: ACC-{type_prefix}-{timestamp36}-{random8}
 */
function generateAccountNumber(type: string): string {
  const prefixes: Record<string, string> = {
    loan_principal: 'LP',
    loan_interest: 'LI',
    loan_fees: 'LF',
    savings: 'SA',
    clearing: 'CL',
    income: 'IN',
    suspense: 'SU',
  };
  const prefix = prefixes[type] ?? 'XX';
  const ts = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
  return `ACC-${prefix}-${ts}-${rand}`;
}

// ---------------------------------------------------------------------------
// Internal mutations (called by system)
// ---------------------------------------------------------------------------

/**
 * Create a new account.
 * Typically called during disbursement completion or product instance setup.
 */
export const createAccount = internalMutation({
  args: {
    accountType: accountType,
    ownerId: v.optional(v.id('users')),
    ownerType: v.optional(v.string()),
    productInstanceId: v.optional(v.string()),
    currency: v.optional(v.string()),
    institutionId: v.optional(v.id('institutions')),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const accountNumber = generateAccountNumber(args.accountType);

    const accountId = await ctx.db.insert('accounts', {
      accountNumber,
      accountType: args.accountType,
      ownerId: args.ownerId,
      ownerType: args.ownerType ?? (args.ownerId ? 'user' : 'system'),
      productInstanceId: args.productInstanceId,
      balance: 0,
      currency: args.currency ?? 'NAD',
      status: 'active',
      institutionId: args.institutionId,
      metadata: args.metadata,
      createdAt: now,
      updatedAt: now,
    });

    emitEvent(ctx, {
      eventType: 'account.created',
      entityType: 'accounts',
      entityId: accountId,
      domainSource: 'accounts',
      correlationId: generateCorrelationId(),
      actorType: 'system',
      payload: {
        accountNumber,
        accountType: args.accountType,
        ownerId: args.ownerId,
        productInstanceId: args.productInstanceId,
      },
    });

    // Ontology: owner -> holds -> account
    if (args.ownerId) {
      emitRelationship(
        ctx,
        { type: 'users', id: args.ownerId },
        { type: 'accounts', id: accountId },
        'holds'
      );
    }

    return { accountId, accountNumber };
  },
});

/**
 * Credit an account (increase balance).
 */
export const creditAccount = internalMutation({
  args: {
    accountId: v.id('accounts'),
    amount: v.number(),
    reason: v.string(),
    referenceId: v.optional(v.string()),
  },
  handler: async (ctx, { accountId, amount, reason, referenceId }) => {
    if (amount <= 0) {
      throw new ConvexError({ code: 'VALIDATION', message: 'Credit amount must be positive.' });
    }

    const account = await ctx.db.get(accountId);
    if (!account) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Account not found.' });
    }
    if (account.status !== 'active') {
      throw new ConvexError({
        code: 'INVALID_STATE',
        message: `Cannot credit ${account.status} account.`,
      });
    }

    const newBalance = account.balance + amount;
    await ctx.db.patch(accountId, {
      balance: newBalance,
      updatedAt: Date.now(),
    });

    emitEvent(ctx, {
      eventType: 'account.credited',
      entityType: 'accounts',
      entityId: accountId,
      domainSource: 'accounts',
      correlationId: generateCorrelationId(),
      actorType: 'system',
      payload: {
        accountNumber: account.accountNumber,
        amount,
        previousBalance: account.balance,
        newBalance,
        reason,
        referenceId,
      },
    });

    return { newBalance };
  },
});

/**
 * Debit an account (decrease balance).
 */
export const debitAccount = internalMutation({
  args: {
    accountId: v.id('accounts'),
    amount: v.number(),
    reason: v.string(),
    referenceId: v.optional(v.string()),
  },
  handler: async (ctx, { accountId, amount, reason, referenceId }) => {
    if (amount <= 0) {
      throw new ConvexError({ code: 'VALIDATION', message: 'Debit amount must be positive.' });
    }

    const account = await ctx.db.get(accountId);
    if (!account) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Account not found.' });
    }
    if (account.status !== 'active') {
      throw new ConvexError({
        code: 'INVALID_STATE',
        message: `Cannot debit ${account.status} account.`,
      });
    }

    const newBalance = account.balance - amount;
    await ctx.db.patch(accountId, {
      balance: newBalance,
      updatedAt: Date.now(),
    });

    emitEvent(ctx, {
      eventType: 'account.debited',
      entityType: 'accounts',
      entityId: accountId,
      domainSource: 'accounts',
      correlationId: generateCorrelationId(),
      actorType: 'system',
      payload: {
        accountNumber: account.accountNumber,
        amount,
        previousBalance: account.balance,
        newBalance,
        reason,
        referenceId,
      },
    });

    return { newBalance };
  },
});

/**
 * Close an account.
 */
export const closeAccount = internalMutation({
  args: {
    accountId: v.id('accounts'),
    reason: v.string(),
  },
  handler: async (ctx, { accountId, reason }) => {
    const account = await ctx.db.get(accountId);
    if (!account) return;
    if (account.status === 'closed') return;

    if (account.balance !== 0) {
      throw new ConvexError({
        code: 'INVALID_STATE',
        message: `Cannot close account with non-zero balance (N$${account.balance}).`,
      });
    }

    await ctx.db.patch(accountId, {
      status: 'closed',
      updatedAt: Date.now(),
    });

    emitEvent(ctx, {
      eventType: 'account.closed',
      entityType: 'accounts',
      entityId: accountId,
      domainSource: 'accounts',
      correlationId: generateCorrelationId(),
      actorType: 'system',
      payload: { accountNumber: account.accountNumber, reason },
    });
  },
});

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Get an account by ID.
 */
export const getAccount = query({
  args: { accountId: v.id('accounts') },
  handler: async (ctx, { accountId }) => {
    const account = await ctx.db.get(accountId);
    if (!account) return null;
    if (account.ownerId) {
      await assertOwnerOrTenantStaff(ctx, account.ownerId, account.institutionId);
    } else {
      await assertStaff(ctx);
    }
    return account;
  },
});

/**
 * Get account by account number.
 */
export const getAccountByNumber = query({
  args: { accountNumber: v.string() },
  handler: async (ctx, { accountNumber }) => {
    await assertStaff(ctx);
    return ctx.db
      .query('accounts')
      .withIndex('by_accountNumber', (q) => q.eq('accountNumber', accountNumber))
      .first();
  },
});

/**
 * Get all accounts for a user.
 */
export const getAccountsByOwner = query({
  args: { ownerId: v.id('users') },
  handler: async (ctx, { ownerId }) => {
    await assertOwnerOrTenantStaffForUser(ctx, ownerId);
    return ctx.db
      .query('accounts')
      .withIndex('by_owner', (q) => q.eq('ownerId', ownerId))
      .collect();
  },
});

/**
 * Get accounts for a product instance (e.g., a specific loan).
 */
export const getAccountsByProductInstance = query({
  args: { productInstanceId: v.string() },
  handler: async (ctx, { productInstanceId }) => {
    await assertStaff(ctx);
    return ctx.db
      .query('accounts')
      .withIndex('by_productInstance', (q) => q.eq('productInstanceId', productInstanceId))
      .collect();
  },
});

/**
 * List all accounts (staff view).
 */
export const listAccounts = query({
  args: {
    status: v.optional(accountStatus),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { status, limit }) => {
    await assertStaff(ctx);
    const results = await ctx.db.query('accounts').take(limit ?? 200);
    if (status) return results.filter((a) => a.status === status);
    return results;
  },
});

// ---------------------------------------------------------------------------
// Admin: Create account (manual, for special cases)
// ---------------------------------------------------------------------------

/**
 * Manually create an account (admin only).
 * For special cases like clearing or suspense accounts.
 */
export const adminCreateAccount = mutation({
  args: {
    accountType: accountType,
    ownerId: v.optional(v.id('users')),
    ownerType: v.optional(v.string()),
    productInstanceId: v.optional(v.string()),
    currency: v.optional(v.string()),
    institutionId: v.optional(v.id('institutions')),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    const now = Date.now();
    const accountNumber = generateAccountNumber(args.accountType);

    const accountId = await ctx.db.insert('accounts', {
      accountNumber,
      accountType: args.accountType,
      ownerId: args.ownerId,
      ownerType: args.ownerType ?? (args.ownerId ? 'user' : 'system'),
      productInstanceId: args.productInstanceId,
      balance: 0,
      currency: args.currency ?? 'NAD',
      status: 'active',
      institutionId: args.institutionId,
      metadata: args.metadata,
      createdAt: now,
      updatedAt: now,
    });

    scheduleAuditLog(ctx, 'accounts', accountId, 'CREATE', 'none', 'active');

    if (args.ownerId) {
      emitRelationship(
        ctx,
        { type: 'users', id: args.ownerId },
        { type: 'accounts', id: accountId },
        'holds'
      );
    }

    return { accountId, accountNumber };
  },
});
