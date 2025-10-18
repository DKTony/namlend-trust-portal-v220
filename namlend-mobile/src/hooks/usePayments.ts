/**
 * Payments Hook with React Query
 * Version: v2.4.2
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PaymentService } from '../services/paymentService';
import { PaymentMethod } from '../types';

/**
 * Get payments for a loan
 */
export const usePaymentsByLoan = (loanId: string) => {
  return useQuery({
    queryKey: ['payments', 'loan', loanId],
    queryFn: () => PaymentService.getPaymentsByLoan(loanId),
    enabled: !!loanId,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Get all payments for current user
 */
export const useMyPayments = () => {
  return useQuery({
    queryKey: ['payments', 'my'],
    queryFn: () => PaymentService.getMyPayments(),
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Get payment statistics for a loan
 */
export const usePaymentStats = (loanId: string) => {
  return useQuery({
    queryKey: ['payments', 'stats', loanId],
    queryFn: () => PaymentService.getPaymentStats(loanId),
    enabled: !!loanId,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Initiate payment mutation
 */
export const useInitiatePayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      loanId,
      amount,
      paymentMethod,
      referenceNumber,
    }: {
      loanId: string;
      amount: number;
      paymentMethod: PaymentMethod;
      referenceNumber?: string;
    }) => PaymentService.initiatePayment(loanId, amount, paymentMethod, referenceNumber),
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['loans', variables.loanId] });
      queryClient.invalidateQueries({ queryKey: ['loans', 'stats'] });
    },
  });
};
