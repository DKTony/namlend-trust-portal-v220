/**
 * IPS Transaction Limits — enforces daily limits per use-case type.
 *
 * Per IPP FSD §5.2 (BoN specification):
 *   P2P:    N$10,000/day, max 10 transactions
 *   P2M:    N$10,000/day, max 100 transactions
 *   ATM:    N$2,000/day,  max 2 transactions
 *   G2P/B2P: N$25,000/day, max 50 transactions
 *
 * Limits are checked in the initiateIpsTransaction mutation BEFORE inserting
 * the transaction, ensuring atomicity with Convex's serializable isolation.
 */

import { GenericMutationCtx } from 'convex/server';
import type { DataModel } from '../_generated/dataModel';
import { ConvexError } from 'convex/values';

// ---------------------------------------------------------------------------
// Use Case Types — maps to spec §5.2 categories
// ---------------------------------------------------------------------------

export type IpsUseCaseType = 'P2P' | 'P2M' | 'ATM' | 'G2P' | 'B2P';

export interface TransactionLimitConfig {
  /** Maximum daily aggregate amount in NAD */
  maxDailyAmount: number;
  /** Maximum number of transactions per day */
  maxDailyCount: number;
}

/** Spec-mandated limits per use case type */
const TRANSACTION_LIMITS: Record<IpsUseCaseType, TransactionLimitConfig> = {
  P2P: { maxDailyAmount: 10_000, maxDailyCount: 10 },
  P2M: { maxDailyAmount: 10_000, maxDailyCount: 100 },
  ATM: { maxDailyAmount: 2_000, maxDailyCount: 2 },
  G2P: { maxDailyAmount: 25_000, maxDailyCount: 50 },
  B2P: { maxDailyAmount: 25_000, maxDailyCount: 50 },
};

/**
 * Derive use case type from transaction parameters.
 * Default: P2P for person-to-person credit transfers (NamLend's primary use case).
 */
export function deriveUseCaseType(
  _txType: string,
  purposeCode?: string,
  metadata?: Record<string, unknown>
): IpsUseCaseType {
  // Check metadata override first (allows explicit tagging)
  if (metadata?.useCaseType && typeof metadata.useCaseType === 'string') {
    const uc = metadata.useCaseType.toUpperCase();
    if (uc in TRANSACTION_LIMITS) return uc as IpsUseCaseType;
  }

  // Derive from purpose code
  if (purposeCode) {
    const code = purposeCode.toUpperCase();
    if (code.startsWith('MERC') || code === 'P2M') return 'P2M';
    if (code === 'ATM' || code === 'CASH') return 'ATM';
    if (code.startsWith('GOV') || code === 'G2P') return 'G2P';
    if (code.startsWith('BULK') || code === 'B2P') return 'B2P';
  }

  // Default: NamLend primarily handles loan disbursements (P2P)
  return 'P2P';
}

// ---------------------------------------------------------------------------
// Limit Enforcement
// ---------------------------------------------------------------------------

/**
 * Check whether a new IPS transaction would exceed daily limits.
 *
 * Must be called from within a mutation (uses ctx.db for transactional reads).
 * Throws ConvexError with code IPS_LIMIT_EXCEEDED if limits would be breached.
 *
 * @param ctx - Convex mutation context
 * @param userId - User initiating the transaction
 * @param amount - Transaction amount in NAD
 * @param useCaseType - Derived use case type
 */
export async function enforceTransactionLimits(
  ctx: GenericMutationCtx<DataModel>,
  userId: string,
  amount: number,
  useCaseType: IpsUseCaseType
): Promise<void> {
  const limits = TRANSACTION_LIMITS[useCaseType];
  if (!limits) return; // Unknown type — skip enforcement (shouldn't happen)

  // Calculate start of today (UTC midnight)
  const now = new Date();
  const startOfDay = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  ).getTime();

  // Query today's transactions for this user
  const todayTxns = await ctx.db
    .query('ipsTransactions')
    .withIndex('by_userId', (q) => q.eq('userId', userId as any))
    .filter((q) =>
      q.and(
        q.gte(q.field('createdAt'), startOfDay),
        // Only count non-failed, non-reversed transactions
        q.neq(q.field('status'), 'failed'),
        q.neq(q.field('status'), 'reversed')
      )
    )
    .collect();

  const dailyCount = todayTxns.length;
  const dailyAmount = todayTxns.reduce((sum, tx) => sum + (tx.amount ?? 0), 0);

  // Check count limit
  if (dailyCount >= limits.maxDailyCount) {
    throw new ConvexError({
      code: 'IPS_LIMIT_EXCEEDED',
      message: `Daily transaction count limit reached for ${useCaseType}: ${dailyCount}/${limits.maxDailyCount} transactions.`,
      limitType: 'count',
      useCaseType,
      current: dailyCount,
      limit: limits.maxDailyCount,
    });
  }

  // Check amount limit
  if (dailyAmount + amount > limits.maxDailyAmount) {
    throw new ConvexError({
      code: 'IPS_LIMIT_EXCEEDED',
      message: `Daily amount limit would be exceeded for ${useCaseType}: N$${(dailyAmount + amount).toFixed(2)} / N$${limits.maxDailyAmount.toFixed(2)}.`,
      limitType: 'amount',
      useCaseType,
      current: dailyAmount,
      requested: amount,
      limit: limits.maxDailyAmount,
    });
  }
}

/**
 * Get remaining daily limits for a user and use case type.
 * Useful for displaying limits in the UI before transaction initiation.
 */
export function getLimitsForType(useCaseType: IpsUseCaseType): TransactionLimitConfig {
  return TRANSACTION_LIMITS[useCaseType] ?? TRANSACTION_LIMITS.P2P;
}
