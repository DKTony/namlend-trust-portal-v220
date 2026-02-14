/**
 * API Client for Orchestration Layer
 * Centralized client for calling edge function APIs
 * 
 * Features:
 * - Retry logic with exponential backoff
 * - Performance monitoring
 * - Standardized error handling
 * - TanStack Query compatible
 */

import { supabase } from '@/integrations/supabase/client';

// =============================================================================
// TYPES
// =============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
    requestId?: string;
    duration?: number;
  };
}

export type ParamValue = string | number | boolean | undefined;

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  params?: Record<string, ParamValue> | { [key: string]: ParamValue };
  retry?: RetryConfig;
  signal?: AbortSignal;
}

export interface RetryConfig {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryOn?: (error: ApiError, attempt: number) => boolean;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string,
    public readonly isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  retryOn: (error: ApiError, attempt: number) => {
    // Retry on network errors or 5xx server errors
    if (error.isRetryable) return attempt < 3;
    if (error.status && error.status >= 500) return attempt < 3;
    if (error.status === 429) return attempt < 5; // Rate limiting - more retries
    return false;
  },
};

// Transient error codes that should be retried
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

// =============================================================================
// PERFORMANCE MONITORING
// =============================================================================

interface PerformanceMetric {
  endpoint: string;
  method: string;
  duration: number;
  status: 'success' | 'error';
  timestamp: number;
  retries: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private readonly maxMetrics = 100;

  record(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
    
    // Log slow requests (> 3s)
    if (metric.duration > 3000) {
      console.warn(`[API Performance] Slow request: ${metric.endpoint} took ${metric.duration}ms`);
    }
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  getAverageDuration(endpoint?: string): number {
    const filtered = endpoint 
      ? this.metrics.filter(m => m.endpoint === endpoint)
      : this.metrics;
    
    if (filtered.length === 0) return 0;
    return filtered.reduce((sum, m) => sum + m.duration, 0) / filtered.length;
  }

  getErrorRate(endpoint?: string): number {
    const filtered = endpoint 
      ? this.metrics.filter(m => m.endpoint === endpoint)
      : this.metrics;
    
    if (filtered.length === 0) return 0;
    const errors = filtered.filter(m => m.status === 'error').length;
    return errors / filtered.length;
  }

  clear(): void {
    this.metrics = [];
  }
}

export const performanceMonitor = new PerformanceMonitor();

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateBackoff(attempt: number, baseDelay: number, maxDelay: number): number {
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * exponentialDelay; // 30% jitter
  return Math.min(exponentialDelay + jitter, maxDelay);
}

/**
 * Get the current session token
 */
async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

/**
 * Build URL with query parameters
 */
function buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined>): string {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const url = new URL(`${baseUrl}/functions/v1/${endpoint}`);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }
  
  return url.toString();
}

/**
 * Determine if an error is retryable
 */
function isRetryableError(status: number | undefined): boolean {
  if (!status) return true; // Network errors are retryable
  return RETRYABLE_STATUS_CODES.includes(status);
}

/**
 * Make a single API request (without retry)
 */
async function makeRequest<T>(
  url: string,
  method: string,
  token: string,
  body?: unknown,
  signal?: AbortSignal
): Promise<{ response: Response; data: unknown }> {
  const response = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    ...(body && { body: JSON.stringify(body) }),
    signal,
  });

  const data = await response.json();
  return { response, data };
}

// =============================================================================
// MAIN API CALL FUNCTION
// =============================================================================

/**
 * Make API call to orchestration layer with retry logic and performance monitoring
 */
export async function callAPI<T = unknown>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { method = 'GET', body, params, retry, signal } = options;
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retry };
  
  const startTime = performance.now();
  let lastError: ApiError | null = null;
  let attempts = 0;

  try {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, error: 'Not authenticated', code: 'AUTH_REQUIRED' };
    }

    const url = buildUrl(endpoint, params);

    while (attempts <= retryConfig.maxRetries) {
      try {
        // Check if request was aborted
        if (signal?.aborted) {
          return { success: false, error: 'Request aborted', code: 'ABORTED' };
        }

        const { response, data } = await makeRequest<T>(url, method, token, body, signal);
        const duration = performance.now() - startTime;

        // Record performance metric
        performanceMonitor.record({
          endpoint,
          method,
          duration,
          status: response.ok ? 'success' : 'error',
          timestamp: Date.now(),
          retries: attempts,
        });

        if (!response.ok) {
          const errorMessage = (data as { error?: string })?.error || `Request failed with status ${response.status}`;
          const isRetryable = isRetryableError(response.status);
          
          lastError = new ApiError(errorMessage, response.status, undefined, isRetryable);

          // Check if we should retry
          if (retryConfig.retryOn(lastError, attempts) && attempts < retryConfig.maxRetries) {
            const delay = calculateBackoff(attempts, retryConfig.baseDelayMs, retryConfig.maxDelayMs);
            console.info(`[API] Retrying ${endpoint} after ${Math.round(delay)}ms (attempt ${attempts + 1}/${retryConfig.maxRetries})`);
            await sleep(delay);
            attempts++;
            continue;
          }

          return {
            success: false,
            error: errorMessage,
            code: response.status === 429 ? 'RATE_LIMITED' : 'REQUEST_FAILED',
            meta: { duration, requestId: response.headers.get('x-request-id') || undefined },
          };
        }

        // Success - add duration to meta
        const responseData = data as ApiResponse<T>;
        return {
          ...responseData,
          meta: {
            ...responseData.meta,
            duration,
          },
        };

      } catch (fetchError) {
        const duration = performance.now() - startTime;
        
        // Network error or other fetch failure
        const errorMessage = fetchError instanceof Error ? fetchError.message : 'Network error';
        lastError = new ApiError(errorMessage, undefined, 'NETWORK_ERROR', true);

        performanceMonitor.record({
          endpoint,
          method,
          duration,
          status: 'error',
          timestamp: Date.now(),
          retries: attempts,
        });

        // Check if we should retry network errors
        if (retryConfig.retryOn(lastError, attempts) && attempts < retryConfig.maxRetries) {
          const delay = calculateBackoff(attempts, retryConfig.baseDelayMs, retryConfig.maxDelayMs);
          console.info(`[API] Retrying ${endpoint} after network error (attempt ${attempts + 1}/${retryConfig.maxRetries})`);
          await sleep(delay);
          attempts++;
          continue;
        }

        throw fetchError;
      }
    }

    // If we've exhausted retries
    return {
      success: false,
      error: lastError?.message || 'Max retries exceeded',
      code: 'MAX_RETRIES_EXCEEDED',
    };

  } catch (err) {
    const duration = performance.now() - startTime;
    console.error('API call failed:', err);
    
    performanceMonitor.record({
      endpoint,
      method,
      duration,
      status: 'error',
      timestamp: Date.now(),
      retries: attempts,
    });

    return {
      success: false,
      error: err instanceof Error ? err.message : 'Network error',
      code: 'UNEXPECTED_ERROR',
      meta: { duration },
    };
  }
}

/**
 * Make API call without retry (for mutations that shouldn't be retried)
 */
export async function callAPIOnce<T = unknown>(
  endpoint: string,
  options: Omit<RequestOptions, 'retry'> = {}
): Promise<ApiResponse<T>> {
  return callAPI<T>(endpoint, { ...options, retry: { maxRetries: 0 } });
}

// =============================================================================
// LOANS API
// =============================================================================

export interface LoanListParams {
  page?: number;
  limit?: number;
  status?: string;
  user_id?: string;
  assigned_officer_id?: string;
  startDate?: string;
  endDate?: string;
  [key: string]: ParamValue;
}

export interface LoanApplication {
  amount: number;
  term_months: number;
  purpose: string;
  interest_rate: number;
  employment_status: 'employed' | 'self_employed' | 'unemployed' | 'retired';
  monthly_income: number;
}

export interface LoanApproval {
  loan_id: string;
  action: 'approve' | 'reject';
  notes?: string;
  approved_amount?: number;
  approved_rate?: number;
}

export interface Disbursement {
  loan_id: string;
  payment_method: 'bank_transfer' | 'mobile_money' | 'cash' | 'debit_order';
  payment_reference: string;
  notes?: string;
}

export const loansAPI = {
  list: (params?: LoanListParams) => 
    callAPI('api-loans/list', { params }),
  
  get: (id: string) => 
    callAPI(`api-loans/${id}`),
  
  apply: (data: LoanApplication) => 
    callAPI('api-loans/apply', { method: 'POST', body: data }),
  
  approve: (data: LoanApproval) => 
    callAPI('api-loans/approve', { method: 'POST', body: data }),
  
  reject: (data: LoanApproval) => 
    callAPI('api-loans/reject', { method: 'POST', body: data }),
  
  disburse: (data: Disbursement) => 
    callAPI('api-loans/disburse', { method: 'POST', body: data }),
  
  getApprovalRequests: (params?: { page?: number; limit?: number }) => 
    callAPI('api-loans/approval-requests', { params }),
  
  getSchedule: (loanId: string) => 
    callAPI(`api-loans/schedules/${loanId}`),
};

// =============================================================================
// USERS API
// =============================================================================

export interface UserUpdateData {
  first_name?: string;
  last_name?: string;
  phone?: string;
  id_number?: string;
}

export interface UserListParams {
  page?: number;
  limit?: number;
  role?: string;
  search?: string;
  [key: string]: ParamValue;
}

export const usersAPI = {
  getProfile: () => 
    callAPI('api-users/profile'),
  
  updateProfile: (data: UserUpdateData) => 
    callAPI('api-users/profile', { method: 'PATCH', body: data }),
  
  list: (params?: UserListParams) => 
    callAPI('api-users/list', { params }),
  
  get: (id: string) => 
    callAPI(`api-users/${id}`),
  
  updateRole: (id: string, role: string) => 
    callAPI(`api-users/${id}/role`, { method: 'PATCH', body: { role } }),
  
  getRoles: () => 
    callAPI('api-users/roles'),
};

// =============================================================================
// PAYMENTS API
// =============================================================================

export interface PaymentListParams {
  page?: number;
  limit?: number;
  loan_id?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  [key: string]: ParamValue;
}

export interface PaymentRecord {
  loan_id: string;
  amount: number;
  payment_method: 'bank_transfer' | 'mobile_money' | 'cash' | 'debit_order';
  reference?: string;
  payment_date?: string;
  notes?: string;
}

export interface PaymentReversal {
  payment_id: string;
  reason: string;
}

export const paymentsAPI = {
  list: (params?: PaymentListParams) => 
    callAPI('api-payments/list', { params }),
  
  get: (id: string) => 
    callAPI(`api-payments/${id}`),
  
  record: (data: PaymentRecord) => 
    callAPI('api-payments/record', { method: 'POST', body: data }),
  
  reverse: (data: PaymentReversal) => 
    callAPI('api-payments/reverse', { method: 'POST', body: data }),
  
  getForLoan: (loanId: string) => 
    callAPI(`api-payments/loan/${loanId}`),
  
  getReconciliation: (params?: { startDate?: string; endDate?: string }) => 
    callAPI('api-payments/reconciliation', { params }),
};

// =============================================================================
// ADMIN API
// =============================================================================

export interface AuditLogParams {
  page?: number;
  limit?: number;
  action?: string;
  table_name?: string;
  user_id?: string;
  startDate?: string;
  endDate?: string;
  [key: string]: ParamValue;
}

export interface BulkApproval {
  loan_ids: string[];
  notes?: string;
}

export const adminAPI = {
  getDashboard: () => 
    callAPI('api-admin/dashboard'),
  
  getAuditLogs: (params?: AuditLogParams) => 
    callAPI('api-admin/audit-logs', { params }),
  
  getSystemHealth: () => 
    callAPI('api-admin/system-health'),
  
  bulkApprove: (data: BulkApproval) => 
    callAPI('api-admin/bulk-approve', { method: 'POST', body: data }),
  
  getComplianceReport: (params?: { startDate?: string; endDate?: string }) => 
    callAPI('api-admin/compliance-report', { params }),
  
  getCollections: () => 
    callAPI('api-admin/collections'),
};

// =============================================================================
// ANALYTICS API
// =============================================================================

export interface AnalyticsParams {
  startDate?: string;
  endDate?: string;
  period?: '7d' | '30d' | '90d' | '365d' | 'all';
  [key: string]: ParamValue;
}

export interface TrendParams extends AnalyticsParams {
  metric?: 'loans' | 'disbursements' | 'payments' | 'collections';
  groupBy?: 'day' | 'week' | 'month';
}

export const analyticsAPI = {
  getPortfolio: (params?: AnalyticsParams) =>
    callAPI('api-analytics/portfolio', { params }),
  
  getLoanPerformance: (params?: AnalyticsParams) =>
    callAPI('api-analytics/loan-performance', { params }),
  
  getCollectionsStats: (params?: AnalyticsParams) =>
    callAPI('api-analytics/collections-stats', { params }),
  
  getDisbursementStats: (params?: AnalyticsParams) =>
    callAPI('api-analytics/disbursement-stats', { params }),
  
  getRiskAnalysis: (params?: AnalyticsParams) =>
    callAPI('api-analytics/risk-analysis', { params }),
  
  getTrends: (params?: TrendParams) =>
    callAPI('api-analytics/trends', { params }),
};

// =============================================================================
// DISBURSEMENTS API
// =============================================================================

export interface DisbursementListParams {
  page?: number;
  limit?: number;
  status?: string;
  loan_id?: string;
  startDate?: string;
  endDate?: string;
  [key: string]: ParamValue;
}

export const disbursementsAPI = {
  list: (params?: DisbursementListParams) =>
    callAPI('api-disbursements/list', { params }),
  
  getPending: (params?: { page?: number; limit?: number }) =>
    callAPI('api-disbursements/pending', { params }),
  
  get: (id: string) =>
    callAPI(`api-disbursements/${id}`),
  
  approve: (data: { disbursement_id: string; notes?: string }) =>
    callAPI('api-disbursements/approve', { method: 'POST', body: data }),
  
  process: (data: { disbursement_id: string; payment_reference: string }) =>
    callAPI('api-disbursements/process', { method: 'POST', body: data }),
  
  complete: (data: { disbursement_id: string; confirmation_reference: string }) =>
    callAPI('api-disbursements/complete', { method: 'POST', body: data }),
  
  fail: (data: { disbursement_id: string; reason: string }) =>
    callAPI('api-disbursements/fail', { method: 'POST', body: data }),
};

// =============================================================================
// COLLECTIONS API
// =============================================================================

export interface CollectionsQueueParams {
  page?: number;
  limit?: number;
  priority?: 'high' | 'medium' | 'low';
  daysOverdue?: number;
  [key: string]: ParamValue;
}

export const collectionsAPI = {
  getQueue: (params?: CollectionsQueueParams) =>
    callAPI('api-collections/queue', { params }),
  
  getCase: (loanId: string) =>
    callAPI(`api-collections/case/${loanId}`),
  
  recordInteraction: (data: {
    loan_id: string;
    interaction_type: string;
    notes: string;
    outcome?: string;
    next_action_date?: string;
  }) =>
    callAPI('api-collections/interaction', { method: 'POST', body: data }),
  
  createPromise: (data: {
    loan_id: string;
    promised_amount: number;
    promised_date: string;
    notes?: string;
  }) =>
    callAPI('api-collections/promise', { method: 'POST', body: data }),
  
  updatePromise: (id: string, data: { status: 'kept' | 'broken'; notes?: string }) =>
    callAPI(`api-collections/promise/${id}`, { method: 'PATCH', body: data }),
  
  escalate: (data: { loan_id: string; reason: string; escalation_level: string }) =>
    callAPI('api-collections/escalate', { method: 'POST', body: data }),
};

// =============================================================================
// RECONCILIATION API
// =============================================================================

export interface ReconciliationRunParams {
  page?: number;
  limit?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
  [key: string]: ParamValue;
}

export const reconciliationAPI = {
  listRuns: (params?: ReconciliationRunParams) =>
    callAPI('api-reconciliation/runs', { params }),
  
  getRun: (id: string) =>
    callAPI(`api-reconciliation/runs/${id}`),
  
  createRun: (data: { name: string; bank_account?: string; start_date: string; end_date: string; notes?: string }) =>
    callAPI('api-reconciliation/runs', { method: 'POST', body: data }),
  
  importTransactions: (data: { source: string; transactions: Array<{
    external_id: string;
    amount: number;
    date: string;
    reference?: string;
    description?: string;
    type?: 'credit' | 'debit';
  }>; run_id?: string }) =>
    callAPI('api-reconciliation/import', { method: 'POST', body: data }),
  
  autoMatch: () =>
    callAPI('api-reconciliation/auto-match', { method: 'POST' }),
  
  manualMatch: (data: { transaction_id: string; payment_id: string; notes?: string }) =>
    callAPI('api-reconciliation/manual-match', { method: 'POST', body: data }),
};

// =============================================================================
// NOTIFICATIONS API
// =============================================================================

export interface NotificationListParams {
  page?: number;
  limit?: number;
  is_read?: boolean;
  notification_type?: string;
  [key: string]: ParamValue;
}

export const notificationsAPI = {
  list: (params?: NotificationListParams) =>
    callAPI('api-notifications/list', { params }),
  
  get: (id: string) =>
    callAPI(`api-notifications/${id}`),
  
  markRead: (data: { notification_id: string }) =>
    callAPI('api-notifications/mark-read', { method: 'POST', body: data }),
  
  markAllRead: () =>
    callAPI('api-notifications/mark-all-read', { method: 'POST' }),
  
  delete: (id: string) =>
    callAPI(`api-notifications/${id}`, { method: 'DELETE' }),
};

// =============================================================================
// AUDIT API
// =============================================================================

export const auditAPI = {
  list: (params?: AuditLogParams) =>
    callAPI('api-audit/logs', { params }),
  
  get: (id: string) =>
    callAPI(`api-audit/logs/${id}`),
  
  getFinancial: (params?: { page?: number; limit?: number; startDate?: string; endDate?: string }) =>
    callAPI('api-audit/financial', { params }),
  
  getByUser: (userId: string, params?: { page?: number; limit?: number }) =>
    callAPI(`api-audit/user/${userId}`, { params }),
  
  getByTable: (tableName: string, params?: { page?: number; limit?: number }) =>
    callAPI(`api-audit/table/${tableName}`, { params }),
  
  export: (params: { format: 'csv' | 'json'; startDate?: string; endDate?: string }) =>
    callAPI('api-audit/export', { params }),
  
  getSummary: (params?: { period?: string }) =>
    callAPI('api-audit/summary', { params }),
  
  getActions: () =>
    callAPI('api-audit/actions'),
};

// =============================================================================
// COMBINED API EXPORT
// =============================================================================

export const api = {
  loans: loansAPI,
  users: usersAPI,
  payments: paymentsAPI,
  admin: adminAPI,
  analytics: analyticsAPI,
  disbursements: disbursementsAPI,
  collections: collectionsAPI,
  reconciliation: reconciliationAPI,
  notifications: notificationsAPI,
  audit: auditAPI,
  call: callAPI,
};

export default api;
