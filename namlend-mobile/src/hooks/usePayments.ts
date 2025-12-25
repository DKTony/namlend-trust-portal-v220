/**
 * Payments Hook with React Query
 * Version: v3.0.0
 * 
 * Enhanced with RPC integration and portfolio summary
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
 * Initiate payment mutation (legacy - uses processLoanPayment internally)
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
      queryClient.invalidateQueries({ queryKey: ['loan-details', variables.loanId] });
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    },
  });
};

/**
 * Process loan payment mutation (new RPC-based)
 */
export const useProcessLoanPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      loanId,
      amount,
      paymentMethod,
      referenceNumber,
      notes,
    }: {
      loanId: string;
      amount: number;
      paymentMethod: PaymentMethod;
      referenceNumber?: string;
      notes?: string;
    }) => PaymentService.processLoanPayment(loanId, amount, paymentMethod, referenceNumber, notes),
    onSuccess: (result, variables) => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['loans', variables.loanId] });
      queryClient.invalidateQueries({ queryKey: ['loans', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['loan-details', variables.loanId] });
      queryClient.invalidateQueries({ queryKey: ['payment-schedule', variables.loanId] });
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      
      // If loan was settled, invalidate more broadly
      if (result.loan_settled) {
        queryClient.invalidateQueries({ queryKey: ['loans'] });
      }
    },
  });
};

/**
 * Get comprehensive loan payment details
 */
export const useLoanPaymentDetails = (loanId: string) => {
  return useQuery({
    queryKey: ['loan-details', loanId],
    queryFn: () => PaymentService.getLoanPaymentDetails(loanId),
    enabled: !!loanId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * Get payment schedule for a loan
 */
export const usePaymentSchedule = (loanId: string) => {
  return useQuery({
    queryKey: ['payment-schedule', loanId],
    queryFn: () => PaymentService.getPaymentSchedule(loanId),
    enabled: !!loanId,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Get user's loan portfolio summary
 */
export const useLoanPortfolioSummary = (userId?: string) => {
  return useQuery({
    queryKey: ['portfolio', userId],
    queryFn: () => PaymentService.getLoanPortfolioSummary(userId),
    staleTime: 5 * 60 * 1000,
  });
};
