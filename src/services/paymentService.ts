import { supabase } from '@/integrations/supabase/client';
import { debugLog } from '@/utils/debug';
import { handleDatabaseError, measurePerformance } from '@/utils/errorHandler';

export type PaymentStatus = 'pending' | 'completed' | 'failed';
export type ScheduleStatus = 'pending' | 'paid' | 'partially_paid' | 'overdue' | 'waived';

export interface ListPaymentsFilter { loanId?: string; status?: PaymentStatus }
export interface RecordPaymentInput {
  loanId: string;
  amount: number;
  payment_method: string;
  reference_number?: string;
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

export async function recordPayment(
  input: RecordPaymentInput
): Promise<{ success: boolean; paymentId?: string; error?: string }> {
  return measurePerformance('record_payment', async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .insert([
          {
            loan_id: input.loanId,
            amount: input.amount,
            payment_method: input.payment_method,
            reference_number: input.reference_number,
            status: 'pending'
          }
        ])
        .select('id')
        .single();

      if (error) {
        debugLog('❌ recordPayment error', error);
        return { success: false, error: error.message };
      }

      return { success: true, paymentId: data.id };
    } catch (error) {
      handleDatabaseError(error, 'recordPayment', { input });
      return { success: false, error: 'Unexpected error occurred' };
    }
  });
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

// Export all functions
export default {
  listPayments,
  recordPayment,
  generatePaymentSchedule,
  getPaymentSchedule,
  applyPaymentToSchedule,
  markOverduePayments,
  calculateLateFee,
  waiveLateFee
};
