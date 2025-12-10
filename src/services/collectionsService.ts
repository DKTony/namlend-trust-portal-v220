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

// ========== NEW COLLECTIONS QUEUE FUNCTIONS ==========

export interface CollectionsQueueItem {
  loan_id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  email: string;
  loan_amount: number;
  monthly_payment: number;
  loan_status: string;
  loan_created_at: string;
  days_overdue: number;
  risk_bucket: 'current' | 'bucket_1_30' | 'bucket_31_60' | 'bucket_61_90' | 'bucket_90_plus' | 'not_applicable';
  last_contact_date?: string;
  last_contact_type?: string;
  pending_promises: number;
  next_promise_date?: string;
  contact_attempts_7_days: number;
}

export interface PromiseToPay {
  id: string;
  loan_id: string;
  user_id: string;
  promised_amount: number;
  promised_date: string;
  status: 'pending' | 'kept' | 'broken' | 'cancelled';
  notes?: string;
  follow_up_date?: string;
  created_by?: string;
  created_at: string;
  resolved_at?: string;
  resolved_by?: string;
}

export interface RescheduleRequest {
  id: string;
  loan_id: string;
  user_id: string;
  original_due_date: string;
  requested_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  admin_notes?: string;
  processed_by?: string;
  processed_at?: string;
  created_at: string;
}

export interface CollectionsStats {
  total_overdue: number;
  bucket_1_30: number;
  bucket_31_60: number;
  bucket_61_90: number;
  bucket_90_plus: number;
  pending_promises: number;
  promises_due_today: number;
  contacts_today: number;
  pending_reschedules: number;
}

/**
 * Get collections queue with risk buckets
 */
export async function getCollectionsQueue(filters?: {
  riskBucket?: string;
  search?: string;
}): Promise<{
  success: boolean;
  data?: CollectionsQueueItem[];
  error?: string;
}> {
  return measurePerformance('get_collections_queue', async () => {
    try {
      debugLog('📊 Fetching collections queue', filters);

      let query = supabase
        .from('collections_queue')
        .select('*')
        .order('days_overdue', { ascending: false });

      if (filters?.riskBucket && filters.riskBucket !== 'all') {
        query = query.eq('risk_bucket', filters.riskBucket);
      }

      if (filters?.search) {
        query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,phone_number.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) {
        debugLog('❌ Get collections queue failed', error);
        return { success: false, error: error.message };
      }

      debugLog('✅ Collections queue retrieved', { count: data?.length || 0 });
      return { success: true, data: data as CollectionsQueueItem[] };
    } catch (error) {
      handleDatabaseError(error, 'getCollectionsQueue', filters || {});
      return { success: false, error: 'Unexpected error occurred' };
    }
  });
}

/**
 * Get collections statistics
 */
export async function getCollectionsStats(): Promise<{
  success: boolean;
  stats?: CollectionsStats;
  error?: string;
}> {
  return measurePerformance('get_collections_stats', async () => {
    try {
      debugLog('📊 Fetching collections stats');

      const { data, error } = await supabase.rpc('get_collections_stats');

      if (error) {
        debugLog('❌ Get collections stats failed', error);
        return { success: false, error: error.message };
      }

      debugLog('✅ Collections stats retrieved', data);
      return { success: true, stats: data as CollectionsStats };
    } catch (error) {
      handleDatabaseError(error, 'getCollectionsStats', {});
      return { success: false, error: 'Unexpected error occurred' };
    }
  });
}

/**
 * Create a promise to pay
 */
export async function createPromiseToPay(
  loanId: string,
  promisedAmount: number,
  promisedDate: string,
  notes?: string,
  followUpDate?: string
): Promise<{
  success: boolean;
  id?: string;
  error?: string;
}> {
  return measurePerformance('create_promise_to_pay', async () => {
    try {
      debugLog('🤝 Creating promise to pay', { loanId, promisedAmount, promisedDate });

      const { data, error } = await supabase.rpc('create_promise_to_pay', {
        p_loan_id: loanId,
        p_promised_amount: promisedAmount,
        p_promised_date: promisedDate,
        p_notes: notes || null,
        p_follow_up_date: followUpDate || null
      });

      if (error) {
        debugLog('❌ Create promise to pay failed', error);
        return { success: false, error: error.message };
      }

      debugLog('✅ Promise to pay created', { id: data });
      return { success: true, id: data };
    } catch (error) {
      handleDatabaseError(error, 'createPromiseToPay', { loanId });
      return { success: false, error: 'Unexpected error occurred' };
    }
  });
}

/**
 * Resolve a promise to pay
 */
export async function resolvePromiseToPay(
  ptpId: string,
  status: 'kept' | 'broken' | 'cancelled',
  notes?: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  return measurePerformance('resolve_promise_to_pay', async () => {
    try {
      debugLog('✅ Resolving promise to pay', { ptpId, status });

      const { data, error } = await supabase.rpc('resolve_promise_to_pay', {
        p_ptp_id: ptpId,
        p_status: status,
        p_notes: notes || null
      });

      if (error) {
        debugLog('❌ Resolve promise to pay failed', error);
        return { success: false, error: error.message };
      }

      debugLog('✅ Promise to pay resolved', { success: data });
      return { success: true };
    } catch (error) {
      handleDatabaseError(error, 'resolvePromiseToPay', { ptpId });
      return { success: false, error: 'Unexpected error occurred' };
    }
  });
}

/**
 * Get promises to pay for a loan
 */
export async function getPromisesToPay(loanId?: string): Promise<{
  success: boolean;
  data?: PromiseToPay[];
  error?: string;
}> {
  return measurePerformance('get_promises_to_pay', async () => {
    try {
      debugLog('📋 Fetching promises to pay', { loanId });

      let query = supabase
        .from('promise_to_pay')
        .select('*')
        .order('promised_date', { ascending: true });

      if (loanId) {
        query = query.eq('loan_id', loanId);
      }

      const { data, error } = await query;

      if (error) {
        debugLog('❌ Get promises to pay failed', error);
        return { success: false, error: error.message };
      }

      debugLog('✅ Promises to pay retrieved', { count: data?.length || 0 });
      return { success: true, data: data as PromiseToPay[] };
    } catch (error) {
      handleDatabaseError(error, 'getPromisesToPay', { loanId });
      return { success: false, error: 'Unexpected error occurred' };
    }
  });
}

/**
 * Log a collections interaction
 */
export async function logInteraction(
  loanId: string,
  interactionType: 'call' | 'sms' | 'email' | 'whatsapp' | 'visit' | 'note' | 'system',
  outcome?: string,
  notes?: string,
  nextAction?: string,
  nextActionDate?: string,
  callDuration?: number
): Promise<{
  success: boolean;
  id?: string;
  error?: string;
}> {
  return measurePerformance('log_interaction', async () => {
    try {
      debugLog('📝 Logging interaction', { loanId, interactionType, outcome });

      const { data, error } = await supabase.rpc('log_collections_interaction', {
        p_loan_id: loanId,
        p_interaction_type: interactionType,
        p_outcome: outcome || null,
        p_notes: notes || null,
        p_next_action: nextAction || null,
        p_next_action_date: nextActionDate || null,
        p_call_duration: callDuration || null
      });

      if (error) {
        debugLog('❌ Log interaction failed', error);
        return { success: false, error: error.message };
      }

      debugLog('✅ Interaction logged', { id: data });
      return { success: true, id: data };
    } catch (error) {
      handleDatabaseError(error, 'logInteraction', { loanId });
      return { success: false, error: 'Unexpected error occurred' };
    }
  });
}

/**
 * Get interactions for a loan
 */
export async function getInteractions(loanId: string): Promise<{
  success: boolean;
  data?: any[];
  error?: string;
}> {
  return measurePerformance('get_interactions', async () => {
    try {
      debugLog('📋 Fetching interactions', { loanId });

      const { data, error } = await supabase
        .from('collections_interactions')
        .select('*')
        .eq('loan_id', loanId)
        .order('created_at', { ascending: false });

      if (error) {
        debugLog('❌ Get interactions failed', error);
        return { success: false, error: error.message };
      }

      debugLog('✅ Interactions retrieved', { count: data?.length || 0 });
      return { success: true, data };
    } catch (error) {
      handleDatabaseError(error, 'getInteractions', { loanId });
      return { success: false, error: 'Unexpected error occurred' };
    }
  });
}

/**
 * Request payment reschedule (for clients)
 */
export async function requestReschedule(
  loanId: string,
  originalDueDate: string,
  requestedDate: string,
  reason: string
): Promise<{
  success: boolean;
  id?: string;
  error?: string;
}> {
  return measurePerformance('request_reschedule', async () => {
    try {
      debugLog('📅 Requesting reschedule', { loanId, originalDueDate, requestedDate });

      const { data, error } = await supabase.rpc('request_payment_reschedule', {
        p_loan_id: loanId,
        p_original_due_date: originalDueDate,
        p_requested_date: requestedDate,
        p_reason: reason
      });

      if (error) {
        debugLog('❌ Request reschedule failed', error);
        return { success: false, error: error.message };
      }

      debugLog('✅ Reschedule requested', { id: data });
      return { success: true, id: data };
    } catch (error) {
      handleDatabaseError(error, 'requestReschedule', { loanId });
      return { success: false, error: 'Unexpected error occurred' };
    }
  });
}

/**
 * Get reschedule requests
 */
export async function getRescheduleRequests(status?: string): Promise<{
  success: boolean;
  data?: RescheduleRequest[];
  error?: string;
}> {
  return measurePerformance('get_reschedule_requests', async () => {
    try {
      debugLog('📋 Fetching reschedule requests', { status });

      let query = supabase
        .from('reschedule_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        debugLog('❌ Get reschedule requests failed', error);
        return { success: false, error: error.message };
      }

      debugLog('✅ Reschedule requests retrieved', { count: data?.length || 0 });
      return { success: true, data: data as RescheduleRequest[] };
    } catch (error) {
      handleDatabaseError(error, 'getRescheduleRequests', { status });
      return { success: false, error: 'Unexpected error occurred' };
    }
  });
}

/**
 * Process a reschedule request (for admins)
 */
export async function processRescheduleRequest(
  requestId: string,
  status: 'approved' | 'rejected',
  adminNotes?: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  return measurePerformance('process_reschedule_request', async () => {
    try {
      debugLog('✅ Processing reschedule request', { requestId, status });

      const { data, error } = await supabase.rpc('process_reschedule_request', {
        p_request_id: requestId,
        p_status: status,
        p_admin_notes: adminNotes || null
      });

      if (error) {
        debugLog('❌ Process reschedule request failed', error);
        return { success: false, error: error.message };
      }

      debugLog('✅ Reschedule request processed', { success: data });
      return { success: true };
    } catch (error) {
      handleDatabaseError(error, 'processRescheduleRequest', { requestId });
      return { success: false, error: 'Unexpected error occurred' };
    }
  });
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
  sendCollectionReminder,
  // New functions
  getCollectionsQueue,
  getCollectionsStats,
  createPromiseToPay,
  resolvePromiseToPay,
  getPromisesToPay,
  logInteraction,
  getInteractions,
  requestReschedule,
  getRescheduleRequests,
  processRescheduleRequest
};
