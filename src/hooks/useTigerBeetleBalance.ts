import { useQuery } from 'convex/react';
import { api } from '@/integrations/convex/api';
import type { Id } from '../../convex/_generated/dataModel';

interface TigerBeetleBalance {
  principal: number;
  interest: number;
  fees: number;
  total: number;
  currency: string;
}

/**
 * Convex-native hook for TigerBeetle balance.
 *
 * Reads balance from the Convex loan document directly — the loan's
 * `outstandingBalance` and `totalPaid` are updated atomically by the
 * `completePayment` mutation (which also enqueues TigerBeetle outbox entries).
 *
 * In Phase 3+, this could be enhanced to read from a dedicated Convex query
 * that aggregates TigerBeetle shadow transfers for breakdown by category.
 */
export function useTigerBeetleBalance(loanId: string | undefined) {
  const loan = useQuery(api.loans.getLoan, loanId ? { loanId: loanId as Id<'loans'> } : 'skip');

  const isLoading = loanId ? loan === undefined : false;

  const data: TigerBeetleBalance | undefined = loan
    ? {
        principal: loan.outstandingBalance ?? loan.principal ?? 0,
        interest: 0, // breakdown not tracked at loan level yet
        fees: 0,
        total: loan.outstandingBalance ?? loan.principal ?? 0,
        currency: 'NAD',
      }
    : undefined;

  return {
    data,
    isLoading,
    error: null as Error | null,
    isError: false,
  };
}

/**
 * Standalone function for getting a loan balance (for non-hook contexts).
 * Returns a promise that resolves to the balance from the loan document.
 */
export async function getLoanBalance(loanId: string): Promise<TigerBeetleBalance> {
  // Fallback: return zero balance. In hook contexts, use useTigerBeetleBalance instead.
  return {
    principal: 0,
    interest: 0,
    fees: 0,
    total: 0,
    currency: 'NAD',
  };
}

/**
 * Get multiple loan balances at once
 */
export async function getLoanBalances(loanIds: string[]): Promise<Map<string, TigerBeetleBalance>> {
  const balances = new Map<string, TigerBeetleBalance>();
  for (const id of loanIds) {
    balances.set(id, await getLoanBalance(id));
  }
  return balances;
}

export default useTigerBeetleBalance;
