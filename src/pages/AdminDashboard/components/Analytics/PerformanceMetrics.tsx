import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Target, Award, AlertTriangle, CheckCircle } from 'lucide-react';

interface MetricCard {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'stable';
  target?: string;
  status: 'excellent' | 'good' | 'warning' | 'poor';
}

interface PerformanceMetricsProps {
  dateRange?: string;
}

const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ dateRange }) => {
  // Mock performance metrics data
  const performanceMetrics: MetricCard[] = [
    {
      title: 'Loan Approval Rate',
      value: '78.5%',
      change: '+2.3%',
      trend: 'up',
      target: '80%',
      status: 'good'
    },
    {
      title: 'Average Processing Time',
      value: '2.4 days',
      change: '-0.6 days',
      trend: 'up',
      target: '2 days',
      status: 'warning'
    },
    {
      title: 'Customer Satisfaction',
      value: '4.6/5',
      change: '+0.2',
      trend: 'up',
      target: '4.5/5',
      status: 'excellent'
    },
    {
      title: 'Default Rate',
      value: '3.2%',
      change: '-0.8%',
      trend: 'up',
      target: '<5%',
      status: 'excellent'
    },
    {
      title: 'Revenue Growth',
      value: '15.7%',
      change: '+3.2%',
      trend: 'up',
      target: '12%',
      status: 'excellent'
    },
    {
      title: 'Cost per Acquisition',
      value: 'NAD 245',
      change: '+NAD 15',
      trend: 'down',
      target: 'NAD 200',
      status: 'warning'
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent':
        return <Award className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case 'good':
        return <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />;
      case 'poor':
        return <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />;
      default:
        return <Target className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400';
      case 'good':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400';
      case 'warning':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400';
      case 'poor':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />;
      default:
        return <Target className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getProgressValue = (value: string, target: string) => {
    // Simple progress calculation for demonstration
    const numValue = parseFloat(value.replace(/[^\d.]/g, ''));
    const numTarget = parseFloat(target.replace(/[^\d.]/g, ''));
    return Math.min((numValue / numTarget) * 100, 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Performance Metrics</h2>
          <p className="text-muted-foreground">
            Key performance indicators and business metrics
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          Updated 5 minutes ago
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {performanceMetrics.map((metric, index) => (
          <Card key={index} className="relative">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.title}
              </CardTitle>
              {getStatusIcon(metric.status)}
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1 mr-2">
                    <div className="text-xl sm:text-2xl font-bold truncate tabular-nums" title={metric.value}>
                      {metric.value}
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 shrink-0">
                    {getTrendIcon(metric.trend)}
                    <span className={`text-sm tabular-nums ${
                      metric.trend === 'up' ? 'text-green-600' : 
                      metric.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {metric.change}
                    </span>
                  </div>
                </div>
                
                {metric.target && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground truncate mr-2">Target: {metric.target}</span>
                      <Badge 
                        variant="secondary" 
                        className={`${getStatusColor(metric.status)} shrink-0`}
                      >
                        {metric.status}
                      </Badge>
                    </div>
                    <Progress 
                      value={getProgressValue(metric.value, metric.target)} 
                      className="h-2"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Section */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Summary</CardTitle>
          <CardDescription>
            Overall performance assessment and recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-medium text-green-600 dark:text-green-400 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Strengths
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Excellent customer satisfaction scores</li>
                <li>• Low default rate well below target</li>
                <li>• Strong revenue growth trajectory</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-yellow-600 dark:text-yellow-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Areas for Improvement
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Reduce average processing time</li>
                <li>• Optimize customer acquisition costs</li>
                <li>• Increase loan approval rate to target</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceMetrics;
