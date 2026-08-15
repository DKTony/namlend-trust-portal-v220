import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  FileText,
  Shield,
  TrendingUp,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/integrations/convex/api';
import { useMutation, useQuery } from 'convex/react';
import React, { useMemo, useState } from 'react';

interface ComplianceMetric {
  title: string;
  value: string;
  status: 'compliant' | 'warning' | 'violation';
  target: string;
  description: string;
  lastChecked: string;
}

interface ComplianceReport {
  id: string;
  title: string;
  type: 'regulatory' | 'internal' | 'audit';
  status: 'current' | 'due' | 'overdue';
  dueDate: string;
  lastGenerated?: string;
  frequency: 'monthly' | 'quarterly' | 'annually';
}

const ComplianceReports: React.FC = () => {
  const { toast } = useToast();
  const [, setSelectedReport] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const generate = useMutation(api.audit.generateComplianceReport);
  const storedReports = useQuery(api.audit.getComplianceReports, { limit: 20 });
  const portfolio = useQuery(api.analytics.getPortfolioSummary, {});
  const clients = useQuery(api.analytics.getClientMetrics);

  const avgApr = useMemo(() => {
    void portfolio;
    return null;
  }, [portfolio]);
  void avgApr;

  const kycRate =
    clients && clients.totalClients > 0 ? (clients.kycApproved / clients.totalClients) * 100 : 0;

  const complianceMetrics: ComplianceMetric[] = [
    {
      title: 'KYC Completion Rate',
      value: `${kycRate.toFixed(1)}%`,
      status: kycRate >= 90 ? 'compliant' : kycRate >= 70 ? 'warning' : 'violation',
      target: '≥90%',
      description: 'Percentage of clients with verified KYC',
      lastChecked: 'Live',
    },
    {
      title: 'APR cap',
      value: '32% legal max',
      status: 'compliant',
      target: '≤32%',
      description: 'createLoan and approval reject rates above 32%',
      lastChecked: 'Server enforced',
    },
    {
      title: 'Generated reports',
      value: String(storedReports?.length ?? 0),
      status: 'compliant',
      target: '≥0',
      description: 'Completed Convex compliance snapshots',
      lastChecked: 'Live',
    },
  ];

  const complianceReports: ComplianceReport[] = (storedReports ?? []).map((row) => ({
    id: String(row._id),
    title: row.reportType.replace(/_/g, ' '),
    type: row.reportType === 'security_audit' ? 'audit' : 'internal',
    status: row.status === 'completed' ? 'current' : row.status === 'failed' ? 'overdue' : 'due',
    dueDate: row.periodEnd,
    lastGenerated: new Date(row.generatedAt).toISOString(),
    frequency: 'monthly',
  }));

  const generateReport = async (reportId: string) => {
    setGenerating(true);
    try {
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const periodEnd = now.toISOString().slice(0, 10);
      const typeMap: Record<string, 'monthly_approvals' | 'user_activity' | 'security_audit'> = {
        '1': 'monthly_approvals',
        '2': 'user_activity',
        '3': 'security_audit',
      };
      await generate({
        reportType: typeMap[reportId] ?? 'monthly_approvals',
        periodStart,
        periodEnd,
      });
      toast({ title: 'Report generated', description: 'Snapshot stored in Convex.' });
    } catch (error) {
      toast({
        title: 'Generation failed',
        description: error instanceof Error ? error.message : 'Could not generate report',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };
  void generating;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant':
      case 'current':
        return 'bg-green-100  text-green-800  border-green-200 ';
      case 'warning':
      case 'due':
        return 'bg-yellow-100  text-yellow-800  border-yellow-200 ';
      case 'violation':
      case 'overdue':
        return 'bg-red-100  text-red-800  border-red-200 ';
      default:
        return 'bg-gray-100  text-gray-800  border-gray-200 ';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant':
      case 'current':
        return <CheckCircle className="h-4 w-4 text-green-600 " />;
      case 'warning':
      case 'due':
        return <Clock className="h-4 w-4 text-yellow-600 " />;
      case 'violation':
      case 'overdue':
        return <AlertTriangle className="h-4 w-4 text-red-600 " />;
      default:
        return <Shield className="h-4 w-4 text-gray-600 " />;
    }
  };

  const getProgressValue = (value: string, target: string) => {
    const numValue = parseFloat(value.replace(/[^\d.]/g, ''));
    const numTarget = parseFloat(target.replace(/[^\d.]/g, ''));

    if (target.includes('≤')) {
      return Math.max(0, 100 - (numValue / numTarget) * 100);
    } else {
      return Math.min((numValue / numTarget) * 100, 100);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Compliance Reports</h2>
          <p className="text-muted-foreground">Regulatory compliance monitoring and reporting</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateReport('1')}
            disabled={generating}
          >
            Generate approvals report
          </Button>
          <Badge variant="outline" className="text-sm">
            Live Convex data
          </Badge>
        </div>
      </div>

      {/* Compliance Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {complianceMetrics.map((metric, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium truncate mr-2" title={metric.title}>
                {metric.title}
              </CardTitle>
              <div className="shrink-0">{getStatusIcon(metric.status)}</div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1 mr-2">
                    <div
                      className="text-xl sm:text-2xl font-bold truncate tabular-nums"
                      title={metric.value}
                    >
                      {metric.value}
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className={`${getStatusColor(metric.status)} shrink-0`}
                  >
                    {metric.status}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground truncate mr-2">
                      Target: {metric.target}
                    </span>
                  </div>
                  <Progress value={getProgressValue(metric.value, metric.target)} className="h-2" />
                </div>

                <p className="text-xs text-muted-foreground truncate" title={metric.description}>
                  {metric.description}
                </p>
                <p
                  className="text-xs text-muted-foreground truncate"
                  title={`Last checked: ${metric.lastChecked}`}
                >
                  Last checked: {metric.lastChecked}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Compliance Alerts */}
      <div className="space-y-3">
        <Alert className="border-l-4 border-l-yellow-500">
          <AlertTriangle className="h-4 w-4 text-yellow-600 " />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>Loan Documentation compliance is below target (87.8% vs 95% target)</span>
              <Button variant="outline" size="sm">
                View Details
              </Button>
            </div>
          </AlertDescription>
        </Alert>

        <Alert className="border-l-4 border-l-red-500">
          <AlertTriangle className="h-4 w-4 text-red-600 " />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>Consumer Protection Report is overdue (Due: Jan 5, 2025)</span>
              <Button variant="outline" size="sm" onClick={() => generateReport('4')}>
                Generate Now
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>

      {/* Compliance Reports */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Regulatory Reports</CardTitle>
            <Button variant="outline" size="sm">
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {complianceReports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => setSelectedReport(report.id)}
              >
                <div className="flex items-center space-x-4 min-w-0">
                  <div
                    className={`p-2 rounded-full shrink-0 ${
                      report.status === 'current'
                        ? 'bg-green-100 '
                        : report.status === 'due'
                          ? 'bg-yellow-100 '
                          : 'bg-red-100 '
                    }`}
                  >
                    <FileText
                      className={`h-5 w-5 ${
                        report.status === 'current'
                          ? 'text-green-600 '
                          : report.status === 'due'
                            ? 'text-yellow-600 '
                            : 'text-red-600 '
                      }`}
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-medium truncate text-foreground" title={report.title}>
                      {report.title}
                    </h4>
                    <div className="flex items-center text-sm text-muted-foreground mt-1 space-x-3">
                      <span className="truncate">{report.frequency}</span>
                      <span>•</span>
                      <span className="truncate">Due: {report.dueDate}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  <Badge
                    variant={
                      report.status === 'current'
                        ? 'default'
                        : report.status === 'due'
                          ? 'secondary'
                          : 'destructive'
                    }
                  >
                    {report.status}
                  </Badge>
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    Generate
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Compliance Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium truncate mr-2">Overall Compliance</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-green-600  truncate tabular-nums">
              92.8%
            </div>
            <p className="text-xs text-muted-foreground truncate">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              +2.1% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium truncate mr-2">Overdue Reports</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-red-600  truncate tabular-nums">
              1
            </div>
            <p
              className="text-xs text-muted-foreground truncate"
              title="Consumer Protection Report"
            >
              Consumer Protection Report
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium truncate mr-2">Due This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-yellow-600  truncate tabular-nums">
              2
            </div>
            <p className="text-xs text-muted-foreground truncate">Reports requiring attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium truncate mr-2">Auto-Generated</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-blue-600  truncate tabular-nums">
              {storedReports?.length ?? 0}
            </div>
            <p className="text-xs text-muted-foreground truncate">Reports this quarter</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ComplianceReports;
