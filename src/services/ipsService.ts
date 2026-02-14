/**
 * IPS/IPP Service
 * 
 * Service layer for Instant Payment Solution integration.
 * Handles all IPS-related operations including disbursements, repayments, and VPA management.
 */

import { supabase } from '@/integrations/supabase/client';
import { withRpcResult, withArrayResult, withServiceResult, ServiceResult } from '@/utils/serviceUtils';
import type {
  InitiateIPSDisbursementParams,
  InitiateIPSDisbursementResult,
  InitiateIPSRepaymentParams,
  InitiateIPSRepaymentResult,
  CompleteIPSTransactionParams,
  CompleteIPSTransactionResult,
  IPSTransactionStatusResult,
  UserVPAsResult,
  UpsertVPAParams,
  UpsertVPAResult,
  LoanIPSTransactionsResult,
  IPSAdapterPayRequest,
  IPSAdapterPayResponse,
  IPSAdapterValidateVPARequest,
  IPSAdapterValidateVPAResponse,
  IPSAdapterCheckStatusRequest,
  IPSAdapterCheckStatusResponse,
  IPSTransaction,
  IPSTransactionStatus,
} from '@/types/ips';

// =============================================================================
// CONFIGURATION
// =============================================================================

// Use the Supabase project URL for edge function calls
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://puahejtaskncpazjyxqp.supabase.co';
const IPS_ADAPTER_URL = `${SUPABASE_URL}/functions/v1/ips-adapter`;

// =============================================================================
// DISBURSEMENT OPERATIONS
// =============================================================================

/**
 * Initiate an IPS disbursement for an approved loan
 */
export async function initiateIPSDisbursement(
  params: InitiateIPSDisbursementParams
): Promise<InitiateIPSDisbursementResult> {
  try {
    // Step 1: Create IPS transaction record via RPC
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      'initiate_ips_disbursement',
      {
        p_disbursement_id: params.disbursementId,
        p_payee_vpa: params.payeeVpa,
        p_note: params.note || null,
      }
    );

    if (rpcError) {
      console.error('IPS disbursement RPC error:', rpcError);
      return {
        success: false,
        error: 'DATABASE_ERROR',
        message: rpcError.message,
      };
    }

    const initResult = rpcResult as InitiateIPSDisbursementResult;
    
    if (!initResult.success) {
      return initResult;
    }

    // Step 2: Call IPS adapter to send payment to IPS
    const adapterRequest: IPSAdapterPayRequest = {
      ipsTransactionId: initResult.ips_transaction_id!,
      msgId: initResult.msg_id!,
      txnId: initResult.txn_id!,
      amount: initResult.amount!,
      currency: initResult.currency || 'NAD',
      payerVpa: initResult.payer_vpa!,
      payeeVpa: initResult.payee_vpa!,
      payeeName: initResult.payee_name,
      purposeCode: 'BUSN',
      note: params.note || 'Loan disbursement',
    };

    const adapterResponse = await callIPSAdapter<IPSAdapterPayResponse>(
      '/pay',
      adapterRequest
    );

    if (!adapterResponse.success) {
      // Update transaction status to failed
      await completeIPSTransaction({
        ipsTransactionId: initResult.ips_transaction_id!,
        ipsResult: 'FAILURE',
        ipsErrorCode: adapterResponse.ipsErrorCode,
        errorMessage: adapterResponse.errorMessage || adapterResponse.error,
      });

      return {
        success: false,
        error: adapterResponse.error || 'IPS_ADAPTER_ERROR',
        message: adapterResponse.errorMessage || 'Failed to process IPS payment',
        ips_transaction_id: initResult.ips_transaction_id,
      };
    }

    // Step 3: Complete the transaction with IPS response
    await completeIPSTransaction({
      ipsTransactionId: initResult.ips_transaction_id!,
      ipsResult: adapterResponse.ipsResult!,
      ipsErrorCode: adapterResponse.ipsErrorCode,
      ipsTxnIdResponse: adapterResponse.ipsTxnId,
      ipsRrn: adapterResponse.ipsRrn,
      errorMessage: adapterResponse.errorMessage,
    });

    return {
      ...initResult,
      success: adapterResponse.ipsResult === 'SUCCESS' || adapterResponse.ipsResult === 'DEEMED',
    };
  } catch (error) {
    console.error('IPS disbursement error:', error);
    return {
      success: false,
      error: 'UNEXPECTED_ERROR',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

// =============================================================================
// REPAYMENT OPERATIONS
// =============================================================================

/**
 * Initiate an IPS repayment for a loan
 */
export async function initiateIPSRepayment(
  params: InitiateIPSRepaymentParams
): Promise<InitiateIPSRepaymentResult> {
  try {
    // Step 1: Create IPS transaction and payment record via RPC
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      'initiate_ips_repayment',
      {
        p_loan_id: params.loanId,
        p_amount: params.amount,
        p_payer_vpa: params.payerVpa,
        p_note: params.note || null,
      }
    );

    if (rpcError) {
      console.error('IPS repayment RPC error:', rpcError);
      return {
        success: false,
        error: 'DATABASE_ERROR',
        message: rpcError.message,
      };
    }

    const initResult = rpcResult as InitiateIPSRepaymentResult;
    
    if (!initResult.success) {
      return initResult;
    }

    // Step 2: Call IPS adapter to send payment to IPS
    const adapterRequest: IPSAdapterPayRequest = {
      ipsTransactionId: initResult.ips_transaction_id!,
      msgId: initResult.msg_id!,
      txnId: initResult.txn_id!,
      amount: initResult.amount!,
      currency: initResult.currency || 'NAD',
      payerVpa: initResult.payer_vpa!,
      payerName: initResult.payer_name,
      payeeVpa: initResult.payee_vpa!,
      payeeName: 'NamLend Trust',
      purposeCode: 'PERS',
      note: params.note || 'Loan repayment',
    };

    const adapterResponse = await callIPSAdapter<IPSAdapterPayResponse>(
      '/pay',
      adapterRequest
    );

    if (!adapterResponse.success) {
      // Update transaction status to failed
      await completeIPSTransaction({
        ipsTransactionId: initResult.ips_transaction_id!,
        ipsResult: 'FAILURE',
        ipsErrorCode: adapterResponse.ipsErrorCode,
        errorMessage: adapterResponse.errorMessage || adapterResponse.error,
      });

      return {
        success: false,
        error: adapterResponse.error || 'IPS_ADAPTER_ERROR',
        message: adapterResponse.errorMessage || 'Failed to process IPS payment',
        ips_transaction_id: initResult.ips_transaction_id,
        payment_id: initResult.payment_id,
      };
    }

    // Step 3: Complete the transaction with IPS response
    await completeIPSTransaction({
      ipsTransactionId: initResult.ips_transaction_id!,
      ipsResult: adapterResponse.ipsResult!,
      ipsErrorCode: adapterResponse.ipsErrorCode,
      ipsTxnIdResponse: adapterResponse.ipsTxnId,
      ipsRrn: adapterResponse.ipsRrn,
      errorMessage: adapterResponse.errorMessage,
    });

    return {
      ...initResult,
      success: adapterResponse.ipsResult === 'SUCCESS' || adapterResponse.ipsResult === 'DEEMED',
    };
  } catch (error) {
    console.error('IPS repayment error:', error);
    return {
      success: false,
      error: 'UNEXPECTED_ERROR',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

// =============================================================================
// TRANSACTION STATUS OPERATIONS
// =============================================================================

/**
 * Complete an IPS transaction (called after IPS response or webhook)
 */
export async function completeIPSTransaction(
  params: CompleteIPSTransactionParams
): Promise<CompleteIPSTransactionResult> {
  return withRpcResult<CompleteIPSTransactionResult>(
    () => supabase.rpc('complete_ips_transaction', {
      p_ips_txn_id: params.ipsTransactionId,
      p_ips_result: params.ipsResult,
      p_ips_error_code: params.ipsErrorCode || null,
      p_ips_txn_id_response: params.ipsTxnIdResponse || null,
      p_ips_rrn: params.ipsRrn || null,
      p_error_message: params.errorMessage || null,
    }),
    'completeIPSTransaction',
    { ipsTransactionId: params.ipsTransactionId }
  );
}

/**
 * Get the status of an IPS transaction
 */
export async function getIPSTransactionStatus(
  transactionId: string
): Promise<IPSTransactionStatusResult> {
  return withRpcResult<IPSTransactionStatusResult>(
    () => supabase.rpc('get_ips_transaction_status', {
      p_ips_txn_id: transactionId,
    }),
    'getIPSTransactionStatus',
    { transactionId }
  );
}

/**
 * Check transaction status with IPS (for pending/timeout transactions)
 */
export async function checkIPSTransactionStatus(
  transactionId: string
): Promise<IPSTransactionStatusResult> {
  try {
    // Get current transaction details
    const currentStatus = await getIPSTransactionStatus(transactionId);
    
    if (!currentStatus.success || !currentStatus.id) {
      return currentStatus;
    }

    // If already in final state, return current status
    if (['success', 'failed', 'reversed', 'deemed'].includes(currentStatus.status!)) {
      return currentStatus;
    }

    // Get full transaction for msg_id and txn_id
    const { data: txn, error: txnError } = await supabase
      .from('ips_transactions')
      .select('msg_id, txn_id')
      .eq('id', transactionId)
      .single();

    if (txnError || !txn) {
      return {
        success: false,
        error: 'TXN_NOT_FOUND',
      };
    }

    // Call IPS adapter to check status
    const checkRequest: IPSAdapterCheckStatusRequest = {
      ipsTransactionId: transactionId,
      orgMsgId: txn.msg_id,
      orgTxnId: txn.txn_id,
    };

    const checkResponse = await callIPSAdapter<IPSAdapterCheckStatusResponse>(
      '/check-status',
      checkRequest
    );

    if (!checkResponse.success) {
      // Update last check timestamp
      await supabase
        .from('ips_transactions')
        .update({ last_status_check_at: new Date().toISOString() })
        .eq('id', transactionId);

      return {
        ...currentStatus,
        error: checkResponse.error,
      };
    }

    // Update transaction with new status
    if (checkResponse.ipsResult) {
      await completeIPSTransaction({
        ipsTransactionId: transactionId,
        ipsResult: checkResponse.ipsResult,
        ipsErrorCode: checkResponse.ipsErrorCode,
        ipsTxnIdResponse: checkResponse.ipsTxnId,
        ipsRrn: checkResponse.ipsRrn,
        errorMessage: checkResponse.errorMessage,
      });
    }

    // Return updated status
    return getIPSTransactionStatus(transactionId);
  } catch (error) {
    console.error('Check IPS transaction status error:', error);
    return {
      success: false,
      error: 'UNEXPECTED_ERROR',
    };
  }
}

// =============================================================================
// VPA OPERATIONS
// =============================================================================

/**
 * Validate a VPA address with IPS
 */
export async function validateVPA(
  vpa: string
): Promise<IPSAdapterValidateVPAResponse> {
  try {
    const request: IPSAdapterValidateVPARequest = { vpa };
    return await callIPSAdapter<IPSAdapterValidateVPAResponse>('/validate-vpa', request);
  } catch (error) {
    console.error('Validate VPA error:', error);
    return {
      success: false,
      error: 'UNEXPECTED_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Failed to validate VPA',
    };
  }
}

/**
 * Get user's saved VPAs
 */
export async function getUserVPAs(userId?: string): Promise<UserVPAsResult> {
  return withRpcResult<UserVPAsResult>(
    () => supabase.rpc('get_user_vpas', {
      p_user_id: userId || null,
    }),
    'getUserVPAs',
    { userId }
  );
}

/**
 * Add or update a user's VPA
 */
export async function upsertUserVPA(params: UpsertVPAParams): Promise<UpsertVPAResult> {
  return withRpcResult<UpsertVPAResult>(
    () => supabase.rpc('upsert_user_vpa', {
      p_vpa_address: params.vpaAddress,
      p_vpa_type: params.vpaType || 'HANDLE',
      p_display_name: params.displayName || null,
      p_set_default: params.setDefault || false,
    }),
    'upsertUserVPA',
    { vpaAddress: params.vpaAddress }
  );
}

/**
 * Delete a user's VPA (soft delete)
 */
export async function deleteUserVPA(vpaId: string): Promise<ServiceResult<null>> {
  return withServiceResult<null>(
    () => supabase
      .from('ips_vpa_registry')
      .update({
        is_active: false,
        deactivated_at: new Date().toISOString(),
        deactivation_reason: 'User deleted',
      })
      .eq('id', vpaId)
      .select(),
    'deleteUserVPA',
    { vpaId }
  );
}

/**
 * Set a VPA as default
 */
export async function setDefaultVPA(vpaId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the VPA address
    const { data: vpa, error: fetchError } = await supabase
      .from('ips_vpa_registry')
      .select('vpa_address')
      .eq('id', vpaId)
      .single();

    if (fetchError || !vpa) {
      return { success: false, error: 'VPA_NOT_FOUND' };
    }

    // Use upsert to set as default (it handles unsetting others)
    return upsertUserVPA({
      vpaAddress: vpa.vpa_address,
      setDefault: true,
    });
  } catch (error) {
    console.error('Set default VPA error:', error);
    return { success: false, error: 'UNEXPECTED_ERROR' };
  }
}

// =============================================================================
// LOAN IPS TRANSACTIONS
// =============================================================================

/**
 * Get all IPS transactions for a loan
 */
export async function getLoanIPSTransactions(
  loanId: string
): Promise<LoanIPSTransactionsResult> {
  return withRpcResult<LoanIPSTransactionsResult>(
    () => supabase.rpc('get_loan_ips_transactions', {
      p_loan_id: loanId,
    }),
    'getLoanIPSTransactions',
    { loanId }
  );
}

/**
 * Get pending IPS transactions (for admin monitoring)
 */
export async function getPendingIPSTransactions(): Promise<ServiceResult<IPSTransaction[]>> {
  return withArrayResult<IPSTransaction>(
    () => supabase
      .from('ips_transactions')
      .select('*')
      .in('status', ['initiated', 'pending', 'sent'])
      .order('created_at', { ascending: false })
      .limit(100),
    'getPendingIPSTransactions'
  );
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Call the IPS adapter edge function
 */
async function callIPSAdapter<T, P = unknown>(
  endpoint: string,
  payload: P
): Promise<T> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    const response = await fetch(`${IPS_ADAPTER_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('IPS adapter error response:', errorText);
      return {
        success: false,
        error: 'IPS_ADAPTER_ERROR',
        errorMessage: `HTTP ${response.status}: ${errorText}`,
      } as T;
    }

    return await response.json();
  } catch (error) {
    console.error('IPS adapter call error:', error);
    return {
      success: false,
      error: 'NETWORK_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Network error',
    } as T;
  }
}

/**
 * Format VPA for display (mask middle part)
 */
export function formatVPAForDisplay(vpa: string): string {
  const parts = vpa.split('@');
  if (parts.length !== 2) return vpa;
  
  const [username, provider] = parts;
  if (username.length <= 4) return vpa;
  
  const masked = username.substring(0, 2) + '***' + username.substring(username.length - 2);
  return `${masked}@${provider}`;
}

/**
 * Validate VPA format
 */
export function isValidVPAFormat(vpa: string): boolean {
  // Basic format: username@provider
  const vpaRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/;
  return vpaRegex.test(vpa);
}

/**
 * Extract provider from VPA
 */
export function getVPAProvider(vpa: string): string | null {
  const parts = vpa.split('@');
  return parts.length === 2 ? parts[1] : null;
}
