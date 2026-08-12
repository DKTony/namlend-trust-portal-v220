import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AdaptiveTabs } from '@/components/adaptive/AdaptiveTabs';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import {
  BarChart3,
  Calendar,
  DollarSign,
  Download,
  FileText,
  Filter,
  PieChart,
  TrendingUp,
} from 'lucide-react';
import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

// Sub-components
import ComplianceReports from './ComplianceReports';
import PerformanceMetrics from './PerformanceMetrics';
import PortfolioAnalytics from './PortfolioAnalytics';
import ReportGenerator from './ReportGenerator';
import RiskAnalysis from './RiskAnalysis';

const ANALYTICS_TABS = ['portfolio', 'performance', 'risk', 'reports', 'compliance'];

const AnalyticsDashboard: React.FC = () => {
  // Deep-linkable tab (e.g. the admin header Reports button → ?tab=reports)
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(
    initialTab && ANALYTICS_TABS.includes(initialTab) ? initialTab : 'portfolio'
  );
  const [dateRange, setDateRange] = useState('30d');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analytics & Reporting</h2>
          <p className="text-muted-foreground">
            Comprehensive analytics, insights, and regulatory reports
          </p>
        </div>
        <div className="flex space-x-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring text-foreground"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
            <option value="custom">Custom range</option>
          </select>
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
          <Button size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Quick Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1 mr-2">
                <p className="text-sm text-muted-foreground truncate">Total Portfolio Value</p>
                <p className="text-xl sm:text-2xl font-bold truncate tabular-nums text-foreground">
                  N$2.4M
                </p>
                <p className="text-xs text-green-600  truncate">+12% vs last month</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600  shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1 mr-2">
                <p className="text-sm text-muted-foreground truncate">Active Loans</p>
                <p className="text-xl sm:text-2xl font-bold truncate tabular-nums text-foreground">
                  156
                </p>
                <p className="text-xs text-blue-600  truncate">+8 this month</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600  shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1 mr-2">
                <p className="text-sm text-muted-foreground truncate">Portfolio Health</p>
                <p className="text-xl sm:text-2xl font-bold truncate tabular-nums text-foreground">
                  94.2%
                </p>
                <p className="text-xs text-green-600  truncate">Excellent</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600  shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1 mr-2">
                <p className="text-sm text-muted-foreground truncate">Risk Score</p>
                <p className="text-xl sm:text-2xl font-bold truncate tabular-nums text-foreground">
                  2.1
                </p>
                <p className="text-xs text-green-600  truncate">Low Risk</p>
              </div>
              <BarChart3 className="h-8 w-8 text-orange-600  shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <AdaptiveTabs
          items={[
            { value: 'portfolio', label: 'Portfolio', icon: PieChart },
            { value: 'performance', label: 'Performance', icon: TrendingUp },
            { value: 'risk', label: 'Risk Analysis', icon: BarChart3, shortLabel: 'Risk' },
            { value: 'reports', label: 'Reports', icon: FileText },
            { value: 'compliance', label: 'Compliance', icon: Calendar },
          ]}
        />

        <TabsContent value="portfolio" className="space-y-4">
          <PortfolioAnalytics dateRange={dateRange} />
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <PerformanceMetrics dateRange={dateRange} />
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          <RiskAnalysis dateRange={dateRange} />
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <ReportGenerator />
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <ComplianceReports />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsDashboard;
