import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
// Temporarily disabled recharts due to d3-array build issue
// import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import {
  AlertTriangle,
  Shield,
  TrendingUp,
  TrendingDown,
  Target,
  Users,
  DollarSign,
  Calendar,
} from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '@/integrations/convex/api';

interface RiskAnalysisProps {
  dateRange?: string;
}

const RiskAnalysis: React.FC<RiskAnalysisProps> = ({ dateRange }) => {
  const risk = useQuery(api.analytics.getRiskMetrics);
  const portfolio = useQuery(api.analytics.getPortfolioSummary, {});

  const { riskDistribution, riskFactors, riskAlerts } = useMemo(() => {
    const nplRatio = risk?.nplRatio ?? 0;
    const par30Ratio = risk?.par30Ratio ?? 0;
    const overdueCount = risk?.nonPerformingLoans ?? 0;
    const activeLoans = portfolio?.loans?.active ?? 0;

    const lowPct = activeLoans > 0 ? Math.max(0, 100 - Math.round(nplRatio * 100 * 5)) : 70;
    const highPct = Math.round(nplRatio * 100 * 2);
    const critPct = Math.round(par30Ratio * 100);
    const medPct = Math.max(0, 100 - lowPct - highPct - critPct);

    return {
      riskDistribution: [
        { name: 'Low Risk', value: lowPct, color: '#22c55e' },
        { name: 'Medium Risk', value: medPct, color: '#f59e0b' },
        { name: 'High Risk', value: highPct, color: '#ef4444' },
        { name: 'Critical Risk', value: critPct, color: '#dc2626' },
      ],
      riskFactors: [
        {
          factor: 'Payment Timeliness',
          impact: Math.max(0, 100 - Math.round(nplRatio * 100 * 10)),
          trend: nplRatio < 0.05 ? 'stable' : 'worsening',
        },
        {
          factor: 'Portfolio Quality (NPL)',
          impact: Math.max(0, 100 - Math.round(nplRatio * 100 * 5)),
          trend: nplRatio < 0.03 ? 'improving' : nplRatio < 0.08 ? 'stable' : 'worsening',
        },
        {
          factor: 'PAR 30+ Ratio',
          impact: Math.max(0, 100 - Math.round(par30Ratio * 100 * 3)),
          trend: par30Ratio < 0.05 ? 'stable' : 'worsening',
        },
        {
          factor: 'Active Loan Count',
          impact: activeLoans > 10 ? 80 : activeLoans > 0 ? 60 : 20,
          trend: activeLoans > 0 ? 'stable' : 'worsening',
        },
        {
          factor: 'Overdue Amount Coverage',
          impact: (risk?.overdueAmount ?? 0) > 0 ? 50 : 95,
          trend: (risk?.overdueAmount ?? 0) > 0 ? 'worsening' : 'improving',
        },
      ],
      riskAlerts: [
        ...(nplRatio > 0.05
          ? [
              {
                level: 'high',
                title: 'Elevated Default Risk',
                description: `NPL ratio is ${(nplRatio * 100).toFixed(1)}% — above 5% threshold`,
                count: overdueCount,
              },
            ]
          : []),
        ...(par30Ratio > 0.03
          ? [
              {
                level: 'medium',
                title: 'PAR 30+ Warning',
                description: `${(par30Ratio * 100).toFixed(1)}% of portfolio is 30+ days overdue`,
                count: Math.round(par30Ratio * activeLoans),
              },
            ]
          : []),
        ...(overdueCount === 0 && activeLoans > 0
          ? [
              {
                level: 'low',
                title: 'Portfolio Health Good',
                description: 'No overdue payment schedules detected',
                count: 0,
              },
            ]
          : []),
      ],
    };
  }, [risk, portfolio]);

  const riskTrends = [
    {
      month: 'Current',
      lowRisk: riskDistribution[0].value,
      mediumRisk: riskDistribution[1].value,
      highRisk: riskDistribution[2].value,
      criticalRisk: riskDistribution[3].value,
    },
  ];

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
      case 'high':
        return 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30';
      case 'critical':
        return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case 'worsening':
        return <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />;
      default:
        return <Target className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />;
      case 'medium':
        return <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />;
      default:
        return <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Risk Analysis</h2>
          <p className="text-muted-foreground">Portfolio risk assessment and monitoring</p>
        </div>
        <Badge variant="outline" className="text-sm">
          Updated 10 minutes ago
        </Badge>
      </div>

      {/* Risk Alerts */}
      <div className="space-y-3">
        {riskAlerts.map((alert, index) => (
          <Alert
            key={index}
            className={`border-l-4 ${
              alert.level === 'high'
                ? 'border-l-red-500'
                : alert.level === 'medium'
                  ? 'border-l-yellow-500'
                  : 'border-l-blue-500'
            }`}
          >
            <div className="flex items-start space-x-3">
              {getAlertIcon(alert.level)}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{alert.title}</h4>
                  <Badge variant="secondary" className="text-xs">
                    {alert.count} items
                  </Badge>
                </div>
                <AlertDescription className="mt-1">{alert.description}</AlertDescription>
              </div>
            </div>
          </Alert>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Risk Distribution (Placeholder) */}
        <Card>
          <CardHeader>
            <CardTitle>Risk Distribution by Portfolio</CardTitle>
            <CardDescription>Current risk assessment across all active loans</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
              <div className="w-full max-w-sm space-y-3 p-4">
                {riskDistribution.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <span className="text-sm font-medium">{item.value}%</span>
                  </div>
                ))}
                <div className="text-xs text-muted-foreground pt-2">Chart temporarily disabled</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Risk Trends (Placeholder) */}
        <Card>
          <CardHeader>
            <CardTitle>Risk Trends</CardTitle>
            <CardDescription>Risk distribution over recent months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg w-full">
              <div className="w-full max-w-md p-4">
                <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground mb-2 min-w-[280px]">
                  <div className="font-medium">Month</div>
                  <div className="text-right">Low</div>
                  <div className="text-right">Med</div>
                  <div className="text-right">High</div>
                </div>
                <div className="space-y-1">
                  {riskTrends.map((r, idx) => (
                    <div key={idx} className="grid grid-cols-4 gap-2 text-sm">
                      <div>{r.month}</div>
                      <div className="text-right">{r.lowRisk}%</div>
                      <div className="text-right">{r.mediumRisk}%</div>
                      <div className="text-right">{r.highRisk}%</div>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground pt-2">Chart temporarily disabled</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Factors */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Factors Analysis</CardTitle>
          <CardDescription>Key factors contributing to portfolio risk</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {riskFactors.map((factor, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{factor.factor}</span>
                    {getTrendIcon(factor.trend)}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">{factor.impact}% impact</span>
                    <Badge
                      variant="secondary"
                      className={`text-xs ${
                        factor.trend === 'improving'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                          : factor.trend === 'worsening'
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400'
                      }`}
                    >
                      {factor.trend}
                    </Badge>
                  </div>
                </div>
                <Progress value={factor.impact} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Risk Metrics Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio at Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">20%</div>
            <p className="text-xs text-muted-foreground">+2% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expected Loss</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">NAD 125K</div>
            <p className="text-xs text-muted-foreground">-5% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">47</div>
            <p className="text-xs text-muted-foreground">+3 from last week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Days Past Due</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12.5</div>
            <p className="text-xs text-muted-foreground">Average days overdue</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RiskAnalysis;
