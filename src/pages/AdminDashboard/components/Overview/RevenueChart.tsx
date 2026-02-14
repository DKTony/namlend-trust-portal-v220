import React from 'react';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
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
  const { styles } = useTheme();
  
  const formatCurrency = (value: number) => {
    return `N$${value.toLocaleString('en-NA')}`;
  };

  interface TooltipPayloadEntry {
    dataKey: string;
    value: number;
    color: string;
  }

  interface CustomTooltipProps {
    active?: boolean;
    payload?: TooltipPayloadEntry[];
    label?: string;
  }

  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background p-3 border border-border rounded-lg shadow-lg">
          <p className="font-medium text-foreground">{`Month: ${label}`}</p>
          {payload.map((entry: TooltipPayloadEntry, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm tabular-nums">
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
      <ThemedCard className="bg-card border-border">
        <div className="pb-4 border-b border-border mb-4">
          <h3 className={cn("text-lg font-semibold", styles.textClass)}>Revenue Analytics</h3>
        </div>
        <div className="h-80 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading chart...</div>
        </div>
      </ThemedCard>
    );
  }

  // Temporary placeholder while recharts is disabled
  return (
    <ThemedCard>
      <div className="pb-4 border-b border-border mb-4">
        <h3 className={cn("text-lg font-semibold", styles.textClass)}>Revenue Analytics</h3>
      </div>
      <div>
        <div className="h-80 flex items-center justify-center border-2 border-dashed border-border rounded-lg">
          <div className="text-center">
            <div className="text-lg font-medium text-muted-foreground mb-2">Chart Temporarily Disabled</div>
            <div className="text-sm text-muted-foreground">
              Recharts disabled due to d3-array build issue
            </div>
            <div className="mt-4 text-xs text-muted-foreground">
              Data points: {data.length} months
            </div>
            <div className="flex items-center justify-center space-x-4 mt-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 dark:bg-blue-400 rounded-full"></div>
                <span className="text-sm text-muted-foreground">Disbursed</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-purple-500 dark:bg-purple-400 rounded-full"></div>
                <span className="text-sm text-muted-foreground">Repayments</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ThemedCard>
  );
};

export default RevenueChart;
