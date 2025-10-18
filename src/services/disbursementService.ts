import { supabase } from '@/integrations/supabase/client';
import { debugLog } from '@/utils/debug';
import { handleDatabaseError, measurePerformance } from '@/utils/errorHandler';

export type DisbursementStatus = 'pending' | 'approved' | 'processing' | 'completed' | 'failed';

export interface Disbursement {
  id: string;
  loan_id: string;
  client_name: string; // From RPC get_pending_disbursements
  amount: number;
  status: DisbursementStatus;
  method: string;
  reference: string;
  payment_reference?: string;
  scheduled_at: string;
  processed_at?: string;
  processing_notes?: string;
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

export interface DisbursementResult {
  success: boolean;
  disbursement_id?: string;
  loan_id?: string;
  amount?: number;
  status?: string;
  payment_reference?: string;
  message?: string;
  error?: string;
}

/**
 * Create disbursement request on loan approval
 */
export async function createDisbursementOnApproval(
  loanId: string
): Promise<DisbursementResult> {
  return measurePerformance('create_disbursement_on_approval', async () => {
    try {
      debugLog('🏦 Creating disbursement for loan', { loanId });

      const { data, error } = await supabase.rpc('create_disbursement_on_approval', {
        p_loan_id: loanId
      });

      if (error) {
        debugLog('❌ Create disbursement failed', error);
        return { success: false, error: error.message };
      }

      const result = data as DisbursementResult;
      
      if (!result.success) {
        debugLog('❌ Create disbursement returned error', result);
        return result;
      }

      debugLog('✅ Disbursement created successfully', result);
      return result;
    } catch (error) {
      handleDatabaseError(error, 'createDisbursementOnApproval', { loanId });
      return { success: false, error: 'Unexpected error occurred' };
    }
  });
}

/**
 * Approve disbursement for processing
 */
export async function approveDisbursement(
  disbursementId: string,
  notes?: string
): Promise<DisbursementResult> {
  return measurePerformance('approve_disbursement', async () => {
    try {
      debugLog('✅ Approving disbursement', { disbursementId, notes });

      const { data, error } = await supabase.rpc('approve_disbursement', {
        p_disbursement_id: disbursementId,
        p_notes: notes || null
      });

      if (error) {
        debugLog('❌ Approve disbursement failed', error);
        return { success: false, error: error.message };
      }

      const result = data as DisbursementResult;
      debugLog('✅ Disbursement approved', result);
      return result;
    } catch (error) {
      handleDatabaseError(error, 'approveDisbursement', { disbursementId });
      return { success: false, error: 'Unexpected error occurred' };
    }
  });
}

/**
 * Mark disbursement as processing
 */
export async function markDisbursementProcessing(
  disbursementId: string,
  notes?: string
): Promise<DisbursementResult> {
  return measurePerformance('mark_disbursement_processing', async () => {
    try {
      debugLog('⏳ Marking disbursement as processing', { disbursementId });

      const { data, error } = await supabase.rpc('mark_disbursement_processing', {
        p_disbursement_id: disbursementId,
        p_notes: notes || null
      });

      if (error) {
        debugLog('❌ Mark processing failed', error);
        return { success: false, error: error.message };
      }

      const result = data as DisbursementResult;
      debugLog('✅ Disbursement marked as processing', result);
      return result;
    } catch (error) {
      handleDatabaseError(error, 'markDisbursementProcessing', { disbursementId });
      return { success: false, error: 'Unexpected error occurred' };
    }
  });
}

/**
 * Complete disbursement with manual payment reference
 * This is the key function for manual payment processing
 */
export async function completeDisbursement(
  disbursementId: string,
  paymentReference: string,
  notes?: string
): Promise<DisbursementResult> {
  return measurePerformance('complete_disbursement', async () => {
    try {
      debugLog('✅ Completing disbursement with payment reference', { 
        disbursementId, 
        paymentReference 
      });

      // Validate payment reference
      if (!paymentReference || paymentReference.trim() === '') {
        return { 
          success: false, 
          error: 'Payment reference is required' 
        };
      }

      const { data, error } = await supabase.rpc('complete_disbursement', {
        p_disbursement_id: disbursementId,
        p_payment_reference: paymentReference.trim(),
        p_notes: notes || null
      });

      if (error) {
        debugLog('❌ Complete disbursement failed', error);
        return { success: false, error: error.message };
      }

      const result = data as DisbursementResult;
      
      if (!result.success) {
        debugLog('❌ Complete disbursement returned error', result);
        return result;
      }

      debugLog('✅ Disbursement completed successfully', result);
      return result;
    } catch (error) {
      handleDatabaseError(error, 'completeDisbursement', { disbursementId, paymentReference });
      return { success: false, error: 'Unexpected error occurred' };
    }
  });
}

/**
 * Mark disbursement as failed
 */
export async function failDisbursement(
  disbursementId: string,
  reason: string
): Promise<DisbursementResult> {
  return measurePerformance('fail_disbursement', async () => {
    try {
      debugLog('❌ Marking disbursement as failed', { disbursementId, reason });

      if (!reason || reason.trim() === '') {
        return { 
          success: false, 
          error: 'Failure reason is required' 
        };
      }

      const { data, error } = await supabase.rpc('fail_disbursement', {
        p_disbursement_id: disbursementId,
        p_reason: reason
      });

      if (error) {
        debugLog('❌ Fail disbursement failed', error);
        return { success: false, error: error.message };
      }

      const result = data as DisbursementResult;
      debugLog('✅ Disbursement marked as failed', result);
      return result;
    } catch (error) {
      handleDatabaseError(error, 'failDisbursement', { disbursementId, reason });
      return { success: false, error: 'Unexpected error occurred' };
    }
  });
}

/**
 * Get pending disbursements queue
 */
export async function getPendingDisbursements(): Promise<{
  success: boolean;
  disbursements?: Disbursement[];
  error?: string;
}> {
  return measurePerformance('get_pending_disbursements', async () => {
    try {
      debugLog('📋 Fetching pending disbursements');

      const { data, error } = await supabase.rpc('get_pending_disbursements');

      if (error) {
        debugLog('❌ Get pending disbursements failed', error);
        return { success: false, error: error.message };
      }

      debugLog('✅ Pending disbursements retrieved', { count: data?.length || 0 });
      return { 
        success: true, 
        disbursements: data as Disbursement[] || [] 
      };
    } catch (error) {
      handleDatabaseError(error, 'getPendingDisbursements', {});
      return { success: false, error: 'Unexpected error occurred' };
    }
  });
}

/**
 * Get disbursement details by ID
 */
export async function getDisbursementById(
  disbursementId: string
): Promise<{
  success: boolean;
  disbursement?: Disbursement;
  error?: string;
}> {
  try {
    debugLog('🔍 Fetching disbursement by ID', { disbursementId });

    const { data, error } = await supabase
      .from('disbursements')
      .select('*')
      .eq('id', disbursementId)
      .single();

    if (error) {
      debugLog('❌ Get disbursement failed', error);
      return { success: false, error: error.message };
    }

    debugLog('✅ Disbursement retrieved', data);
    return { success: true, disbursement: data as Disbursement };
  } catch (error) {
    handleDatabaseError(error, 'getDisbursementById', { disbursementId });
    return { success: false, error: 'Unexpected error occurred' };
  }
}

/**
 * Get disbursements for a specific loan
 */
export async function getDisbursementsForLoan(
  loanId: string
): Promise<{
  success: boolean;
  disbursements?: Disbursement[];
  error?: string;
}> {
  try {
    debugLog('📋 Fetching disbursements for loan', { loanId });

    const { data, error } = await supabase
      .from('disbursements')
      .select('*')
      .eq('loan_id', loanId)
      .order('created_at', { ascending: false });

    if (error) {
      debugLog('❌ Get disbursements for loan failed', error);
      return { success: false, error: error.message };
    }

    debugLog('✅ Disbursements retrieved', { count: data?.length || 0 });
    return { success: true, disbursements: data as Disbursement[] || [] };
  } catch (error) {
    handleDatabaseError(error, 'getDisbursementsForLoan', { loanId });
    return { success: false, error: 'Unexpected error occurred' };
  }
}

// Export all functions
export default {
  createDisbursementOnApproval,
  approveDisbursement,
  markDisbursementProcessing,
  completeDisbursement,
  failDisbursement,
  getPendingDisbursements,
  getDisbursementById,
  getDisbursementsForLoan
};
