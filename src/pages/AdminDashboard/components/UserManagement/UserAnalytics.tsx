import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Activity,
  BarChart3,
  Clock,
  Download,
  PieChart as PieChartIcon,
  Shield,
  TrendingUp,
  UserCheck,
  Users,
  UserX,
} from 'lucide-react';
import { api } from '@/integrations/convex/api';
import { useQuery } from 'convex/react';
import React from 'react';

interface UserMetric {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

interface ChartData {
  name: string;
  value: number;
  color: string;
}

const UserAnalytics: React.FC = () => {
  const clientMetrics = useQuery(api.analytics.getClientMetrics);
  const users = useQuery(api.users.listUsers, { limit: 500 });
  const auditLogs = useQuery(api.audit.getAuditLogs, { limit: 200 });

  const roleCounts = (users ?? []).reduce(
    (acc, user) => {
      const role = user.role ?? 'client';
      acc[role] = (acc[role] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const userMetrics: UserMetric[] = [
    {
      label: 'Total Users',
      value: clientMetrics?.totalClients ?? users?.length ?? 0,
      icon: <Users className="h-5 w-5" />,
      color: 'text-blue-600 ',
    },
    {
      label: 'KYC verified',
      value: clientMetrics?.kycApproved ?? 0,
      icon: <UserCheck className="h-5 w-5" />,
      color: 'text-green-600 ',
    },
    {
      label: 'New (30 days)',
      value: clientMetrics?.newThisMonth ?? 0,
      icon: <TrendingUp className="h-5 w-5" />,
      color: 'text-purple-600 ',
    },
    {
      label: 'KYC pending',
      value: clientMetrics?.kycPending ?? 0,
      icon: <UserX className="h-5 w-5" />,
      color: 'text-red-600 ',
    },
    {
      label: 'With active loans',
      value: clientMetrics?.withActiveLoans ?? 0,
      icon: <Clock className="h-5 w-5" />,
      color: 'text-orange-600 ',
    },
    {
      label: 'Audit events (recent)',
      value: auditLogs?.length ?? 0,
      icon: <Shield className="h-5 w-5" />,
      color: 'text-indigo-600 ',
    },
  ];

  const roleDistribution: ChartData[] = [
    { name: 'Clients', value: roleCounts.client ?? 0, color: '#3B82F6' },
    { name: 'Loan Officers', value: roleCounts.loan_officer ?? 0, color: '#10B981' },
    {
      name: 'Admins',
      value: (roleCounts.admin ?? 0) + (roleCounts.tenant_admin ?? 0),
      color: '#EF4444',
    },
  ];

  const statusDistribution: ChartData[] = [
    { name: 'KYC verified', value: clientMetrics?.kycApproved ?? 0, color: '#10B981' },
    { name: 'KYC pending', value: clientMetrics?.kycPending ?? 0, color: '#F59E0B' },
  ];

  const topActivities = Object.entries(
    (auditLogs ?? []).reduce(
      (acc, log) => {
        acc[log.action] = (acc[log.action] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    )
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const topActivityMax = topActivities[0]?.[1] ?? 0;
  const uniqueAuditActors = new Set(
    (auditLogs ?? []).map((log) => (log.userId ? String(log.userId) : 'system'))
  ).size;

  const exportAnalytics = () => {
    const data = {
      metrics: userMetrics.map(({ label, value }) => ({ label, value })),
      roleDistribution,
      statusDistribution,
      topActivities: Object.fromEntries(topActivities),
      generatedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user-analytics-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const PieChart: React.FC<{ data: ChartData[] }> = ({ data }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);

    return (
      <div className="space-y-4">
        <div className="flex justify-center">
          <div className="relative w-48 h-48">
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
              {data.map((item, index) => {
                const percentage = total === 0 ? 0 : (item.value / total) * 100;
                const strokeDasharray = `${percentage} ${100 - percentage}`;
                const strokeDashoffset = data
                  .slice(0, index)
                  .reduce((sum, prev) => sum + (total === 0 ? 0 : (prev.value / total) * 100), 0);

                return (
                  <circle
                    key={index}
                    cx="50"
                    cy="50"
                    r="15.9"
                    fill="transparent"
                    stroke={item.color}
                    strokeWidth="8"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={-strokeDashoffset}
                    className="transition-all duration-300"
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">{total}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {data.map((item, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-sm text-foreground">{item.name}</span>
              <span className="text-sm font-medium ml-auto text-foreground">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">User Analytics</h2>
          <p className="text-muted-foreground">
            Live Convex snapshot — session analytics (DAU/WAU, bounce, retention) are not stored
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportAnalytics}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {userMetrics.map((metric) => (
          <Card key={metric.label} className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                  <p className="text-2xl font-bold text-foreground">
                    {metric.value.toLocaleString()}
                  </p>
                </div>
                <div className={metric.color}>{metric.icon}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center text-foreground">
              <BarChart3 className="h-5 w-5 mr-2" />
              User Registration Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Historical monthly registration series is not stored. Use the 30-day new-user count
              above.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center text-foreground">
              <PieChartIcon className="h-5 w-5 mr-2" />
              User Role Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PieChart data={roleDistribution} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">User Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <PieChart data={statusDistribution} />
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Top audit actions</CardTitle>
          </CardHeader>
          <CardContent>
            {topActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No audit events in the recent window.</p>
            ) : (
              <div className="space-y-4">
                {topActivities.map(([action, count]) => (
                  <div key={action} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 min-w-0 flex-1 mr-2">
                      <Activity className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium truncate text-foreground" title={action}>
                        {action}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      <div className="w-20 bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{
                            width: `${topActivityMax === 0 ? 0 : (count / topActivityMax) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-12 text-right tabular-nums">
                        {count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Current snapshot</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-foreground">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-2">Metric</th>
                  <th className="text-left p-2">Value</th>
                  <th className="text-left p-2">Source</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    metric: 'Registered users (query window)',
                    value: users?.length ?? 0,
                    source: 'api.users.listUsers',
                  },
                  {
                    metric: 'KYC verified clients',
                    value: clientMetrics?.kycApproved ?? 0,
                    source: 'api.analytics.getClientMetrics',
                  },
                  {
                    metric: 'Recent audit events',
                    value: auditLogs?.length ?? 0,
                    source: 'api.audit.getAuditLogs',
                  },
                  {
                    metric: 'Distinct actors in recent audit',
                    value: uniqueAuditActors,
                    source: 'auditLogs.userId',
                  },
                ].map((row) => (
                  <tr
                    key={row.metric}
                    className="border-b border-border hover:bg-muted/50 transition-colors"
                  >
                    <td className="p-2 font-medium truncate max-w-[280px]" title={row.metric}>
                      {row.metric}
                    </td>
                    <td className="p-2 tabular-nums">{row.value}</td>
                    <td className="p-2 text-sm text-muted-foreground">{row.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserAnalytics;
