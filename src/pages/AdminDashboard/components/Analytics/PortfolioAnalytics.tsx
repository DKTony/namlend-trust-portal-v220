import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// Temporarily disabled recharts due to d3-array build issue

interface PortfolioAnalyticsProps {
  dateRange: string;
}

const PortfolioAnalytics: React.FC<PortfolioAnalyticsProps> = ({ dateRange }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Portfolio Analytics</h2>
        <div className="text-sm text-muted-foreground">
          Date Range: {dateRange}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Loan Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
              <div className="text-center">
                <div className="text-lg font-medium text-muted-foreground mb-2">Chart Temporarily Disabled</div>
                <div className="text-sm text-muted-foreground">Recharts disabled due to d3-array build issue</div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Active:</span>
                    <span className="font-medium">156</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Pending:</span>
                    <span className="font-medium">23</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Completed:</span>
                    <span className="font-medium">89</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Risk Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
              <div className="text-center">
                <div className="text-lg font-medium text-muted-foreground mb-2">Chart Temporarily Disabled</div>
                <div className="text-sm text-muted-foreground">Recharts disabled due to d3-array build issue</div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Low Risk:</span>
                    <span className="font-medium">45%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Medium Risk:</span>
                    <span className="font-medium">35%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">High Risk:</span>
                    <span className="font-medium">20%</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
              <div className="text-center">
                <div className="text-lg font-medium text-muted-foreground mb-2">Chart Temporarily Disabled</div>
                <div className="text-sm text-muted-foreground">Recharts disabled due to d3-array build issue</div>
                <div className="mt-4 text-xs text-muted-foreground">
                  6 months of performance data available
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Average Loan Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">N$15,385</div>
            <p className="text-xs text-green-600">+5.2% vs last period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Portfolio Yield</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18.5%</div>
            <p className="text-xs text-blue-600">Within target range</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Default Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.1%</div>
            <p className="text-xs text-green-600">Below industry average</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PortfolioAnalytics;
