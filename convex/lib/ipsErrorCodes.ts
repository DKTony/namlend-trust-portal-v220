/**
 * IPS Error Code Mapping — comprehensive mapping from IPS response codes
 * to retryability flags, user-friendly messages, and categories.
 *
 * Source: IPP_Error_Response_Codes.md (BoN/NIPL specification)
 *
 * Classification:
 *   TD = Technical Decline → transient, safe to retry (triggers outbox backoff)
 *   BD = Business Decline  → permanent, do NOT retry (mark transaction failed)
 */

export interface IpsErrorEntry {
  /** IPS response code (e.g., "00", "Z9", "UP") */
  code: string;
  /** Official description from the spec */
  description: string;
  /** TD = Technical Decline (retryable), BD = Business Decline (permanent) */
  classification: 'TD' | 'BD' | 'SUCCESS';
  /** Whether the transaction can be retried */
  isRetryable: boolean;
  /** User-friendly message suitable for display in the UI */
  userMessage: string;
  /** Error category for grouping and analytics */
  category: ErrorCategory;
}

export type ErrorCategory =
  | 'success'
  | 'auth'
  | 'account'
  | 'funds'
  | 'compliance'
  | 'mandate'
  | 'card'
  | 'system'
  | 'timeout'
  | 'format'
  | 'limit'
  | 'otp'
  | 'merchant'
  | 'reversal'
  | 'unknown';

// ---------------------------------------------------------------------------
// Core error code mapping — from IPP_Error_Response_Codes.md
// ---------------------------------------------------------------------------

const IPS_ERROR_ENTRIES: IpsErrorEntry[] = [
  // Success
  {
    code: '00',
    description: 'Approved or completed successfully',
    classification: 'SUCCESS',
    isRetryable: false,
    userMessage: 'Transaction completed successfully.',
    category: 'success',
  },

  // Auth / PIN errors (BD)
  {
    code: 'AM',
    description: 'MPIN not set by customer',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'Please set your IPS PIN before making transactions.',
    category: 'auth',
  },
  {
    code: 'ZM',
    description: 'Invalid MPIN',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'Incorrect IPS PIN entered. Please try again.',
    category: 'auth',
  },
  {
    code: 'Z6',
    description: 'Number of PIN tries exceeded',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'PIN entry limit reached. Please try again later or reset your PIN.',
    category: 'auth',
  },

  // Account errors (BD)
  {
    code: 'B1',
    description: 'Registered mobile number linked to account changed/removed',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'Your registered mobile number has changed. Please re-register.',
    category: 'account',
  },
  {
    code: 'B3',
    description: 'Transaction not permitted to account',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'This transaction is not permitted on your account type.',
    category: 'account',
  },
  {
    code: 'QU',
    description: 'Payer account has changed',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'Your account details have changed. Please update your payment address.',
    category: 'account',
  },
  {
    code: 'XH',
    description: 'Account does not exist (remitter)',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'The sending account could not be found.',
    category: 'account',
  },
  {
    code: 'XI',
    description: 'Account does not exist (beneficiary)',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'The recipient account could not be found.',
    category: 'account',
  },
  {
    code: 'YE',
    description: 'Remitting account blocked/frozen',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'Your account is blocked or frozen. Please contact your bank.',
    category: 'account',
  },
  {
    code: 'YF',
    description: 'Beneficiary account blocked/frozen',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'The recipient account is blocked or frozen.',
    category: 'account',
  },
  {
    code: 'ZX',
    description: 'Inactive or dormant account (remitter)',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'Your account is inactive. Please contact your bank.',
    category: 'account',
  },
  {
    code: 'ZY',
    description: 'Inactive or dormant account (beneficiary)',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'The recipient account is inactive.',
    category: 'account',
  },

  // Funds errors (BD)
  {
    code: 'Z9',
    description: 'Insufficient funds in customer account',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'Insufficient funds in your account.',
    category: 'funds',
  },
  {
    code: 'IC',
    description: 'Debit amount not blocked for customer',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'The required amount was not blocked for this transaction.',
    category: 'funds',
  },
  {
    code: 'ID',
    description: 'Debit amount greater than blocked amount',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'The transaction amount exceeds the blocked amount.',
    category: 'funds',
  },
  {
    code: 'IE',
    description: 'Funds blocked for mandate',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'Your funds are held for a debit order and cannot be used.',
    category: 'funds',
  },
  {
    code: 'PS',
    description: 'Maximum balance exceeded (beneficiary bank)',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'The recipient has reached their maximum balance limit.',
    category: 'funds',
  },

  // Compliance errors (BD)
  {
    code: '15',
    description: 'Issuer not live on IPS',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'The issuing bank is not active on IPS.',
    category: 'compliance',
  },
  {
    code: '59',
    description: 'Suspected fraud — transaction declined based on risk score (remitter)',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'This transaction was declined for security reasons.',
    category: 'compliance',
  },
  {
    code: 'CA',
    description: 'Compliance error (acquirer)',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'Transaction declined due to compliance requirements.',
    category: 'compliance',
  },
  {
    code: 'CI',
    description: 'Compliance error (issuer)',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'Transaction declined due to compliance requirements.',
    category: 'compliance',
  },
  {
    code: 'K1',
    description: 'Suspected fraud — declined based on risk score (remitter)',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'Transaction declined for security reasons.',
    category: 'compliance',
  },
  {
    code: 'XV',
    description: 'Compliance violation (remitter)',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'Transaction cannot be completed due to compliance rules.',
    category: 'compliance',
  },
  {
    code: 'XW',
    description: 'Compliance violation (beneficiary)',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'Transaction cannot be completed due to compliance rules.',
    category: 'compliance',
  },
  {
    code: 'ZI',
    description: 'Suspected fraud — declined based on risk score (beneficiary)',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'Transaction declined for security reasons.',
    category: 'compliance',
  },
  {
    code: 'ZF',
    description: 'Transaction not permitted to device',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'This device is not permitted for transactions. Please re-register.',
    category: 'compliance',
  },

  // Mandate errors (BD)
  {
    code: 'VA',
    description: 'Mandate has been revoked',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'The debit order has been revoked.',
    category: 'mandate',
  },
  {
    code: 'VB',
    description: 'Incorrect recurrence pattern',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'The debit order schedule is invalid.',
    category: 'mandate',
  },
  {
    code: 'VC',
    description: 'Incorrect recurrence pattern rule',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'The debit order schedule rule is invalid.',
    category: 'mandate',
  },
  {
    code: 'VD',
    description: 'Incorrect amount rule',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'The debit order amount does not match the mandate.',
    category: 'mandate',
  },
  {
    code: 'VE',
    description: 'Mandate is already honoured',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'This debit order has already been processed.',
    category: 'mandate',
  },
  {
    code: 'VF',
    description: 'UMN does not exist (remitter)',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'The mandate reference could not be found.',
    category: 'mandate',
  },
  {
    code: 'VG',
    description: 'Payer VPA incorrect (remitter)',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'The payer address on the mandate is incorrect.',
    category: 'mandate',
  },
  {
    code: 'VH',
    description: 'Mandate signature tampered or corrupt (remitter)',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'The mandate could not be verified.',
    category: 'mandate',
  },
  {
    code: 'VI',
    description: 'Execution day and rule mismatch (remitter)',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'The debit order execution date does not match the schedule.',
    category: 'mandate',
  },
  {
    code: 'VJ',
    description: 'Payer account has changed (remitter)',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'The payer account has changed since the mandate was created.',
    category: 'mandate',
  },
  {
    code: 'VK',
    description: 'Number of mandates exceeded (issuer limit)',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'Maximum number of debit orders reached on this account.',
    category: 'mandate',
  },
  {
    code: 'VL',
    description: 'Mandate registration not allowed for account type',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'Debit orders are not permitted on this account type.',
    category: 'mandate',
  },
  {
    code: 'VM',
    description: 'Nature of debit not allowed in account type',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'This type of debit is not allowed on your account.',
    category: 'mandate',
  },
  {
    code: 'VO',
    description: 'Payment stopped by court order',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'Payment has been stopped by court order.',
    category: 'mandate',
  },
  {
    code: 'VP',
    description: 'Withdrawal stopped — death of account holder',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'Account withdrawals have been stopped.',
    category: 'mandate',
  },
  {
    code: 'VQ',
    description: 'Withdrawal stopped — insolvency',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'Account withdrawals have been stopped.',
    category: 'mandate',
  },
  {
    code: 'VR',
    description: 'Withdrawal stopped — incapacity',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'Account withdrawals have been stopped.',
    category: 'mandate',
  },
  {
    code: 'VS',
    description: 'Duplicate mandate request',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'A debit order with these details already exists.',
    category: 'mandate',
  },
  {
    code: 'VT',
    description: 'Mandate is paused',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'This debit order is currently paused.',
    category: 'mandate',
  },
  {
    code: 'VU',
    description: 'Mandate has expired',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'This debit order has expired.',
    category: 'mandate',
  },
  {
    code: 'VY',
    description: 'Payee VPA incorrect (remitter)',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'The payee address on the mandate is incorrect.',
    category: 'mandate',
  },
  {
    code: 'VZ',
    description: 'Payment stopped by attachment order',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'Payment has been stopped by attachment order.',
    category: 'mandate',
  },

  // Card errors (BD)
  {
    code: 'XL',
    description: 'Expired card (remitter)',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'Your card has expired.',
    category: 'card',
  },
  {
    code: 'XM',
    description: 'Expired card (beneficiary)',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'The recipient card has expired.',
    category: 'card',
  },
  {
    code: 'XN',
    description: 'No card record (remitter)',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'Card not found. Please check your card details.',
    category: 'card',
  },
  {
    code: 'XO',
    description: 'No card record (beneficiary)',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'Recipient card not found.',
    category: 'card',
  },
  {
    code: 'XP',
    description: 'Transaction not permitted to cardholder (remitter)',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'This transaction is not permitted for your card.',
    category: 'card',
  },
  {
    code: 'XQ',
    description: 'Transaction not permitted to cardholder (beneficiary)',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'Transaction not permitted for the recipient card.',
    category: 'card',
  },
  {
    code: 'XR',
    description: 'Restricted card (remitter)',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'Your card is restricted. Please contact your bank.',
    category: 'card',
  },
  {
    code: 'XS',
    description: 'Restricted card (beneficiary)',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'The recipient card is restricted.',
    category: 'card',
  },
  {
    code: 'YA',
    description: 'Lost or stolen card (remitter)',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'This card has been reported lost or stolen.',
    category: 'card',
  },
  {
    code: 'YB',
    description: 'Lost or stolen card (beneficiary)',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'The recipient card has been reported lost or stolen.',
    category: 'card',
  },

  // System/technical errors (TD — retryable)
  {
    code: 'HS',
    description: 'Bank HSM is down (remitter)',
    classification: 'TD',
    isRetryable: true,
    userMessage: 'A temporary system issue occurred. Please try again.',
    category: 'system',
  },
  {
    code: 'IR',
    description: 'Internal exception at server/CBS (remitter)',
    classification: 'TD',
    isRetryable: true,
    userMessage: 'A temporary system issue occurred. Please try again.',
    category: 'system',
  },
  {
    code: 'UB',
    description: 'Internal exception at server/CBS (beneficiary)',
    classification: 'TD',
    isRetryable: true,
    userMessage: 'A temporary issue at the recipient bank. Please try again.',
    category: 'system',
  },
  {
    code: 'UA',
    description: 'PSP not supported by IPS',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'The payment service provider is not supported.',
    category: 'system',
  },
  {
    code: 'LC',
    description: 'Unable to process credit from pool/BGL account',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'Unable to process credit. Please contact your bank.',
    category: 'system',
  },
  {
    code: 'LD',
    description: 'Unable to process debit in pool/BGL account',
    classification: 'TD',
    isRetryable: true,
    userMessage: 'A temporary issue processing the debit. Please try again.',
    category: 'system',
  },
  {
    code: 'XY',
    description: 'Remitter CBS offline',
    classification: 'TD',
    isRetryable: true,
    userMessage: 'Your bank system is temporarily unavailable. Please try again later.',
    category: 'system',
  },
  {
    code: 'Y1',
    description: 'Beneficiary CBS offline',
    classification: 'TD',
    isRetryable: true,
    userMessage: 'The recipient bank is temporarily unavailable. Please try again later.',
    category: 'system',
  },
  {
    code: 'ZJ',
    description: 'Beneficiary/acquiring switch inoperative',
    classification: 'TD',
    isRetryable: true,
    userMessage: 'The recipient payment system is temporarily unavailable.',
    category: 'system',
  },
  {
    code: 'ZK',
    description: 'Remitter switch inoperative',
    classification: 'TD',
    isRetryable: true,
    userMessage: 'Your payment system is temporarily unavailable.',
    category: 'system',
  },

  // Timeout errors (TD — retryable)
  {
    code: 'UP',
    description: 'PSP timeout',
    classification: 'TD',
    isRetryable: true,
    userMessage: 'The transaction timed out. Please try again.',
    category: 'timeout',
  },
  {
    code: 'UT',
    description: 'Remitter/issuer unavailable',
    classification: 'TD',
    isRetryable: true,
    userMessage: 'Your bank is temporarily unavailable. Please try again.',
    category: 'timeout',
  },
  {
    code: 'BT',
    description: 'Beneficiary unavailable',
    classification: 'TD',
    isRetryable: true,
    userMessage: 'The recipient bank is temporarily unavailable. Please try again.',
    category: 'timeout',
  },
  {
    code: 'ZC',
    description: 'Acquirer/beneficiary unavailable',
    classification: 'TD',
    isRetryable: true,
    userMessage: 'The recipient is temporarily unavailable. Please try again.',
    category: 'timeout',
  },
  {
    code: 'ZL',
    description: 'Received late response',
    classification: 'TD',
    isRetryable: true,
    userMessage: 'Response was received late. Please check your transaction status.',
    category: 'timeout',
  },

  // Cut-off (TD)
  {
    code: 'XT',
    description: 'Cut-off in process (remitter)',
    classification: 'TD',
    isRetryable: true,
    userMessage: 'Settlement cut-off in progress. Please try again shortly.',
    category: 'system',
  },
  {
    code: 'XU',
    description: 'Cut-off in process (beneficiary)',
    classification: 'TD',
    isRetryable: true,
    userMessage: 'Settlement cut-off in progress. Please try again shortly.',
    category: 'system',
  },

  // Format / validation errors (BD)
  {
    code: 'B6',
    description: 'Mismatch in payment details',
    classification: 'TD',
    isRetryable: true,
    userMessage: 'Payment details mismatch. Please verify and try again.',
    category: 'format',
  },
  {
    code: 'XB',
    description: 'Invalid transaction (remitter)',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'The transaction could not be processed. Please check the details.',
    category: 'format',
  },
  {
    code: 'XC',
    description: 'Invalid transaction (beneficiary)',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'The recipient could not process this transaction.',
    category: 'format',
  },
  {
    code: 'XD',
    description: 'Invalid amount (remitter)',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'The transaction amount is invalid.',
    category: 'format',
  },
  {
    code: 'XE',
    description: 'Invalid amount (beneficiary)',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'The transaction amount is not accepted by the recipient.',
    category: 'format',
  },
  {
    code: 'XF',
    description: 'Format error (remitter)',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'Transaction format error. Please try again.',
    category: 'format',
  },
  {
    code: 'XG',
    description: 'Format error (beneficiary)',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'Transaction format error at the recipient.',
    category: 'format',
  },
  {
    code: 'XJ',
    description: 'Requested function not supported (remitter)',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'This transaction type is not supported by your bank.',
    category: 'format',
  },
  {
    code: 'XK',
    description: 'Requested function not supported (beneficiary)',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'This transaction type is not supported by the recipient bank.',
    category: 'format',
  },
  {
    code: 'XX',
    description: 'No financial address record found',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'The payment address could not be found.',
    category: 'format',
  },
  {
    code: 'ZD',
    description: 'Validation error',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'The transaction failed validation. Please check the details.',
    category: 'format',
  },
  {
    code: 'Z5',
    description: 'Invalid beneficiary credentials',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'Invalid recipient credentials.',
    category: 'format',
  },

  // Limit errors (BD)
  {
    code: 'Z7',
    description: 'Transaction frequency limit exceeded (remitter)',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'You have exceeded the maximum number of transactions today.',
    category: 'limit',
  },
  {
    code: 'Z8',
    description: 'Per-transaction limit exceeded (remitter)',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'This transaction exceeds the per-transaction limit.',
    category: 'limit',
  },
  {
    code: 'ZU',
    description: 'Limit exceeded for remitting/issuing bank',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'Bank transaction limit exceeded. Please try again tomorrow.',
    category: 'limit',
  },
  {
    code: 'FL',
    description: 'First transaction limit exceeded',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'First-time transaction limit exceeded. Try a smaller amount.',
    category: 'limit',
  },
  {
    code: 'FP',
    description: 'Freeze period for first-time user',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'You are in a cooldown period. Please try again after 24 hours.',
    category: 'limit',
  },
  {
    code: 'ZP',
    description: 'Bank not live on this transaction type (beneficiary)',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'The recipient bank does not support this transaction type.',
    category: 'limit',
  },

  // Honour errors (BD)
  {
    code: 'YC',
    description: 'Do not honour (remitter)',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'Your bank has declined this transaction.',
    category: 'account',
  },
  {
    code: 'YD',
    description: 'Do not honour (beneficiary)',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'The recipient bank has declined this transaction.',
    category: 'account',
  },
  {
    code: 'YH',
    description: 'Merchant error (acquiring bank)',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'A merchant processing error occurred.',
    category: 'merchant',
  },
  {
    code: 'YI',
    description: 'Invalid response code',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'An unexpected response was received. Please try again.',
    category: 'system',
  },

  // OTP errors (BD)
  {
    code: 'ZR',
    description: 'Invalid OTP',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'The OTP entered is invalid.',
    category: 'otp',
  },
  {
    code: 'ZS',
    description: 'OTP expired',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'The OTP has expired. Please request a new one.',
    category: 'otp',
  },
  {
    code: 'ZT',
    description: 'OTP transaction limit exceeded',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'OTP attempt limit exceeded. Please try again later.',
    category: 'otp',
  },
  {
    code: 'ZV',
    description: 'Incorrect OTP',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'The OTP entered is incorrect.',
    category: 'otp',
  },

  // Merchant errors (BD)
  {
    code: 'X6',
    description: 'Invalid merchant (acquirer)',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'The merchant is not valid.',
    category: 'merchant',
  },
  {
    code: 'X7',
    description: 'Merchant not reachable (acquirer)',
    classification: 'TD',
    isRetryable: true,
    userMessage: 'The merchant is temporarily unavailable. Please try again.',
    category: 'merchant',
  },
  {
    code: 'ZN',
    description: 'Functionality not available for merchant (acquiring bank)',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'This feature is not available for this merchant.',
    category: 'merchant',
  },
  {
    code: 'ZO',
    description: 'Functionality not available for customer (payee PSP)',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'This feature is not yet available for your account.',
    category: 'merchant',
  },

  // Duplicate errors (BD)
  {
    code: 'DF',
    description: 'Duplicate RRN (beneficiary)',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'A duplicate transaction was detected.',
    category: 'format',
  },
  {
    code: 'DT',
    description: 'Duplicate RRN (remitter)',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'A duplicate transaction was detected.',
    category: 'format',
  },

  // Reversal codes
  {
    code: '21',
    description: 'No action taken (full reversal)',
    classification: 'TD',
    isRetryable: true,
    userMessage: 'The reversal status is pending confirmation.',
    category: 'reversal',
  },
  {
    code: '32',
    description: 'Partial reversal',
    classification: 'TD',
    isRetryable: true,
    userMessage: 'The reversal completed only partially and needs confirmation.',
    category: 'reversal',
  },
  {
    code: 'RB',
    description: 'Credit reversal timeout',
    classification: 'TD',
    isRetryable: true,
    userMessage: 'The credit reversal timed out and will be checked.',
    category: 'timeout',
  },
  {
    code: 'RR',
    description: 'Debit reversal timeout',
    classification: 'TD',
    isRetryable: true,
    userMessage: 'The debit reversal timed out and will be checked.',
    category: 'timeout',
  },
  {
    code: '96',
    description: 'Reversal failure',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'The reversal could not be completed.',
    category: 'reversal',
  },
  {
    code: 'CS',
    description: 'Credit reversal success',
    classification: 'SUCCESS',
    isRetryable: false,
    userMessage: 'Credit reversal completed successfully.',
    category: 'reversal',
  },
  {
    code: 'NC',
    description: 'Credit not done',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'The credit could not be applied.',
    category: 'reversal',
  },
  {
    code: 'ND',
    description: 'Debit not done',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'The debit could not be applied.',
    category: 'reversal',
  },
  {
    code: 'OC',
    description: 'Original credit not found (reversal)',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'The original credit transaction could not be found.',
    category: 'reversal',
  },
  {
    code: 'OD',
    description: 'Original debit not found (reversal)',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'The original debit transaction could not be found.',
    category: 'reversal',
  },
  {
    code: 'ZQ',
    description: 'Unable to process reversal',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'The reversal could not be processed.',
    category: 'reversal',
  },

  // Merged/amalgamated account errors (BD)
  {
    code: 'MR',
    description: 'Incorrect account — merged/amalgamated (remitter)',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'Your account has been merged. Please update your details.',
    category: 'account',
  },
  {
    code: 'MB',
    description: 'Incorrect account — merged/amalgamated (beneficiary)',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'The recipient account has been merged. Please verify the details.',
    category: 'account',
  },

  // AuthDetail-specific codes (BD)
  {
    code: 'QA',
    description: 'Mandate paused by user',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'The debit order is paused by the account holder.',
    category: 'mandate',
  },
  {
    code: 'QB',
    description: 'Mandate already honoured',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'This debit order has already been processed.',
    category: 'mandate',
  },
  {
    code: 'QC',
    description: 'Mandate has been revoked',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'The debit order has been cancelled.',
    category: 'mandate',
  },
  {
    code: 'QD',
    description: 'Mandate has expired',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'The debit order has expired.',
    category: 'mandate',
  },
  {
    code: 'QH',
    description: 'Transaction amount differs from mandate amount',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'The amount does not match the debit order.',
    category: 'mandate',
  },
  {
    code: 'QI',
    description: 'Payee VPA incorrect (payer)',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'The payee address does not match the mandate.',
    category: 'mandate',
  },

  // No original request
  {
    code: 'NO',
    description: 'No original request found during debit/credit',
    classification: 'TD',
    isRetryable: false,
    userMessage: 'The original transaction could not be found.',
    category: 'system',
  },

  // PSP not registered
  {
    code: 'U17',
    description: 'PSP not registered',
    classification: 'BD',
    isRetryable: false,
    userMessage: 'The payment service provider is not registered.',
    category: 'system',
  },
];

// ---------------------------------------------------------------------------
// Lookup structures — built once at module load
// ---------------------------------------------------------------------------

const ERROR_MAP = new Map<string, IpsErrorEntry>();
for (const entry of IPS_ERROR_ENTRIES) {
  ERROR_MAP.set(entry.code, entry);
}

const FALLBACK_ENTRY: IpsErrorEntry = {
  code: 'UNKNOWN',
  description: 'Unknown IPS error code',
  classification: 'BD',
  isRetryable: false,
  userMessage: 'An unexpected error occurred. Please try again or contact support.',
  category: 'unknown',
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Get the full error entry for an IPS response code */
export function getErrorEntry(code: string): IpsErrorEntry {
  return ERROR_MAP.get(code) ?? { ...FALLBACK_ENTRY, code };
}

/** Check if a response code indicates the transaction can be retried */
export function isRetryable(code: string): boolean {
  return ERROR_MAP.get(code)?.isRetryable ?? false;
}

/** Get a user-friendly message for a response code */
export function getUserMessage(code: string): string {
  return (ERROR_MAP.get(code) ?? FALLBACK_ENTRY).userMessage;
}

/** Check if a response code indicates success */
export function isSuccess(code: string): boolean {
  const entry = ERROR_MAP.get(code);
  return entry?.classification === 'SUCCESS';
}

/** Get the error category for analytics/grouping */
export function getErrorCategory(code: string): ErrorCategory {
  return (ERROR_MAP.get(code) ?? FALLBACK_ENTRY).category;
}

/**
 * Map an IPS response code to an internal transaction status.
 * Used by the webhook handler to update ipsTransactions.
 */
export function mapToTransactionStatus(
  respCode: string
): 'completed' | 'failed' | 'processing' | 'reversed' | 'timeout' {
  if (respCode === '00' || respCode === 'CS') return 'completed';
  if (respCode === '96') return 'failed'; // reversal failure → deemed success scenario

  const entry = ERROR_MAP.get(respCode);
  if (!entry) return 'failed';

  if (entry.category === 'timeout') return 'timeout';
  if (entry.isRetryable) return 'processing'; // TD errors may resolve on retry
  if (entry.category === 'reversal') return 'reversed';
  return 'failed';
}
