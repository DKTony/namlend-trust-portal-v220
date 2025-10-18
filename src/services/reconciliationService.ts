import { supabase } from '@/integrations/supabase/client';
import { debugLog } from '@/utils/debug';
import { handleDatabaseError, measurePerformance } from '@/utils/errorHandler';

export type MatchType = 'auto_exact' | 'auto_fuzzy' | 'manual' | 'exception';
export type ReconciliationStatus = 'matched' | 'unmatched' | 'disputed' | 'resolved';
export type TransactionType = 'credit' | 'debit';

export interface BankTransaction {
  id: string;
  transaction_reference: string;
  transaction_date: string;
  transaction_amount: number;
  transaction_type: TransactionType;
  bank_name?: string;
  account_number?: string;
  description?: string;
  is_reconciled: boolean;
  reconciliation_id?: string;
  imported_by: string;
  imported_at: string;
  created_at: string;
}

export interface PaymentReconciliation {
  id: string;
  payment_id?: string;
  transaction_reference: string;
  transaction_date: string;
  transaction_amount: number;
  match_type: MatchType;
  match_confidence?: number;
  variance_amount: number;
  variance_reason?: string;
  reconciled_by: string;
  reconciled_at: string;
  status: ReconciliationStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ImportTransactionInput {
  transaction_reference: string;
  transaction_date: string;
  transaction_amount: number;
  transaction_type: TransactionType;
  bank_name?: string;
  account_number?: string;
  description?: string;
}

/**
 * Import bank transactions
 */
export async function importBankTransactions(
  transactions: ImportTransactionInput[]
): Promise<{
  success: boolean;
  imported_count?: number;
  duplicate_count?: number;
  error?: string;
}> {
  return measurePerformance('import_bank_transactions', async () => {
    try {
      debugLog('📥 Importing bank transactions', { count: transactions.length });

      let imported_count = 0;
      let duplicate_count = 0;

      for (const transaction of transactions) {
        const { error } = await supabase
          .from('bank_transactions')
          .insert({
            transaction_reference: transaction.transaction_reference,
            transaction_date: transaction.transaction_date,
            transaction_amount: transaction.transaction_amount,
            transaction_type: transaction.transaction_type,
            bank_name: transaction.bank_name,
            account_number: transaction.account_number,
            description: transaction.description,
            is_reconciled: false
          });

        if (error) {
          // Check if it's a duplicate (unique constraint violation)
          if (error.code === '23505') {
            duplicate_count++;
            debugLog('⚠️ Duplicate transaction skipped', transaction.transaction_reference);
          } else {
            debugLog('❌ Import transaction failed', error);
            return { success: false, error: error.message };
          }
        } else {
          imported_count++;
        }
      }

      debugLog('✅ Bank transactions imported', { imported_count, duplicate_count });
      return { 
        success: true, 
        imported_count, 
        duplicate_count 
      };
    } catch (error) {
      handleDatabaseError(error, 'importBankTransactions', { count: transactions.length });
      return { success: false, error: 'Unexpected error occurred' };
    }
  });
}

/**
 * Auto-match payments to bank transactions
 */
export async function autoMatchPayments(): Promise<{
  success: boolean;
  matched_count?: number;
  error?: string;
}> {
  return measurePerformance('auto_match_payments', async () => {
    try {
      debugLog('🔄 Auto-matching payments to transactions');

      // Get unreconciled bank transactions
      const { data: transactions, error: txError } = await supabase
        .from('bank_transactions')
        .select('*')
        .eq('is_reconciled', false)
        .eq('transaction_type', 'credit'); // Only match incoming payments

      if (txError) {
        debugLog('❌ Get unreconciled transactions failed', txError);
        return { success: false, error: txError.message };
      }

      // Get unmatched payments
      const { data: payments, error: payError } = await supabase
        .from('payments')
        .select('*')
        .eq('status', 'completed')
        .is('reference_number', null);

      if (payError) {
        debugLog('❌ Get unmatched payments failed', payError);
        return { success: false, error: payError.message };
      }

      let matched_count = 0;

      // Exact matching: amount and date
      for (const transaction of transactions || []) {
        const matchingPayments = (payments || []).filter(p => 
          Math.abs(p.amount - transaction.transaction_amount) < 0.01 && // Allow 1 cent variance
          new Date(p.created_at).toDateString() === new Date(transaction.transaction_date).toDateString()
        );

        if (matchingPayments.length === 1) {
          // Exact match found
          const payment = matchingPayments[0];
          
          const { error: reconError } = await supabase
            .from('payment_reconciliations')
            .insert({
              payment_id: payment.id,
              transaction_reference: transaction.transaction_reference,
              transaction_date: transaction.transaction_date,
              transaction_amount: transaction.transaction_amount,
              match_type: 'auto_exact',
              match_confidence: 1.0,
              variance_amount: 0,
              status: 'matched'
            });

          if (!reconError) {
            // Mark transaction as reconciled
            await supabase
              .from('bank_transactions')
              .update({ is_reconciled: true })
              .eq('id', transaction.id);

            matched_count++;
            debugLog('✅ Auto-matched payment', { payment_id: payment.id, transaction_ref: transaction.transaction_reference });
          }
        }
      }

      debugLog('✅ Auto-matching completed', { matched_count });
      return { success: true, matched_count };
    } catch (error) {
      handleDatabaseError(error, 'autoMatchPayments', {});
      return { success: false, error: 'Unexpected error occurred' };
    }
  });
}

/**
 * Manual match payment to transaction
 */
export async function manualMatchPayment(
  paymentId: string,
  transactionId: string,
  notes?: string
): Promise<{
  success: boolean;
  reconciliation_id?: string;
  error?: string;
}> {
  return measurePerformance('manual_match_payment', async () => {
    try {
      debugLog('🔗 Manually matching payment to transaction', { paymentId, transactionId });

      // Get transaction details
      const { data: transaction, error: txError } = await supabase
        .from('bank_transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (txError) {
        debugLog('❌ Get transaction failed', txError);
        return { success: false, error: txError.message };
      }

      // Get payment details
      const { data: payment, error: payError } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (payError) {
        debugLog('❌ Get payment failed', payError);
        return { success: false, error: payError.message };
      }

      // Calculate variance
      const variance = Math.abs(payment.amount - transaction.transaction_amount);

      // Create reconciliation
      const { data: reconciliation, error: reconError } = await supabase
        .from('payment_reconciliations')
        .insert({
          payment_id: paymentId,
          transaction_reference: transaction.transaction_reference,
          transaction_date: transaction.transaction_date,
          transaction_amount: transaction.transaction_amount,
          match_type: 'manual',
          match_confidence: 0.8,
          variance_amount: variance,
          variance_reason: variance > 0 ? 'Amount mismatch' : null,
          status: variance > 0 ? 'disputed' : 'matched',
          notes: notes
        })
        .select()
        .single();

      if (reconError) {
        debugLog('❌ Create reconciliation failed', reconError);
        return { success: false, error: reconError.message };
      }

      // Mark transaction as reconciled
      await supabase
        .from('bank_transactions')
        .update({ 
          is_reconciled: true,
          reconciliation_id: reconciliation.id
        })
        .eq('id', transactionId);

      debugLog('✅ Manual match completed', { reconciliation_id: reconciliation.id });
      return { success: true, reconciliation_id: reconciliation.id };
    } catch (error) {
      handleDatabaseError(error, 'manualMatchPayment', { paymentId, transactionId });
      return { success: false, error: 'Unexpected error occurred' };
    }
  });
}

/**
 * Get unmatched bank transactions
 */
export async function getUnmatchedTransactions(): Promise<{
  success: boolean;
  transactions?: BankTransaction[];
  error?: string;
}> {
  try {
    debugLog('📋 Fetching unmatched transactions');

    const { data, error } = await supabase
      .from('bank_transactions')
      .select('*')
      .eq('is_reconciled', false)
      .order('transaction_date', { ascending: false });

    if (error) {
      debugLog('❌ Get unmatched transactions failed', error);
      return { success: false, error: error.message };
    }

    debugLog('✅ Unmatched transactions retrieved', { count: data?.length || 0 });
    return { success: true, transactions: data as BankTransaction[] || [] };
  } catch (error) {
    handleDatabaseError(error, 'getUnmatchedTransactions', {});
    return { success: false, error: 'Unexpected error occurred' };
  }
}

/**
 * Get unmatched payments
 */
export async function getUnmatchedPayments(): Promise<{
  success: boolean;
  payments?: any[];
  error?: string;
}> {
  try {
    debugLog('📋 Fetching unmatched payments');

    // Get payments that don't have a reconciliation
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        loan:loans(
          id,
          user_id,
          amount
        )
      `)
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    if (error) {
      debugLog('❌ Get unmatched payments failed', error);
      return { success: false, error: error.message };
    }

    // Filter out payments that have reconciliations
    const { data: reconciliations } = await supabase
      .from('payment_reconciliations')
      .select('payment_id');

    const reconciledIds = new Set((reconciliations || []).map(r => r.payment_id));
    const unmatchedPayments = (data || []).filter(p => !reconciledIds.has(p.id));

    debugLog('✅ Unmatched payments retrieved', { count: unmatchedPayments.length });
    return { success: true, payments: unmatchedPayments };
  } catch (error) {
    handleDatabaseError(error, 'getUnmatchedPayments', {});
    return { success: false, error: 'Unexpected error occurred' };
  }
}

/**
 * Get reconciliation report
 */
export async function getReconciliationReport(
  startDate?: string,
  endDate?: string
): Promise<{
  success: boolean;
  report?: {
    total_transactions: number;
    reconciled_transactions: number;
    unreconciled_transactions: number;
    total_amount: number;
    reconciled_amount: number;
    variance_amount: number;
  };
  error?: string;
}> {
  try {
    debugLog('📊 Generating reconciliation report', { startDate, endDate });

    let query = supabase
      .from('bank_transactions')
      .select('*');

    if (startDate) {
      query = query.gte('transaction_date', startDate);
    }
    if (endDate) {
      query = query.lte('transaction_date', endDate);
    }

    const { data: transactions, error } = await query;

    if (error) {
      debugLog('❌ Get transactions for report failed', error);
      return { success: false, error: error.message };
    }

    const total_transactions = transactions?.length || 0;
    const reconciled_transactions = transactions?.filter(t => t.is_reconciled).length || 0;
    const unreconciled_transactions = total_transactions - reconciled_transactions;
    const total_amount = transactions?.reduce((sum, t) => sum + Number(t.transaction_amount), 0) || 0;
    const reconciled_amount = transactions?.filter(t => t.is_reconciled)
      .reduce((sum, t) => sum + Number(t.transaction_amount), 0) || 0;

    // Get variance from reconciliations
    const { data: reconciliations } = await supabase
      .from('payment_reconciliations')
      .select('variance_amount');

    const variance_amount = reconciliations?.reduce((sum, r) => sum + Number(r.variance_amount), 0) || 0;

    const report = {
      total_transactions,
      reconciled_transactions,
      unreconciled_transactions,
      total_amount,
      reconciled_amount,
      variance_amount
    };

    debugLog('✅ Reconciliation report generated', report);
    return { success: true, report };
  } catch (error) {
    handleDatabaseError(error, 'getReconciliationReport', { startDate, endDate });
    return { success: false, error: 'Unexpected error occurred' };
  }
}

// Export all functions
export default {
  importBankTransactions,
  autoMatchPayments,
  manualMatchPayment,
  getUnmatchedTransactions,
  getUnmatchedPayments,
  getReconciliationReport
};
