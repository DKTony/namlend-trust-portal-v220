import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Download, 
  Calendar,
  FileText,
  Clock,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

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
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  // Mock compliance metrics data
  const complianceMetrics: ComplianceMetric[] = [
    {
      title: 'APR Compliance',
      value: '28.5%',
      status: 'compliant',
      target: '≤32%',
      description: 'Average APR across all active loans',
      lastChecked: '2 hours ago'
    },
    {
      title: 'KYC Completion Rate',
      value: '94.2%',
      status: 'compliant',
      target: '≥90%',
      description: 'Percentage of clients with complete KYC',
      lastChecked: '1 hour ago'
    },
    {
      title: 'Loan Documentation',
      value: '87.8%',
      status: 'warning',
      target: '≥95%',
      description: 'Complete loan documentation compliance',
      lastChecked: '3 hours ago'
    },
    {
      title: 'Data Retention',
      value: '99.1%',
      status: 'compliant',
      target: '≥99%',
      description: 'Compliance with data retention policies',
      lastChecked: '6 hours ago'
    },
    {
      title: 'Risk Assessment',
      value: '91.5%',
      status: 'compliant',
      target: '≥85%',
      description: 'Loans with proper risk assessment',
      lastChecked: '4 hours ago'
    },
    {
      title: 'Audit Trail',
      value: '96.7%',
      status: 'compliant',
      target: '≥95%',
      description: 'Complete audit trail maintenance',
      lastChecked: '1 hour ago'
    }
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
      frequency: 'monthly'
    },
    {
      id: '2',
      title: 'Anti-Money Laundering Report',
      type: 'regulatory',
      status: 'due',
      dueDate: '2025-01-15',
      frequency: 'quarterly'
    },
    {
      id: '3',
      title: 'Internal Audit Report',
      type: 'internal',
      status: 'current',
      dueDate: '2025-02-28',
      lastGenerated: '2024-12-15',
      frequency: 'quarterly'
    },
    {
      id: '4',
      title: 'Consumer Protection Report',
      type: 'regulatory',
      status: 'overdue',
      dueDate: '2025-01-05',
      frequency: 'monthly'
    },
    {
      id: '5',
      title: 'Annual Compliance Review',
      type: 'audit',
      status: 'current',
      dueDate: '2025-03-31',
      lastGenerated: '2024-03-31',
      frequency: 'annually'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant':
      case 'current':
        return 'bg-green-100 text-green-800';
      case 'warning':
      case 'due':
        return 'bg-yellow-100 text-yellow-800';
      case 'violation':
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant':
      case 'current':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
      case 'due':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'violation':
      case 'overdue':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Shield className="h-4 w-4 text-gray-600" />;
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
    alert(`Generating compliance report... This would trigger the actual report generation process.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Compliance Reports</h2>
          <p className="text-muted-foreground">
            Regulatory compliance monitoring and reporting
          </p>
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
              <CardTitle className="text-sm font-medium">
                {metric.title}
              </CardTitle>
              {getStatusIcon(metric.status)}
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">{metric.value}</div>
                  <Badge 
                    variant="secondary" 
                    className={getStatusColor(metric.status)}
                  >
                    {metric.status}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Target: {metric.target}</span>
                  </div>
                  <Progress 
                    value={getProgressValue(metric.value, metric.target)} 
                    className="h-2"
                  />
                </div>
                
                <p className="text-xs text-muted-foreground">
                  {metric.description}
                </p>
                <p className="text-xs text-muted-foreground">
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
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
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
          <AlertTriangle className="h-4 w-4 text-red-600" />
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
          <CardTitle>Compliance Reports</CardTitle>
          <CardDescription>
            Scheduled regulatory and internal compliance reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {complianceReports.map((report) => (
              <div 
                key={report.id} 
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-medium">{report.title}</h4>
                    <Badge variant="outline" className="text-xs">
                      {report.type}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <span>Due: {new Date(report.dueDate).toLocaleDateString()}</span>
                    <span>Frequency: {report.frequency}</span>
                    {report.lastGenerated && (
                      <span>Last: {new Date(report.lastGenerated).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant="secondary" 
                    className={getStatusColor(report.status)}
                  >
                    {report.status}
                  </Badge>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => generateReport(report.id)}
                  >
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
            <CardTitle className="text-sm font-medium">
              Overall Compliance
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">92.8%</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              +2.1% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Overdue Reports
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">1</div>
            <p className="text-xs text-muted-foreground">
              Consumer Protection Report
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Due This Month
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">2</div>
            <p className="text-xs text-muted-foreground">
              Reports requiring attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Auto-Generated
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">8</div>
            <p className="text-xs text-muted-foreground">
              Reports this quarter
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ComplianceReports;
