/**
 * React Hooks for Audit Logging
 * Version: v2.4.1
 */

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQuery as useConvexQuery, useMutation as useConvexMutation } from 'convex/react';
import { api } from '@/integrations/convex/api';

interface AuditLog {
  _id: string;
  entityType: string;
  entityId: string;
  action: string;
  oldState?: unknown;
  newState?: unknown;
  userId?: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

interface ViewLog {
  _id: string;
  userId: string;
  entityType: string;
  entityId: string;
  fieldsViewed?: string[];
  viewDurationMs?: number;
  timestamp: number;
}

interface StateTransition {
  _id: string;
  entityType: string;
  entityId: string;
  fromState: string;
  toState: string;
  transitionReason?: string;
  triggeredBy?: string;
  workflowInstanceId?: string;
  timestamp: number;
}

interface ComplianceReport {
  _id: string;
  reportType: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: number;
  generatedBy: string;
  reportData: Record<string, unknown>;
  status: string;
}

// ============================================================================
// useViewTracking - Track when users view sensitive data
// ============================================================================

export const useViewTracking = (entityType: string, entityId: string, fieldsViewed?: string[]) => {
  const [viewStartTime] = useState(Date.now());
  const logViewMutation = useConvexMutation(api.audit.logViewAccess);

  useEffect(() => {
    if (!entityType || !entityId) return;

    logViewMutation({ entityType, entityId, fieldsViewed }).catch((err) => {
      console.error('Failed to log view access:', err);
    });

    return () => {
      const duration = Date.now() - viewStartTime;
      logViewMutation({ entityType, entityId, fieldsViewed, viewDurationMs: duration }).catch(
        (err) => {
          console.error('Failed to log view duration:', err);
        }
      );
    };
  }, [entityType, entityId, viewStartTime]);
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
  const raw = useConvexQuery(api.audit.getAuditLogs, {
    entityType: filters?.entityType,
    entityId: filters?.entityId,
    userId: filters?.userId,
    startDate: filters?.startDate ? new Date(filters.startDate).getTime() : undefined,
    endDate: filters?.endDate ? new Date(filters.endDate).getTime() : undefined,
    limit: filters?.limit,
  });

  const logs = (raw ?? []) as AuditLog[];
  const loading = raw === undefined;
  const error = null;
  const refetch = useCallback(() => {}, []);

  return { logs, loading, error, refetch };
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
  const raw = useConvexQuery(api.audit.getViewLogs, { limit: filters?.limit });

  const logs = (raw ?? []) as ViewLog[];
  const loading = raw === undefined;
  const error = null;
  const refetch = useCallback(() => {}, []);

  return { logs, loading, error, refetch };
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
  const raw = useConvexQuery(api.audit.getStateTransitions, {
    entityType: filters?.entityType,
    entityId: filters?.entityId,
    limit: filters?.limit,
  });

  const transitions = (raw ?? []) as StateTransition[];
  const loading = raw === undefined;
  const error = null;
  const refetch = useCallback(() => {}, []);

  return { transitions, loading, error, refetch };
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
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();
  const generateMutation = useConvexMutation(api.audit.generateComplianceReport);

  const raw = useConvexQuery(api.audit.getComplianceReports, {
    reportType: filters?.reportType,
    limit: filters?.limit,
  });

  const reports = (raw ?? []) as ComplianceReport[];
  const loading = raw === undefined;
  const error = null;
  const refetch = useCallback(() => {}, []);

  const generateReport = async (
    reportType:
      | 'monthly_approvals'
      | 'user_activity'
      | 'state_changes'
      | 'view_access'
      | 'security_audit',
    periodStart: string,
    periodEnd: string
  ) => {
    try {
      setGenerating(true);
      await generateMutation({ reportType, periodStart, periodEnd });
      toast({
        title: 'Report Generated',
        description: 'Compliance report has been generated successfully',
        duration: 5000,
      });
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

  return { reports, loading, error, generating, generateReport, refetch };
};

// ============================================================================
// useAuditStats - Get audit statistics
// ============================================================================

export const useAuditStats = (_startDate?: string, _endDate?: string) => {
  const auditRaw = useConvexQuery(api.audit.getAuditLogs, { limit: 10000 });
  const transitionRaw = useConvexQuery(api.audit.getStateTransitions, { limit: 10000 });
  const viewRaw = useConvexQuery(api.audit.getViewLogs, { limit: 10000 });

  const loading = auditRaw === undefined || transitionRaw === undefined || viewRaw === undefined;

  const stats = loading
    ? null
    : {
        total_actions: (auditRaw ?? []).length,
        total_views: (viewRaw ?? []).length,
        total_transitions: (transitionRaw ?? []).length,
        unique_users: new Set((auditRaw ?? []).map((l: AuditLog) => l.userId).filter(Boolean)).size,
        actions_by_type: (auditRaw ?? []).reduce((acc: Record<string, number>, l: AuditLog) => {
          acc[l.action] = (acc[l.action] ?? 0) + 1;
          return acc;
        }, {}),
      };

  const refetch = useCallback(() => {}, []);
  return { stats, loading, error: null, refetch };
};

// ============================================================================
// useStateTransitionLogger - Helper to log state transitions
// ============================================================================

export const useStateTransitionLogger = () => {
  const { toast } = useToast();

  const logTransition = async (
    _entityType: string,
    _entityId: string,
    _fromState: string,
    _toState: string,
    _reason?: string,
    _workflowInstanceId?: string
  ) => {
    try {
      // State transitions are written via internalMutation (server-side only).
      // Client-side callers should trigger transitions through Convex mutations
      // that internally call internal.audit.writeStateTransition.
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
