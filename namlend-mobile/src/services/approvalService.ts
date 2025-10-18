/**
 * Approval Service for Loan Officers/Admins
 * Version: v2.4.2
 * 
 * Handles approval queue and workflow operations
 */

import { supabase } from './supabaseClient';
import { ApprovalRequest, WorkflowStageExecution } from '../types';
 

export class ApprovalService {
  /**
   * Get approval queue for current user
   */
  static async getApprovalQueue(filters?: {
    status?: string;
    priority?: string;
    limit?: number;
  }): Promise<ApprovalRequest[]> {
    try {
      try {
        let query = supabase
          .from('approval_requests')
          .select(`
            *,
            user:user_id(email, raw_user_meta_data),
            profile:user_id(*)
          `)
          .order('created_at', { ascending: false });

        if (filters?.status) {
          query = query.eq('status', filters.status);
        }

        if (filters?.priority) {
          query = query.eq('priority', filters.priority);
        }

        if (filters?.limit) {
          query = query.limit(filters.limit);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      } catch (err: any) {
        let q = supabase
          .from('approval_requests')
          .select('*')
          .order('created_at', { ascending: false });
        if (filters?.status) q = q.eq('status', filters.status);
        if (filters?.priority) q = q.eq('priority', filters.priority);
        if (filters?.limit) q = q.limit(filters.limit);
        const { data: base, error: baseErr } = await q;
        if (baseErr) throw baseErr;
        const userIds = Array.from(new Set((base || []).map(r => r.user_id).filter(Boolean)));
        if (!userIds.length) return base as any;
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('user_id', userIds);
        const map = new Map((profiles || []).map(p => [p.user_id, p]));
        const merged = (base || []).map(r => ({ ...r, profile: map.get(r.user_id) }));
        return merged as any;
      }
    } catch (error) {
      console.error('Error fetching approval queue:', error);
      throw error;
    }
  }

  /**
   * Get pending workflow stages assigned to current user
   */
  static async getMyPendingStages(): Promise<WorkflowStageExecution[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('workflow_stage_executions')
        .select('*, workflow_instances(*)')
        .eq('assigned_to', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching pending stages:', error);
      throw error;
    }
  }

  /**
   * Approve an approval request
   */
  static async approveRequest(
    requestId: string,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { error } = await supabase
        .from('approval_requests')
        .update({
          status: 'approved',
          reviewer_id: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: notes || null,
        })
        .eq('id', requestId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error approving request:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Reject an approval request
   */
  static async rejectRequest(
    requestId: string,
    notes: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      if (!notes || notes.trim().length === 0) {
        return { success: false, error: 'Rejection reason is required' };
      }

      const { error } = await supabase
        .from('approval_requests')
        .update({
          status: 'rejected',
          reviewer_id: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: notes,
        })
        .eq('id', requestId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error rejecting request:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Approve a workflow stage
   */
  static async approveWorkflowStage(
    stageExecutionId: string,
    notes?: string
  ): Promise<{ success: boolean; error?: string; result?: any }> {
    try {
      const { data, error } = await supabase.rpc('decide_workflow_stage', {
        p_stage_execution_id: stageExecutionId,
        p_decision: 'approved',
        p_notes: notes || null,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, result: data };
    } catch (error) {
      console.error('Error approving workflow stage:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Reject a workflow stage
   */
  static async rejectWorkflowStage(
    stageExecutionId: string,
    notes: string
  ): Promise<{ success: boolean; error?: string; result?: any }> {
    try {
      if (!notes || notes.trim().length === 0) {
        return { success: false, error: 'Rejection reason is required' };
      }

      const { data, error } = await supabase.rpc('decide_workflow_stage', {
        p_stage_execution_id: stageExecutionId,
        p_decision: 'rejected',
        p_notes: notes,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, result: data };
    } catch (error) {
      console.error('Error rejecting workflow stage:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get approval statistics
   */
  static async getApprovalStats() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get counts for different statuses
      const { count: pendingCount } = await supabase
        .from('approval_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const { count: underReviewCount } = await supabase
        .from('approval_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'under_review');

      const { count: myAssignedCount } = await supabase
        .from('approval_requests')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', user.id)
        .in('status', ['pending', 'under_review']);

      return {
        pending: pendingCount || 0,
        underReview: underReviewCount || 0,
        myAssigned: myAssignedCount || 0,
      };
    } catch (error) {
      console.error('Error fetching approval stats:', error);
      return {
        pending: 0,
        underReview: 0,
        myAssigned: 0,
      };
    }
  }
}
