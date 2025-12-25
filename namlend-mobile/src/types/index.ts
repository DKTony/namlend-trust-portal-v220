/**
 * Shared TypeScript Types for NamLend Mobile
 * Version: v2.4.2
 */

// ============================================================================
// USER & AUTH TYPES
// ============================================================================

export type UserRole = 'client' | 'loan_officer' | 'admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  profile?: UserProfile;
  created_at?: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  id_number?: string;
  employment_status?: string;
  monthly_income?: number;
  credit_score?: number;
  risk_category?: string;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// LOAN TYPES
// ============================================================================

export type LoanStatus = 'pending' | 'approved' | 'rejected' | 'disbursed' | 'active' | 'completed' | 'defaulted';

export interface Loan {
  id: string;
  user_id: string;
  amount: number;
  term_months: number;
  interest_rate: number;
  monthly_payment: number;
  total_repayment: number;
  purpose?: string;
  status: LoanStatus;
  created_at: string;
  updated_at?: string;
  approved_at?: string;
  approved_by?: string;
  disbursed_at?: string;
  approval_request_id?: string;
  version?: number;
}

export interface LoanApplication {
  id: string;
  user_id: string;
  request_type: string;
  request_data: {
    amount: number;
    term: number;
    term_months?: number;
    interest_rate?: number;
    interestRate?: number;
    monthly_payment?: number;
    monthlyPayment?: number;
    total_repayment?: number;
    totalRepayment?: number;
    purpose?: string;
    loanPurpose?: string;
  };
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  priority?: string;
  created_at: string;
  reviewed_at?: string;
  reviewer_id?: string;
  review_notes?: string;
}

// ============================================================================
// PAYMENT TYPES
// ============================================================================

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'cancelled';
export type PaymentMethod = 'bank_transfer' | 'mobile_money' | 'cash' | 'debit_order';
export type ScheduleStatus = 'pending' | 'paid' | 'partially_paid' | 'overdue' | 'waived';

export interface Payment {
  id: string;
  loan_id: string;
  amount: number;
  payment_method: PaymentMethod;
  status: PaymentStatus;
  reference_number?: string;
  paid_at?: string;
  created_at: string;
  is_overdue?: boolean;
  days_overdue?: number;
  payment_notes?: string;
  ips_transaction_id?: string;
  payer_vpa?: string;
}

export interface PaymentSchedule {
  id: string;
  loan_id: string;
  installment_number: number;
  due_date: string;
  principal_amount: number;
  interest_amount: number;
  fee_amount: number;
  late_fee_applied: number;
  total_amount: number;
  amount_paid: number;
  balance: number;
  status: ScheduleStatus;
  paid_at?: string;
  days_overdue: number;
}

export interface ProcessPaymentResult {
  success: boolean;
  payment_id?: string;
  reference_number?: string;
  amount_paid?: number;
  amount_applied?: number;
  overpayment?: number;
  schedules_updated?: number;
  previous_outstanding?: number;
  new_outstanding?: number;
  loan_settled?: boolean;
  settlement_details?: {
    settled: boolean;
    settled_at?: string;
    total_paid?: number;
    outstanding_balance?: number;
  };
  error?: string;
}

export interface LoanPaymentDetails {
  success: boolean;
  loan?: {
    id: string;
    amount: number;
    interest_rate: number;
    term_months: number;
    monthly_payment: number;
    total_repayment: number;
    status: LoanStatus;
    disbursed_at?: string;
    settled_at?: string;
    purpose?: string;
  };
  summary?: {
    total_scheduled: number;
    total_paid: number;
    outstanding_balance: number;
    installments_paid: number;
    installments_remaining: number;
    total_installments: number;
    next_due_date?: string;
    overdue_amount: number;
    is_settled: boolean;
  };
  schedules?: PaymentSchedule[];
  payments?: Array<{
    id: string;
    amount: number;
    payment_method: string;
    reference_number?: string;
    status: PaymentStatus;
    paid_at?: string;
    notes?: string;
  }>;
  error?: string;
}

export interface LoanPortfolioSummary {
  success: boolean;
  user_id?: string;
  portfolio?: {
    total_loans: number;
    active_loans: number;
    settled_loans: number;
    total_borrowed: number;
    total_paid: number;
    total_outstanding: number;
    next_payment_due?: string;
  };
  loans?: Array<{
    loan_id: string;
    principal_amount: number;
    total_repayment: number;
    monthly_payment: number;
    status: LoanStatus;
    total_paid: number;
    outstanding_balance: number;
    installments_paid: number;
    installments_remaining: number;
    total_installments: number;
    next_due_date?: string;
    next_payment_amount: number;
    disbursed_at?: string;
    settled_at?: string;
    progress_percent: number;
  }>;
  error?: string;
}

// ============================================================================
// APPROVAL WORKFLOW TYPES
// ============================================================================

export interface ApprovalRequest {
  id: string;
  user_id: string;
  request_type: string;
  request_data: any;
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'requires_info';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  reviewed_at?: string;
  reviewer_id?: string;
  review_notes?: string;
  reference_id?: string;
  reference_table?: string;
  risk_score?: number;
  compliance_flags?: any[];
  metadata?: any;
  user?: {
    email: string;
    raw_user_meta_data?: any;
  };
  profile?: UserProfile;
}

export interface WorkflowInstance {
  id: string;
  workflow_definition_id: string;
  entity_type: string;
  entity_id: string;
  current_stage: number;
  status: 'in_progress' | 'completed' | 'rejected' | 'cancelled';
  started_at: string;
  completed_at?: string;
  metadata: any;
}

export interface WorkflowStageExecution {
  id: string;
  workflow_instance_id: string;
  stage_number: number;
  stage_name: string;
  assigned_role: string;
  assigned_to?: string;
  status: 'pending' | 'approved' | 'rejected' | 'skipped';
  decision?: string;
  decision_notes?: string;
  decided_by?: string;
  decided_at?: string;
  created_at: string;
}

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export interface PushNotification {
  id: string;
  title: string;
  body: string;
  data?: any;
  timestamp: string;
  read: boolean;
}

// ============================================================================
// DOCUMENT TYPES
// ============================================================================

export type DocumentType = 'id_card' | 'proof_income' | 'bank_statement' | 'other';

export interface Document {
  id: string;
  user_id: string;
  document_type: DocumentType;
  file_url: string;
  file_name: string;
  file_size: number;
  uploaded_at: string;
  verified: boolean;
  verified_at?: string;
  verified_by?: string;
}

// ============================================================================
// IPS/VPA TYPES (Instant Payment System)
// ============================================================================

export type IPSTransactionStatus = 'initiated' | 'pending_callback' | 'completed' | 'failed' | 'timeout';
export type IPSTransactionType = 'PAY' | 'COLLECT' | 'REVERSAL' | 'REFUND';

export interface VPA {
  id: string;
  user_id: string;
  vpa_address: string;
  provider: string;
  is_default: boolean;
  is_verified: boolean;
  verified_at?: string;
  created_at: string;
  updated_at: string;
}

export interface IPSTransaction {
  id: string;
  loan_id?: string;
  payment_id?: string;
  transaction_type: IPSTransactionType;
  payer_vpa: string;
  payee_vpa: string;
  amount: number;
  currency: string;
  status: IPSTransactionStatus;
  ips_ref_id?: string;
  ips_txn_id?: string;
  error_code?: string;
  error_message?: string;
  initiated_at: string;
  completed_at?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// NOTIFICATION TYPES (Backend Integration)
// ============================================================================

export type NotificationCategory = 'loan' | 'payment' | 'kyc' | 'account' | 'general' | 'marketing' | 'collections';
export type NotificationChannel = 'in_app' | 'sms' | 'whatsapp' | 'email' | 'push';

export interface BackendNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  is_read: boolean;
  read_at?: string;
  action_url?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface NotificationPreference {
  id: string;
  user_id: string;
  channel: NotificationChannel;
  category: NotificationCategory;
  enabled: boolean;
  updated_at: string;
}

// ============================================================================
// CREDIT SCORE TYPES
// ============================================================================

export type ScoreRange = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
export type RiskLevel = 'low' | 'medium' | 'high' | 'very_high';

export interface CreditScore {
  score: number;
  scoreRange: ScoreRange;
  riskLevel: RiskLevel;
  maxApprovedAmount: number;
  suggestedInterestRate: number;
  debtToIncomeRatio: number;
  factors: CreditScoreFactor[];
  recommendations: string[];
}

export interface CreditScoreFactor {
  name: string;
  value: number;
  weight: number;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
