/**
 * Centralized loan status constants
 * 
 * This file provides a single source of truth for all loan-related statuses
 * used throughout the application. Using these constants prevents typos and
 * ensures consistency between frontend and backend.
 */

// Loan statuses
export const LOAN_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  DISBURSED: 'disbursed',
  ACTIVE: 'active',
  FUNDED: 'funded',
  SETTLED: 'settled',
  DEFAULTED: 'defaulted',
  REJECTED: 'rejected',
  COMPLETED: 'completed', // Legacy - same as settled
} as const;

export type LoanStatus = typeof LOAN_STATUS[keyof typeof LOAN_STATUS];

// Statuses that allow payments to be made
export const PAYABLE_STATUSES: LoanStatus[] = [
  LOAN_STATUS.ACTIVE,
  LOAN_STATUS.DISBURSED,
  LOAN_STATUS.FUNDED,
  LOAN_STATUS.APPROVED,
];

// Statuses that indicate an active/ongoing loan
export const ACTIVE_LOAN_STATUSES: LoanStatus[] = [
  LOAN_STATUS.ACTIVE,
  LOAN_STATUS.DISBURSED,
  LOAN_STATUS.FUNDED,
];

// Statuses that indicate a closed/completed loan
export const CLOSED_LOAN_STATUSES: LoanStatus[] = [
  LOAN_STATUS.SETTLED,
  LOAN_STATUS.COMPLETED,
  LOAN_STATUS.DEFAULTED,
  LOAN_STATUS.REJECTED,
];

// Payment statuses
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
} as const;

export type PaymentStatus = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS];

// Payment schedule statuses
export const SCHEDULE_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  PARTIALLY_PAID: 'partially_paid',
  OVERDUE: 'overdue',
  WAIVED: 'waived',
} as const;

export type ScheduleStatus = typeof SCHEDULE_STATUS[keyof typeof SCHEDULE_STATUS];

// Disbursement statuses
export const DISBURSEMENT_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

export type DisbursementStatus = typeof DISBURSEMENT_STATUS[keyof typeof DISBURSEMENT_STATUS];

// Approval request statuses
export const APPROVAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  ESCALATED: 'escalated',
} as const;

export type ApprovalStatus = typeof APPROVAL_STATUS[keyof typeof APPROVAL_STATUS];

// Payment methods
export const PAYMENT_METHOD = {
  BANK_TRANSFER: 'bank_transfer',
  BANK_EFT: 'bank_eft',
  MOBILE_MONEY: 'mobile_money',
  DEBIT_ORDER: 'debit_order',
  CASH: 'cash',
  CARD: 'card',
} as const;

export type PaymentMethod = typeof PAYMENT_METHOD[keyof typeof PAYMENT_METHOD];

// Helper functions
export const isPayableStatus = (status: string): boolean => {
  return PAYABLE_STATUSES.includes(status as LoanStatus);
};

export const isActiveLoan = (status: string): boolean => {
  return ACTIVE_LOAN_STATUSES.includes(status as LoanStatus);
};

export const isClosedLoan = (status: string): boolean => {
  return CLOSED_LOAN_STATUSES.includes(status as LoanStatus);
};

// Status display labels
export const LOAN_STATUS_LABELS: Record<LoanStatus, string> = {
  [LOAN_STATUS.PENDING]: 'Pending',
  [LOAN_STATUS.APPROVED]: 'Approved',
  [LOAN_STATUS.DISBURSED]: 'Disbursed',
  [LOAN_STATUS.ACTIVE]: 'Active',
  [LOAN_STATUS.FUNDED]: 'Funded',
  [LOAN_STATUS.SETTLED]: 'Settled',
  [LOAN_STATUS.DEFAULTED]: 'Defaulted',
  [LOAN_STATUS.REJECTED]: 'Rejected',
  [LOAN_STATUS.COMPLETED]: 'Completed',
};

// Status colors for UI
export const LOAN_STATUS_COLORS: Record<LoanStatus, { bg: string; text: string; border: string }> = {
  [LOAN_STATUS.PENDING]: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  [LOAN_STATUS.APPROVED]: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  [LOAN_STATUS.DISBURSED]: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  [LOAN_STATUS.ACTIVE]: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  [LOAN_STATUS.FUNDED]: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  [LOAN_STATUS.SETTLED]: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  [LOAN_STATUS.DEFAULTED]: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  [LOAN_STATUS.REJECTED]: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
  [LOAN_STATUS.COMPLETED]: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
};
