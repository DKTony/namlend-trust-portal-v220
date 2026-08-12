import { toast } from '@/hooks/use-toast';
import { api } from '@/integrations/convex/api';
import { APR_LIMIT } from '@/constants/regulatory';
import { downloadCsv } from '@/utils/downloadFile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from 'convex/react';
import {
  AlertTriangle,
  DollarSign,
  Download,
  FileText,
  PieChart,
  TrendingUp,
  Users,
} from 'lucide-react';
import React, { useState } from 'react';

/**
 * Generates CSV reports directly from the live analytics queries.
 * Reports download immediately in the browser — no server-side generation
 * step. The date range applies to the revenue/payment reports (the underlying
 * getRevenueMetrics query filters by date); portfolio/risk/client reports are
 * point-in-time snapshots.
 */
const ReportGenerator: React.FC = () => {
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  const portfolio = useQuery(api.analytics.getPortfolioSummary, {});
  const risk = useQuery(api.analytics.getRiskMetrics, {});
  const clients = useQuery(api.analytics.getClientMetrics, {});
  const revenue = useQuery(api.analytics.getRevenueMetrics, {
    dateFrom: dateRange.from || undefined,
    dateTo: dateRange.to || undefined,
  });

  const reportTypes = [
    {
      id: 'portfolio-summary',
      name: 'Portfolio Summary Report',
      description: 'Comprehensive overview of loan portfolio performance',
      icon: PieChart,
      category: 'Portfolio',
    },
    {
      id: 'financial-performance',
      name: 'Financial Performance Report',
      description: 'Revenue, collections and income split for the selected period',
      icon: TrendingUp,
      category: 'Financial',
    },
    {
      id: 'risk-assessment',
      name: 'Risk Assessment Report',
      description: 'NPL ratio, PAR30/PAR90 and overdue exposure',
      icon: AlertTriangle,
      category: 'Risk',
    },
    {
      id: 'client-analytics',
      name: 'Client Analytics Report',
      description: 'Client base, KYC funnel and repeat-borrower metrics',
      icon: Users,
      category: 'Clients',
    },
    {
      id: 'payment-analysis',
      name: 'Payment Analysis Report',
      description: 'Collections and payment volume for the selected period',
      icon: DollarSign,
      category: 'Payments',
    },
    {
      id: 'regulatory-compliance',
      name: 'Regulatory Compliance Report',
      description: 'APR limit adherence and portfolio compliance snapshot',
      icon: FileText,
      category: 'Compliance',
    },
  ];

  const dataReady =
    portfolio !== undefined && risk !== undefined && clients !== undefined && revenue !== undefined;

  const handleReportSelection = (reportId: string) => {
    setSelectedReports((prev) =>
      prev.includes(reportId) ? prev.filter((id) => id !== reportId) : [...prev, reportId]
    );
  };

  const generateReports = () => {
    if (!dataReady) {
      toast({ title: 'Analytics still loading', description: 'Try again in a moment.' });
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const period =
      dateRange.from || dateRange.to
        ? `${dateRange.from || 'start'} to ${dateRange.to || 'today'}`
        : 'all time';

    const builders: Record<string, () => void> = {
      'portfolio-summary': () =>
        downloadCsv(
          `portfolio-summary-${today}.csv`,
          ['Metric', 'Value'],
          [
            ['Total loans', portfolio!.loans.total],
            ['Active loans', portfolio!.loans.active],
            ['Pending review', portfolio!.loans.pending],
            ['Approved', portfolio!.loans.approved],
            ['Rejected', portfolio!.loans.rejected],
            ['Paid off', portfolio!.loans.completed],
            ['Total outstanding (NAD)', portfolio!.portfolio.totalOutstanding.toFixed(2)],
            ['Total disbursed (NAD)', portfolio!.portfolio.totalDisbursed.toFixed(2)],
            ['Total repaid (NAD)', portfolio!.portfolio.totalRepaid.toFixed(2)],
            ['Average loan size (NAD)', portfolio!.portfolio.averageLoanSize.toFixed(2)],
          ]
        ),
      'financial-performance': () =>
        downloadCsv(
          `financial-performance-${today}.csv`,
          ['Metric', 'Value', 'Period'],
          [
            ['Interest income (NAD)', revenue!.interestIncome.toFixed(2), period],
            ['Fees income (NAD)', revenue!.feesIncome.toFixed(2), period],
            ['Total income (NAD)', revenue!.totalIncome.toFixed(2), period],
            ['Principal repaid (NAD)', revenue!.principalRepaid.toFixed(2), period],
            ['Total collected (NAD)', revenue!.totalCollected.toFixed(2), period],
            ['Payment count', revenue!.paymentCount, period],
          ]
        ),
      'risk-assessment': () =>
        downloadCsv(
          `risk-assessment-${today}.csv`,
          ['Metric', 'Value'],
          [
            ['Non-performing installments', risk!.nonPerformingLoans],
            ['Overdue amount (NAD)', risk!.overdueAmount.toFixed(2)],
            ['NPL ratio', (risk!.nplRatio * 100).toFixed(2) + '%'],
            ['PAR 30 (NAD)', risk!.par30.toFixed(2)],
            ['PAR 90 (NAD)', risk!.par90.toFixed(2)],
            ['PAR 30 ratio', (risk!.par30Ratio * 100).toFixed(2) + '%'],
          ]
        ),
      'client-analytics': () =>
        downloadCsv(
          `client-analytics-${today}.csv`,
          ['Metric', 'Value'],
          [
            ['Total clients', clients!.totalClients],
            ['KYC verified', clients!.kycApproved],
            ['KYC pending', clients!.kycPending],
            ['New this month', clients!.newThisMonth],
            ['With active loans', clients!.withActiveLoans],
            ['Repeat borrowers', clients!.repeatBorrowers],
          ]
        ),
      'payment-analysis': () =>
        downloadCsv(
          `payment-analysis-${today}.csv`,
          ['Metric', 'Value', 'Period'],
          [
            ['Payments received', revenue!.paymentCount, period],
            ['Total collected (NAD)', revenue!.totalCollected.toFixed(2), period],
            ['Principal share (NAD)', revenue!.principalRepaid.toFixed(2), period],
            ['Interest share (NAD)', revenue!.interestIncome.toFixed(2), period],
            ['Fees share (NAD)', revenue!.feesIncome.toFixed(2), period],
          ]
        ),
      'regulatory-compliance': () =>
        downloadCsv(
          `regulatory-compliance-${today}.csv`,
          ['Check', 'Value'],
          [
            ['Regulatory APR limit', `${APR_LIMIT}%`],
            ['Active loans', portfolio!.loans.active],
            ['Total outstanding (NAD)', portfolio!.portfolio.totalOutstanding.toFixed(2)],
            ['NPL ratio', (risk!.nplRatio * 100).toFixed(2) + '%'],
            ['KYC verified clients', clients!.kycApproved],
            ['KYC pending clients', clients!.kycPending],
            ['Report generated', new Date().toISOString()],
          ]
        ),
    };

    for (const id of selectedReports) builders[id]?.();
    toast({
      title: 'Reports downloaded',
      description: `${selectedReports.length} CSV report${selectedReports.length > 1 ? 's' : ''} generated from live data.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Report Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Report Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Date range applies to the Financial Performance and Payment Analysis reports; other
            reports are point-in-time snapshots.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">From Date</label>
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))}
                className="w-full p-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">To Date</label>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))}
                className="w-full p-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring text-foreground"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Reports */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportTypes.map((report) => {
          const Icon = report.icon;
          const isSelected = selectedReports.includes(report.id);

          return (
            <Card
              key={report.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                isSelected ? 'ring-2 ring-blue-500 bg-blue-50 ' : ''
              }`}
              onClick={() => handleReportSelection(report.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div
                    className={`p-3 rounded-full shrink-0 ${
                      isSelected ? 'bg-blue-100 ' : 'bg-muted'
                    }`}
                  >
                    <Icon
                      className={`h-6 w-6 ${
                        isSelected ? 'text-blue-600 ' : 'text-muted-foreground'
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-foreground truncate" title={report.name}>
                        {report.name}
                      </h3>
                      {isSelected && (
                        <div className="w-5 h-5 bg-blue-600  rounded-full flex items-center justify-center shrink-0 ml-2">
                          <svg
                            className="w-3 h-3 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                    <p
                      className="text-sm text-muted-foreground mb-3 line-clamp-2 min-h-[2.5rem]"
                      title={report.description}
                    >
                      {report.description}
                    </p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="bg-muted px-2 py-1 rounded-full text-muted-foreground shrink-0">
                        {report.category}
                      </span>
                      <span className="text-muted-foreground shrink-0 ml-2">CSV · instant</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Generate Reports Section */}
      {selectedReports.length > 0 && (
        <Card className="border-blue-200  bg-blue-50 ">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-900  mb-1">
                  {selectedReports.length} report{selectedReports.length > 1 ? 's' : ''} selected
                </h3>
                <p className="text-sm text-blue-700 ">
                  Generated in your browser from live portfolio data.
                </p>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => setSelectedReports([])}>
                  Clear Selection
                </Button>
                <Button onClick={generateReports} disabled={!dataReady}>
                  <Download className="h-4 w-4 mr-2" />
                  {dataReady ? 'Generate Reports' : 'Loading data…'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ReportGenerator;
