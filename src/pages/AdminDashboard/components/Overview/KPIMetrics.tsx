import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPIData {
  title: string;
  value: string | number;
  trend: 'up' | 'down' | 'stable';
  trendValue: string;
  description: string;
}

interface KPIMetricsProps {
  kpiData: KPIData[];
  loading?: boolean;
}

const KPIMetrics: React.FC<KPIMetricsProps> = ({ kpiData, loading = false }) => {
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'stable':
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      case 'stable':
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-32"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-24 mb-2"></div>
              <div className="flex items-center space-x-2">
                <div className="h-4 w-4 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-16"></div>
              </div>
              <div className="h-3 bg-gray-200 rounded w-28 mt-2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {kpiData.map((kpi, index) => (
        <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {kpi.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">
              {typeof kpi.value === 'number' 
                ? kpi.value.toLocaleString() 
                : kpi.value
              }
            </div>
            <div className="flex items-center space-x-2 mb-1">
              {getTrendIcon(kpi.trend)}
              <span className={`text-sm font-medium ${getTrendColor(kpi.trend)}`}>
                {kpi.trendValue}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {kpi.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default KPIMetrics;
