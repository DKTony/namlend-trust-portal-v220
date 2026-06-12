/**
 * IPS payment hooks
 *
 * These hooks call the portal-specific Convex mutations. The backend owns
 * message IDs, linked payment/disbursement records, limits, and IPS transport.
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

export function useIPSRepayment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const initiateRepayment = useConvexMutation(api.ips.ipsTransactions.initiateIpsRepayment);

  return useMutation<InitiateIPSRepaymentResult, Error, InitiateIPSRepaymentParams>({
    mutationFn: async (params) => {
      return initiateRepayment({
        loanId: params.loanId as any,
        amount: params.amount,
        payerVpa: params.payerVpa,
        payerAliasId: params.payerAliasId as any,
        clientRequestId: params.clientRequestId,
      });
    },
    onSuccess: (result, variables) => {
      if (result.success) {
        toast({
          title: 'Payment Initiated',
          description: `Your payment request for NAD ${variables.amount.toFixed(2)} was accepted for IPS processing.`,
        });

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
      toast({
        title: 'Payment Error',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    },
  });
}

export function useIPSDisbursement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const initiateDisbursement = useConvexMutation(api.ips.ipsTransactions.initiateIpsDisbursement);

  return useMutation<InitiateIPSDisbursementResult, Error, InitiateIPSDisbursementParams>({
    mutationFn: async (params) => {
      return initiateDisbursement({
        disbursementId: params.disbursementId as any,
        payeeVpa: params.payeeVpa,
        clientRequestId: params.clientRequestId,
      });
    },
    onSuccess: (result, variables) => {
      if (result.success) {
        toast({
          title: 'Disbursement Initiated',
          description: `Disbursement request for NAD ${variables.amount.toFixed(2)} was accepted for IPS processing.`,
        });

        queryClient.invalidateQueries({ queryKey: ['disbursement', variables.disbursementId] });
        queryClient.invalidateQueries({ queryKey: ['disbursements'] });
        queryClient.invalidateQueries({ queryKey: ['pending-disbursements'] });
        queryClient.invalidateQueries({ queryKey: ['loan', variables.loanId] });
      } else {
        toast({
          title: 'Disbursement Failed',
          description: result.message || 'Failed to initiate disbursement. Please try again.',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Disbursement Error',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    },
  });
}
