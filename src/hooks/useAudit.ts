/**
 * React Hooks for Audit Logging
 * Version: v2.4.1
 */

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import AuditService, {
  AuditLog,
  ViewLog,
  StateTransition,
  ComplianceReport
} from '@/services/auditService';

// ============================================================================
// useViewTracking - Track when users view sensitive data
// ============================================================================

export const useViewTracking = (
  entityType: string,
  entityId: string,
  fieldsViewed?: string[]
) => {
  const [viewStartTime] = useState(Date.now());

  useEffect(() => {
    // Log view on mount
    const logView = async () => {
      try {
        await AuditService.logViewAccess(entityType, entityId, fieldsViewed);
      } catch (err) {
        console.error('Failed to log view access:', err);
      }
    };

    if (entityType && entityId) {
      logView();
    }

    // Log view duration on unmount
    return () => {
      const duration = Date.now() - viewStartTime;
      AuditService.logViewAccess(entityType, entityId, fieldsViewed, duration).catch(err => {
        console.error('Failed to log view duration:', err);
      });
    };
  }, [entityType, entityId, fieldsViewed, viewStartTime]);
};

// ============================================================================
// useAuditLogs - Fetch audit logs with filters
// ============================================================================

export const useAuditLogs = (filters?: {
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await AuditService.getAuditLogs(filters);
      setLogs(data);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return { logs, loading, error, refetch: fetchLogs };
};

// ============================================================================
// useViewLogs - Fetch view logs with filters
// ============================================================================

export const useViewLogs = (filters?: {
  userId?: string;
  entityType?: string;
  entityId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}) => {
  const [logs, setLogs] = useState<ViewLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await AuditService.getViewLogs(filters);
      setLogs(data);
    } catch (err) {
      console.error('Error fetching view logs:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return { logs, loading, error, refetch: fetchLogs };
};

// ============================================================================
// useStateTransitions - Fetch state transitions with filters
// ============================================================================

export const useStateTransitions = (filters?: {
  entityType?: string;
  entityId?: string;
  triggeredBy?: string;
  workflowInstanceId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}) => {
  const [transitions, setTransitions] = useState<StateTransition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransitions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await AuditService.getStateTransitions(filters);
      setTransitions(data);
    } catch (err) {
      console.error('Error fetching state transitions:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchTransitions();
  }, [fetchTransitions]);

  return { transitions, loading, error, refetch: fetchTransitions };
};

// ============================================================================
// useComplianceReports - Manage compliance reports
// ============================================================================

export const useComplianceReports = (filters?: {
  reportType?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}) => {
  const [reports, setReports] = useState<ComplianceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await AuditService.getComplianceReports(filters);
      setReports(data);
    } catch (err) {
      console.error('Error fetching compliance reports:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const generateReport = async (
    reportType: 'monthly_approvals' | 'user_activity' | 'state_changes' | 'view_access' | 'security_audit',
    periodStart: string,
    periodEnd: string
  ) => {
    try {
      setGenerating(true);
      await AuditService.generateComplianceReport(reportType, periodStart, periodEnd);
      
      toast({
        title: 'Report Generated',
        description: 'Compliance report has been generated successfully',
        duration: 5000,
      });

      // Refresh reports list
      await fetchReports();
    } catch (err) {
      console.error('Error generating report:', err);
      toast({
        title: 'Generation Failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
        duration: 5000,
      });
      throw err;
    } finally {
      setGenerating(false);
    }
  };

  return {
    reports,
    loading,
    error,
    generating,
    generateReport,
    refetch: fetchReports
  };
};

// ============================================================================
// useAuditStats - Get audit statistics
// ============================================================================

export const useAuditStats = (startDate?: string, endDate?: string) => {
  const [stats, setStats] = useState<{
    total_actions: number;
    total_views: number;
    total_transitions: number;
    unique_users: number;
    actions_by_type: Record<string, number>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await AuditService.getAuditStats(startDate, endDate);
      setStats(data);
    } catch (err) {
      console.error('Error fetching audit stats:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
};

// ============================================================================
// useStateTransitionLogger - Helper to log state transitions
// ============================================================================

export const useStateTransitionLogger = () => {
  const { toast } = useToast();

  const logTransition = async (
    entityType: string,
    entityId: string,
    fromState: string,
    toState: string,
    reason?: string,
    workflowInstanceId?: string
  ) => {
    try {
      await AuditService.logStateTransition(
        entityType,
        entityId,
        fromState,
        toState,
        reason,
        workflowInstanceId
      );
    } catch (err) {
      console.error('Failed to log state transition:', err);
      toast({
        title: 'Audit Logging Failed',
        description: 'Failed to log state transition',
        variant: 'destructive',
        duration: 3000,
      });
    }
  };

  return { logTransition };
};
