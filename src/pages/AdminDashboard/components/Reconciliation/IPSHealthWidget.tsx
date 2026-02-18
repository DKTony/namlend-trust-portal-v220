/**
 * IPS Transaction Health Widget
 * Displays real-time IPS transaction health status and alerts
 */

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Activity,
  Bell,
  BellOff,
  Eye,
  CheckCheck,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatNAD } from '@/constants/regulatory';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
  const queryClient = useQueryClient();

  // Fetch IPS health data
  const {
    data: healthData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<IPSHealthData>({
    queryKey: ['ips-health'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_ips_transaction_health');
      if (error) throw error;
      return data as IPSHealthData;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch unresolved alerts
  const { data: alerts } = useQuery<IPSAlert[]>({
    queryKey: ['ips-alerts-unresolved'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ips_transaction_alerts')
        .select('*')
        .is('resolved_at', null)
        .order('severity', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as IPSAlert[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Acknowledge alert mutation
  const acknowledgeMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { data, error } = await supabase.rpc('acknowledge_ips_alert', {
        p_alert_id: alertId,
        p_notes: 'Acknowledged via dashboard',
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ips-alerts-unresolved'] });
      queryClient.invalidateQueries({ queryKey: ['ips-health'] });
      toast.success('Alert acknowledged');
    },
    onError: (error) => {
      toast.error('Failed to acknowledge alert: ' + (error as Error).message);
    },
  });

  // Resolve alert mutation
  const resolveMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { data, error } = await supabase.rpc('resolve_ips_alert', {
        p_alert_id: alertId,
        p_notes: 'Resolved via dashboard',
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ips-alerts-unresolved'] });
      queryClient.invalidateQueries({ queryKey: ['ips-health'] });
      toast.success('Alert resolved');
    },
    onError: (error) => {
      toast.error('Failed to resolve alert: ' + (error as Error).message);
    },
  });

  // Run manual check
  const runCheckMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('check_stuck_ips_transactions');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ips-health'] });
      queryClient.invalidateQueries({ queryKey: ['ips-alerts-unresolved'] });
      if (data && data[0]) {
        const result = data[0];
        if (result.alerts_created > 0) {
          toast.warning(
            `Created ${result.alerts_created} new alerts (${result.critical_count} critical)`
          );
        } else {
          toast.success('Check complete - no new issues found');
        }
      }
    },
    onError: (error) => {
      toast.error('Check failed: ' + (error as Error).message);
    },
  });

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
  const HealthIcon = healthStatus.icon || Activity;

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
          <Badge
            variant="outline"
            className="text-xs border-yellow-500 text-yellow-600 dark:text-yellow-400"
          >
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
                  onClick={() => runCheckMutation.mutate()}
                  disabled={runCheckMutation.isPending}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${runCheckMutation.isPending ? 'animate-spin' : ''}`}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Run manual check</TooltipContent>
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
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {isLoading ? '...' : healthData?.summary.final_state || 0}
            </div>
            <div className="text-xs text-muted-foreground">Final State</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {isLoading ? '...' : healthData?.stuck_transactions.count || 0}
            </div>
            <div className="text-xs text-muted-foreground">Stuck (&gt;1h)</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {isLoading ? '...' : healthData?.unresolved_alerts.critical || 0}
            </div>
            <div className="text-xs text-muted-foreground">Critical Alerts</div>
          </div>
        </div>

        {/* Stuck Transactions Summary */}
        {healthData && healthData.stuck_transactions.count > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <Clock className="h-4 w-4" />
              <span className="font-medium">Stuck Transactions</span>
            </div>
            <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
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
                        ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
                        : alert.severity === 'warning'
                          ? 'border-yellow-300 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20'
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
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
            <CheckCircle className="h-8 w-8 mx-auto text-green-600 dark:text-green-400 mb-2" />
            <p className="text-sm font-medium text-green-800 dark:text-green-200">All Clear</p>
            <p className="text-xs text-green-600 dark:text-green-400">
              No stuck transactions or unresolved alerts
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default IPSHealthWidget;
