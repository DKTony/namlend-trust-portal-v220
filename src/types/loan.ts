/**
 * Canonical Loan Type Definitions
 * 
 * This file contains the unified, canonical type definitions for loan-related entities.
 * All components should import from this file to maintain consistency across the codebase.
 * 
 * @module types/loan
 */

// =============================================================================
// LOAN STATUS TYPES
// =============================================================================

/**
 * Valid loan statuses in the system
 * State machine: pending → approved → disbursed → active → settled
 *                       ↘ rejected
 */
export type LoanStatus = 
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'disbursed'
  | 'active'
  | 'settled'
  | 'defaulted'
  | 'written_off';

/**
 * Valid disbursement statuses
 * State machine: approved → processing → completed
 *                        ↘ failed
 */
export type DisbursementStatus = 
  | 'pending'
  | 'approved'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * Valid payment statuses
 */
export type PaymentStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'reversed';

// =============================================================================
// CORE LOAN TYPES
// =============================================================================

/**
 * Base loan record from database
 * Maps directly to the `loans` table schema
 */
export interface LoanRecord {
  id: string;
  user_id: string;
  amount: number;
  purpose: string;
  term_months: number;
  interest_rate: number;
  monthly_payment?: number;
  total_repayment?: number;
  outstanding_balance?: number;
  total_paid?: number;
  status: LoanStatus;
  created_at: string;
  updated_at?: string;
  approved_at?: string;
  approved_by?: string;
  disbursed_at?: string;
  settled_at?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Loan application for admin review
 * Extended loan record with applicant information
 */
export interface LoanApplication {
  id: string;
  applicantName: string;
  applicantEmail: string;
  amount: number;
  purpose: string;
  status: LoanStatus;
  submittedAt: string;
  riskScore?: number;
  monthlyIncome?: number;
  employmentStatus?: string;
  creditScore?: number;
  source?: 'loan' | 'approval';
  approvedAt?: string;
  disbursedAt?: string;
  termMonths?: number;
  interestRate?: number;
}

/**
 * Detailed loan information for review panels
 */
export interface LoanDetailsForReview {
  id: string;
  applicantName: string;
  applicantEmail: string;
  phone: string;
  address: string;
  amount: number;
  purpose: string;
  term: number;
  interestRate: number;
  monthlyIncome: number;
  employmentStatus: string;
  employer: string;
  creditScore: number;
  riskScore: number;
  submittedAt: string;
  status: string;
  approvedAt?: string;
  disbursedAt?: string;
  documents: LoanDocument[];
  creditHistory: CreditHistoryItem[];
}

/**
 * Loan details for 360° view
 */
export interface Loan360Details {
  id: string;
  amount: number;
  term_months: number;
  interest_rate: number;
  monthly_payment: number;
  total_repayment: number;
  purpose: string;
  status: string;
  created_at: string;
  approved_at?: string;
  disbursed_at?: string;
  user_id: string;
}

// =============================================================================
// SUPPORTING TYPES
// =============================================================================

/**
 * Document attached to a loan
 */
export interface LoanDocument {
  id: string;
  name: string;
  type: string;
  status: 'verified' | 'pending' | 'rejected';
  uploadedAt: string;
}

/**
 * Credit history item
 */
export interface CreditHistoryItem {
  type: string;
  amount: number;
  status: string;
  date: string;
}

/**
 * Client profile information
 */
export interface ClientProfile {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  id_number?: string;
  address?: string;
  employment_status?: string;
  employer_name?: string;
  monthly_income?: number;
}

// =============================================================================
// DISBURSEMENT TYPES
// =============================================================================

/**
 * Disbursement record
 */
export interface Disbursement {
  id: string;
  loan_id: string;
  client_name?: string;
  amount: number;
  status: DisbursementStatus;
  method?: string;
  reference?: string;
  payment_reference?: string;
  scheduled_at?: string;
  processed_at?: string;
  processing_notes?: string;
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

/**
 * Result from disbursement operations
 */
export interface DisbursementResult {
  success: boolean;
  disbursement_id?: string;
  loan_id?: string;
  amount?: number;
  status?: string;
  payment_reference?: string;
  message?: string;
  error?: string;
}

// =============================================================================
// PAYMENT TYPES
// =============================================================================

/**
 * Payment record
 */
export interface Payment {
  id: string;
  loan_id: string;
  amount: number;
  payment_method: string;
  status: PaymentStatus;
  reference_number?: string;
  paid_at?: string;
  created_at: string;
}

/**
 * Payment schedule item
 */
export interface PaymentScheduleItem {
  id: string;
  loan_id: string;
  installment_number: number;
  due_date: string;
  principal_amount: number;
  interest_amount: number;
  total_amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'partial';
  paid_amount?: number;
  paid_at?: string;
}

// =============================================================================
// TIMELINE TYPES
// =============================================================================

/**
 * Timeline event for loan status display
 */
export interface LoanTimelineEvent {
  id: string;
  type: 'status_change' | 'payment' | 'disbursement' | 'document' | 'note';
  title: string;
  description?: string;
  timestamp: string;
  status?: 'completed' | 'pending' | 'failed';
  metadata?: Record<string, unknown>;
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/**
 * Standard API response wrapper
 */
export interface LoanApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Paginated loan list response
 */
export interface PaginatedLoanResponse {
  loans: LoanApplication[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Check if a status is a valid loan status
 */
export function isValidLoanStatus(status: string): status is LoanStatus {
  return ['pending', 'approved', 'rejected', 'disbursed', 'active', 'settled', 'defaulted', 'written_off'].includes(status);
}

/**
 * Check if a status is a valid disbursement status
 */
export function isValidDisbursementStatus(status: string): status is DisbursementStatus {
  return ['pending', 'approved', 'processing', 'completed', 'failed', 'cancelled'].includes(status);
}

/**
 * Check if a loan can be approved (is in pending status)
 */
export function canApproveLoan(status: LoanStatus): boolean {
  return status === 'pending';
}

/**
 * Check if a loan can be disbursed (is in approved status)
 */
export function canDisburseLoan(status: LoanStatus): boolean {
  return status === 'approved';
}

/**
 * Check if a loan is in a final state
 */
export function isLoanFinalState(status: LoanStatus): boolean {
  return ['rejected', 'settled', 'defaulted', 'written_off'].includes(status);
}
