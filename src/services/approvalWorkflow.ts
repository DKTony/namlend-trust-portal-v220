import { supabase } from '@/integrations/supabase/client';
import { debugLog } from '@/utils/debug';
import { handleDatabaseError, handleBusinessLogicError, measurePerformance } from '@/utils/errorHandler';

export interface ApprovalRequest {
  id: string;
  user_id: string;
  request_type: 'loan_application' | 'kyc_document' | 'profile_update' | 'payment' | 'document_upload';
  request_data: any;
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'requires_info';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  reviewed_at?: string;
  reviewer_id?: string;
  review_notes?: string;
  reference_id?: string;
  reference_table?: string;
  auto_approve_eligible: boolean;
  risk_score: number;
  compliance_flags: any[];
  metadata: any;
  // Expanded view fields (approval_requests_expanded)
  user_first_name?: string;
  user_last_name?: string;
  assigned_first_name?: string;
  assigned_last_name?: string;
  reviewer_first_name?: string;
  reviewer_last_name?: string;
  // Optional email if present in payload/view or request_data
  user_email?: string;
}

export interface ApprovalWorkflowHistory {
  id: string;
  approval_request_id: string;
  previous_status?: string;
  new_status: string;
  changed_by: string;
  change_reason?: string;
  changed_at: string;
  additional_data: any;
}

export interface ApprovalNotification {
  id: string;
  approval_request_id: string;
  recipient_id: string;
  notification_type: 'new_request' | 'status_update' | 'assignment' | 'reminder';
  title: string;
  message: string;
  is_read: boolean;
  sent_at: string;
  read_at?: string;
  metadata: any;
}

export interface ApprovalRequestData {
  user_id: string;
  request_type: 'loan_application' | 'kyc_document' | 'profile_update' | 'payment' | 'document_upload';
  request_data: any;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

/**
 * Submit a new approval request to the back office workflow
 */
export async function submitApprovalRequest(
  requestData: ApprovalRequestData
): Promise<{ success: boolean; requestId?: string; error?: string }> {
  return await measurePerformance('submit_approval_request', async () => {
    try {
      debugLog('📝 Submitting approval request:', requestData);
      
      const { data, error } = await supabase
        .from('approval_requests')
        .insert([
          {
            user_id: requestData.user_id,
            request_type: requestData.request_type,
            request_data: requestData.request_data,
            status: 'pending',
            priority: requestData.priority || 'normal'
            // Note: Using created_at (auto-generated) instead of submitted_at
          }
        ])
        .select()
        .single();

      if (error) {
        debugLog('❌ Error submitting approval request:', error);
        handleDatabaseError(error, 'submit_approval_request', { requestData });
        return { success: false, error: error.message };
      }

      debugLog('✅ Approval request submitted successfully:', data.id);
      return { success: true, requestId: data.id };
    } catch (error) {
      debugLog('❌ Unexpected error submitting approval request:', error);
      handleDatabaseError(error, 'submit_approval_request', { requestData });
      return { success: false, error: 'Unexpected error occurred' };
    }
  });
}

/**
 * Get approval requests for the current user
 */
export async function getUserApprovalRequests(
  status?: ApprovalRequest['status']
): Promise<{ success: boolean; requests?: ApprovalRequest[]; error?: string }> {
  try {
    let query = supabase
      .from('approval_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      debugLog('❌ Error fetching user approval requests:', error);
      return { success: false, error: error.message };
    }

    return { success: true, requests: data };
  } catch (error) {
    debugLog('❌ Unexpected error fetching approval requests:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

/**
 * Get all approval requests for admin review
 */
export async function getAllApprovalRequests(
  filters?: {
    status?: ApprovalRequest['status'];
    requestType?: ApprovalRequest['request_type'];
    priority?: ApprovalRequest['priority'];
    assignedTo?: string;
  }
): Promise<{ success: boolean; requests?: ApprovalRequest[]; error?: string }> {
  try {
    // Prefer the expanded view that joins against profiles instead of auth.users to
    // avoid schema cache relationship issues (PGRST200). This also reduces N+1.
    let query = supabase
      .from('approval_requests_expanded')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.requestType) {
      query = query.eq('request_type', filters.requestType);
    }
    if (filters?.priority) {
      query = query.eq('priority', filters.priority);
    }
    if (filters?.assignedTo) {
      query = query.eq('assigned_to', filters.assignedTo);
    }

    const { data, error } = await query;

    if (error) {
      debugLog('❌ Error fetching all approval requests:', error);
      
      // Fallback to simpler query if view is not available
      const fallbackQuery = supabase
        .from('approval_requests')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (filters?.status) fallbackQuery.eq('status', filters.status);
      if (filters?.requestType) fallbackQuery.eq('request_type', filters.requestType);
      if (filters?.priority) fallbackQuery.eq('priority', filters.priority);
      if (filters?.assignedTo) fallbackQuery.eq('assigned_to', filters.assignedTo);
      
      const { data: fallbackData, error: fallbackError } = await fallbackQuery;
      
      if (fallbackError) {
        return { success: false, error: fallbackError.message };
      }
      
      // Map fallback data with minimal user info
      const mappedRequests = fallbackData.map(request => ({
        ...request,
        user: {
          email: `User ${request.user_id.substring(0, 8)}...`,
          full_name: 'Unknown User',
          phone_number: null,
          id_number: null
        }
      }));
      
      return { success: true, requests: mappedRequests };
    }

    // Data already contains user/reviewer/assignee names from profiles via the view.
    const enhancedRequests = data as unknown as ApprovalRequest[];

    return { success: true, requests: enhancedRequests };
  } catch (error) {
    debugLog('❌ Unexpected error fetching all approval requests:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

/**
 * Update approval request status (admin only)
 */
export async function updateApprovalStatus(
  requestId: string,
  status: ApprovalRequest['status'],
  reviewNotes?: string,
  assignedTo?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    debugLog('🔄 Updating approval status:', { requestId, status, reviewNotes });

    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (reviewNotes) {
      updateData.review_notes = reviewNotes;
    }

    if (assignedTo) {
      updateData.assigned_to = assignedTo;
    }

    if (status === 'approved' || status === 'rejected') {
      updateData.reviewed_at = new Date().toISOString();
      
      // Get current user as reviewer
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        updateData.reviewer_id = user.id;
      }
    }

    const { error } = await supabase
      .from('approval_requests')
      .update(updateData)
      .eq('id', requestId);

    if (error) {
      debugLog('❌ Error updating approval status:', error);
      return { success: false, error: error.message };
    }

    debugLog('✅ Approval status updated successfully');
    return { success: true };
  } catch (error) {
    debugLog('❌ Unexpected error updating approval status:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

/**
 * Get approval workflow history for a request
 */
export async function getApprovalHistory(
  requestId: string
): Promise<{ success: boolean; history?: ApprovalWorkflowHistory[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('approval_workflow_history')
      .select(`
        *,
        changed_by_user:changed_by (
          email,
          raw_user_meta_data
        )
      `)
      .eq('approval_request_id', requestId)
      .order('changed_at', { ascending: true });

    if (error) {
      debugLog('❌ Error fetching approval history:', error);
      return { success: false, error: error.message };
    }

    return { success: true, history: data };
  } catch (error) {
    debugLog('❌ Unexpected error fetching approval history:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

/**
 * Get approval notifications for the current user
 */
export async function getApprovalNotifications(
  unreadOnly: boolean = false
): Promise<{ success: boolean; notifications?: ApprovalNotification[]; error?: string }> {
  try {
    let query = supabase
      .from('approval_notifications')
      .select(`
        *,
        approval_request:approval_request_id (
          request_type,
          status,
          priority
        )
      `)
      .order('sent_at', { ascending: false });

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;

    if (error) {
      debugLog('❌ Error fetching approval notifications:', error);
      return { success: false, error: error.message };
    }

    return { success: true, notifications: data };
  } catch (error) {
    debugLog('❌ Unexpected error fetching approval notifications:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(
  notificationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('approval_notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', notificationId);

    if (error) {
      debugLog('❌ Error marking notification as read:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    debugLog('❌ Unexpected error marking notification as read:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

/**
 * Get approval workflow statistics for admin dashboard
 */
export async function getApprovalStatistics(): Promise<{
  success: boolean;
  stats?: {
    total: number;
    pending: number;
    underReview: number;
    approved: number;
    rejected: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
    avgProcessingTime: number;
  };
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('approval_requests')
      .select('status, request_type, priority, created_at, reviewed_at');

    if (error) {
      debugLog('❌ Error fetching approval statistics:', error);
      return { success: false, error: error.message };
    }

    const stats = {
      total: data.length,
      pending: data.filter(r => r.status === 'pending').length,
      underReview: data.filter(r => r.status === 'under_review').length,
      approved: data.filter(r => r.status === 'approved').length,
      rejected: data.filter(r => r.status === 'rejected').length,
      byType: {} as Record<string, number>,
      byPriority: {} as Record<string, number>,
      avgProcessingTime: 0
    };

    // Calculate by type
    data.forEach(request => {
      stats.byType[request.request_type] = (stats.byType[request.request_type] || 0) + 1;
    });

    // Calculate by priority
    data.forEach(request => {
      stats.byPriority[request.priority] = (stats.byPriority[request.priority] || 0) + 1;
    });

    // Calculate average processing time for completed requests
    const completedRequests = data.filter(r => r.reviewed_at);
    if (completedRequests.length > 0) {
      const totalProcessingTime = completedRequests.reduce((sum, request) => {
        const created = new Date(request.created_at).getTime();
        const reviewed = new Date(request.reviewed_at!).getTime();
        return sum + (reviewed - created);
      }, 0);
      stats.avgProcessingTime = totalProcessingTime / completedRequests.length / (1000 * 60 * 60); // Convert to hours
    }

    return { success: true, stats };
  } catch (error) {
    debugLog('❌ Unexpected error fetching approval statistics:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

/**
 * Process approved loan application
 * Uses atomic transaction to ensure data consistency
 */
export async function processApprovedLoanApplication(
  approvalRequestId: string
): Promise<{ success: boolean; loanId?: string; error?: string }> {
  return await measurePerformance('process_approved_loan_application', async () => {
    try {
      debugLog('🔄 Processing approved loan application:', approvalRequestId);
      
      // Use the new transaction function for atomic processing
      const { data, error } = await supabase
        .rpc('process_approval_transaction', {
          request_id: approvalRequestId
        });

      if (error) {
        debugLog('❌ Error processing loan application:', error);
        handleDatabaseError(error, 'process_approval_transaction', { approvalRequestId });
        return { success: false, error: error.message };
      }

      // Check the result from the function
      if (!data || !data.success) {
        const errorMsg = data?.error || 'Failed to process loan application';
        handleBusinessLogicError('process_loan_application', errorMsg, { approvalRequestId });
        return { success: false, error: errorMsg };
      }

      debugLog('✅ Loan application processed successfully:', data.loan_id);
      return { success: true, loanId: data.loan_id };
    } catch (error) {
      debugLog('❌ Unexpected error processing loan application:', error);
      handleDatabaseError(error, 'process_approved_loan_application', { approvalRequestId });
      return { success: false, error: 'Unexpected error occurred' };
    }
  });
}

/**
 * Process approved KYC document
 */
export async function processApprovedKYCDocument(
  approvalRequestId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    debugLog('🔄 Processing approved KYC document:', approvalRequestId);

    // Get the approval request
    const { data: approvalRequest, error: fetchError } = await supabase
      .from('approval_requests')
      .select('*')
      .eq('id', approvalRequestId)
      .eq('status', 'approved')
      .eq('request_type', 'kyc_document')
      .single();

    if (fetchError || !approvalRequest) {
      return { success: false, error: 'Approval request not found or not approved' };
    }

    // Update the KYC document status
    if (approvalRequest.reference_id) {
      const { error: updateError } = await supabase
        .from('kyc_documents')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: approvalRequest.reviewer_id
        })
        .eq('id', approvalRequest.reference_id);

      if (updateError) {
        debugLog('❌ Error updating KYC document status:', updateError);
        return { success: false, error: updateError.message };
      }
    }

    // Check if user should be marked as verified
    const { data: userDocs } = await supabase
      .from('kyc_documents')
      .select('document_type, status')
      .eq('user_id', approvalRequest.user_id);

    const requiredDocs = ['id_card', 'proof_income'];
    const approvedDocs = userDocs?.filter(doc => doc.status === 'approved').map(doc => doc.document_type) || [];
    const hasAllRequiredDocs = requiredDocs.every(docType => approvedDocs.includes(docType));

    if (hasAllRequiredDocs) {
      // Mark user as verified
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ verified: true })
        .eq('user_id', approvalRequest.user_id);

      if (profileError) {
        debugLog('⚠️ Warning: Could not update user verification status:', profileError);
      } else {
        debugLog('✅ User marked as verified');
      }
    }

    debugLog('✅ KYC document processed successfully');
    return { success: true };
  } catch (error) {
    debugLog('❌ Unexpected error processing KYC document:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}
