/**
 * Audit Service
 * Comprehensive audit logging for compliance and security
 * Version: v2.4.1
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export interface AuditLog {
  id: string;
  timestamp: string;
  user_id: string;
  user_role?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_state?: Record<string, any> | null;
  new_state?: Record<string, any> | null;
  ip_address?: string | null;
  user_agent?: string | null;
  session_id?: string | null;
  metadata?: Record<string, any> | null;
}

export interface ViewLog {
  id: string;
  timestamp: string;
  user_id: string;
  entity_type: string;
  entity_id: string;
  view_duration_ms?: number;
  fields_viewed?: string[];
  ip_address?: string;
  session_id?: string;
}

export interface StateTransition {
  id: string;
  timestamp: string;
  entity_type: string;
  entity_id: string;
  from_state: string;
  to_state: string;
  transition_reason?: string;
  triggered_by: string;
  workflow_instance_id?: string;
}

export interface ComplianceReport {
  id: string;
  report_type: 'monthly_approvals' | 'user_activity' | 'state_changes' | 'view_access' | 'security_audit';
  period_start: string;
  period_end: string;
  generated_at: string;
  generated_by: string;
  report_data: Record<string, any>;
  file_url?: string;
  status: 'pending' | 'completed' | 'failed';
}

// ============================================================================
// AUDIT SERVICE
// ============================================================================

export class AuditService {
  /**
   * Log a view access event
   */
  static async logViewAccess(
    entityType: string,
    entityId: string,
    fieldsViewed?: string[],
    viewDurationMs?: number
  ): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('log_view_access', {
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_fields_viewed: fieldsViewed || null,
        p_view_duration_ms: viewDurationMs || null
      });

      if (error) throw error;
      return data as string;
    } catch (err) {
      console.error('Error logging view access:', err);
      throw err;
    }
  }

  /**
   * Log a state transition
   */
  static async logStateTransition(
    entityType: string,
    entityId: string,
    fromState: string,
    toState: string,
    reason?: string,
    workflowInstanceId?: string
  ): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('log_state_transition', {
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_from_state: fromState,
        p_to_state: toState,
        p_reason: reason || null,
        p_workflow_instance_id: workflowInstanceId || null
      });

      if (error) throw error;
      return data as string;
    } catch (err) {
      console.error('Error logging state transition:', err);
      throw err;
    }
  }

  /**
   * Get audit logs with filters
   */
  static async getAuditLogs(filters?: {
    userId?: string;
    action?: string;
    entityType?: string;
    entityId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<AuditLog[]> {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false });

      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters?.action) {
        query = query.eq('action', filters.action);
      }
      if (filters?.entityType) {
        query = query.eq('entity_type', filters.entityType);
      }
      if (filters?.entityId) {
        query = query.eq('entity_id', filters.entityId);
      }
      if (filters?.startDate) {
        query = query.gte('timestamp', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('timestamp', filters.endDate);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      throw err;
    }
  }

  /**
   * Get view logs with filters
   */
  static async getViewLogs(filters?: {
    userId?: string;
    entityType?: string;
    entityId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<ViewLog[]> {
    try {
      let query = supabase
        .from('view_logs')
        .select('*')
        .order('timestamp', { ascending: false });

      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters?.entityType) {
        query = query.eq('entity_type', filters.entityType);
      }
      if (filters?.entityId) {
        query = query.eq('entity_id', filters.entityId);
      }
      if (filters?.startDate) {
        query = query.gte('timestamp', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('timestamp', filters.endDate);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching view logs:', err);
      throw err;
    }
  }

  /**
   * Get state transitions with filters
   */
  static async getStateTransitions(filters?: {
    entityType?: string;
    entityId?: string;
    triggeredBy?: string;
    workflowInstanceId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<StateTransition[]> {
    try {
      let query = supabase
        .from('state_transitions')
        .select('*')
        .order('timestamp', { ascending: false });

      if (filters?.entityType) {
        query = query.eq('entity_type', filters.entityType);
      }
      if (filters?.entityId) {
        query = query.eq('entity_id', filters.entityId);
      }
      if (filters?.triggeredBy) {
        query = query.eq('triggered_by', filters.triggeredBy);
      }
      if (filters?.workflowInstanceId) {
        query = query.eq('workflow_instance_id', filters.workflowInstanceId);
      }
      if (filters?.startDate) {
        query = query.gte('timestamp', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('timestamp', filters.endDate);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching state transitions:', err);
      throw err;
    }
  }

  /**
   * Generate compliance report
   */
  static async generateComplianceReport(
    reportType: 'monthly_approvals' | 'user_activity' | 'state_changes' | 'view_access' | 'security_audit',
    periodStart: string,
    periodEnd: string
  ): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('generate_compliance_report', {
        p_report_type: reportType,
        p_period_start: periodStart,
        p_period_end: periodEnd
      });

      if (error) throw error;
      return data as string;
    } catch (err) {
      console.error('Error generating compliance report:', err);
      throw err;
    }
  }

  /**
   * Get compliance reports
   */
  static async getComplianceReports(filters?: {
    reportType?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<ComplianceReport[]> {
    try {
      let query = supabase
        .from('compliance_reports')
        .select('*')
        .order('generated_at', { ascending: false });

      if (filters?.reportType) {
        query = query.eq('report_type', filters.reportType);
      }
      if (filters?.startDate) {
        query = query.gte('period_start', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('period_end', filters.endDate);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching compliance reports:', err);
      throw err;
    }
  }

  /**
   * Get audit statistics
   */
  static async getAuditStats(startDate?: string, endDate?: string): Promise<{
    total_actions: number;
    total_views: number;
    total_transitions: number;
    unique_users: number;
    actions_by_type: Record<string, number>;
  }> {
    try {
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const end = endDate || new Date().toISOString();

      // Get audit logs count
      const { count: auditCount } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', start)
        .lte('timestamp', end);

      // Get view logs count
      const { count: viewCount } = await supabase
        .from('view_logs')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', start)
        .lte('timestamp', end);

      // Get state transitions count
      const { count: transitionCount } = await supabase
        .from('state_transitions')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', start)
        .lte('timestamp', end);

      // Get unique users
      const { data: auditLogs } = await supabase
        .from('audit_logs')
        .select('user_id')
        .gte('timestamp', start)
        .lte('timestamp', end);

      const uniqueUsers = new Set(auditLogs?.map(log => log.user_id) || []).size;

      // Get actions by type
      const { data: actionData } = await supabase
        .from('audit_logs')
        .select('action')
        .gte('timestamp', start)
        .lte('timestamp', end);

      const actionsByType: Record<string, number> = {};
      actionData?.forEach(log => {
        actionsByType[log.action] = (actionsByType[log.action] || 0) + 1;
      });

      return {
        total_actions: auditCount || 0,
        total_views: viewCount || 0,
        total_transitions: transitionCount || 0,
        unique_users: uniqueUsers,
        actions_by_type: actionsByType
      };
    } catch (err) {
      console.error('Error fetching audit stats:', err);
      throw err;
    }
  }
}

export default AuditService;
