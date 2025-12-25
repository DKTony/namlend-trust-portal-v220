/**
 * IPS (Instant Payment System) Hooks
 * Version: v3.0.0
 * 
 * React Query hooks for IPS payment integration
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IPSService } from '../services/ipsService';
import { PaymentMethod } from '../types';

/**
 * Get user's saved VPAs
 */
export const useUserVPAs = (userId?: string) => {
  return useQuery({
    queryKey: ['vpas', userId],
    queryFn: () => IPSService.getUserVPAs(userId),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Get IPS transactions for a loan
 */
export const useLoanIPSTransactions = (loanId: string) => {
  return useQuery({
    queryKey: ['ips-transactions', loanId],
    queryFn: () => IPSService.getLoanIPSTransactions(loanId),
    enabled: !!loanId,
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * Validate VPA mutation
 */
export const useValidateVPA = () => {
  return useMutation({
    mutationFn: (vpa: string) => IPSService.validateVPA(vpa),
  });
};

/**
 * Save/update VPA mutation
 */
export const useUpsertVPA = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      vpaAddress: string;
      provider?: string;
      isDefault?: boolean;
    }) => IPSService.upsertVPA(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vpas'] });
    },
  });
};

/**
 * Delete VPA mutation
 */
export const useDeleteVPA = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vpaId: string) => IPSService.deleteVPA(vpaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vpas'] });
    },
  });
};

/**
 * Initiate IPS repayment mutation
 */
export const useInitiateIPSRepayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      loanId: string;
      amount: number;
      payerVpa: string;
    }) => IPSService.initiateIPSRepayment(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ips-transactions', variables.loanId] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['loans', variables.loanId] });
      queryClient.invalidateQueries({ queryKey: ['loan-details', variables.loanId] });
    },
  });
};

/**
 * Get IPS transaction status
 */
export const useIPSTransactionStatus = (transactionId: string) => {
  return useQuery({
    queryKey: ['ips-status', transactionId],
    queryFn: () => IPSService.getTransactionStatus(transactionId),
    enabled: !!transactionId,
    refetchInterval: (query) => {
      // Poll every 5 seconds while transaction is pending
      const status = query.state.data?.transaction?.status;
      if (status === 'initiated' || status === 'pending_callback') {
        return 5000;
      }
      return false;
    },
  });
};
