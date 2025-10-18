import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  PieChart, 
  Download, 
  Calendar,
  Filter,
  FileText,
  Users,
  DollarSign
} from 'lucide-react';

// Sub-components
import PortfolioAnalytics from './PortfolioAnalytics';
import PerformanceMetrics from './PerformanceMetrics';
import RiskAnalysis from './RiskAnalysis';
import ReportGenerator from './ReportGenerator';
import ComplianceReports from './ComplianceReports';

const AnalyticsDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('portfolio');
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
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
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
              <div>
                <p className="text-sm text-gray-600">Total Portfolio Value</p>
                <p className="text-2xl font-bold">N$2.4M</p>
                <p className="text-xs text-green-600">+12% vs last month</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Loans</p>
                <p className="text-2xl font-bold">156</p>
                <p className="text-xs text-blue-600">+8 this month</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Portfolio Health</p>
                <p className="text-2xl font-bold">94.2%</p>
                <p className="text-xs text-green-600">Excellent</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Risk Score</p>
                <p className="text-2xl font-bold">2.1</p>
                <p className="text-xs text-green-600">Low Risk</p>
              </div>
              <BarChart3 className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="portfolio" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Portfolio
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="risk" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Risk Analysis
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Reports
          </TabsTrigger>
          <TabsTrigger value="compliance" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Compliance
          </TabsTrigger>
        </TabsList>

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
