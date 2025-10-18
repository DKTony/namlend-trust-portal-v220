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
