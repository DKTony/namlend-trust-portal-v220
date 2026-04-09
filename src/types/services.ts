/**
 * Service Layer Type Definitions
 *
 * Type definitions for service-level operations including loans,
 * collections, reconciliation, and external integrations.
 */

// =============================================================================
// LOAN SERVICE TYPES
// =============================================================================

export type LoanStatus =
  | 'pending'
  | 'approved'
  | 'disbursed'
  | 'completed'
  | 'rejected'
  | 'defaulted';

export interface LoanRecord {
  id: string;
  user_id: string;
  amount: number;
  status: LoanStatus;
  purpose?: string;
  term_months?: number;
  interest_rate?: number;
  created_at: string;
  updated_at?: string;
}

export interface DisbursementPayload {
  loan_id: string;
  amount: number;
  status: 'pending';
  method?: string;
  scheduled_at?: string;
  notes?: string;
}

// =============================================================================
// COLLECTIONS SERVICE TYPES
// =============================================================================

export interface RecordActivityResponse {
  success: boolean;
  activity_id?: string;
  loan_id?: string;
  activity_type?: string;
  error?: string;
}

export interface AssignToAgentResponse {
  success: boolean;
  activity_id?: string;
  loan_id?: string;
  agent_id?: string;
  agent_name?: string;
  error?: string;
}

export interface RecordPaymentPromiseResponse {
  success: boolean;
  promise_id?: string;
  loan_id?: string;
  promised_date?: string;
  promised_amount?: number;
  error?: string;
}

export interface MarkPromiseFulfilledResponse {
  success: boolean;
  promise_id?: string;
  fulfilled_at?: string;
  error?: string;
}

export interface OverdueLoan {
  id: string;
  user_id: string;
  amount: number;
  days_overdue: number;
  outstanding_balance: number;
  due_date?: string;
  lastPaymentDate?: string;
}

export interface CollectionsInteraction {
  id: string;
  loan_id: string;
  interaction_type: string;
  notes?: string;
  outcome?: string;
  agent_id?: string;
  created_at: string;
}

// =============================================================================
// RECONCILIATION SERVICE TYPES
// =============================================================================

export interface PaymentWithLoan {
  id: string;
  loan_id: string;
  amount: number;
  status: string;
  payment_method?: string;
  reference_number?: string;
  created_at: string;
  loan?: LoanRecord;
}

export interface UnmatchedPayment {
  id: string;
  amount: number;
  reference_number?: string;
  received_at: string;
  source?: string;
  status: 'unmatched' | 'pending_review' | 'matched';
}

// =============================================================================
// LEDGER SERVICE TYPES (TIGERBEETLE)
// =============================================================================

export interface TBClient {
  createAccounts: (accounts: TBAccountCreate[]) => Promise<TBCreateResult[]>;
  createTransfers: (transfers: TBTransferCreate[]) => Promise<TBCreateResult[]>;
  lookupAccounts: (ids: bigint[]) => Promise<TBAccount[]>;
  lookupTransfers: (ids: bigint[]) => Promise<TBTransfer[]>;
}

export interface TBAccountCreate {
  id: bigint;
  user_data_128?: bigint;
  user_data_64?: bigint;
  user_data_32?: number;
  ledger: number;
  code: number;
  flags?: number;
}

export interface TBAccount {
  id: bigint;
  user_data_128: bigint;
  user_data_64: bigint;
  user_data_32: number;
  ledger: number;
  code: number;
  flags: number;
  debits_pending: bigint;
  debits_posted: bigint;
  credits_pending: bigint;
  credits_posted: bigint;
  timestamp: bigint;
}

export interface TBTransferCreate {
  id: bigint;
  debit_account_id: bigint;
  credit_account_id: bigint;
  amount: bigint;
  pending_id?: bigint;
  user_data_128?: bigint;
  user_data_64?: bigint;
  user_data_32?: number;
  timeout?: number;
  ledger: number;
  code: number;
  flags?: number;
}

export interface TBTransfer {
  id: bigint;
  debit_account_id: bigint;
  credit_account_id: bigint;
  amount: bigint;
  pending_id: bigint;
  user_data_128: bigint;
  user_data_64: bigint;
  user_data_32: number;
  timeout: number;
  ledger: number;
  code: number;
  flags: number;
  timestamp: bigint;
}

export interface TBCreateResult {
  index: number;
  result: number;
}

// =============================================================================
// WHATSAPP GATEWAY TYPES
// =============================================================================

export interface WhatsAppWebhookEntry {
  id: string;
  changes: WhatsAppWebhookChange[];
}

export interface WhatsAppWebhookChange {
  value: {
    messaging_product?: string;
    metadata?: {
      display_phone_number?: string;
      phone_number_id?: string;
    };
    contacts?: WhatsAppContact[];
    messages?: WhatsAppMessage[];
    statuses?: WhatsAppStatus[];
  };
  field?: string;
}

export interface WhatsAppContact {
  profile?: {
    name?: string;
  };
  wa_id?: string;
}

export interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'location' | 'contacts' | 'interactive';
  text?: {
    body: string;
  };
}

export interface WhatsAppStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  errors?: Array<{
    code: number;
    title: string;
  }>;
}

// =============================================================================
// GENERIC SERVICE RESPONSE TYPES
// =============================================================================

export interface ServiceResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
