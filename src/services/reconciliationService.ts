import { supabase } from '@/integrations/supabase/client';
import { debugLog } from '@/utils/debug';
import { handleDatabaseError, measurePerformance } from '@/utils/errorHandler';
import { PaymentWithLoan } from '@/types/services';

export type ReconciliationStatus = 'matched' | 'unmatched' | 'disputed' | 'excluded' | 'duplicate';
export type TransactionType = 'credit' | 'debit';

export interface BankTransaction {
  id: string;
  external_id: string;
  amount: number;
  transaction_date: string;
  transaction_type: TransactionType;
  reference?: string;
  description?: string;
  source: string;
  status: ReconciliationStatus;
  reconciliation_run_id?: string | null;
  matched_payment_id?: string | null;
  matched_at?: string | null;
  matched_by?: string | null;
  match_notes?: string | null;
  match_confidence?: number | null;
  imported_by?: string | null;
  imported_at: string;
  created_at: string;
  updated_at: string;
}

export interface ImportTransactionInput {
  external_id: string;
  amount: number;
  transaction_date: string;
  transaction_type: TransactionType;
  reference?: string;
  description?: string;
  source?: string;
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
            external_id: transaction.external_id,
            amount: transaction.amount,
            transaction_date: transaction.transaction_date,
            transaction_type: transaction.transaction_type,
            reference: transaction.reference,
            description: transaction.description,
            source: transaction.source || 'csv',
            status: 'unmatched'
          });

        if (error) {
          // Check if it's a duplicate (unique constraint violation)
          if (error.code === '23505') {
            duplicate_count++;
            debugLog('⚠️ Duplicate transaction skipped', transaction.external_id);
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

      // Get unmatched bank transactions (credits only)
      const { data: transactions, error: txError } = await supabase
        .from('bank_transactions')
        .select('*')
        .eq('status', 'unmatched')
        .eq('transaction_type', 'credit');

      if (txError) {
        debugLog('❌ Get unreconciled transactions failed', txError);
        return { success: false, error: txError.message };
      }

      // Get unmatched payments
      const { data: payments, error: payError } = await supabase
        .from('payments')
        .select('*')
        .in('status', ['pending', 'completed'])
        .is('bank_transaction_id', null);

      if (payError) {
        debugLog('❌ Get unmatched payments failed', payError);
        return { success: false, error: payError.message };
      }

      let matched_count = 0;

      // Exact matching: amount and date
      const { data: { user } } = await supabase.auth.getUser();
      const matchedBy = user?.id || null;

      for (const transaction of transactions || []) {
        const txnRef = transaction.reference || transaction.external_id;
        const matchingPayments = (payments || []).filter(p => {
          const amountMatches = Math.abs(p.amount - transaction.amount) < 0.01;
          const dateMatches =
            new Date(p.created_at).toDateString() === new Date(transaction.transaction_date).toDateString();
          const refMatches = txnRef ? p.reference_number === txnRef : false;
          return amountMatches && (refMatches || dateMatches);
        });

        if (matchingPayments.length === 1) {
          const payment = matchingPayments[0];
          const now = new Date().toISOString();

          const { error: updateError } = await supabase
            .from('bank_transactions')
            .update({
              status: 'matched',
              matched_payment_id: payment.id,
              matched_at: now,
              matched_by: matchedBy,
              match_confidence: 100
            })
            .eq('id', transaction.id);

          if (!updateError) {
            await supabase
              .from('payments')
              .update({ bank_transaction_id: transaction.id })
              .eq('id', payment.id);

            matched_count++;
            debugLog('✅ Auto-matched payment', { payment_id: payment.id, transaction_ref: txnRef });
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
  transaction_id?: string;
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

      const variance = Math.abs(payment.amount - transaction.amount);
      const { data: { user } } = await supabase.auth.getUser();
      const now = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('bank_transactions')
        .update({
          status: variance > 0 ? 'disputed' : 'matched',
          matched_payment_id: paymentId,
          matched_at: now,
          matched_by: user?.id || null,
          match_notes: notes || null,
          match_confidence: variance > 0 ? 80 : 100
        })
        .eq('id', transactionId);

      if (updateError) {
        debugLog('❌ Manual match update failed', updateError);
        return { success: false, error: updateError.message };
      }

      await supabase
        .from('payments')
        .update({ bank_transaction_id: transactionId })
        .eq('id', paymentId);

      debugLog('✅ Manual match completed', { transaction_id: transactionId, payment_id: paymentId });
      return { success: true, transaction_id: transactionId };
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
      .eq('status', 'unmatched')
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
  payments?: PaymentWithLoan[];
  error?: string;
}> {
  try {
    debugLog('📋 Fetching unmatched payments');

    // Get payments that don't have a bank transaction match
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
      .is('bank_transaction_id', null)
      .order('created_at', { ascending: false });

    if (error) {
      debugLog('❌ Get unmatched payments failed', error);
      return { success: false, error: error.message };
    }

    debugLog('✅ Unmatched payments retrieved', { count: data?.length || 0 });
    return { success: true, payments: data || [] };
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
    const reconciled_transactions = transactions?.filter(t => t.status === 'matched').length || 0;
    const unreconciled_transactions = total_transactions - reconciled_transactions;
    const total_amount = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    const reconciled_amount = transactions?.filter(t => t.status === 'matched')
      .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    // Compute variance by comparing matched transactions to payment amounts
    const matchedPaymentIds = (transactions || [])
      .filter(t => t.matched_payment_id)
      .map(t => t.matched_payment_id as string);

    let variance_amount = 0;
    if (matchedPaymentIds.length > 0) {
      const { data: matchedPayments } = await supabase
        .from('payments')
        .select('id, amount')
        .in('id', matchedPaymentIds);

      const paymentMap = new Map((matchedPayments || []).map(p => [p.id, p.amount]));
      variance_amount = (transactions || [])
        .filter(t => t.matched_payment_id)
        .reduce((sum, t) => {
          const paymentAmount = paymentMap.get(t.matched_payment_id as string) || 0;
          return sum + Math.abs(Number(t.amount) - Number(paymentAmount));
        }, 0);
    }

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
