import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Loader2,
  PieChart,
  BarChart3,
  Target,
  Percent,
} from 'lucide-react';
import { formatNAD } from '@/utils/currency';
import { cn } from '@/lib/utils';
import { useQuery as useConvexQuery } from 'convex/react';
import { api } from '@/integrations/convex/api';

interface PortfolioAnalyticsProps {
  dateRange?: string;
}

interface PortfolioMetrics {
  totalLoans: number;
  totalDisbursed: number;
  totalOutstanding: number;
  totalRepaid: number;
  averageLoanAmount: number;
  averageInterestRate: number;
  averageTerm: number;
  byStatus: Record<string, number>;
  byPurpose: Record<string, number>;
  clientCount: number;
  repaymentRate: number;
  defaultRate: number;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500 dark:bg-green-600',
  disbursed: 'bg-blue-500 dark:bg-blue-600',
  pending: 'bg-yellow-500 dark:bg-yellow-600',
  approved: 'bg-emerald-500 dark:bg-emerald-600',
  completed: 'bg-gray-500 dark:bg-gray-600',
  rejected: 'bg-red-500 dark:bg-red-600',
  defaulted: 'bg-red-700 dark:bg-red-800',
};

const PortfolioAnalytics: React.FC<PortfolioAnalyticsProps> = ({ dateRange = '30d' }) => {
  const [selectedPeriod, setSelectedPeriod] = useState(dateRange);
  const refreshing = false;

  // Convex reactive queries
  const portfolioRaw = useConvexQuery(api.analytics.getPortfolioSummary, {});
  const clientRaw = useConvexQuery(api.analytics.getClientMetrics);
  const riskRaw = useConvexQuery(api.analytics.getRiskMetrics);

  const loading = portfolioRaw === undefined;

  const metrics: PortfolioMetrics | null = useMemo(() => {
    if (!portfolioRaw) return null;
    return {
      totalLoans: portfolioRaw.totalLoans ?? 0,
      totalDisbursed: portfolioRaw.totalDisbursed ?? 0,
      totalOutstanding: portfolioRaw.totalOutstanding ?? 0,
      totalRepaid: portfolioRaw.totalRepayments ?? portfolioRaw.totalRepaid ?? 0,
      averageLoanAmount: portfolioRaw.averageLoanSize ?? 0,
      averageInterestRate: portfolioRaw.averageInterestRate ?? 0,
      averageTerm: portfolioRaw.averageTerm ?? 0,
      byStatus: portfolioRaw.byStatus ?? {},
      byPurpose: portfolioRaw.byPurpose ?? {},
      clientCount: clientRaw?.totalClients ?? 0,
      repaymentRate: portfolioRaw.repaymentRate ?? 0,
      defaultRate: riskRaw?.defaultRate ?? 0,
    };
  }, [portfolioRaw, clientRaw, riskRaw]);

  const fetchMetrics = (_showRefresh?: boolean) => {}; // Convex is reactive

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalStatusLoans = Object.values(metrics?.byStatus || {}).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Portfolio Analytics</h2>
          <p className="text-muted-foreground">
            Comprehensive view of your loan portfolio performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="12m">Last 12 Months</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchMetrics(true)}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1 mr-2">
                <p className="text-sm text-muted-foreground truncate">Total Disbursed</p>
                <p
                  className="text-xl sm:text-2xl font-bold truncate tabular-nums"
                  title={formatNAD(metrics?.totalDisbursed || 0)}
                >
                  {formatNAD(metrics?.totalDisbursed || 0)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500 dark:text-green-400 opacity-50 shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1 mr-2">
                <p className="text-sm text-muted-foreground truncate">Outstanding Balance</p>
                <p
                  className="text-xl sm:text-2xl font-bold truncate tabular-nums"
                  title={formatNAD(metrics?.totalOutstanding || 0)}
                >
                  {formatNAD(metrics?.totalOutstanding || 0)}
                </p>
              </div>
              <Target className="h-8 w-8 text-orange-500 dark:text-orange-400 opacity-50 shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1 mr-2">
                <p className="text-sm text-muted-foreground truncate">Total Repaid</p>
                <p
                  className="text-xl sm:text-2xl font-bold truncate tabular-nums"
                  title={formatNAD(metrics?.totalRepaid || 0)}
                >
                  {formatNAD(metrics?.totalRepaid || 0)}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-500 dark:text-blue-400 opacity-50 shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1 mr-2">
                <p className="text-sm text-muted-foreground truncate">Active Clients</p>
                <p
                  className="text-xl sm:text-2xl font-bold truncate tabular-nums"
                  title={String(metrics?.clientCount || 0)}
                >
                  {metrics?.clientCount || 0}
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-500 dark:text-purple-400 opacity-50 shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Average Loan Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="text-2xl font-bold truncate tabular-nums"
              title={formatNAD(metrics?.averageLoanAmount || 0)}
            >
              {formatNAD(metrics?.averageLoanAmount || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              Across {metrics?.totalLoans || 0} total loans
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Average Interest Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate tabular-nums">
              {(metrics?.averageInterestRate || 0).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">Annual Percentage Rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Average Term
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate tabular-nums">
              {(metrics?.averageTerm || 0).toFixed(0)} months
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate">Loan duration</p>
          </CardContent>
        </Card>
      </div>

      {/* Status & Risk Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Loan Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Loan Status Distribution
            </CardTitle>
            <CardDescription>Breakdown of loans by current status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(metrics?.byStatus || {}).map(([status, count]) => {
                const percentage = totalStatusLoans > 0 ? (count / totalStatusLoans) * 100 : 0;
                return (
                  <div key={status} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            'w-3 h-3 rounded-full',
                            STATUS_COLORS[status] || 'bg-gray-400'
                          )}
                        />
                        <span className="capitalize">{status.replace('_', ' ')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{count}</span>
                        <span className="text-muted-foreground">({percentage.toFixed(1)}%)</span>
                      </div>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Risk Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Risk Metrics
            </CardTitle>
            <CardDescription>Portfolio health indicators</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Repayment Rate</span>
                <Badge variant={metrics?.repaymentRate || 0 >= 80 ? 'default' : 'destructive'}>
                  {(metrics?.repaymentRate || 0).toFixed(1)}%
                </Badge>
              </div>
              <Progress value={metrics?.repaymentRate || 0} className="h-3" />
              <p className="text-xs text-muted-foreground mt-1">Target: 85%+</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Default Rate</span>
                <Badge variant={(metrics?.defaultRate || 0) <= 5 ? 'default' : 'destructive'}>
                  {(metrics?.defaultRate || 0).toFixed(1)}%
                </Badge>
              </div>
              <Progress value={metrics?.defaultRate || 0} className="h-3" />
              <p className="text-xs text-muted-foreground mt-1">Target: Below 5%</p>
            </div>

            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-3">Portfolio Health</h4>
              <div className="flex items-center gap-2">
                {(metrics?.defaultRate || 0) <= 3 ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-green-700 font-medium">Healthy</span>
                  </>
                ) : (metrics?.defaultRate || 0) <= 7 ? (
                  <>
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    <span className="text-yellow-700 font-medium">Moderate Risk</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <span className="text-red-700 font-medium">High Risk</span>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loan Purpose Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Loan Purpose Distribution</CardTitle>
          <CardDescription>What clients are borrowing for</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Object.entries(metrics?.byPurpose || {}).map(([purpose, count]) => (
              <div
                key={purpose}
                className="p-4 border border-border rounded-lg text-center bg-card"
              >
                <div className="text-2xl font-bold text-foreground">{count}</div>
                <div className="text-sm text-muted-foreground truncate" title={purpose}>
                  {purpose}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortfolioAnalytics;
