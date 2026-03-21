/**
 * IPS Transaction Status Hook
 *
 * React Query hook for polling IPS transaction status
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback } from 'react';
import { useQuery as useConvexQuery } from 'convex/react';
import { api } from '@/integrations/convex/api';
import { type Id } from '@/integrations/convex/api';
import type { IPSTransactionStatusResult, IPSTransactionStatus } from '@/types/ips';
import { isIPSStatusFinal } from '@/types/ips';

interface UseIPSTransactionStatusOptions {
  /** Enable polling for pending transactions */
  enablePolling?: boolean;
  /** Polling interval in milliseconds (default: 3000) */
  pollInterval?: number;
  /** Maximum number of polls before stopping (default: 20) */
  maxPolls?: number;
  /** Callback when transaction completes */
  onComplete?: (status: IPSTransactionStatus, result: IPSTransactionStatusResult) => void;
  /** Callback when transaction fails */
  onError?: (error: string) => void;
}

/**
 * Hook for fetching and polling IPS transaction status
 */
export function useIPSTransactionStatus(
  transactionId: string | null | undefined,
  options: UseIPSTransactionStatusOptions = {}
) {
  const { enablePolling = true, pollInterval = 3000, maxPolls = 20, onComplete, onError } = options;

  const queryClient = useQueryClient();

  const convexTx = useConvexQuery(
    api.ips.ipsTransactions.getTransaction,
    transactionId ? { transactionId: transactionId as Id<'ipsTransactions'> } : 'skip'
  );

  const query = useQuery<IPSTransactionStatusResult>({
    queryKey: ['ips-transaction-status', transactionId],
    queryFn: () => {
      if (!convexTx)
        return { success: false, error: 'Transaction not found' } as IPSTransactionStatusResult;
      return {
        success: true,
        status: convexTx.status as IPSTransactionStatus,
        transactionId: convexTx._id,
        amount: convexTx.amount,
        currency: convexTx.currency,
        errorCode: convexTx.errorCode,
        errorDescription: convexTx.errorDescription,
      } as IPSTransactionStatusResult;
    },
    enabled: !!transactionId && convexTx !== undefined,
    refetchInterval: (query) => {
      if (!enablePolling) return false;

      const data = query.state.data;
      if (!data?.success) return false;

      // Stop polling if transaction is in final state
      if (data.status && isIPSStatusFinal(data.status)) {
        return false;
      }

      // Stop polling after max polls
      const pollCount = query.state.dataUpdateCount;
      if (pollCount >= maxPolls) {
        return false;
      }

      return pollInterval;
    },
    staleTime: 1000, // Consider data stale after 1 second
  });

  // Handle completion callback
  useEffect(() => {
    if (query.data?.success && query.data.status) {
      if (isIPSStatusFinal(query.data.status)) {
        onComplete?.(query.data.status, query.data);
      }
    }
  }, [query.data, onComplete]);

  // Handle error callback
  useEffect(() => {
    if (query.data && !query.data.success && query.data.error) {
      onError?.(query.data.error);
    }
  }, [query.data, onError]);

  /**
   * Manually check status with IPS (for timeout/pending transactions)
   */
  const checkStatus = useCallback(async () => {
    if (!transactionId) return null;
    queryClient.invalidateQueries({ queryKey: ['ips-transaction-status', transactionId] });
    return query.data ?? null;
  }, [transactionId, queryClient, query.data]);

  /**
   * Force refresh the status
   */
  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['ips-transaction-status', transactionId] });
  }, [transactionId, queryClient]);

  return {
    ...query,
    checkStatus,
    refresh,
    isPolling: enablePolling && query.data?.status && !isIPSStatusFinal(query.data.status),
  };
}

/**
 * Hook for fetching all IPS transactions for a loan
 */
export function useLoanIPSTransactions(loanId: string | null | undefined) {
  const raw = useConvexQuery(
    api.ips.ipsTransactions.getTransactionsByLoan,
    loanId ? { loanId: loanId as Id<'loans'> } : 'skip'
  );
  return { data: raw, isLoading: raw === undefined, isError: false };
}
