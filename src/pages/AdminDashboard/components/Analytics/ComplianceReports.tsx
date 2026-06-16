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
import React, { useState } from 'react';

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
  const [, setSelectedReport] = useState<string | null>(null);

  // Mock compliance metrics data
  const complianceMetrics: ComplianceMetric[] = [
    {
      title: 'APR Compliance',
      value: '28.5%',
      status: 'compliant',
      target: '≤32%',
      description: 'Average APR across all active loans',
      lastChecked: '2 hours ago',
    },
    {
      title: 'KYC Completion Rate',
      value: '94.2%',
      status: 'compliant',
      target: '≥90%',
      description: 'Percentage of clients with complete KYC',
      lastChecked: '1 hour ago',
    },
    {
      title: 'Loan Documentation',
      value: '87.8%',
      status: 'warning',
      target: '≥95%',
      description: 'Complete loan documentation compliance',
      lastChecked: '3 hours ago',
    },
    {
      title: 'Data Retention',
      value: '99.1%',
      status: 'compliant',
      target: '≥99%',
      description: 'Compliance with data retention policies',
      lastChecked: '6 hours ago',
    },
    {
      title: 'Risk Assessment',
      value: '91.5%',
      status: 'compliant',
      target: '≥85%',
      description: 'Loans with proper risk assessment',
      lastChecked: '4 hours ago',
    },
    {
      title: 'Audit Trail',
      value: '96.7%',
      status: 'compliant',
      target: '≥95%',
      description: 'Complete audit trail maintenance',
      lastChecked: '1 hour ago',
    },
  ];

  // Mock compliance reports data
  const complianceReports: ComplianceReport[] = [
    {
      id: '1',
      title: 'Bank of Namibia Monthly Report',
      type: 'regulatory',
      status: 'current',
      dueDate: '2025-01-31',
      lastGenerated: '2025-01-01',
      frequency: 'monthly',
    },
    {
      id: '2',
      title: 'Anti-Money Laundering Report',
      type: 'regulatory',
      status: 'due',
      dueDate: '2025-01-15',
      frequency: 'quarterly',
    },
    {
      id: '3',
      title: 'Internal Audit Report',
      type: 'internal',
      status: 'current',
      dueDate: '2025-02-28',
      lastGenerated: '2024-12-15',
      frequency: 'quarterly',
    },
    {
      id: '4',
      title: 'Consumer Protection Report',
      type: 'regulatory',
      status: 'overdue',
      dueDate: '2025-01-05',
      frequency: 'monthly',
    },
    {
      id: '5',
      title: 'Annual Compliance Review',
      type: 'audit',
      status: 'current',
      dueDate: '2025-03-31',
      lastGenerated: '2024-03-31',
      frequency: 'annually',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant':
      case 'current':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800';
      case 'warning':
      case 'due':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
      case 'violation':
      case 'overdue':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant':
      case 'current':
        return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case 'warning':
      case 'due':
        return <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />;
      case 'violation':
      case 'overdue':
        return <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />;
      default:
        return <Shield className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
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

  const generateReport = (reportId: string) => {
    console.log(`Generating report: ${reportId}`);
    // Mock report generation
    alert(
      `Generating compliance report... This would trigger the actual report generation process.`
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Compliance Reports</h2>
          <p className="text-muted-foreground">Regulatory compliance monitoring and reporting</p>
        </div>
        <Badge variant="outline" className="text-sm">
          Last updated 1 hour ago
        </Badge>
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
          <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
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
          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
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
                        ? 'bg-green-100 dark:bg-green-900/30'
                        : report.status === 'due'
                          ? 'bg-yellow-100 dark:bg-yellow-900/30'
                          : 'bg-red-100 dark:bg-red-900/30'
                    }`}
                  >
                    <FileText
                      className={`h-5 w-5 ${
                        report.status === 'current'
                          ? 'text-green-600 dark:text-green-400'
                          : report.status === 'due'
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : 'text-red-600 dark:text-red-400'
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
            <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400 truncate tabular-nums">
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
            <div className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400 truncate tabular-nums">
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
            <div className="text-xl sm:text-2xl font-bold text-yellow-600 dark:text-yellow-400 truncate tabular-nums">
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
            <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400 truncate tabular-nums">
              8
            </div>
            <p className="text-xs text-muted-foreground truncate">Reports this quarter</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ComplianceReports;
