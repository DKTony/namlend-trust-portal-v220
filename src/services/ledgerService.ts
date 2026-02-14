/**
 * TigerBeetle Ledger Service
 * 
 * Provides integration with TigerBeetle for double-entry bookkeeping.
 * Uses the outbox pattern for reliable posting via Supabase.
 * Direct TigerBeetle client for real-time operations.
 * 
 * @module ledgerService
 */

import { supabase } from '@/integrations/supabase/client';
import { TBClient } from '@/types/services';

// TigerBeetle client - dynamically imported for browser compatibility
let tbClient: TBClient | null = null;
let tbClientPromise: Promise<TBClient | null> | null = null;

// TigerBeetle configuration
const TB_CONFIG = {
  cluster_id: 0n, // Development cluster
  replica_addresses: ['127.0.0.1:3001'],
};

/**
 * Initialize TigerBeetle client (lazy loading)
 * Returns null in browser environment - use outbox pattern instead
 */
async function getTigerBeetleClient(): Promise<TBClient | null> {
  // Skip in browser environment
  if (typeof window !== 'undefined') {
    console.log('TigerBeetle client not available in browser - using outbox pattern');
    return null;
  }

  if (tbClient) return tbClient;
  
  if (!tbClientPromise) {
    tbClientPromise = (async () => {
      try {
        const { createClient } = await import('tigerbeetle-node');
        tbClient = createClient({
          cluster_id: TB_CONFIG.cluster_id,
          replica_addresses: TB_CONFIG.replica_addresses,
        });
        console.log('✅ TigerBeetle client connected to', TB_CONFIG.replica_addresses);
        return tbClient;
      } catch (error) {
        console.warn('⚠️ TigerBeetle client initialization failed:', error);
        return null;
      }
    })();
  }
  
  return tbClientPromise;
}

// ============================================================================
// Types & Constants
// ============================================================================

/** TigerBeetle Account Codes (Chart of Accounts) */
export const TB_ACCOUNT_CODES = {
  // Borrower Sub-Ledger (1000-1999)
  LOAN_PRINCIPAL_RECEIVABLE: 1001,
  LOAN_INTEREST_RECEIVABLE: 1002,
  LOAN_FEE_RECEIVABLE: 1003,
  LOAN_LATE_FEE_RECEIVABLE: 1004,
  
  // Operational Accounts (2000-2999)
  DISBURSEMENT_CLEARING: 2001,
  COLLECTIONS_CLEARING: 2002,
  BANK_SETTLEMENT: 2003,
  SUSPENSE: 2004,
  
  // IPS Accounts (3000-3999)
  IPS_PENDING_INBOUND: 3001,
  IPS_PENDING_OUTBOUND: 3002,
  IPS_OPERATOR_FEE: 3003,
  
  // Income Accounts (5000-5999)
  INTEREST_INCOME: 5001,
  FEE_INCOME: 5002,
  LATE_FEE_INCOME: 5003,
  
  // Expense Accounts (6000-6999)
  WRITE_OFF_EXPENSE: 6001,
} as const;

/** TigerBeetle Transfer Codes */
export const TB_TRANSFER_CODES = {
  DISBURSEMENT: 101,
  REPAYMENT_PRINCIPAL: 201,
  REPAYMENT_INTEREST: 202,
  REPAYMENT_FEE: 203,
  REPAYMENT_LATE_FEE: 204,
  LATE_FEE_ACCRUAL: 301,
  INTEREST_ACCRUAL: 302,
  WRITE_OFF: 401,
  IPS_INITIATE: 501,
  IPS_POST: 502,
  IPS_VOID: 503,
  SETTLEMENT_NET: 601,
  ADJUSTMENT: 701,
} as const;

/** Entity types for TigerBeetle account mapping */
export type TBEntityType = 
  | 'LOAN_PRINCIPAL' | 'LOAN_INTEREST' | 'LOAN_FEES'
  | 'USER_WALLET' | 'BANK_SETTLEMENT' | 'IPS_CLEARING'
  | 'DISBURSEMENT_CLEARING' | 'COLLECTIONS_CLEARING'
  | 'INTEREST_INCOME' | 'FEE_INCOME' | 'WRITE_OFF_EXPENSE'
  | 'IPS_PENDING_IN' | 'IPS_PENDING_OUT' | 'OPERATOR_FEE';

/** Event types for outbox */
export type TBEventType = 
  | 'CREATE_ACCOUNT' | 'DISBURSEMENT' | 'REPAYMENT'
  | 'LATE_FEE' | 'INTEREST_ACCRUAL' | 'WRITE_OFF'
  | 'IPS_INITIATE' | 'IPS_COMPLETE' | 'IPS_REVERSE'
  | 'SETTLEMENT_NET' | 'ADJUSTMENT';

/** Outbox entry status */
export type OutboxStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'dead_letter';

/** Result type for ledger operations */
export interface LedgerResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  outboxId?: string;
}

/** TigerBeetle account mapping record */
export interface TBAccountMapping {
  id: string;
  entity_type: TBEntityType;
  entity_id: string;
  // Store as string to preserve 64-bit precision (values > 2^53 lose precision as JS numbers)
  tb_account_id_high: string;
  tb_account_id_low: string;
  tb_ledger: number;
  tb_code: number;
  status: 'pending' | 'created' | 'failed';
  created_at: string;
}

/** Outbox entry */
export interface OutboxEntry {
  id: string;
  event_type: TBEventType;
  source_table: string;
  source_id: string;
  payload: Record<string, unknown>;
  status: OutboxStatus;
  retry_count: number;
  created_at: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generates deterministic TigerBeetle ID components from a UUID
 * TigerBeetle uses 128-bit IDs, we split into high/low 64-bit values
 */
export function uuidToTBId(uuid: string): { high: bigint; low: bigint } {
  const hex = uuid.replace(/-/g, '');
  const high = BigInt('0x' + hex.substring(0, 16));
  const low = BigInt('0x' + hex.substring(16, 32));
  return { high, low };
}

/**
 * Converts amount to TigerBeetle integer format (cents/smallest unit)
 * TigerBeetle doesn't support decimals, so NAD 100.50 becomes 10050
 */
export function amountToTBUnits(amount: number): bigint {
  return BigInt(Math.round(amount * 100));
}

/**
 * Converts TigerBeetle units back to decimal amount
 */
export function tbUnitsToAmount(units: bigint): number {
  return Number(units) / 100;
}

// ============================================================================
// Account Management
// ============================================================================

/**
 * Creates or retrieves TigerBeetle account mapping for a loan
 * Creates three accounts: Principal, Interest, and Fees receivable
 */
export async function createLoanAccounts(
  loanId: string,
  userId: string
): Promise<LedgerResult<{ accountIds: Record<string, string> }>> {
  try {
    const accountTypes: Array<{ type: TBEntityType; code: number }> = [
      { type: 'LOAN_PRINCIPAL', code: TB_ACCOUNT_CODES.LOAN_PRINCIPAL_RECEIVABLE },
      { type: 'LOAN_INTEREST', code: TB_ACCOUNT_CODES.LOAN_INTEREST_RECEIVABLE },
      { type: 'LOAN_FEES', code: TB_ACCOUNT_CODES.LOAN_FEE_RECEIVABLE },
    ];

    const accountIds: Record<string, string> = {};
    const { high, low } = uuidToTBId(loanId);

    for (const { type, code } of accountTypes) {
      // Check if account already exists
      const { data: existing } = await supabase
        .from('tigerbeetle_accounts')
        .select('id')
        .eq('entity_type', type)
        .eq('entity_id', loanId)
        .single();

      if (existing) {
        accountIds[type] = existing.id;
        continue;
      }

      // Create account mapping
      // CRITICAL: Use toString() to preserve 64-bit precision for TigerBeetle IDs
      // Number() loses precision for values > 2^53 (JavaScript safe integer limit)
      // Supabase handles bigint columns correctly when passed as strings
      const lowWithOffset = BigInt(low) + BigInt(code);
      const { data, error } = await supabase
        .from('tigerbeetle_accounts')
        .insert({
          entity_type: type,
          entity_id: loanId,
          tb_account_id_high: high.toString(),
          tb_account_id_low: lowWithOffset.toString(),
          tb_ledger: 1, // NAD ledger
          tb_code: code,
          status: 'pending',
        })
        .select('id')
        .single();

      if (error) throw error;
      accountIds[type] = data.id;

      // Queue account creation in TigerBeetle via outbox
      await queueTBEvent('CREATE_ACCOUNT', 'tigerbeetle_accounts', data.id, {
        entity_type: type,
        entity_id: loanId,
        user_id: userId,
        tb_code: code,
      });
    }

    return { success: true, data: { accountIds } };
  } catch (error) {
    console.error('❌ createLoanAccounts failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Gets TigerBeetle account mapping for an entity
 */
export async function getAccountMapping(
  entityType: TBEntityType,
  entityId: string
): Promise<LedgerResult<TBAccountMapping>> {
  try {
    const { data, error } = await supabase
      .from('tigerbeetle_accounts')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .single();

    if (error) throw error;
    return { success: true, data: data as TBAccountMapping };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Account not found' };
  }
}

// ============================================================================
// Transfer Operations (via Outbox)
// ============================================================================

/**
 * Posts a disbursement transfer to TigerBeetle
 * DR: Loan Principal Receivable
 * CR: Disbursement Clearing
 */
export async function postDisbursement(
  disbursementId: string,
  loanId: string,
  amount: number,
  paymentReference: string
): Promise<LedgerResult<{ outboxId: string }>> {
  try {
    const payload = {
      disbursement_id: disbursementId,
      loan_id: loanId,
      amount: amountToTBUnits(amount).toString(),
      payment_reference: paymentReference,
      transfer_code: TB_TRANSFER_CODES.DISBURSEMENT,
      debit_account_type: 'LOAN_PRINCIPAL' as TBEntityType,
      credit_account_type: 'DISBURSEMENT_CLEARING' as TBEntityType,
    };

    const outboxId = await queueTBEvent('DISBURSEMENT', 'disbursements', disbursementId, payload);
    
    return { success: true, outboxId, data: { outboxId } };
  } catch (error) {
    console.error('❌ postDisbursement failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Posts a repayment with proper allocation (fees → interest → principal)
 * Creates linked transfers for atomic execution
 */
export async function postRepayment(
  paymentId: string,
  loanId: string,
  allocation: {
    principal: number;
    interest: number;
    fees: number;
    lateFees: number;
  },
  paymentReference: string
): Promise<LedgerResult<{ outboxId: string }>> {
  try {
    const transfers: Array<{
      debit_type: TBEntityType;
      credit_type: TBEntityType;
      amount: string;
      code: number;
    }> = [];

    // Build transfer chain (order matters for linked transfers)
    if (allocation.lateFees > 0) {
      transfers.push({
        debit_type: 'COLLECTIONS_CLEARING',
        credit_type: 'LOAN_FEES', // Late fees go to fee receivable
        amount: amountToTBUnits(allocation.lateFees).toString(),
        code: TB_TRANSFER_CODES.REPAYMENT_LATE_FEE,
      });
    }

    if (allocation.fees > 0) {
      transfers.push({
        debit_type: 'COLLECTIONS_CLEARING',
        credit_type: 'LOAN_FEES',
        amount: amountToTBUnits(allocation.fees).toString(),
        code: TB_TRANSFER_CODES.REPAYMENT_FEE,
      });
    }

    if (allocation.interest > 0) {
      transfers.push({
        debit_type: 'COLLECTIONS_CLEARING',
        credit_type: 'LOAN_INTEREST',
        amount: amountToTBUnits(allocation.interest).toString(),
        code: TB_TRANSFER_CODES.REPAYMENT_INTEREST,
      });
    }

    if (allocation.principal > 0) {
      transfers.push({
        debit_type: 'COLLECTIONS_CLEARING',
        credit_type: 'LOAN_PRINCIPAL',
        amount: amountToTBUnits(allocation.principal).toString(),
        code: TB_TRANSFER_CODES.REPAYMENT_PRINCIPAL,
      });
    }

    const payload = {
      payment_id: paymentId,
      loan_id: loanId,
      payment_reference: paymentReference,
      transfers,
      linked: true, // All transfers execute atomically
    };

    const outboxId = await queueTBEvent('REPAYMENT', 'payments', paymentId, payload);
    
    return { success: true, outboxId, data: { outboxId } };
  } catch (error) {
    console.error('❌ postRepayment failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Posts a late fee accrual
 * DR: Late Fee Receivable
 * CR: Late Fee Income
 */
export async function postLateFeeAccrual(
  loanId: string,
  scheduleId: string,
  amount: number
): Promise<LedgerResult<{ outboxId: string }>> {
  try {
    const payload = {
      loan_id: loanId,
      schedule_id: scheduleId,
      amount: amountToTBUnits(amount).toString(),
      transfer_code: TB_TRANSFER_CODES.LATE_FEE_ACCRUAL,
      debit_account_type: 'LOAN_FEES' as TBEntityType,
      credit_account_type: 'FEE_INCOME' as TBEntityType,
    };

    const outboxId = await queueTBEvent('LATE_FEE', 'payment_schedules', scheduleId, payload);
    
    return { success: true, outboxId, data: { outboxId } };
  } catch (error) {
    console.error('❌ postLateFeeAccrual failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Posts IPS transaction initiation (two-phase: pending)
 * Creates a pending transfer that will be posted or voided
 */
export async function postIPSInitiate(
  ipsTransactionId: string,
  loanId: string,
  transactionType: 'REPAYMENT' | 'DISBURSEMENT',
  amount: number
): Promise<LedgerResult<{ outboxId: string }>> {
  try {
    const payload = {
      ips_transaction_id: ipsTransactionId,
      loan_id: loanId,
      transaction_type: transactionType,
      amount: amountToTBUnits(amount).toString(),
      transfer_code: TB_TRANSFER_CODES.IPS_INITIATE,
      pending: true, // Two-phase transfer
      debit_account_type: transactionType === 'DISBURSEMENT' ? 'IPS_PENDING_OUT' : 'IPS_PENDING_IN',
      credit_account_type: transactionType === 'DISBURSEMENT' ? 'LOAN_PRINCIPAL' : 'COLLECTIONS_CLEARING',
    };

    const outboxId = await queueTBEvent('IPS_INITIATE', 'ips_transactions', ipsTransactionId, payload);
    
    return { success: true, outboxId, data: { outboxId } };
  } catch (error) {
    console.error('❌ postIPSInitiate failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Posts IPS transaction completion (two-phase: post)
 */
export async function postIPSComplete(
  ipsTransactionId: string,
  pendingTransferId: string
): Promise<LedgerResult<{ outboxId: string }>> {
  try {
    const payload = {
      ips_transaction_id: ipsTransactionId,
      pending_transfer_id: pendingTransferId,
      transfer_code: TB_TRANSFER_CODES.IPS_POST,
      post_pending: true,
    };

    const outboxId = await queueTBEvent('IPS_COMPLETE', 'ips_transactions', ipsTransactionId, payload);
    
    return { success: true, outboxId, data: { outboxId } };
  } catch (error) {
    console.error('❌ postIPSComplete failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Voids IPS transaction (two-phase: void)
 */
export async function postIPSVoid(
  ipsTransactionId: string,
  pendingTransferId: string,
  reason: string
): Promise<LedgerResult<{ outboxId: string }>> {
  try {
    const payload = {
      ips_transaction_id: ipsTransactionId,
      pending_transfer_id: pendingTransferId,
      transfer_code: TB_TRANSFER_CODES.IPS_VOID,
      void_pending: true,
      reason,
    };

    const outboxId = await queueTBEvent('IPS_REVERSE', 'ips_transactions', ipsTransactionId, payload);
    
    return { success: true, outboxId, data: { outboxId } };
  } catch (error) {
    console.error('❌ postIPSVoid failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================================================
// Balance Queries
// ============================================================================

/**
 * Gets loan balance from TigerBeetle shadow ledger
 * Falls back to Supabase loan_balance_summary if TigerBeetle unavailable
 */
export async function getLoanBalance(
  loanId: string
): Promise<LedgerResult<{
  principal: number;
  interest: number;
  fees: number;
  total: number;
  source: 'tigerbeetle' | 'supabase';
}>> {
  try {
    // Try to get from TigerBeetle shadow ledger first
    const { data: transfers, error: tbError } = await supabase
      .from('tigerbeetle_transfers')
      .select(`
        amount,
        tb_code,
        is_posted,
        debit_account:tigerbeetle_accounts!debit_account_id(entity_type, entity_id),
        credit_account:tigerbeetle_accounts!credit_account_id(entity_type, entity_id)
      `)
      .eq('is_posted', true)
      .or(`debit_account.entity_id.eq.${loanId},credit_account.entity_id.eq.${loanId}`);

    if (!tbError && transfers && transfers.length > 0) {
      // Calculate balances from shadow ledger
      let principal = 0, interest = 0, fees = 0;
      
      for (const t of transfers) {
        const amount = Number(t.amount);
        // Logic to calculate debits/credits based on account types
        // This is simplified - actual implementation would be more complex
        if (t.tb_code === TB_TRANSFER_CODES.DISBURSEMENT) {
          principal += amount;
        } else if (t.tb_code === TB_TRANSFER_CODES.REPAYMENT_PRINCIPAL) {
          principal -= amount;
        } else if (t.tb_code === TB_TRANSFER_CODES.REPAYMENT_INTEREST) {
          interest -= amount;
        } else if (t.tb_code === TB_TRANSFER_CODES.REPAYMENT_FEE || 
                   t.tb_code === TB_TRANSFER_CODES.REPAYMENT_LATE_FEE) {
          fees -= amount;
        } else if (t.tb_code === TB_TRANSFER_CODES.LATE_FEE_ACCRUAL) {
          fees += amount;
        }
      }

      return {
        success: true,
        data: {
          principal: Math.max(0, principal),
          interest: Math.max(0, interest),
          fees: Math.max(0, fees),
          total: Math.max(0, principal + interest + fees),
          source: 'tigerbeetle',
        },
      };
    }

    // Fallback to Supabase view - use correct column names from loan_balance_summary
    // Use maybeSingle() to gracefully handle missing rows (e.g., loan not found)
    const { data: loanData, error: loanError } = await supabase
      .from('loan_balance_summary')
      .select('principal_balance, interest_balance, fees_balance, total_balance')
      .eq('loan_id', loanId)
      .maybeSingle();

    // Handle query errors (but not "no rows" which returns null data)
    if (loanError) throw loanError;

    // Handle case where loan doesn't exist in the view
    if (!loanData) {
      console.warn(`⚠️ getLoanBalance: No balance data found for loan ${loanId}`);
      return {
        success: true,
        data: {
          principal: 0,
          interest: 0,
          fees: 0,
          total: 0,
          source: 'supabase',
        },
      };
    }

    return {
      success: true,
      data: {
        principal: Number(loanData.principal_balance) || 0,
        interest: Number(loanData.interest_balance) || 0,
        fees: Number(loanData.fees_balance) || 0,
        total: Number(loanData.total_balance) || 0,
        source: 'supabase',
      },
    };
  } catch (error) {
    console.error('❌ getLoanBalance failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================================================
// Outbox Management
// ============================================================================

/**
 * Queues an event in the TigerBeetle outbox
 */
async function queueTBEvent(
  eventType: TBEventType,
  sourceTable: string,
  sourceId: string,
  payload: Record<string, unknown>
): Promise<string> {
  const { data, error } = await supabase.rpc('queue_tigerbeetle_event', {
    p_event_type: eventType,
    p_source_table: sourceTable,
    p_source_id: sourceId,
    p_payload: payload,
  });

  if (error) throw error;
  return data as string;
}

/**
 * Gets pending outbox entries for processing
 */
export async function getPendingOutboxEntries(
  limit: number = 100
): Promise<LedgerResult<OutboxEntry[]>> {
  try {
    const { data, error } = await supabase
      .from('tigerbeetle_outbox')
      .select('*')
      .in('status', ['pending', 'failed'])
      .lt('retry_count', 5)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return { success: true, data: data as OutboxEntry[] };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Marks an outbox entry as completed
 */
export async function completeOutboxEntry(
  outboxId: string,
  transferIds: string[]
): Promise<LedgerResult> {
  try {
    const { error } = await supabase
      .from('tigerbeetle_outbox')
      .update({
        status: 'completed',
        tb_transfer_ids: transferIds,
        processed_at: new Date().toISOString(),
      })
      .eq('id', outboxId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Marks an outbox entry as failed with retry scheduling
 */
export async function failOutboxEntry(
  outboxId: string,
  errorMessage: string
): Promise<LedgerResult> {
  try {
    // Exponential backoff: 1min, 2min, 4min, 8min, 16min
    const { data: entry } = await supabase
      .from('tigerbeetle_outbox')
      .select('retry_count, max_retries')
      .eq('id', outboxId)
      .single();

    const retryCount = (entry?.retry_count || 0) + 1;
    const maxRetries = entry?.max_retries || 5;
    const nextRetry = new Date(Date.now() + Math.pow(2, retryCount) * 60000);

    const { error } = await supabase
      .from('tigerbeetle_outbox')
      .update({
        status: retryCount >= maxRetries ? 'dead_letter' : 'failed',
        retry_count: retryCount,
        next_retry_at: nextRetry.toISOString(),
        last_error: errorMessage,
      })
      .eq('id', outboxId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================================================
// Reconciliation
// ============================================================================

/**
 * Runs reconciliation between Supabase and TigerBeetle shadow ledger
 */
export async function runReconciliation(
  loanId?: string
): Promise<LedgerResult<{
  recordsChecked: number;
  discrepancies: number;
  details: Array<{ type: string; message: string }>;
}>> {
  try {
    // Create reconciliation record
    const { data: recon, error: reconError } = await supabase
      .from('tigerbeetle_reconciliation')
      .insert({
        run_type: loanId ? 'LOAN_SPECIFIC' : 'INCREMENTAL',
        loan_id: loanId,
        status: 'running',
      })
      .select('id')
      .single();

    if (reconError) throw reconError;

    const details: Array<{ type: string; message: string }> = [];
    let recordsChecked = 0;
    let discrepancies = 0;

    // Get loans to check
    const loansQuery = supabase
      .from('loans')
      .select('id, amount, total_paid, outstanding_balance, status')
      .in('status', ['funded', 'settled']);

    if (loanId) {
      loansQuery.eq('id', loanId);
    }

    const { data: loans, error: loansError } = await loansQuery.limit(100);
    if (loansError) throw loansError;

    for (const loan of loans || []) {
      recordsChecked++;
      
      // Get TigerBeetle balance
      const tbBalance = await getLoanBalance(loan.id);
      
      if (tbBalance.success && tbBalance.data?.source === 'tigerbeetle') {
        const supabaseBalance = Number(loan.outstanding_balance) || 0;
        const tbTotal = tbBalance.data.total;
        
        // Check for discrepancy (allow 1 cent tolerance for rounding)
        if (Math.abs(supabaseBalance - tbTotal) > 0.01) {
          discrepancies++;
          details.push({
            type: 'BALANCE_MISMATCH',
            message: `Loan ${loan.id}: Supabase=${supabaseBalance}, TigerBeetle=${tbTotal}`,
          });
        }
      }
    }

    // Update reconciliation record
    await supabase
      .from('tigerbeetle_reconciliation')
      .update({
        status: discrepancies > 0 ? 'discrepancy_found' : 'completed',
        records_checked: recordsChecked,
        discrepancies_found: discrepancies,
        discrepancy_details: details,
        completed_at: new Date().toISOString(),
      })
      .eq('id', recon.id);

    return {
      success: true,
      data: { recordsChecked, discrepancies, details },
    };
  } catch (error) {
    console.error('❌ runReconciliation failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================================================
// Connection Test & Direct Operations
// ============================================================================

/**
 * Test TigerBeetle connection and return server info
 * Use this to verify the integration is working
 */
export async function testTigerBeetleConnection(): Promise<LedgerResult<{
  connected: boolean;
  cluster_id: string;
  replica_addresses: string[];
}>> {
  try {
    const client = await getTigerBeetleClient();
    
    if (!client) {
      return {
        success: true,
        data: {
          connected: false,
          cluster_id: 'N/A (browser mode - using outbox)',
          replica_addresses: TB_CONFIG.replica_addresses,
        },
      };
    }

    // Try to lookup a non-existent account to verify connection
    await client.lookupAccounts([0n]);
    
    return {
      success: true,
      data: {
        connected: true,
        cluster_id: TB_CONFIG.cluster_id.toString(),
        replica_addresses: TB_CONFIG.replica_addresses,
      },
    };
  } catch (error) {
    console.error('❌ TigerBeetle connection test failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Connection failed' 
    };
  }
}

/**
 * Create account directly in TigerBeetle (for server-side use)
 */
export async function createTBAccountDirect(
  id: bigint,
  ledger: number,
  code: number,
  userData128: bigint = 0n
): Promise<LedgerResult<{ created: boolean }>> {
  try {
    const client = await getTigerBeetleClient();
    
    if (!client) {
      return { success: false, error: 'TigerBeetle client not available' };
    }

    const errors = await client.createAccounts([{
      id,
      debits_pending: 0n,
      debits_posted: 0n,
      credits_pending: 0n,
      credits_posted: 0n,
      user_data_128: userData128,
      user_data_64: 0n,
      user_data_32: 0,
      reserved: 0,
      ledger,
      code,
      flags: 0,
      timestamp: 0n,
    }]);

    if (errors.length > 0) {
      // Error code 1 means account already exists - that's OK
      if (errors[0].result === 1) {
        return { success: true, data: { created: false } };
      }
      return { success: false, error: `TigerBeetle error: ${errors[0].result}` };
    }

    return { success: true, data: { created: true } };
  } catch (error) {
    console.error('❌ createTBAccountDirect failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Create transfer directly in TigerBeetle (for server-side use)
 */
export async function createTBTransferDirect(
  id: bigint,
  debitAccountId: bigint,
  creditAccountId: bigint,
  amount: bigint,
  ledger: number,
  code: number,
  flags: number = 0,
  userData128: bigint = 0n
): Promise<LedgerResult<{ created: boolean }>> {
  try {
    const client = await getTigerBeetleClient();
    
    if (!client) {
      return { success: false, error: 'TigerBeetle client not available' };
    }

    const errors = await client.createTransfers([{
      id,
      debit_account_id: debitAccountId,
      credit_account_id: creditAccountId,
      amount,
      pending_id: 0n,
      user_data_128: userData128,
      user_data_64: 0n,
      user_data_32: 0,
      timeout: 0,
      ledger,
      code,
      flags,
      timestamp: 0n,
    }]);

    if (errors.length > 0) {
      return { success: false, error: `TigerBeetle error: ${errors[0].result}` };
    }

    return { success: true, data: { created: true } };
  } catch (error) {
    console.error('❌ createTBTransferDirect failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Lookup account balances directly from TigerBeetle
 */
export async function lookupTBAccount(
  accountId: bigint
): Promise<LedgerResult<{
  debits_pending: bigint;
  debits_posted: bigint;
  credits_pending: bigint;
  credits_posted: bigint;
  balance: bigint;
}>> {
  try {
    const client = await getTigerBeetleClient();
    
    if (!client) {
      return { success: false, error: 'TigerBeetle client not available' };
    }

    const accounts = await client.lookupAccounts([accountId]);
    
    if (accounts.length === 0) {
      return { success: false, error: 'Account not found' };
    }

    const account = accounts[0];
    // Ensure bigint types for TigerBeetle account values
    const creditsPosted = BigInt(account.credits_posted);
    const debitsPosted = BigInt(account.debits_posted);
    return {
      success: true,
      data: {
        debits_pending: BigInt(account.debits_pending),
        debits_posted: debitsPosted,
        credits_pending: BigInt(account.credits_pending),
        credits_posted: creditsPosted,
        balance: creditsPosted - debitsPosted,
      },
    };
  } catch (error) {
    console.error('❌ lookupTBAccount failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================================================
// Exports
// ============================================================================

export default {
  // Account management
  createLoanAccounts,
  getAccountMapping,
  
  // Transfer operations
  postDisbursement,
  postRepayment,
  postLateFeeAccrual,
  postIPSInitiate,
  postIPSComplete,
  postIPSVoid,
  
  // Balance queries
  getLoanBalance,
  
  // Outbox management
  getPendingOutboxEntries,
  completeOutboxEntry,
  failOutboxEntry,
  
  // Reconciliation
  runReconciliation,
  
  // Direct TigerBeetle operations
  testTigerBeetleConnection,
  createTBAccountDirect,
  createTBTransferDirect,
  lookupTBAccount,
  
  // Helpers
  uuidToTBId,
  amountToTBUnits,
  tbUnitsToAmount,
  
  // Constants
  TB_ACCOUNT_CODES,
  TB_TRANSFER_CODES,
};
