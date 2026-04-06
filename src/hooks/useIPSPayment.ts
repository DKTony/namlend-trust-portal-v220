/**
 * IPS payment hooks
 *
 * These hooks are thin wrappers over the live Convex `ipsTransactions`
 * mutation, with the VPA roles mapped to the semantics the backend expects.
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

const COLLECTIONS_VPA = import.meta.env.VITE_IPS_COLLECTIONS_VPA ?? 'collections@namlend';
const DISBURSEMENTS_VPA = import.meta.env.VITE_IPS_DISBURSEMENTS_VPA ?? 'disbursements@namlend';

export function useIPSRepayment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const initiateIpsTx = useConvexMutation(api.ips.ipsTransactions.initiateIpsTransaction);

  return useMutation<InitiateIPSRepaymentResult, Error, InitiateIPSRepaymentParams>({
    mutationFn: async (params) => {
      const msgId = `repay-${params.loanId}-${Date.now()}`;
      const transactionId = await initiateIpsTx({
        msgId,
        txType: 'credit_transfer',
        direction: 'inbound',
        amount: params.amount,
        currency: 'NAD',
        debtorVpa: params.payerVpa,
        creditorVpa: COLLECTIONS_VPA,
        loanId: params.loanId as Id<'loans'>,
        remittanceInfo: params.note ?? `Loan repayment ${params.loanId}`,
      });

      return {
        success: true,
        message: 'Payment initiated',
        ips_transaction_id: String(transactionId),
        msg_id: msgId,
        amount: params.amount,
        currency: 'NAD',
        payer_vpa: params.payerVpa,
        payee_vpa: COLLECTIONS_VPA,
        loan_id: params.loanId,
      };
    },
    onSuccess: (result, variables) => {
      if (result.success) {
        toast({
          title: 'Payment Initiated',
          description: `Your payment of NAD ${variables.amount.toFixed(2)} is being processed.`,
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
  const initiateIpsTx = useConvexMutation(api.ips.ipsTransactions.initiateIpsTransaction);

  return useMutation<InitiateIPSDisbursementResult, Error, InitiateIPSDisbursementParams>({
    mutationFn: async (params) => {
      const msgId = `disb-${params.disbursementId}-${Date.now()}`;
      const sourceVpa = params.sourceVpa ?? params.creditorVpa ?? DISBURSEMENTS_VPA;
      const transactionId = await initiateIpsTx({
        msgId,
        txType: 'credit_transfer',
        direction: 'outbound',
        amount: params.amount,
        currency: 'NAD',
        debtorVpa: sourceVpa,
        creditorVpa: params.payeeVpa,
        disbursementId: params.disbursementId as Id<'disbursements'>,
        loanId: params.loanId as Id<'loans'>,
        remittanceInfo: params.note ?? `Loan disbursement ${params.disbursementId}`,
      });

      return {
        success: true,
        message: 'Disbursement initiated',
        ips_transaction_id: String(transactionId),
        msg_id: msgId,
        amount: params.amount,
        currency: 'NAD',
        payer_vpa: sourceVpa,
        payee_vpa: params.payeeVpa,
        loan_id: params.loanId,
        disbursement_id: params.disbursementId,
      };
    },
    onSuccess: (result, variables) => {
      if (result.success) {
        toast({
          title: 'Disbursement Initiated',
          description: `Disbursement of NAD ${variables.amount.toFixed(2)} is being processed via IPS.`,
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
