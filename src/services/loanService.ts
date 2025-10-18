import { supabase } from '@/integrations/supabase/client';
import { debugLog } from '@/utils/debug';
import { handleDatabaseError, measurePerformance } from '@/utils/errorHandler';

export type LoanStatus = 'pending' | 'approved' | 'rejected' | 'disbursed';

export interface GetLoanByIdInput { loanId: string }
export interface UpdateLoanStatusInput { loanId: string; status: LoanStatus }
export interface CreateDisbursementInput {
  loanId: string;
  amount: number;
  method?: string;
  scheduled_at?: string; // ISO string
}

export async function getLoanById(
  { loanId }: GetLoanByIdInput
): Promise<{ success: boolean; loan?: any; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('loans')
      .select('*')
      .eq('id', loanId)
      .single();

    if (error) {
      debugLog('❌ getLoanById error', error);
      return { success: false, error: error.message };
    }

    return { success: true, loan: data };
  } catch (error) {
    handleDatabaseError(error, 'getLoanById', { loanId });
    return { success: false, error: 'Unexpected error occurred' };
  }
}

export async function updateLoanStatus(
  { loanId, status }: UpdateLoanStatusInput
): Promise<{ success: boolean; error?: string }> {
  return measurePerformance('update_loan_status', async () => {
    try {
      const { error } = await supabase
        .from('loans')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', loanId);

      if (error) {
        debugLog('❌ updateLoanStatus error', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      handleDatabaseError(error, 'updateLoanStatus', { loanId, status });
      return { success: false, error: 'Unexpected error occurred' };
    }
  });
}

export async function createDisbursement(
  { loanId, amount, method, scheduled_at }: CreateDisbursementInput
): Promise<{ success: boolean; disbursementId?: string; error?: string }> {
  return measurePerformance('create_disbursement', async () => {
    try {
      const payload: any = { loan_id: loanId, amount, status: 'pending' as const };
      if (method) payload.method = method;
      if (scheduled_at) payload.scheduled_at = scheduled_at;

      const { data, error } = await supabase
        .from('disbursements')
        .insert([payload])
        .select('id')
        .single();

      if (error) {
        debugLog('❌ createDisbursement error', error);
        return { success: false, error: error.message };
      }

      return { success: true, disbursementId: data.id };
    } catch (error) {
      handleDatabaseError(error, 'createDisbursement', { loanId, amount });
      return { success: false, error: 'Unexpected error occurred' };
    }
  });
}
