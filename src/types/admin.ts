/**
 * Admin Dashboard Type Definitions
 *
 * Type definitions for admin components, workflows, user management,
 * and configuration screens.
 */

// =============================================================================
// WORKFLOW TYPES
// =============================================================================

export type WorkflowEntityType =
  | 'loan_application'
  | 'disbursement'
  | 'payment'
  | 'user_role_change'
  | 'kyc_verification';

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  entity_type: WorkflowEntityType | string;
  stages: WorkflowStage[];
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface WorkflowStage {
  stage: number;
  name: string;
  description: string;
  required_role: string;
  required_approvals: number;
  auto_assign: boolean;
  timeout_hours: number;
  conditions: WorkflowConditions;
}

export interface WorkflowConditions {
  amount_min?: number | null;
  amount_max?: number | null;
  [key: string]: unknown;
}

// =============================================================================
// USER MANAGEMENT TYPES
// =============================================================================

export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending';

export type UserRole = 'admin' | 'loan_officer' | 'client' | 'support' | 'auditor';

export interface ProfileUpdatePayload {
  first_name?: string;
  last_name?: string;
  phone_number?: string | null;
  verified?: boolean;
  updated_at: string;
}

export interface ProfileWithRolesRow {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  verified: boolean | null;
  created_at: string;
  updated_at: string | null;
  last_login: string | null;
  email: string | null;
  role: string | null;
  primary_role?: string | null;
  roles?: string[];
}

export interface UserAuditEntry {
  id: string;
  user_id: string;
  action: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// =============================================================================
// CONFIGURATION TYPES
// =============================================================================

export type ConfigValue = string | number | boolean | Record<string, unknown>;

export interface ConfigItem<T = unknown> {
  config_key: string;
  config_value: T;
  category?: string;
  updated_at?: string;
}

export interface SettlementConfigData {
  auto_settlement: boolean;
  settlement_time: string;
  minimum_amount: number;
  batch_size: number;
  retry_attempts: number;
  notification_email?: string;
}

export interface IPSConfigData {
  enabled: boolean;
  endpoint_url: string;
  api_key?: string;
  timeout_seconds: number;
  max_retries: number;
}

export interface ReconciliationConfigData {
  auto_reconcile: boolean;
  reconcile_frequency: string;
  tolerance_amount: number;
  alert_threshold: number;
}

export interface TigerBeetleConfigData {
  cluster_id: string;
  replica_addresses: string[];
  connection_timeout: number;
  request_timeout: number;
}

// =============================================================================
// CHART & ANALYTICS TYPES
// =============================================================================

export interface ChartTooltipPayload {
  dataKey: string;
  value: number;
  color: string;
  name?: string;
  payload?: Record<string, unknown>;
}

export interface ChartTooltipProps {
  active?: boolean;
  payload?: ChartTooltipPayload[];
  label?: string;
}

export interface RevenueData {
  month: string;
  revenue: number;
  disbursements: number;
  collections: number;
  profit?: number;
}

export interface FinancialMetrics {
  totalLoans: number;
  totalDisbursed: number;
  totalCollected: number;
  outstandingBalance: number;
  defaultRate: number;
  averageLoanSize: number;
}

// =============================================================================
// PAYMENT MANAGEMENT TYPES
// =============================================================================

export interface OverduePayment {
  id: string;
  loan_id: string;
  amount_due: number;
  due_date: string;
  days_overdue: number;
  borrower_name?: string;
  borrower_phone?: string;
  last_contact_date?: string;
}

export interface DisbursementRequest {
  id: string;
  loan_id: string;
  amount: number;
  method: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requested_at: string;
  processed_at?: string;
}

export interface CollectionRecord {
  id: string;
  loan_id: string;
  amount: number;
  status: 'pending' | 'in_progress' | 'collected' | 'failed';
  assigned_agent?: string;
  notes?: string;
  created_at: string;
}

// =============================================================================
// FORM & INPUT TYPES
// =============================================================================

export interface FormFieldChange<T = unknown> {
  field: string;
  value: T;
  previousValue?: T;
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

export function isUserStatus(value: unknown): value is UserStatus {
  return (
    typeof value === 'string' &&
    ['active', 'inactive', 'suspended', 'pending'].includes(value)
  );
}

export function isUserRole(value: unknown): value is UserRole {
  return (
    typeof value === 'string' &&
    ['admin', 'loan_officer', 'client', 'support', 'auditor'].includes(value)
  );
}

export function isWorkflowEntityType(value: unknown): value is WorkflowEntityType {
  return (
    typeof value === 'string' &&
    ['loan_application', 'disbursement', 'payment', 'user_role_change', 'kyc_verification'].includes(value)
  );
}
