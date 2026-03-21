/**
 * IPS Payment Hook
 *
 * React Query hook for initiating IPS payments (repayments)
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useMutation as useConvexMutation } from 'convex/react';
import { api } from '@/integrations/convex/api';
import type {
  InitiateIPSRepaymentParams,
  InitiateIPSRepaymentResult,
  InitiateIPSDisbursementParams,
  InitiateIPSDisbursementResult,
} from '@/types/ips';
import type { Id } from '@/integrations/convex/api';

/**
 * Hook for initiating IPS repayments (customer paying loan)
 */
export function useIPSRepayment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const initiateIpsTx = useConvexMutation(api.ips.ipsTransactions.initiateIpsTransaction);

  return useMutation<InitiateIPSRepaymentResult, Error, InitiateIPSRepaymentParams>({
    mutationFn: async (params) => {
      const txId = await initiateIpsTx({
        msgId: params.msgId ?? `repay-${params.loanId}-${Date.now()}`,
        txType: 'credit_transfer',
        direction: 'inbound',
        amount: params.amount,
        currency: 'NAD',
        debtorVpa: params.debtorVpa,
        creditorVpa: params.creditorVpa,
        loanId: params.loanId as Id<'loans'>,
        remittanceInfo: params.remittanceInfo,
      });
      return {
        success: true,
        transactionId: txId,
        message: 'Payment initiated',
      } as InitiateIPSRepaymentResult;
    },
    onSuccess: (result, variables) => {
      if (result.success) {
        toast({
          title: 'Payment Initiated',
          description: `Your payment of NAD ${variables.amount.toFixed(2)} is being processed.`,
        });

        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['loan', variables.loanId] });
        queryClient.invalidateQueries({ queryKey: ['loan-payments', variables.loanId] });
        queryClient.invalidateQueries({ queryKey: ['loan-ips-transactions', variables.loanId] });
        queryClient.invalidateQueries({ queryKey: ['loan-balance'] });
      } else {
        toast({
          title: 'Payment Failed',
          description: result.message || 'Failed to initiate payment. Please try again.',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      console.error('IPS repayment error:', error);
      toast({
        title: 'Payment Error',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook for initiating IPS disbursements (admin disbursing loan)
 */
export function useIPSDisbursement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const initiateIpsTx = useConvexMutation(api.ips.ipsTransactions.initiateIpsTransaction);

  return useMutation<InitiateIPSDisbursementResult, Error, InitiateIPSDisbursementParams>({
    mutationFn: async (params) => {
      const txId = await initiateIpsTx({
        msgId: params.msgId ?? `disb-${params.disbursementId}-${Date.now()}`,
        txType: 'credit_transfer',
        direction: 'outbound',
        amount: params.amount,
        currency: 'NAD',
        creditorVpa: params.creditorVpa,
        disbursementId: params.disbursementId as Id<'disbursements'>,
        loanId: params.loanId as Id<'loans'>,
        remittanceInfo: params.remittanceInfo,
      });
      return {
        success: true,
        transactionId: txId,
        message: 'Disbursement initiated',
      } as InitiateIPSDisbursementResult;
    },
    onSuccess: (result, variables) => {
      if (result.success) {
        toast({
          title: 'Disbursement Initiated',
          description: `Disbursement of NAD ${result.amount?.toFixed(2)} is being processed via IPS.`,
        });

        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['disbursement', variables.disbursementId] });
        queryClient.invalidateQueries({ queryKey: ['disbursements'] });
        queryClient.invalidateQueries({ queryKey: ['pending-disbursements'] });
        if (result.loan_id) {
          queryClient.invalidateQueries({ queryKey: ['loan', result.loan_id] });
        }
      } else {
        toast({
          title: 'Disbursement Failed',
          description: result.message || 'Failed to initiate disbursement. Please try again.',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      console.error('IPS disbursement error:', error);
      toast({
        title: 'Disbursement Error',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    },
  });
}
