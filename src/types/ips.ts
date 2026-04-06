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

export type IPSResult = 'SUCCESS' | 'FAILURE' | 'PENDING' | 'PARTIAL' | 'DEEMED';
export type IPSValidationStatus = 'validated' | 'pending' | 'invalid';

export type VPAType = 'HANDLE' | 'MOBILE_NUMBER' | 'ACCOUNT' | 'AADHAAR' | 'QR';

export type IPSPurposeCode =
  | 'PERS' // Personal
  | 'BUSN' // Business
  | 'G2P' // Government to Person
  | 'B2P'; // Business to Person

export type IPSInitiationMode = 'MOBILE_APP' | 'USSD' | 'BACKOFFICE' | 'API';

export type IPSChannel = 'MOBILE' | 'WEB' | 'USSD' | 'ATM' | 'POS';

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
  loanId: string;
  amount: number;
  sourceVpa?: string;
  creditorVpa?: string;
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
    provider_code?: string | null;
    provider_name: string | null;
    account_masked: string | null;
    account_holder_name: string | null;
    ifsc_code?: string | null;
    is_validated: boolean;
    is_default: boolean;
    display_name: string | null;
    status?: string;
    source?: 'alias_directory' | 'legacy_registry';
    synced_with_ips?: boolean;
    is_usable?: boolean;
    unavailable_reason?: string | null;
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
  isValid: boolean;
  validationStatus: IPSValidationStatus;
  accountHolderName?: string;
  ifscCode?: string;
  providerCode?: string;
  providerName?: string;
  resolvedVpa?: string;
  status?: string;
  entityType?: string;
  source?: 'local' | 'ips';
  cmId?: string;
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

// =============================================================================
// IPP ONBOARDING TYPES
// =============================================================================

export type IPPOnboardingState =
  | 'NOT_STARTED'
  | 'DEVICE_BINDING_REQUIRED'
  | 'DEVICE_BOUND'
  | 'SOV_SELECTION_PENDING'
  | 'SOV_SELECTED'
  | 'ACCOUNTS_LISTED'
  | 'VERIFICATION_PENDING'
  | 'VERIFIED'
  | 'IPS_PIN_SETTING'
  | 'IPS_PIN_SET'
  | 'ALIAS_REGISTRATION_PENDING'
  | 'ALIAS_REGISTERED'
  | 'READY_FOR_IPP_PAYMENTS'
  | 'SUSPENDED'
  | 'DEREGISTERED';

export type IPPMerchantState =
  | 'MERCHANT_KYC_PENDING'
  | 'MERCHANT_KYC_APPROVED'
  | 'MERCHANT_ALIAS_PENDING'
  | 'MERCHANT_ALIAS_CREATED'
  | 'MERCHANT_ID_PENDING'
  | 'MERCHANT_ID_ASSIGNED'
  | 'MERCHANT_DIRECTORY_PENDING'
  | 'MERCHANT_DIRECTORY_REGISTERED'
  | 'QR_GENERATION_PENDING'
  | 'QR_READY'
  | 'MERCHANT_LIVE'
  | 'MERCHANT_SUSPENDED'
  | 'MERCHANT_DEREGISTERED';

export type IPPAliasIdType = 'MOBILE' | 'NUMERICID';

export type IPPAliasStatus = 'NEW' | 'ACTIVE' | 'INACTIVE' | 'BLOCKED' | 'DEREGISTERED' | 'PORTED';

// =============================================================================
// IPP ONBOARDING DATABASE TYPES
// =============================================================================

export interface IPPDeviceBinding {
  id: string;
  user_id: string;
  device_fingerprint: string;
  device_model?: string;
  device_os?: string;
  device_os_version?: string;
  app_version?: string;
  binding_token?: string;
  mobile_number: string;
  sim_serial?: string;
  imei?: string;
  status: 'pending' | 'active' | 'expired' | 'revoked' | 'replaced';
  bound_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface IPPOnboarding {
  id: string;
  user_id: string;
  state: IPPOnboardingState;
  device_binding_id?: string;
  sov_provider_code?: string;
  sov_provider_name?: string;
  sov_provider_handle?: string;
  selected_account_ref?: string;
  selected_account_masked?: string;
  selected_account_type?: string;
  selected_account_ifsc?: string;
  long_alias?: string;
  short_alias_mobile?: string;
  numeric_id?: string;
  mobile_id_status?: IPPAliasStatus;
  numeric_id_status?: IPPAliasStatus;
  alias_expiry_ts?: string;
  ips_pin_set: boolean;
  ips_pin_set_at?: string;
  ips_pin_attempts: number;
  ips_pin_locked_until?: string;
  verification_method?: string;
  verified_at?: string;
  verification_reference?: string;
  cm_id?: string;
  last_step_completed?: string;
  last_error_code?: string;
  last_error_message?: string;
  retry_count: number;
  started_at?: string;
  completed_at?: string;
  suspended_at?: string;
  suspension_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface IPPAliasDirectory {
  id: string;
  user_id?: string;
  merchant_id?: string;
  addr: string;
  entity_type: 'PERSON' | 'ENTITY';
  id_type: IPPAliasIdType;
  id_value: string;
  status: IPPAliasStatus;
  set_status?: string;
  expiry_ts: string;
  last_updated_ts?: string;
  cm_id?: string;
  channel?: string;
  synced_with_ips: boolean;
  last_sync_at?: string;
  sync_error?: string;
  created_at: string;
  updated_at: string;
}

export interface IPPMerchant {
  id: string;
  user_id?: string;
  business_name: string;
  merchant_code?: string;
  merchant_numeric_id?: string;
  merchant_alias?: string;
  settlement_account_ref?: string;
  settlement_account_masked?: string;
  settlement_ifsc?: string;
  settlement_vpa?: string;
  state: IPPMerchantState;
  kyc_status: string;
  kyc_approved_at?: string;
  kyc_approved_by?: string;
  kyc_rejection_reason?: string;
  merchant_category_code?: string;
  merchant_type?: string;
  static_qr_payload?: string;
  dynamic_qr_enabled: boolean;
  qr_generated_at?: string;
  vae_registered: boolean;
  vae_entry_id?: string;
  is_active: boolean;
  suspended_at?: string;
  suspension_reason?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  physical_address?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface IPPSoVProvider {
  id: string;
  provider_code: string;
  provider_name: string;
  provider_handle?: string;
  supports_debit_card: boolean;
  supports_wallet_pin: boolean;
  supports_aadhaar: boolean;
  supports_collect: boolean;
  api_version?: string;
  min_app_version?: string;
  is_active: boolean;
  maintenance_mode: boolean;
  maintenance_message?: string;
  last_fetched_at?: string;
  created_at: string;
  updated_at: string;
}

export type IPPVerificationMethod = 'mno' | 'debit_card';

export interface IPPAccountCredential {
  type: string;
  subType: string;
  dType?: string;
  dLength?: string;
}

export interface IPPOnboardingProvider {
  providerCode: string;
  providerName: string;
  providerHandle: string;
  providerOrgId?: string;
  providerIfsc?: string;
  active?: string;
  mobRegFormat?: string;
  featureSupported?: string;
  supportsDebitCard: boolean;
  supportsWalletPin: boolean;
}

export interface IPPOnboardingAccount {
  accountRef: string;
  maskedAccountNumber?: string;
  accountType?: string;
  accountHolderName?: string;
  ifsc?: string;
  mmid?: string;
  aeba?: string;
  mbeba?: string;
  aadhaarNo?: string;
  credsAllowed?: IPPAccountCredential[];
  verificationMethods?: IPPVerificationMethod[];
}

export interface IPPKeysCache {
  id: string;
  org_id: string;
  key_id: string;
  key_type: 'encryption' | 'signing' | 'both';
  public_key: string;
  key_algorithm?: string;
  key_size?: number;
  valid_from: string;
  valid_to: string;
  is_active: boolean;
  fetched_at: string;
  source?: string;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// IPP ONBOARDING ADAPTER TYPES
// =============================================================================

export interface IPPListAccPvdRequest {
  // No params needed
}

export interface IPPListAccPvdResponse {
  success: boolean;
  error?: string;
  providers?: Array<{
    providerCode: string;
    providerName: string;
    providerHandle: string;
    supportsDebitCard: boolean;
    supportsWalletPin: boolean;
    isActive: boolean;
  }>;
  errorCode?: string;
  errorMessage?: string;
}

export interface IPPListAccountRequest {
  userId: string;
  mobileNumber: string;
  providerCode: string;
}

export interface IPPListAccountResponse {
  success: boolean;
  error?: string;
  accounts?: Array<{
    accRefNumber: string;
    accType: string;
    maskedAccNumber: string;
    accountHolderName: string;
    ifsc?: string;
    mmid?: string;
    allowedCredentials: string[];
  }>;
  errorCode?: string;
  errorMessage?: string;
}

export interface IPPRegisterMobileRequest {
  userId: string;
  mobileNumber: string;
  providerCode: string;
  accountRef: string;
  encryptedOtp?: string;
  encryptedPin?: string;
  encryptedCardDigits?: string;
  encryptedExpDate?: string;
  keyId?: string;
}

export interface IPPRegisterMobileResponse {
  success: boolean;
  error?: string;
  registered?: boolean;
  ipsPinSet?: boolean;
  errorCode?: string;
  errorMessage?: string;
}

export interface IPPGetAliasRequest {
  aliasAddress: string;
  mobileNumber?: string;
}

export interface IPPGetAliasResponse {
  success: boolean;
  error?: string;
  exists?: boolean;
  status?: string;
  entityType?: string;
  cmId?: string;
  expiryTs?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface IPPRegMapperRequest {
  userId: string;
  aliasAddress: string;
  entityType: 'PERSON' | 'ENTITY';
  mobileNumber: string;
  numericId?: string;
  operation: 'ADD' | 'MODIFY' | 'BLOCK' | 'UNBLOCK' | 'DEREGISTER';
}

export interface IPPRegMapperResponse {
  success: boolean;
  error?: string;
  registered?: boolean;
  cmId?: string;
  status?: string;
  expiryTs?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface IPPSetCredRequest {
  userId: string;
  mobileNumber: string;
  providerCode: string;
  operation: 'SET' | 'CHANGE' | 'RESET';
  encryptedOldPin?: string;
  encryptedNewPin: string;
  keyId?: string;
}

export interface IPPSetCredResponse {
  success: boolean;
  error?: string;
  updated?: boolean;
  errorCode?: string;
  errorMessage?: string;
}

export interface IPPListKeysRequest {
  orgId?: string;
}

export interface IPPListKeysResponse {
  success: boolean;
  error?: string;
  keys?: Array<{
    keyId: string;
    orgId: string;
    keyType: string;
    publicKey: string;
    validFrom: string;
    validTo: string;
  }>;
  errorCode?: string;
  errorMessage?: string;
}

// =============================================================================
// IPP ONBOARDING RPC TYPES
// =============================================================================

export interface GetOrCreateIPPOnboardingResult {
  success: boolean;
  error?: string;
  onboarding?: {
    id: string;
    user_id: string;
    state: IPPOnboardingState;
    sov_provider_code?: string;
    sov_provider_name?: string;
    selected_account_masked?: string;
    long_alias?: string;
    short_alias_mobile?: string;
    mobile_id_status?: IPPAliasStatus;
    ips_pin_set: boolean;
    last_step_completed?: string;
    last_error_code?: string;
    last_error_message?: string;
    started_at?: string;
    completed_at?: string;
  };
  profile?: {
    phone?: string;
    first_name?: string;
    last_name?: string;
    default_vpa?: string;
  };
}

export interface AdvanceIPPOnboardingStepResult {
  success: boolean;
  error?: string;
  previous_state?: IPPOnboardingState;
  new_state?: IPPOnboardingState;
  step_name?: string;
  history_id?: string;
}

export interface IPPOnboardingSummaryResult {
  success: boolean;
  error?: string;
  stats?: {
    total_users: number;
    by_state: Record<IPPOnboardingState, number>;
    ipp_ready: number;
    in_progress: number;
    not_started: number;
    suspended: number;
    with_errors: number;
  };
}

export interface IPPPendingOnboardingUser {
  user_id: string;
  state: IPPOnboardingState;
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  long_alias?: string;
  ips_pin_set: boolean;
  last_step_completed?: string;
  last_error_code?: string;
  started_at?: string;
  updated_at?: string;
}

export interface GetUsersPendingIPPOnboardingResult {
  success: boolean;
  error?: string;
  users?: IPPPendingOnboardingUser[];
  total?: number;
  limit?: number;
  offset?: number;
}

export interface AdminInitiateIPPOnboardingResult {
  success: boolean;
  error?: string;
  message?: string;
  onboarding_id?: string;
  user_id?: string;
  state?: IPPOnboardingState;
}

// =============================================================================
// IPP ONBOARDING UI TYPES
// =============================================================================

export const IPP_ONBOARDING_STATE_LABELS: Record<IPPOnboardingState, string> = {
  NOT_STARTED: 'Not Started',
  DEVICE_BINDING_REQUIRED: 'Device Binding Required',
  DEVICE_BOUND: 'Device Bound',
  SOV_SELECTION_PENDING: 'Select Provider',
  SOV_SELECTED: 'Provider Selected',
  ACCOUNTS_LISTED: 'Accounts Listed',
  VERIFICATION_PENDING: 'Verification Pending',
  VERIFIED: 'Verified',
  IPS_PIN_SETTING: 'Setting IPS PIN',
  IPS_PIN_SET: 'IPS PIN Set',
  ALIAS_REGISTRATION_PENDING: 'Registering Alias',
  ALIAS_REGISTERED: 'Alias Registered',
  READY_FOR_IPP_PAYMENTS: 'Ready for IPP',
  SUSPENDED: 'Suspended',
  DEREGISTERED: 'Deregistered',
};

export const IPP_ONBOARDING_STATE_COLORS: Record<IPPOnboardingState, string> = {
  NOT_STARTED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  DEVICE_BINDING_REQUIRED:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  DEVICE_BOUND: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  SOV_SELECTION_PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  SOV_SELECTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  ACCOUNTS_LISTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  VERIFICATION_PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  VERIFIED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  IPS_PIN_SETTING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  IPS_PIN_SET: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  ALIAS_REGISTRATION_PENDING:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  ALIAS_REGISTERED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  READY_FOR_IPP_PAYMENTS: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  SUSPENDED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  DEREGISTERED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
};

export const isIPPOnboardingComplete = (state: IPPOnboardingState): boolean => {
  return state === 'READY_FOR_IPP_PAYMENTS';
};

export const isIPPOnboardingInProgress = (state: IPPOnboardingState): boolean => {
  return !['NOT_STARTED', 'READY_FOR_IPP_PAYMENTS', 'SUSPENDED', 'DEREGISTERED'].includes(state);
};

export const getIPPOnboardingProgress = (state: IPPOnboardingState): number => {
  const stateOrder: IPPOnboardingState[] = [
    'NOT_STARTED',
    'DEVICE_BINDING_REQUIRED',
    'DEVICE_BOUND',
    'SOV_SELECTION_PENDING',
    'SOV_SELECTED',
    'ACCOUNTS_LISTED',
    'VERIFICATION_PENDING',
    'VERIFIED',
    'IPS_PIN_SETTING',
    'IPS_PIN_SET',
    'ALIAS_REGISTRATION_PENDING',
    'ALIAS_REGISTERED',
    'READY_FOR_IPP_PAYMENTS',
  ];

  const index = stateOrder.indexOf(state);
  if (index === -1) return 0;
  return Math.round((index / (stateOrder.length - 1)) * 100);
};
