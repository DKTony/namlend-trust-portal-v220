/**
 * TanStack Query Hooks for API Orchestration Layer
 * 
 * Provides caching, automatic refetching, and optimistic updates
 * for all API endpoints.
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import {
  loansAPI,
  usersAPI,
  paymentsAPI,
  adminAPI,
  analyticsAPI,
  disbursementsAPI,
  collectionsAPI,
  reconciliationAPI,
  notificationsAPI,
  auditAPI,
  ApiResponse,
  LoanListParams,
  LoanApplication,
  LoanApproval,
  UserListParams,
  UserUpdateData,
  PaymentListParams,
  PaymentRecord,
  PaymentReversal,
  AuditLogParams,
  BulkApproval,
  AnalyticsParams,
  TrendParams,
  DisbursementListParams,
  CollectionsQueueParams,
  ReconciliationRunParams,
  NotificationListParams,
  Disbursement,
} from '@/services/api-client';

// =============================================================================
// QUERY KEY FACTORIES
// =============================================================================

export const queryKeys = {
  // Loans
  loans: {
    all: ['loans'] as const,
    lists: () => [...queryKeys.loans.all, 'list'] as const,
    list: (params?: LoanListParams) => [...queryKeys.loans.lists(), params] as const,
    details: () => [...queryKeys.loans.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.loans.details(), id] as const,
    approvalRequests: (params?: { page?: number; limit?: number }) => 
      [...queryKeys.loans.all, 'approval-requests', params] as const,
    schedule: (id: string) => [...queryKeys.loans.all, 'schedule', id] as const,
  },

  // Users
  users: {
    all: ['users'] as const,
    profile: () => [...queryKeys.users.all, 'profile'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (params?: UserListParams) => [...queryKeys.users.lists(), params] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
    roles: () => [...queryKeys.users.all, 'roles'] as const,
  },

  // Payments
  payments: {
    all: ['payments'] as const,
    lists: () => [...queryKeys.payments.all, 'list'] as const,
    list: (params?: PaymentListParams) => [...queryKeys.payments.lists(), params] as const,
    details: () => [...queryKeys.payments.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.payments.details(), id] as const,
    forLoan: (loanId: string) => [...queryKeys.payments.all, 'loan', loanId] as const,
    reconciliation: (params?: { startDate?: string; endDate?: string }) => 
      [...queryKeys.payments.all, 'reconciliation', params] as const,
  },

  // Admin
  admin: {
    all: ['admin'] as const,
    dashboard: () => [...queryKeys.admin.all, 'dashboard'] as const,
    auditLogs: (params?: AuditLogParams) => [...queryKeys.admin.all, 'audit-logs', params] as const,
    systemHealth: () => [...queryKeys.admin.all, 'system-health'] as const,
    complianceReport: (params?: { startDate?: string; endDate?: string }) => 
      [...queryKeys.admin.all, 'compliance-report', params] as const,
    collections: () => [...queryKeys.admin.all, 'collections'] as const,
  },

  // Analytics
  analytics: {
    all: ['analytics'] as const,
    portfolio: (params?: AnalyticsParams) => [...queryKeys.analytics.all, 'portfolio', params] as const,
    loanPerformance: (params?: AnalyticsParams) => [...queryKeys.analytics.all, 'loan-performance', params] as const,
    collectionsStats: (params?: AnalyticsParams) => [...queryKeys.analytics.all, 'collections-stats', params] as const,
    disbursementStats: (params?: AnalyticsParams) => [...queryKeys.analytics.all, 'disbursement-stats', params] as const,
    riskAnalysis: (params?: AnalyticsParams) => [...queryKeys.analytics.all, 'risk-analysis', params] as const,
    trends: (params?: TrendParams) => [...queryKeys.analytics.all, 'trends', params] as const,
  },

  // Disbursements
  disbursements: {
    all: ['disbursements'] as const,
    lists: () => [...queryKeys.disbursements.all, 'list'] as const,
    list: (params?: DisbursementListParams) => [...queryKeys.disbursements.lists(), params] as const,
    pending: (params?: { page?: number; limit?: number }) => 
      [...queryKeys.disbursements.all, 'pending', params] as const,
    details: () => [...queryKeys.disbursements.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.disbursements.details(), id] as const,
  },

  // Collections
  collections: {
    all: ['collections'] as const,
    queue: (params?: CollectionsQueueParams) => [...queryKeys.collections.all, 'queue', params] as const,
    case: (loanId: string) => [...queryKeys.collections.all, 'case', loanId] as const,
  },

  // Reconciliation
  reconciliation: {
    all: ['reconciliation'] as const,
    runs: (params?: ReconciliationRunParams) => [...queryKeys.reconciliation.all, 'runs', params] as const,
    run: (id: string) => [...queryKeys.reconciliation.all, 'run', id] as const,
  },

  // Notifications
  notifications: {
    all: ['notifications'] as const,
    lists: () => [...queryKeys.notifications.all, 'list'] as const,
    list: (params?: NotificationListParams) => [...queryKeys.notifications.lists(), params] as const,
    detail: (id: string) => [...queryKeys.notifications.all, id] as const,
  },

  // Audit
  audit: {
    all: ['audit'] as const,
    logs: (params?: AuditLogParams) => [...queryKeys.audit.all, 'logs', params] as const,
    log: (id: string) => [...queryKeys.audit.all, 'log', id] as const,
    financial: (params?: { startDate?: string; endDate?: string }) => 
      [...queryKeys.audit.all, 'financial', params] as const,
    byUser: (userId: string, params?: { page?: number; limit?: number }) => 
      [...queryKeys.audit.all, 'user', userId, params] as const,
    byTable: (tableName: string, params?: { page?: number; limit?: number }) => 
      [...queryKeys.audit.all, 'table', tableName, params] as const,
    summary: (params?: { period?: string }) => [...queryKeys.audit.all, 'summary', params] as const,
    actions: () => [...queryKeys.audit.all, 'actions'] as const,
  },
};

// =============================================================================
// STALE TIME CONFIGURATION
// =============================================================================

export const staleTimes = {
  // Real-time data - refetch frequently
  realtime: 10 * 1000, // 10 seconds
  
  // Dynamic data - moderate freshness
  dynamic: 30 * 1000, // 30 seconds
  
  // Semi-static data - less frequent updates
  semiStatic: 2 * 60 * 1000, // 2 minutes
  
  // Analytics/reports - can be stale longer
  analytics: 5 * 60 * 1000, // 5 minutes
  
  // Static reference data
  static: 30 * 60 * 1000, // 30 minutes
};

// =============================================================================
// LOANS HOOKS
// =============================================================================

export function useLoans(params?: LoanListParams, options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: queryKeys.loans.list(params),
    queryFn: () => loansAPI.list(params),
    staleTime: staleTimes.dynamic,
    ...options,
  });
}

export function useLoan(id: string, options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: queryKeys.loans.detail(id),
    queryFn: () => loansAPI.get(id),
    staleTime: staleTimes.dynamic,
    enabled: !!id,
    ...options,
  });
}

export function useApprovalRequests(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.loans.approvalRequests(params),
    queryFn: () => loansAPI.getApprovalRequests(params),
    staleTime: staleTimes.realtime,
  });
}

export function useLoanSchedule(loanId: string) {
  return useQuery({
    queryKey: queryKeys.loans.schedule(loanId),
    queryFn: () => loansAPI.getSchedule(loanId),
    staleTime: staleTimes.semiStatic,
    enabled: !!loanId,
  });
}

export function useApplyForLoan() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: LoanApplication) => loansAPI.apply(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.loans.all });
    },
  });
}

export function useApproveLoan() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: LoanApproval) => loansAPI.approve(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.loans.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.disbursements.all });
    },
  });
}

export function useRejectLoan() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: LoanApproval) => loansAPI.reject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.loans.all });
    },
  });
}

export function useDisburseLoan() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Disbursement) => loansAPI.disburse(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.loans.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.disbursements.all });
    },
  });
}

// =============================================================================
// USERS HOOKS
// =============================================================================

export function useUserProfile() {
  return useQuery({
    queryKey: queryKeys.users.profile(),
    queryFn: () => usersAPI.getProfile(),
    staleTime: staleTimes.semiStatic,
  });
}

export function useUsers(params?: UserListParams) {
  return useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: () => usersAPI.list(params),
    staleTime: staleTimes.dynamic,
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: () => usersAPI.get(id),
    staleTime: staleTimes.semiStatic,
    enabled: !!id,
  });
}

export function useUserRoles() {
  return useQuery({
    queryKey: queryKeys.users.roles(),
    queryFn: () => usersAPI.getRoles(),
    staleTime: staleTimes.static,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: UserUpdateData) => usersAPI.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.profile() });
    },
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => usersAPI.updateRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
}

// =============================================================================
// PAYMENTS HOOKS
// =============================================================================

export function usePayments(params?: PaymentListParams) {
  return useQuery({
    queryKey: queryKeys.payments.list(params),
    queryFn: () => paymentsAPI.list(params),
    staleTime: staleTimes.dynamic,
  });
}

export function usePayment(id: string) {
  return useQuery({
    queryKey: queryKeys.payments.detail(id),
    queryFn: () => paymentsAPI.get(id),
    staleTime: staleTimes.dynamic,
    enabled: !!id,
  });
}

export function usePaymentsForLoan(loanId: string) {
  return useQuery({
    queryKey: queryKeys.payments.forLoan(loanId),
    queryFn: () => paymentsAPI.getForLoan(loanId),
    staleTime: staleTimes.dynamic,
    enabled: !!loanId,
  });
}

export function usePaymentReconciliation(params?: { startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: queryKeys.payments.reconciliation(params),
    queryFn: () => paymentsAPI.getReconciliation(params),
    staleTime: staleTimes.analytics,
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: PaymentRecord) => paymentsAPI.record(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.loans.all });
    },
  });
}

export function useReversePayment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: PaymentReversal) => paymentsAPI.reverse(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.loans.all });
    },
  });
}

// =============================================================================
// ADMIN HOOKS
// =============================================================================

export function useAdminDashboard() {
  return useQuery({
    queryKey: queryKeys.admin.dashboard(),
    queryFn: () => adminAPI.getDashboard(),
    staleTime: staleTimes.realtime,
  });
}

export function useSystemHealth() {
  return useQuery({
    queryKey: queryKeys.admin.systemHealth(),
    queryFn: () => adminAPI.getSystemHealth(),
    staleTime: staleTimes.realtime,
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
  });
}

export function useComplianceReport(params?: { startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: queryKeys.admin.complianceReport(params),
    queryFn: () => adminAPI.getComplianceReport(params),
    staleTime: staleTimes.analytics,
  });
}

export function useAdminCollections() {
  return useQuery({
    queryKey: queryKeys.admin.collections(),
    queryFn: () => adminAPI.getCollections(),
    staleTime: staleTimes.dynamic,
  });
}

export function useBulkApprove() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: BulkApproval) => adminAPI.bulkApprove(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.loans.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.dashboard() });
    },
  });
}

// =============================================================================
// ANALYTICS HOOKS
// =============================================================================

export function usePortfolioAnalytics(params?: AnalyticsParams) {
  return useQuery({
    queryKey: queryKeys.analytics.portfolio(params),
    queryFn: () => analyticsAPI.getPortfolio(params),
    staleTime: staleTimes.analytics,
  });
}

export function useLoanPerformance(params?: AnalyticsParams) {
  return useQuery({
    queryKey: queryKeys.analytics.loanPerformance(params),
    queryFn: () => analyticsAPI.getLoanPerformance(params),
    staleTime: staleTimes.analytics,
  });
}

export function useCollectionsStats(params?: AnalyticsParams) {
  return useQuery({
    queryKey: queryKeys.analytics.collectionsStats(params),
    queryFn: () => analyticsAPI.getCollectionsStats(params),
    staleTime: staleTimes.analytics,
  });
}

export function useDisbursementStats(params?: AnalyticsParams) {
  return useQuery({
    queryKey: queryKeys.analytics.disbursementStats(params),
    queryFn: () => analyticsAPI.getDisbursementStats(params),
    staleTime: staleTimes.analytics,
  });
}

export function useRiskAnalysis(params?: AnalyticsParams) {
  return useQuery({
    queryKey: queryKeys.analytics.riskAnalysis(params),
    queryFn: () => analyticsAPI.getRiskAnalysis(params),
    staleTime: staleTimes.analytics,
  });
}

export function useTrends(params?: TrendParams) {
  return useQuery({
    queryKey: queryKeys.analytics.trends(params),
    queryFn: () => analyticsAPI.getTrends(params),
    staleTime: staleTimes.analytics,
  });
}

// =============================================================================
// DISBURSEMENTS HOOKS
// =============================================================================

export function useDisbursementsList(params?: DisbursementListParams) {
  return useQuery({
    queryKey: queryKeys.disbursements.list(params),
    queryFn: () => disbursementsAPI.list(params),
    staleTime: staleTimes.dynamic,
  });
}

export function usePendingDisbursements(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.disbursements.pending(params),
    queryFn: () => disbursementsAPI.getPending(params),
    staleTime: staleTimes.realtime,
  });
}

export function useDisbursement(id: string) {
  return useQuery({
    queryKey: queryKeys.disbursements.detail(id),
    queryFn: () => disbursementsAPI.get(id),
    staleTime: staleTimes.dynamic,
    enabled: !!id,
  });
}

export function useApproveDisbursement() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: { disbursement_id: string; notes?: string }) => 
      disbursementsAPI.approve(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.disbursements.all });
    },
  });
}

export function useProcessDisbursement() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: { disbursement_id: string; payment_reference: string }) => 
      disbursementsAPI.process(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.disbursements.all });
    },
  });
}

export function useCompleteDisbursement() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: { disbursement_id: string; confirmation_reference: string }) => 
      disbursementsAPI.complete(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.disbursements.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.loans.all });
    },
  });
}

export function useFailDisbursement() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: { disbursement_id: string; reason: string }) => 
      disbursementsAPI.fail(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.disbursements.all });
    },
  });
}

// =============================================================================
// COLLECTIONS HOOKS
// =============================================================================

export function useCollectionsQueue(params?: CollectionsQueueParams) {
  return useQuery({
    queryKey: queryKeys.collections.queue(params),
    queryFn: () => collectionsAPI.getQueue(params),
    staleTime: staleTimes.dynamic,
  });
}

export function useCollectionCase(loanId: string) {
  return useQuery({
    queryKey: queryKeys.collections.case(loanId),
    queryFn: () => collectionsAPI.getCase(loanId),
    staleTime: staleTimes.dynamic,
    enabled: !!loanId,
  });
}

export function useRecordInteraction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: {
      loan_id: string;
      interaction_type: string;
      notes: string;
      outcome?: string;
      next_action_date?: string;
    }) => collectionsAPI.recordInteraction(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collections.case(variables.loan_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.collections.queue() });
    },
  });
}

export function useCreatePromise() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: {
      loan_id: string;
      promised_amount: number;
      promised_date: string;
      notes?: string;
    }) => collectionsAPI.createPromise(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collections.case(variables.loan_id) });
    },
  });
}

export function useUpdatePromise() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status: 'kept' | 'broken'; notes?: string } }) => 
      collectionsAPI.updatePromise(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collections.all });
    },
  });
}

export function useEscalateCollection() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: { loan_id: string; reason: string; escalation_level: string }) => 
      collectionsAPI.escalate(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collections.case(variables.loan_id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.collections.queue() });
    },
  });
}

// =============================================================================
// RECONCILIATION HOOKS
// =============================================================================

export function useReconciliationRuns(params?: ReconciliationRunParams) {
  return useQuery({
    queryKey: queryKeys.reconciliation.runs(params),
    queryFn: () => reconciliationAPI.listRuns(params),
    staleTime: staleTimes.dynamic,
  });
}

export function useReconciliationRun(id: string) {
  return useQuery({
    queryKey: queryKeys.reconciliation.run(id),
    queryFn: () => reconciliationAPI.getRun(id),
    staleTime: staleTimes.dynamic,
    enabled: !!id,
  });
}

export function useCreateReconciliationRun() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: { name: string; bank_account?: string; start_date: string; end_date: string; notes?: string }) => 
      reconciliationAPI.createRun(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reconciliation.all });
    },
  });
}

export function useImportTransactions() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: { source: string; transactions: Array<{
      external_id: string;
      amount: number;
      date: string;
      reference?: string;
      description?: string;
      type?: 'credit' | 'debit';
    }>; run_id?: string }) => 
      reconciliationAPI.importTransactions(data),
    onSuccess: (_, variables) => {
      if (variables.run_id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.reconciliation.run(variables.run_id) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.reconciliation.runs() });
    },
  });
}

export function useAutoMatch() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => reconciliationAPI.autoMatch(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reconciliation.all });
    },
  });
}

export function useManualMatch() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: { transaction_id: string; payment_id: string; notes?: string }) => 
      reconciliationAPI.manualMatch(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reconciliation.all });
    },
  });
}

// =============================================================================
// NOTIFICATIONS HOOKS
// =============================================================================

export function useNotifications(params?: NotificationListParams) {
  return useQuery({
    queryKey: queryKeys.notifications.list(params),
    queryFn: () => notificationsAPI.list(params),
    staleTime: staleTimes.realtime,
  });
}

export function useNotification(id: string) {
  return useQuery({
    queryKey: queryKeys.notifications.detail(id),
    queryFn: () => notificationsAPI.get(id),
    staleTime: staleTimes.dynamic,
    enabled: !!id,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: { notification_id: string }) => notificationsAPI.markRead(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => notificationsAPI.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => notificationsAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

// =============================================================================
// AUDIT HOOKS
// =============================================================================

export function useAuditLogs(params?: AuditLogParams) {
  return useQuery({
    queryKey: queryKeys.audit.logs(params),
    queryFn: () => auditAPI.list(params),
    staleTime: staleTimes.dynamic,
  });
}

export function useAuditLog(id: string) {
  return useQuery({
    queryKey: queryKeys.audit.log(id),
    queryFn: () => auditAPI.get(id),
    staleTime: staleTimes.dynamic,
    enabled: !!id,
  });
}

export function useFinancialAuditLogs(params?: { page?: number; limit?: number; startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: queryKeys.audit.financial(params),
    queryFn: () => auditAPI.getFinancial(params),
    staleTime: staleTimes.dynamic,
  });
}

export function useUserAuditLogs(userId: string, params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.audit.byUser(userId, params),
    queryFn: () => auditAPI.getByUser(userId, params),
    staleTime: staleTimes.dynamic,
    enabled: !!userId,
  });
}

export function useTableAuditLogs(tableName: string, params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.audit.byTable(tableName, params),
    queryFn: () => auditAPI.getByTable(tableName, params),
    staleTime: staleTimes.dynamic,
    enabled: !!tableName,
  });
}

export function useAuditSummary(params?: { period?: string }) {
  return useQuery({
    queryKey: queryKeys.audit.summary(params),
    queryFn: () => auditAPI.getSummary(params),
    staleTime: staleTimes.analytics,
  });
}

export function useAuditActions() {
  return useQuery({
    queryKey: queryKeys.audit.actions(),
    queryFn: () => auditAPI.getActions(),
    staleTime: staleTimes.static,
  });
}
