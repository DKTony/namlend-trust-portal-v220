/**
 * IPS/IPP Integration Types
 * 
 * Type definitions for Instant Payment Solution integration
 */

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export type IPSTransactionType = 
  | 'DISBURSEMENT' 
  | 'REPAYMENT' 
  | 'REFUND' 
  | 'REVERSAL' 
  | 'BALANCE_CHECK' 
  | 'VPA_VALIDATION';

export type IPSTxnType = 
  | 'PAY' 
  | 'COLLECT' 
  | 'REVERSAL' 
  | 'AUTOREVERSAL' 
  | 'REFUND' 
  | 'BAL' 
  | 'CHK' 
  | 'VAL';

export type IPSTransactionStatus = 
  | 'initiated' 
  | 'pending' 
  | 'sent' 
  | 'success' 
  | 'failed' 
  | 'timeout' 
  | 'reversed' 
  | 'deemed' 
  | 'unknown';

export type IPSResult = 
  | 'SUCCESS' 
  | 'FAILURE' 
  | 'PENDING' 
  | 'PARTIAL' 
  | 'DEEMED';

export type VPAType = 
  | 'HANDLE' 
  | 'MOBILE_NUMBER' 
  | 'ACCOUNT' 
  | 'AADHAAR' 
  | 'QR';

export type IPSPurposeCode = 
  | 'PERS'  // Personal
  | 'BUSN'  // Business
  | 'G2P'   // Government to Person
  | 'B2P';  // Business to Person

export type IPSInitiationMode = 
  | 'MOBILE_APP' 
  | 'USSD' 
  | 'BACKOFFICE' 
  | 'API';

export type IPSChannel = 
  | 'MOBILE' 
  | 'WEB' 
  | 'USSD' 
  | 'ATM' 
  | 'POS';

// =============================================================================
// DATABASE TYPES
// =============================================================================

export interface IPSTransaction {
  id: string;
  loan_id: string | null;
  disbursement_id: string | null;
  payment_id: string | null;
  msg_id: string;
  txn_id: string;
  ips_txn_id: string | null;
  ips_rrn: string | null;
  org_txn_id: string | null;
  org_msg_id: string | null;
  transaction_type: IPSTransactionType;
  ips_txn_type: IPSTxnType;
  ips_txn_subtype: string | null;
  amount: number;
  currency: string;
  payer_vpa: string;
  payer_name: string | null;
  payer_account_masked: string | null;
  payer_ifsc: string | null;
  payee_vpa: string;
  payee_name: string | null;
  payee_account_masked: string | null;
  payee_ifsc: string | null;
  status: IPSTransactionStatus;
  ips_result: IPSResult | null;
  ips_error_code: string | null;
  ips_error_message: string | null;
  internal_error_code: string | null;
  purpose_code: IPSPurposeCode | null;
  initiation_mode: IPSInitiationMode | null;
  channel: IPSChannel | null;
  note: string | null;
  customer_ref: string | null;
  device_fingerprint: Record<string, unknown> | null;
  ip_address: string | null;
  initiated_at: string;
  sent_at: string | null;
  response_received_at: string | null;
  completed_at: string | null;
  expires_at: string | null;
  retry_count: number;
  last_status_check_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface IPSVPARecord {
  id: string;
  user_id: string;
  vpa_address: string;
  vpa_type: VPAType;
  provider_code: string | null;
  provider_name: string | null;
  account_masked: string | null;
  account_holder_name: string | null;
  ifsc_code: string | null;
  is_validated: boolean;
  validated_at: string | null;
  validation_txn_id: string | null;
  validation_error: string | null;
  is_default: boolean;
  display_name: string | null;
  is_active: boolean;
  deactivated_at: string | null;
  deactivation_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface IPSErrorCode {
  code: string;
  internal_code: string;
  description: string;
  http_status: number;
  is_retryable: boolean;
  user_message: string | null;
  created_at: string;
}

export interface IPSApiLog {
  id: string;
  correlation_id: string;
  ips_transaction_id: string | null;
  api_name: string;
  api_version: string | null;
  direction: 'OUTBOUND' | 'INBOUND' | 'CALLBACK';
  endpoint_url: string | null;
  request_summary: Record<string, unknown> | null;
  response_summary: Record<string, unknown> | null;
  http_status: number | null;
  ips_result: IPSResult | null;
  error_code: string | null;
  error_message: string | null;
  sent_at: string | null;
  received_at: string | null;
  duration_ms: number | null;
  environment: string | null;
  server_id: string | null;
  created_at: string;
}

// =============================================================================
// RPC REQUEST/RESPONSE TYPES
// =============================================================================

// Initiate Disbursement
export interface InitiateIPSDisbursementParams {
  disbursementId: string;
  payeeVpa: string;
  note?: string;
}

export interface InitiateIPSDisbursementResult {
  success: boolean;
  error?: string;
  message?: string;
  ips_transaction_id?: string;
  msg_id?: string;
  txn_id?: string;
  amount?: number;
  currency?: string;
  payer_vpa?: string;
  payee_vpa?: string;
  payee_name?: string;
  loan_id?: string;
  disbursement_id?: string;
}

// Initiate Repayment
export interface InitiateIPSRepaymentParams {
  loanId: string;
  amount: number;
  payerVpa: string;
  note?: string;
}

export interface InitiateIPSRepaymentResult {
  success: boolean;
  error?: string;
  message?: string;
  ips_transaction_id?: string;
  payment_id?: string;
  msg_id?: string;
  txn_id?: string;
  amount?: number;
  currency?: string;
  payer_vpa?: string;
  payer_name?: string;
  payee_vpa?: string;
  loan_id?: string;
  outstanding_after?: number;
}

// Complete Transaction (webhook/adapter)
export interface CompleteIPSTransactionParams {
  ipsTransactionId: string;
  ipsResult: IPSResult;
  ipsErrorCode?: string;
  ipsTxnIdResponse?: string;
  ipsRrn?: string;
  errorMessage?: string;
}

export interface CompleteIPSTransactionResult {
  success: boolean;
  error?: string;
  message?: string;
  status?: IPSTransactionStatus;
  transaction_type?: IPSTransactionType;
  ips_result?: IPSResult;
  error_code?: string;
  is_retryable?: boolean;
  linked_entity?: 'disbursement' | 'payment';
  linked_entity_id?: string;
}

// Transaction Status
export interface IPSTransactionStatusResult {
  success: boolean;
  error?: string;
  id?: string;
  status?: IPSTransactionStatus;
  ips_result?: IPSResult;
  amount?: number;
  currency?: string;
  transaction_type?: IPSTransactionType;
  payer_vpa?: string;
  payee_vpa?: string;
  ips_rrn?: string;
  error_code?: string;
  error_message?: string;
  is_retryable?: boolean;
  initiated_at?: string;
  completed_at?: string;
  loan_id?: string;
  disbursement_id?: string;
  payment_id?: string;
}

// User VPAs
export interface UserVPAsResult {
  success: boolean;
  error?: string;
  vpas?: Array<{
    id: string;
    vpa_address: string;
    vpa_type: VPAType;
    provider_name: string | null;
    account_masked: string | null;
    account_holder_name: string | null;
    is_validated: boolean;
    is_default: boolean;
    display_name: string | null;
    created_at: string;
  }>;
}

// Upsert VPA
export interface UpsertVPAParams {
  vpaAddress: string;
  vpaType?: VPAType;
  displayName?: string;
  setDefault?: boolean;
}

export interface UpsertVPAResult {
  success: boolean;
  error?: string;
  message?: string;
  vpa_id?: string;
  vpa_address?: string;
  is_default?: boolean;
}

// Loan IPS Transactions
export interface LoanIPSTransactionsResult {
  success: boolean;
  error?: string;
  loan_id?: string;
  transactions?: Array<{
    id: string;
    transaction_type: IPSTransactionType;
    status: IPSTransactionStatus;
    amount: number;
    payer_vpa: string;
    payee_vpa: string;
    ips_result: IPSResult | null;
    ips_rrn: string | null;
    error_message: string | null;
    initiated_at: string;
    completed_at: string | null;
  }>;
}

// =============================================================================
// EDGE FUNCTION TYPES
// =============================================================================

// IPS Adapter Request/Response
export interface IPSAdapterPayRequest {
  ipsTransactionId: string;
  msgId: string;
  txnId: string;
  amount: number;
  currency: string;
  payerVpa: string;
  payerName?: string;
  payeeVpa: string;
  payeeName?: string;
  purposeCode: IPSPurposeCode;
  note?: string;
  customerRef?: string;
}

export interface IPSAdapterPayResponse {
  success: boolean;
  error?: string;
  ipsResult?: IPSResult;
  ipsErrorCode?: string;
  ipsTxnId?: string;
  ipsRrn?: string;
  errorMessage?: string;
}

export interface IPSAdapterValidateVPARequest {
  vpa: string;
}

export interface IPSAdapterValidateVPAResponse {
  success: boolean;
  error?: string;
  isValid?: boolean;
  accountHolderName?: string;
  accountMasked?: string;
  ifscCode?: string;
  providerName?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface IPSAdapterCheckStatusRequest {
  ipsTransactionId: string;
  orgMsgId: string;
  orgTxnId: string;
}

export interface IPSAdapterCheckStatusResponse {
  success: boolean;
  error?: string;
  ipsResult?: IPSResult;
  ipsErrorCode?: string;
  ipsTxnId?: string;
  ipsRrn?: string;
  errorMessage?: string;
}

// =============================================================================
// WEBHOOK TYPES
// =============================================================================

export interface IPSWebhookPayload {
  type: 'PAYMENT_COMPLETE' | 'PAYMENT_FAILED' | 'REVERSAL' | 'STATUS_UPDATE';
  msgId: string;
  txnId: string;
  orgMsgId?: string;
  orgTxnId?: string;
  ipsResult: IPSResult;
  ipsErrorCode?: string;
  ipsTxnId?: string;
  ipsRrn?: string;
  amount?: number;
  currency?: string;
  payerVpa?: string;
  payeeVpa?: string;
  timestamp: string;
  signature?: string;
}

// =============================================================================
// UI COMPONENT TYPES
// =============================================================================

export interface VPAInputProps {
  value: string;
  onChange: (value: string) => void;
  onValidate?: (result: IPSAdapterValidateVPAResponse) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  showValidation?: boolean;
  autoValidate?: boolean;
}

export interface IPSPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  loanId: string;
  maxAmount: number;
  outstandingBalance: number;
  onSuccess?: (result: InitiateIPSRepaymentResult) => void;
  onError?: (error: string) => void;
}

export interface IPSTransactionStatusProps {
  transactionId: string;
  onComplete?: (status: IPSTransactionStatus) => void;
  pollInterval?: number;
  maxPolls?: number;
}

export interface IPSHistoryListProps {
  loanId?: string;
  userId?: string;
  limit?: number;
  showFilters?: boolean;
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

export interface IPSConfig {
  enabled: boolean;
  environment: 'development' | 'uat' | 'production';
  orgId: string;
  baseUrl: string;
  callbackUrl: string;
  collectionsVpa: string;
  disbursementsVpa: string;
  requestTimeoutMs: number;
  statusCheckIntervalMs: number;
  maxStatusChecks: number;
  maxTransactionAmount: number;
}

export const IPS_STATUS_LABELS: Record<IPSTransactionStatus, string> = {
  initiated: 'Initiated',
  pending: 'Processing',
  sent: 'Sent to Bank',
  success: 'Successful',
  failed: 'Failed',
  timeout: 'Timed Out',
  reversed: 'Reversed',
  deemed: 'Deemed Successful',
  unknown: 'Unknown',
};

export const IPS_STATUS_COLORS: Record<IPSTransactionStatus, string> = {
  initiated: 'bg-gray-100 text-gray-800',
  pending: 'bg-yellow-100 text-yellow-800',
  sent: 'bg-blue-100 text-blue-800',
  success: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  timeout: 'bg-orange-100 text-orange-800',
  reversed: 'bg-purple-100 text-purple-800',
  deemed: 'bg-green-100 text-green-800',
  unknown: 'bg-gray-100 text-gray-800',
};

export const isIPSStatusFinal = (status: IPSTransactionStatus): boolean => {
  return ['success', 'failed', 'reversed', 'deemed'].includes(status);
};

export const isIPSStatusSuccess = (status: IPSTransactionStatus): boolean => {
  return ['success', 'deemed'].includes(status);
};
