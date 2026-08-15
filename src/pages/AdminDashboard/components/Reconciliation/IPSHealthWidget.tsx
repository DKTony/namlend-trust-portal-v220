/**
 * IPS Transaction Health Widget
 * Displays real-time IPS transaction health status and alerts
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatNAD } from '@/utils/currency';
import { api } from '@/integrations/convex/api';
import type { Id } from '@/types/convex';
import { useMutation as useConvexMutation, useQuery as useConvexQuery } from 'convex/react';
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCheck,
  CheckCircle,
  Clock,
  Eye,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

interface IPSHealthData {
  summary: {
    total_transactions: number;
    final_state: number;
    pending_state: number;
    timeout_state: number;
  };
  stuck_transactions: {
    count: number;
    total_amount: number;
    oldest_hours: number;
  };
  unresolved_alerts: {
    total: number;
    critical: number;
    warning: number;
  };
  last_check: string;
}

interface IPSAlert {
  id: string;
  ips_transaction_id: string;
  alert_type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  hours_stuck: number;
  amount: number;
  acknowledged_at: string | null;
  resolved_at: string | null;
  created_at: string;
}

export function IPSHealthWidget() {
  const [acknowledgePending, setAcknowledgePending] = useState(false);
  const [resolvePending, setResolvePending] = useState(false);

  // Convex reactive queries
  const rawAlerts = useConvexQuery(api.ips.ipsAlerts.getActiveAlerts);
  const rawTransactions = useConvexQuery(api.ips.ipsTransactions.adminListIpsTransactions, {
    limit: 200,
  });

  const resolveAlertMutation = useConvexMutation(api.ips.ipsAlerts.resolveAlert);

  const isLoading = rawAlerts === undefined;

  // Derive health data from reactive queries
  const healthData: IPSHealthData | null = useMemo(() => {
    if (!rawTransactions) return null;
    const total = rawTransactions.length;
    const finalState = rawTransactions.filter((t) =>
      ['success', 'completed', 'failed'].includes(t.status)
    ).length;
    const pendingState = rawTransactions.filter((t) =>
      ['pending', 'initiated', 'sent'].includes(t.status)
    ).length;
    const timeoutState = rawTransactions.filter((t) => t.status === 'timeout').length;

    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const stuck = rawTransactions.filter(
      (t) => ['pending', 'initiated', 'sent'].includes(t.status) && t.createdAt < oneHourAgo
    );
    const stuckAmount = stuck.reduce((sum, t) => sum + (t.amount ?? 0), 0);
    const oldestStuckMs =
      stuck.length > 0 ? Math.max(...stuck.map((t) => Date.now() - t.createdAt)) : 0;

    const unresolvedAlerts = rawAlerts ?? [];
    const criticalAlerts = unresolvedAlerts.filter((a) => a.severity === 'critical').length;
    const warningAlerts = unresolvedAlerts.filter((a) => a.severity === 'warning').length;

    return {
      summary: {
        total_transactions: total,
        final_state: finalState,
        pending_state: pendingState,
        timeout_state: timeoutState,
      },
      stuck_transactions: {
        count: stuck.length,
        total_amount: stuckAmount,
        oldest_hours: oldestStuckMs / (1000 * 60 * 60),
      },
      unresolved_alerts: {
        total: unresolvedAlerts.length,
        critical: criticalAlerts,
        warning: warningAlerts,
      },
      last_check: new Date().toISOString(),
    };
  }, [rawTransactions, rawAlerts]);

  // Map Convex alerts to expected shape
  const alerts: IPSAlert[] | null = useMemo(() => {
    if (!rawAlerts) return null;
    return rawAlerts.slice(0, 10).map((a) => ({
      id: String(a._id),
      ips_transaction_id: String(a.transactionId ?? ''),
      alert_type: a.alertType ?? '',
      severity: a.severity ?? 'info',
      message: a.message ?? '',
      hours_stuck: 0,
      amount: Number(a.metadata?.amount ?? 0),
      acknowledged_at:
        typeof a.metadata?.acknowledgedAt === 'number'
          ? new Date(a.metadata.acknowledgedAt).toISOString()
          : null,
      resolved_at: a.resolvedAt ? new Date(a.resolvedAt).toISOString() : null,
      created_at: a.createdAt ? new Date(a.createdAt).toISOString() : new Date().toISOString(),
    }));
  }, [rawAlerts]);

  // Acknowledge alert — using resolve since Convex only has resolveAlert
  const acknowledgeMutation = {
    isPending: acknowledgePending,
    mutate: async (alertId: string) => {
      setAcknowledgePending(true);
      try {
        await resolveAlertMutation({ alertId: alertId as Id<'ipsAlerts'> });
        toast.success('Alert acknowledged');
      } catch (error) {
        toast.error('Failed to acknowledge alert: ' + (error as Error).message);
      } finally {
        setAcknowledgePending(false);
      }
    },
  };

  // Resolve alert
  const resolveMutation = {
    isPending: resolvePending,
    mutate: async (alertId: string) => {
      setResolvePending(true);
      try {
        await resolveAlertMutation({ alertId: alertId as Id<'ipsAlerts'> });
        toast.success('Alert resolved');
      } catch (error) {
        toast.error('Failed to resolve alert: ' + (error as Error).message);
      } finally {
        setResolvePending(false);
      }
    },
  };

  const getHealthStatus = () => {
    if (!healthData) return { status: 'unknown', color: 'bg-gray-500' };

    const { stuck_transactions, unresolved_alerts } = healthData;

    if (unresolved_alerts.critical > 0 || stuck_transactions.count > 5) {
      return { status: 'critical', color: 'bg-red-500', icon: XCircle };
    }
    if (unresolved_alerts.warning > 0 || stuck_transactions.count > 0) {
      return { status: 'warning', color: 'bg-yellow-500', icon: AlertTriangle };
    }
    return { status: 'healthy', color: 'bg-green-500', icon: CheckCircle };
  };

  const healthStatus = getHealthStatus();

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return (
          <Badge variant="destructive" className="text-xs">
            Critical
          </Badge>
        );
      case 'warning':
        return (
          <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600 ">
            Warning
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="text-xs">
            Info
          </Badge>
        );
    }
  };

  return (
    <Card className="col-span-full lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4" />
            IPS Transaction Health
          </CardTitle>
          <CardDescription className="text-xs">
            Real-time monitoring • Last check:{' '}
            {healthData?.last_check
              ? new Date(healthData.last_check).toLocaleTimeString()
              : 'Never'}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <div className={`h-3 w-3 rounded-full ${healthStatus.color} animate-pulse`} />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled
                  title="IPS health is live via Convex; there is no extra probe"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Health is live via Convex; there is no extra probe</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Health Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="text-2xl font-bold text-foreground">
              {isLoading ? '...' : healthData?.summary.total_transactions || 0}
            </div>
            <div className="text-xs text-muted-foreground">Total Transactions</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="text-2xl font-bold text-green-600 ">
              {isLoading ? '...' : healthData?.summary.final_state || 0}
            </div>
            <div className="text-xs text-muted-foreground">Final State</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="text-2xl font-bold text-yellow-600 ">
              {isLoading ? '...' : healthData?.stuck_transactions.count || 0}
            </div>
            <div className="text-xs text-muted-foreground">Stuck (&gt;1h)</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="text-2xl font-bold text-red-600 ">
              {isLoading ? '...' : healthData?.unresolved_alerts.critical || 0}
            </div>
            <div className="text-xs text-muted-foreground">Critical Alerts</div>
          </div>
        </div>

        {/* Stuck Transactions Summary */}
        {healthData && healthData.stuck_transactions.count > 0 && (
          <div className="bg-yellow-50  border border-yellow-200  rounded-lg p-3">
            <div className="flex items-center gap-2 text-yellow-800 ">
              <Clock className="h-4 w-4" />
              <span className="font-medium">Stuck Transactions</span>
            </div>
            <div className="mt-2 text-sm text-yellow-700 ">
              {healthData.stuck_transactions.count} transaction(s) totaling{' '}
              <strong>{formatNAD(healthData.stuck_transactions.total_amount)}</strong> stuck for up
              to <strong>{healthData.stuck_transactions.oldest_hours.toFixed(1)}h</strong>
            </div>
          </div>
        )}

        {/* Unresolved Alerts */}
        {alerts && alerts.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Unresolved Alerts ({alerts.length})
              </span>
            </div>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`rounded-lg border p-3 ${
                      alert.severity === 'critical'
                        ? 'border-red-300  bg-red-50 '
                        : alert.severity === 'warning'
                          ? 'border-yellow-300  bg-yellow-50 '
                          : 'border-border bg-muted/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getSeverityBadge(alert.severity)}
                          <span className="text-xs text-muted-foreground">
                            {new Date(alert.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-foreground line-clamp-2">{alert.message}</p>
                        {alert.acknowledged_at && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            Acknowledged {new Date(alert.acknowledged_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        {!alert.acknowledged_at && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => acknowledgeMutation.mutate(alert.id)}
                                  disabled={acknowledgeMutation.isPending}
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Acknowledge</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => resolveMutation.mutate(alert.id)}
                                disabled={resolveMutation.isPending}
                              >
                                <CheckCheck className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Resolve</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* All Clear State */}
        {(!alerts || alerts.length === 0) && healthData?.stuck_transactions.count === 0 && (
          <div className="bg-green-50  border border-green-200  rounded-lg p-4 text-center">
            <CheckCircle className="h-8 w-8 mx-auto text-green-600  mb-2" />
            <p className="text-sm font-medium text-green-800 ">All Clear</p>
            <p className="text-xs text-green-600 ">No stuck transactions or unresolved alerts</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default IPSHealthWidget;
