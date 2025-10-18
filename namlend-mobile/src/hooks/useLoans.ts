/**
 * Loans Hook with React Query
 * Version: v2.4.2
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LoanService } from '../services/loanService';

/**
 * Get all loans for current user
 */
export const useMyLoans = () => {
  return useQuery({
    queryKey: ['loans', 'my'],
    queryFn: () => LoanService.getMyLoans(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });
};

/**
 * Get loan by ID
 */
export const useLoan = (loanId: string) => {
  return useQuery({
    queryKey: ['loans', loanId],
    queryFn: () => LoanService.getLoanById(loanId),
    enabled: !!loanId,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Get pending applications
 */
export const useMyApplications = () => {
  return useQuery({
    queryKey: ['applications', 'my'],
    queryFn: () => LoanService.getMyApplications(),
    staleTime: 2 * 60 * 1000, // 2 minutes (more frequent for pending items)
  });
};

/**
 * Get repayment schedule
 */
export const useRepaymentSchedule = (loanId: string) => {
  return useQuery({
    queryKey: ['repayment-schedule', loanId],
    queryFn: () => LoanService.getRepaymentSchedule(loanId),
    enabled: !!loanId,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Get loan statistics
 */
export const useLoanStats = () => {
  return useQuery({
    queryKey: ['loans', 'stats'],
    queryFn: () => LoanService.getLoanStats(),
    staleTime: 5 * 60 * 1000,
  });
};
