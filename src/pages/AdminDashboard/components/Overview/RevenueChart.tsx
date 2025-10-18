import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// Temporarily disabled recharts due to d3-array build issue
// import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface RevenueData {
  month: string;
  revenue: number;
  disbursed: number;
  repayments: number;
}

interface RevenueChartProps {
  data: RevenueData[];
  loading?: boolean;
  chartType?: 'line' | 'bar';
}

const RevenueChart: React.FC<RevenueChartProps> = ({ 
  data, 
  loading = false, 
  chartType = 'line' 
}) => {
  const formatCurrency = (value: number) => {
    return `N$${value.toLocaleString('en-NA')}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{`Month: ${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {`${entry.dataKey === 'revenue' ? 'Revenue' : 
                 entry.dataKey === 'disbursed' ? 'Disbursed' : 'Repayments'}: ${formatCurrency(entry.value)}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revenue Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading chart...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Temporary placeholder while recharts is disabled
  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue Analytics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
          <div className="text-center">
            <div className="text-lg font-medium text-muted-foreground mb-2">Chart Temporarily Disabled</div>
            <div className="text-sm text-muted-foreground">
              Recharts disabled due to d3-array build issue
            </div>
            <div className="mt-4 text-xs text-muted-foreground">
              Data points: {data.length} months
            </div>
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Disbursed</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Repayments</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RevenueChart;
