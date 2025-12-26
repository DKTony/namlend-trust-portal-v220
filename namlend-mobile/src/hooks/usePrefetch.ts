/**
 * Navigation-Aware Query Prefetching Hook
 * Version: v2.7.1
 * 
 * Prefetches data for upcoming screens based on navigation patterns
 * to improve perceived performance and reduce loading states
 */

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { LoanService } from '../services/loanService';
import { PaymentService } from '../services/paymentService';
import { ApprovalService } from '../services/approvalService';
import { BackendNotificationService } from '../services/backendNotificationService';

/**
 * Prefetch client dashboard data
 * Call this when navigating TO the dashboard or on app start
 */
export function usePrefetchDashboard() {
  const queryClient = useQueryClient();

  const prefetch = useCallback(async () => {
    // Prefetch loans list
    await queryClient.prefetchQuery({
      queryKey: ['loans', 'my'],
      queryFn: () => LoanService.getMyLoans(),
      staleTime: 5 * 60 * 1000,
    });

    // Prefetch loan stats
    await queryClient.prefetchQuery({
      queryKey: ['loans', 'stats'],
      queryFn: () => LoanService.getLoanStats(),
      staleTime: 5 * 60 * 1000,
    });

    // Prefetch applications
    await queryClient.prefetchQuery({
      queryKey: ['applications', 'my'],
      queryFn: () => LoanService.getMyApplications(),
      staleTime: 2 * 60 * 1000,
    });

    // Prefetch notifications count
    await queryClient.prefetchQuery({
      queryKey: ['notifications', 'unread-count'],
      queryFn: () => BackendNotificationService.getUnreadCount(),
      staleTime: 1 * 60 * 1000,
    });
  }, [queryClient]);

  return { prefetch };
}

/**
 * Prefetch loan details and related data
 * Call this when user views a loan in the list (before they tap to see details)
 */
export function usePrefetchLoanDetails() {
  const queryClient = useQueryClient();

  const prefetch = useCallback(async (loanId: string) => {
    if (!loanId) return;

    // Prefetch loan details
    await queryClient.prefetchQuery({
      queryKey: ['loans', loanId],
      queryFn: () => LoanService.getLoanById(loanId),
      staleTime: 5 * 60 * 1000,
    });

    // Prefetch repayment schedule
    await queryClient.prefetchQuery({
      queryKey: ['repayment-schedule', loanId],
      queryFn: () => LoanService.getRepaymentSchedule(loanId),
      staleTime: 5 * 60 * 1000,
    });

    // Prefetch payments for this loan
    await queryClient.prefetchQuery({
      queryKey: ['payments', 'loan', loanId],
      queryFn: () => PaymentService.getPaymentsByLoan(loanId),
      staleTime: 2 * 60 * 1000,
    });

    // Prefetch payment details (includes schedule and summary)
    await queryClient.prefetchQuery({
      queryKey: ['loan-details', loanId],
      queryFn: () => PaymentService.getLoanPaymentDetails(loanId),
      staleTime: 2 * 60 * 1000,
    });
  }, [queryClient]);

  return { prefetch };
}

/**
 * Prefetch approver dashboard data
 * Call this when an approver logs in or navigates to approver section
 */
export function usePrefetchApproverDashboard() {
  const queryClient = useQueryClient();

  const prefetch = useCallback(async () => {
    // Prefetch approval queue
    await queryClient.prefetchQuery({
      queryKey: ['approvals', 'queue'],
      queryFn: () => ApprovalService.getApprovalQueue({ limit: 20 }),
      staleTime: 2 * 60 * 1000,
    });

    // Prefetch pending stages
    await queryClient.prefetchQuery({
      queryKey: ['approvals', 'pending-stages'],
      queryFn: () => ApprovalService.getMyPendingStages(),
      staleTime: 2 * 60 * 1000,
    });

    // Prefetch approval stats
    await queryClient.prefetchQuery({
      queryKey: ['approvals', 'stats'],
      queryFn: () => ApprovalService.getApprovalStats(),
      staleTime: 2 * 60 * 1000,
    });
  }, [queryClient]);

  return { prefetch };
}

/**
 * Prefetch notifications data
 * Call this when navigating to notifications screen
 */
export function usePrefetchNotifications() {
  const queryClient = useQueryClient();

  const prefetch = useCallback(async () => {
    await queryClient.prefetchQuery({
      queryKey: ['notifications'],
      queryFn: () => BackendNotificationService.getNotifications({ limit: 20 }),
      staleTime: 1 * 60 * 1000,
    });
  }, [queryClient]);

  return { prefetch };
}

/**
 * Hook to prefetch data on focus/mount
 * Automatically prefetches when the screen comes into focus
 */
export function useAutoPreFetch(prefetchFn: () => Promise<void>, deps: any[] = []) {
  useEffect(() => {
    // Small delay to not block initial render
    const timeout = setTimeout(() => {
      prefetchFn().catch(console.error);
    }, 100);

    return () => clearTimeout(timeout);
  }, deps);
}

/**
 * Prefetch profile data
 */
export function usePrefetchProfile() {
  const queryClient = useQueryClient();

  const prefetch = useCallback(async () => {
    await queryClient.prefetchQuery({
      queryKey: ['portfolio'],
      queryFn: () => PaymentService.getLoanPortfolioSummary(),
      staleTime: 5 * 60 * 1000,
    });
  }, [queryClient]);

  return { prefetch };
}
