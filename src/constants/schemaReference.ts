/**
 * Database Schema Reference
 * 
 * This file documents the actual column names in key database tables.
 * Use this as a reference when writing queries or RPC functions.
 * 
 * IMPORTANT: This is auto-generated from the database schema.
 * Do not modify manually - regenerate if schema changes.
 */

// audit_logs table columns
export const AUDIT_LOGS_COLUMNS = {
  id: 'id',
  user_id: 'user_id',           // NOT 'performed_by'
  action: 'action',
  table_name: 'table_name',
  record_id: 'record_id',
  old_values: 'old_values',
  new_values: 'new_values',
  ip_address: 'ip_address',
  user_agent: 'user_agent',
  created_at: 'created_at',
} as const;

// state_transitions table columns
export const STATE_TRANSITIONS_COLUMNS = {
  id: 'id',
  created_at: 'created_at',
  entity_type: 'entity_type',
  entity_id: 'entity_id',
  from_state: 'from_state',
  to_state: 'to_state',
  transition_reason: 'transition_reason',  // NOT 'reason'
  triggered_by: 'triggered_by',            // NOT 'performed_by'
  workflow_instance_id: 'workflow_instance_id',
  metadata: 'metadata',
} as const;

// profiles table columns
export const PROFILES_COLUMNS = {
  id: 'id',
  user_id: 'user_id',
  first_name: 'first_name',      // NOT 'full_name' - combine first_name + last_name
  last_name: 'last_name',
  phone_number: 'phone_number',
  phone: 'phone',                // Alternative phone field
  email: 'email',
  id_number: 'id_number',
  employment_status: 'employment_status',
  monthly_income: 'monthly_income',
  verified: 'verified',
  created_at: 'created_at',
  updated_at: 'updated_at',
  credit_score: 'credit_score',
  risk_category: 'risk_category',
  last_login: 'last_login',
  version: 'version',
  monthly_debt_payments: 'monthly_debt_payments',
  employment_duration: 'employment_duration',
  existing_debt: 'existing_debt',
  address_verified: 'address_verified',
  employment_verified: 'employment_verified',
} as const;

// loans table columns
export const LOANS_COLUMNS = {
  id: 'id',
  user_id: 'user_id',
  amount: 'amount',
  term_months: 'term_months',
  interest_rate: 'interest_rate',
  monthly_payment: 'monthly_payment',
  total_repayment: 'total_repayment',
  purpose: 'purpose',
  status: 'status',
  disbursed_at: 'disbursed_at',
  created_at: 'created_at',
  updated_at: 'updated_at',
  approval_request_id: 'approval_request_id',
  version: 'version',
  approved_at: 'approved_at',
  approved_by: 'approved_by',
  settled_at: 'settled_at',
  total_paid: 'total_paid',
  outstanding_balance: 'outstanding_balance',
} as const;

// payments table columns
export const PAYMENTS_COLUMNS = {
  id: 'id',
  loan_id: 'loan_id',
  amount: 'amount',
  payment_method: 'payment_method',
  status: 'status',
  reference_number: 'reference_number',
  paid_at: 'paid_at',
  created_at: 'created_at',
  is_overdue: 'is_overdue',
  days_overdue: 'days_overdue',
  payment_notes: 'payment_notes',
} as const;

// payment_schedules table columns
export const PAYMENT_SCHEDULES_COLUMNS = {
  id: 'id',
  loan_id: 'loan_id',
  installment_number: 'installment_number',
  due_date: 'due_date',
  principal_amount: 'principal_amount',
  interest_amount: 'interest_amount',
  fee_amount: 'fee_amount',
  amount_paid: 'amount_paid',
  status: 'status',
  paid_at: 'paid_at',
  days_overdue: 'days_overdue',
  late_fee_applied: 'late_fee_applied',
  created_at: 'created_at',
  updated_at: 'updated_at',
} as const;

// disbursements table columns
export const DISBURSEMENTS_COLUMNS = {
  id: 'id',
  loan_id: 'loan_id',
  amount: 'amount',
  status: 'status',
  method: 'method',
  reference: 'reference',
  scheduled_at: 'scheduled_at',
  processed_at: 'processed_at',
  created_by: 'created_by',
  created_at: 'created_at',
  updated_at: 'updated_at',
  payment_reference: 'payment_reference',
  processing_notes: 'processing_notes',
} as const;

// Helper function to get full name from profile
export const getFullName = (profile: { first_name?: string; last_name?: string } | null | undefined): string => {
  if (!profile) return 'Unknown';
  const firstName = profile.first_name || '';
  const lastName = profile.last_name || '';
  return `${firstName} ${lastName}`.trim() || 'Unknown';
};

// Common column name mappings (wrong -> correct)
export const COLUMN_NAME_CORRECTIONS = {
  // audit_logs
  'performed_by': 'user_id',
  
  // state_transitions
  'reason': 'transition_reason',
  
  // profiles
  'full_name': 'first_name + last_name (use getFullName helper)',
  'name': 'first_name + last_name (use getFullName helper)',
} as const;
