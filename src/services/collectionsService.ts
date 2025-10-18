import { supabase } from '@/integrations/supabase/client';
import { debugLog } from '@/utils/debug';
import { handleDatabaseError, measurePerformance } from '@/utils/errorHandler';

export type ActivityType = 
  | 'call_attempt' 
  | 'sms_sent' 
  | 'email_sent' 
  | 'promise_to_pay'
  | 'payment_received' 
  | 'escalation' 
  | 'legal_notice' 
  | 'note'
  | 'field_visit' 
  | 'letter_sent' 
  | 'whatsapp_sent';

export type ActivityStatus = 'completed' | 'pending' | 'failed' | 'scheduled';

export type ContactMethod = 'phone' | 'sms' | 'email' | 'in_person' | 'letter' | 'whatsapp';

export interface CollectionQueueItem {
  loan_id: string;
  user_id: string;
  client_name: string;
  phone_number: string;
  email: string;
  total_overdue: number;
  days_overdue: number;
  priority_score: number;
  last_contact_date?: string;
  last_contact_type?: string;
  promise_date?: string;
  promise_amount?: number;
  overdue_installments: number;
}

export interface CollectionActivity {
  id: string;
  loan_id: string;
  activity_type: ActivityType;
  activity_status: ActivityStatus;
  contact_method?: ContactMethod;
  outcome?: string;
  notes?: string;
  promise_date?: string;
  promise_amount?: number;
  promise_fulfilled: boolean;
  next_action_date?: string;
  next_action_type?: string;
  assigned_to?: string;
  agent_name?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface RecordActivityInput {
  loan_id: string;
  activity_type: ActivityType;
  contact_method?: ContactMethod;
  outcome?: string;
  notes?: string;
  promise_date?: string;
  promise_amount?: number;
  next_action_date?: string;
  next_action_type?: string;
}

/**
 * Generate prioritized collection queue
 */
export async function generateCollectionQueue(): Promise<{
  success: boolean;
  queue?: CollectionQueueItem[];
  error?: string;
}> {
  return measurePerformance('generate_collection_queue', async () => {
    try {
      debugLog('📊 Generating collection queue');

      const { data, error } = await supabase.rpc('generate_collection_queue');

      if (error) {
        debugLog('❌ Generate collection queue failed', error);
        return { success: false, error: error.message };
      }

      debugLog('✅ Collection queue generated', { count: data?.length || 0 });
      return { 
        success: true, 
        queue: data as CollectionQueueItem[] || [] 
      };
    } catch (error) {
      handleDatabaseError(error, 'generateCollectionQueue', {});
      return { success: false, error: 'Unexpected error occurred' };
    }
  });
}

/**
 * Record a collection activity
 */
export async function recordCollectionActivity(
  input: RecordActivityInput
): Promise<{
  success: boolean;
  activity_id?: string;
  loan_id?: string;
  activity_type?: string;
  error?: string;
}> {
  return measurePerformance('record_collection_activity', async () => {
    try {
      debugLog('📝 Recording collection activity', input);

      const { data, error } = await supabase.rpc('record_collection_activity', {
        p_loan_id: input.loan_id,
        p_activity_type: input.activity_type,
        p_contact_method: input.contact_method || null,
        p_outcome: input.outcome || null,
        p_notes: input.notes || null,
        p_promise_date: input.promise_date || null,
        p_promise_amount: input.promise_amount || null,
        p_next_action_date: input.next_action_date || null,
        p_next_action_type: input.next_action_type || null
      });

      if (error) {
        debugLog('❌ Record collection activity failed', error);
        return { success: false, error: error.message };
      }

      const result = data as any;
      debugLog('✅ Collection activity recorded', result);
      return result;
    } catch (error) {
      handleDatabaseError(error, 'recordCollectionActivity', input);
      return { success: false, error: 'Unexpected error occurred' };
    }
  });
}

/**
 * Assign loan to collection agent
 */
export async function assignToCollectionAgent(
  loanId: string,
  agentId: string,
  notes?: string
): Promise<{
  success: boolean;
  activity_id?: string;
  loan_id?: string;
  agent_id?: string;
  agent_name?: string;
  error?: string;
}> {
  return measurePerformance('assign_to_collection_agent', async () => {
    try {
      debugLog('👤 Assigning loan to collection agent', { loanId, agentId });

      const { data, error } = await supabase.rpc('assign_to_collection_agent', {
        p_loan_id: loanId,
        p_agent_id: agentId,
        p_notes: notes || null
      });

      if (error) {
        debugLog('❌ Assign to agent failed', error);
        return { success: false, error: error.message };
      }

      const result = data as any;
      debugLog('✅ Loan assigned to agent', result);
      return result;
    } catch (error) {
      handleDatabaseError(error, 'assignToCollectionAgent', { loanId, agentId });
      return { success: false, error: 'Unexpected error occurred' };
    }
  });
}

/**
 * Record payment promise from client
 */
export async function recordPaymentPromise(
  loanId: string,
  promiseDate: string,
  promiseAmount: number,
  notes?: string
): Promise<{
  success: boolean;
  activity_id?: string;
  loan_id?: string;
  promise_date?: string;
  promise_amount?: number;
  error?: string;
}> {
  return measurePerformance('record_payment_promise', async () => {
    try {
      debugLog('🤝 Recording payment promise', { loanId, promiseDate, promiseAmount });

      const { data, error } = await supabase.rpc('record_payment_promise', {
        p_loan_id: loanId,
        p_promise_date: promiseDate,
        p_promise_amount: promiseAmount,
        p_notes: notes || null
      });

      if (error) {
        debugLog('❌ Record payment promise failed', error);
        return { success: false, error: error.message };
      }

      const result = data as any;
      debugLog('✅ Payment promise recorded', result);
      return result;
    } catch (error) {
      handleDatabaseError(error, 'recordPaymentPromise', { loanId, promiseDate, promiseAmount });
      return { success: false, error: 'Unexpected error occurred' };
    }
  });
}

/**
 * Mark payment promise as fulfilled
 */
export async function markPromiseFulfilled(
  activityId: string
): Promise<{
  success: boolean;
  activity_id?: string;
  message?: string;
  error?: string;
}> {
  return measurePerformance('mark_promise_fulfilled', async () => {
    try {
      debugLog('✅ Marking promise as fulfilled', { activityId });

      const { data, error } = await supabase.rpc('mark_promise_fulfilled', {
        p_activity_id: activityId
      });

      if (error) {
        debugLog('❌ Mark promise fulfilled failed', error);
        return { success: false, error: error.message };
      }

      const result = data as any;
      debugLog('✅ Promise marked as fulfilled', result);
      return result;
    } catch (error) {
      handleDatabaseError(error, 'markPromiseFulfilled', { activityId });
      return { success: false, error: 'Unexpected error occurred' };
    }
  });
}

/**
 * Get collection activities for a loan
 */
export async function getCollectionActivities(
  loanId: string
): Promise<{
  success: boolean;
  activities?: CollectionActivity[];
  error?: string;
}> {
  return measurePerformance('get_collection_activities', async () => {
    try {
      debugLog('📋 Fetching collection activities', { loanId });

      const { data, error } = await supabase.rpc('get_collection_activities', {
        p_loan_id: loanId
      });

      if (error) {
        debugLog('❌ Get collection activities failed', error);
        return { success: false, error: error.message };
      }

      debugLog('✅ Collection activities retrieved', { count: data?.length || 0 });
      return { 
        success: true, 
        activities: data as CollectionActivity[] || [] 
      };
    } catch (error) {
      handleDatabaseError(error, 'getCollectionActivities', { loanId });
      return { success: false, error: 'Unexpected error occurred' };
    }
  });
}

/**
 * Get overdue loans
 */
export async function getOverdueLoans(): Promise<{
  success: boolean;
  loans?: any[];
  error?: string;
}> {
  return measurePerformance('get_overdue_loans', async () => {
    try {
      debugLog('📊 Fetching overdue loans');

      const { data, error } = await supabase.rpc('get_overdue_loans');

      if (error) {
        debugLog('❌ Get overdue loans failed', error);
        return { success: false, error: error.message };
      }

      debugLog('✅ Overdue loans retrieved', { count: data?.length || 0 });
      return { 
        success: true, 
        loans: data || [] 
      };
    } catch (error) {
      handleDatabaseError(error, 'getOverdueLoans', {});
      return { success: false, error: 'Unexpected error occurred' };
    }
  });
}

/**
 * Send collection reminder (placeholder for SMS/Email integration)
 */
export async function sendCollectionReminder(
  loanId: string,
  method: ContactMethod,
  message: string
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    debugLog('📧 Sending collection reminder', { loanId, method, message });

    // TODO: Integrate with SMS/Email service
    // For now, just record the activity
    const result = await recordCollectionActivity({
      loan_id: loanId,
      activity_type: method === 'sms' ? 'sms_sent' : 'email_sent',
      contact_method: method,
      notes: message,
      outcome: 'sent'
    });

    if (!result.success) {
      return result;
    }

    debugLog('✅ Collection reminder sent', result);
    return { 
      success: true, 
      message: 'Reminder sent and activity recorded' 
    };
  } catch (error) {
    handleDatabaseError(error, 'sendCollectionReminder', { loanId, method });
    return { success: false, error: 'Unexpected error occurred' };
  }
}

// Export all functions
export default {
  generateCollectionQueue,
  recordCollectionActivity,
  assignToCollectionAgent,
  recordPaymentPromise,
  markPromiseFulfilled,
  getCollectionActivities,
  getOverdueLoans,
  sendCollectionReminder
};
