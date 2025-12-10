import { supabase } from '@/integrations/supabase/client';
import { debugLog } from '@/utils/debug';
import { handleDatabaseError, measurePerformance } from '@/utils/errorHandler';

export type PaymentStatus = 'pending' | 'completed' | 'failed';
export type ScheduleStatus = 'pending' | 'paid' | 'partially_paid' | 'overdue' | 'waived';
export type LoanStatus = 'pending' | 'approved' | 'disbursed' | 'active' | 'funded' | 'settled' | 'defaulted' | 'rejected';

export interface ListPaymentsFilter { loanId?: string; status?: PaymentStatus }
export interface RecordPaymentInput {
  loanId: string;
  amount: number;
  payment_method: string;
  reference_number?: string;
  notes?: string;
}

export interface PaymentSchedule {
  id: string;
  loan_id: string;
  installment_number: number;
  due_date: string;
  principal_amount: number;
  interest_amount: number;
  fee_amount: number;
  late_fee_applied: number;
  total_amount: number;
  amount_paid: number;
  balance: number;
  status: ScheduleStatus;
  paid_at?: string;
  days_overdue: number;
}

export async function listPayments(
  filters?: ListPaymentsFilter
): Promise<{ success: boolean; payments?: any[]; error?: string }> {
  try {
    let query = supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.loanId) query = query.eq('loan_id', filters.loanId);
    if (filters?.status) query = query.eq('status', filters.status);

    const { data, error } = await query;

    if (error) {
      debugLog('❌ listPayments error', error);
      return { success: false, error: error.message };
    }

    return { success: true, payments: data || [] };
  } catch (error) {
    handleDatabaseError(error, 'listPayments', { filters });
    return { success: false, error: 'Unexpected error occurred' };
  }
}

export interface ProcessPaymentResult {
  success: boolean;
  payment_id?: string;
  reference_number?: string;
  amount_paid?: number;
  amount_applied?: number;
  overpayment?: number;
  schedules_updated?: number;
  previous_outstanding?: number;
  new_outstanding?: number;
  loan_settled?: boolean;
  settlement_details?: {
    settled: boolean;
    settled_at?: string;
    total_paid?: number;
    outstanding_balance?: number;
  };
  error?: string;
}

/**
 * Process a loan payment with automatic schedule application and settlement detection
 */
export async function processLoanPayment(
  input: RecordPaymentInput
): Promise<ProcessPaymentResult> {
  return measurePerformance('process_loan_payment', async () => {
    try {
      debugLog('💰 Processing loan payment', { loanId: input.loanId, amount: input.amount });

      const { data, error } = await supabase.rpc('process_loan_payment', {
        p_loan_id: input.loanId,
        p_amount: input.amount,
        p_payment_method: input.payment_method,
        p_reference_number: input.reference_number || null,
        p_notes: input.notes || null
      });

      if (error) {
        debugLog('❌ Process loan payment failed', error);
        return { success: false, error: error.message };
      }

      const result = data as ProcessPaymentResult;
      
      if (!result.success) {
        debugLog('❌ Payment processing returned error', result.error);
        return result;
      }

      debugLog('✅ Payment processed successfully', {
        paymentId: result.payment_id,
        amountApplied: result.amount_applied,
        newOutstanding: result.new_outstanding,
        loanSettled: result.loan_settled
      });

      return result;
    } catch (error) {
      handleDatabaseError(error, 'processLoanPayment', { input });
      return { success: false, error: 'Unexpected error occurred' };
    }
  });
}

/**
 * Legacy recordPayment function - now uses processLoanPayment internally
 */
export async function recordPayment(
  input: RecordPaymentInput
): Promise<{ success: boolean; paymentId?: string; error?: string }> {
  const result = await processLoanPayment(input);
  return {
    success: result.success,
    paymentId: result.payment_id,
    error: result.error
  };
}

/**
 * Generate payment schedule for a loan
 */
export async function generatePaymentSchedule(
  loanId: string
): Promise<{
  success: boolean;
  loan_id?: string;
  installments_created?: number;
  error?: string;
}> {
  return measurePerformance('generate_payment_schedule', async () => {
    try {
      debugLog('📅 Generating payment schedule', { loanId });

      const { data, error } = await supabase.rpc('generate_payment_schedule', {
        p_loan_id: loanId
      });

      if (error) {
        debugLog('❌ Generate payment schedule failed', error);
        return { success: false, error: error.message };
      }

      const result = data as any;
      debugLog('✅ Payment schedule generated', result);
      return result;
    } catch (error) {
      handleDatabaseError(error, 'generatePaymentSchedule', { loanId });
      return { success: false, error: 'Unexpected error occurred' };
    }
  });
}

/**
 * Get payment schedule for a loan
 */
export async function getPaymentSchedule(
  loanId: string
): Promise<{
  success: boolean;
  schedule?: PaymentSchedule[];
  error?: string;
}> {
  return measurePerformance('get_payment_schedule', async () => {
    try {
      debugLog('📋 Fetching payment schedule', { loanId });

      const { data, error } = await supabase.rpc('get_payment_schedule', {
        p_loan_id: loanId
      });

      if (error) {
        debugLog('❌ Get payment schedule failed', error);
        return { success: false, error: error.message };
      }

      debugLog('✅ Payment schedule retrieved', { count: data?.length || 0 });
      return { 
        success: true, 
        schedule: data as PaymentSchedule[] || [] 
      };
    } catch (error) {
      handleDatabaseError(error, 'getPaymentSchedule', { loanId });
      return { success: false, error: 'Unexpected error occurred' };
    }
  });
}

/**
 * Apply payment to schedule
 */
export async function applyPaymentToSchedule(
  paymentId: string,
  amount: number
): Promise<{
  success: boolean;
  payment_id?: string;
  amount_applied?: number;
  schedules_updated?: number;
  remaining_amount?: number;
  error?: string;
}> {
  return measurePerformance('apply_payment_to_schedule', async () => {
    try {
      debugLog('💰 Applying payment to schedule', { paymentId, amount });

      const { data, error } = await supabase.rpc('apply_payment_to_schedule', {
        p_payment_id: paymentId,
        p_amount: amount
      });

      if (error) {
        debugLog('❌ Apply payment to schedule failed', error);
        return { success: false, error: error.message };
      }

      const result = data as any;
      debugLog('✅ Payment applied to schedule', result);
      return result;
    } catch (error) {
      handleDatabaseError(error, 'applyPaymentToSchedule', { paymentId, amount });
      return { success: false, error: 'Unexpected error occurred' };
    }
  });
}

/**
 * Mark overdue payments (scheduled job)
 */
export async function markOverduePayments(): Promise<{
  success: boolean;
  schedules_marked?: number;
  processed_at?: string;
  error?: string;
}> {
  return measurePerformance('mark_overdue_payments', async () => {
    try {
      debugLog('⏰ Marking overdue payments');

      const { data, error } = await supabase.rpc('mark_overdue_payments');

      if (error) {
        debugLog('❌ Mark overdue payments failed', error);
        return { success: false, error: error.message };
      }

      const result = data as any;
      debugLog('✅ Overdue payments marked', result);
      return result;
    } catch (error) {
      handleDatabaseError(error, 'markOverduePayments', {});
      return { success: false, error: 'Unexpected error occurred' };
    }
  });
}

/**
 * Calculate late fee for a schedule
 */
export async function calculateLateFee(
  scheduleId: string
): Promise<{
  success: boolean;
  late_fee?: number;
  days_overdue?: number;
  outstanding_balance?: number;
  calculation_method?: string;
  max_fee_cap?: number;
  message?: string;
  error?: string;
}> {
  return measurePerformance('calculate_late_fee', async () => {
    try {
      debugLog('🧮 Calculating late fee', { scheduleId });

      const { data, error } = await supabase.rpc('calculate_late_fee', {
        p_schedule_id: scheduleId
      });

      if (error) {
        debugLog('❌ Calculate late fee failed', error);
        return { success: false, error: error.message };
      }

      const result = data as any;
      debugLog('✅ Late fee calculated', result);
      return result;
    } catch (error) {
      handleDatabaseError(error, 'calculateLateFee', { scheduleId });
      return { success: false, error: 'Unexpected error occurred' };
    }
  });
}

/**
 * Waive late fee
 */
export async function waiveLateFee(
  lateFeeId: string,
  reason: string
): Promise<{
  success: boolean;
  late_fee_id?: string;
  fee_amount?: number;
  message?: string;
  error?: string;
}> {
  return measurePerformance('waive_late_fee', async () => {
    try {
      debugLog('🎁 Waiving late fee', { lateFeeId, reason });

      const { data, error } = await supabase.rpc('waive_late_fee', {
        p_late_fee_id: lateFeeId,
        p_reason: reason
      });

      if (error) {
        debugLog('❌ Waive late fee failed', error);
        return { success: false, error: error.message };
      }

      const result = data as any;
      debugLog('✅ Late fee waived', result);
      return result;
    } catch (error) {
      handleDatabaseError(error, 'waiveLateFee', { lateFeeId, reason });
      return { success: false, error: 'Unexpected error occurred' };
    }
  });
}

/**
 * Get comprehensive loan payment details including schedules and history
 */
export interface LoanPaymentDetails {
  success: boolean;
  loan?: {
    id: string;
    amount: number;
    interest_rate: number;
    term_months: number;
    monthly_payment: number;
    total_repayment: number;
    status: LoanStatus;
    disbursed_at?: string;
    settled_at?: string;
    purpose?: string;
  };
  summary?: {
    total_scheduled: number;
    total_paid: number;
    outstanding_balance: number;
    installments_paid: number;
    installments_remaining: number;
    total_installments: number;
    next_due_date?: string;
    overdue_amount: number;
    is_settled: boolean;
  };
  schedules?: PaymentSchedule[];
  payments?: Array<{
    id: string;
    amount: number;
    payment_method: string;
    reference_number?: string;
    status: PaymentStatus;
    paid_at?: string;
    notes?: string;
  }>;
  error?: string;
}

export async function getLoanPaymentDetails(
  loanId: string
): Promise<LoanPaymentDetails> {
  return measurePerformance('get_loan_payment_details', async () => {
    try {
      debugLog('📋 Fetching loan payment details', { loanId });

      const { data, error } = await supabase.rpc('get_loan_payment_details', {
        p_loan_id: loanId
      });

      if (error) {
        debugLog('❌ Get loan payment details failed', error);
        return { success: false, error: error.message };
      }

      const result = data as LoanPaymentDetails;
      debugLog('✅ Loan payment details retrieved', { 
        loanId,
        outstanding: result.summary?.outstanding_balance,
        isSettled: result.summary?.is_settled
      });

      return result;
    } catch (error) {
      handleDatabaseError(error, 'getLoanPaymentDetails', { loanId });
      return { success: false, error: 'Unexpected error occurred' };
    }
  });
}

/**
 * Get user's loan portfolio summary
 */
export interface LoanPortfolioSummary {
  success: boolean;
  user_id?: string;
  portfolio?: {
    total_loans: number;
    active_loans: number;
    settled_loans: number;
    total_borrowed: number;
    total_paid: number;
    total_outstanding: number;
    next_payment_due?: string;
  };
  loans?: Array<{
    loan_id: string;
    principal_amount: number;
    total_repayment: number;
    monthly_payment: number;
    status: LoanStatus;
    total_paid: number;
    outstanding_balance: number;
    installments_paid: number;
    installments_remaining: number;
    total_installments: number;
    next_due_date?: string;
    next_payment_amount: number;
    disbursed_at?: string;
    settled_at?: string;
    progress_percent: number;
  }>;
  error?: string;
}

export async function getLoanPortfolioSummary(
  userId?: string
): Promise<LoanPortfolioSummary> {
  return measurePerformance('get_loan_portfolio_summary', async () => {
    try {
      debugLog('📊 Fetching loan portfolio summary', { userId });

      const { data, error } = await supabase.rpc('get_loan_portfolio_summary', {
        p_user_id: userId || null
      });

      if (error) {
        debugLog('❌ Get loan portfolio summary failed', error);
        return { success: false, error: error.message };
      }

      const result = data as LoanPortfolioSummary;
      debugLog('✅ Loan portfolio summary retrieved', {
        totalLoans: result.portfolio?.total_loans,
        activeLoans: result.portfolio?.active_loans,
        totalOutstanding: result.portfolio?.total_outstanding
      });

      return result;
    } catch (error) {
      handleDatabaseError(error, 'getLoanPortfolioSummary', { userId });
      return { success: false, error: 'Unexpected error occurred' };
    }
  });
}

/**
 * Check if a loan can be settled with a given payment amount
 */
export async function checkSettlementAmount(
  loanId: string
): Promise<{
  success: boolean;
  outstanding_balance?: number;
  can_settle?: boolean;
  error?: string;
}> {
  try {
    const details = await getLoanPaymentDetails(loanId);
    
    if (!details.success) {
      return { success: false, error: details.error };
    }

    return {
      success: true,
      outstanding_balance: details.summary?.outstanding_balance || 0,
      can_settle: (details.summary?.outstanding_balance || 0) > 0
    };
  } catch (error) {
    return { success: false, error: 'Failed to check settlement amount' };
  }
}

// Export all functions
export default {
  listPayments,
  recordPayment,
  processLoanPayment,
  generatePaymentSchedule,
  getPaymentSchedule,
  applyPaymentToSchedule,
  markOverduePayments,
  calculateLateFee,
  waiveLateFee,
  getLoanPaymentDetails,
  getLoanPortfolioSummary,
  checkSettlementAmount
};
