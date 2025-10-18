import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Clock, 
  Shield, 
  UserCheck, 
  UserX,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  Download
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface UserMetric {
  label: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  icon: React.ReactNode;
  color: string;
}

interface ChartData {
  name: string;
  value: number;
  color: string;
}

const UserAnalytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedMetric, setSelectedMetric] = useState('registrations');

  // Mock analytics data
  const userMetrics: UserMetric[] = [
    {
      label: 'Total Users',
      value: 1284,
      change: 12.5,
      trend: 'up',
      icon: <Users className="h-5 w-5" />,
      color: 'text-blue-600'
    },
    {
      label: 'Active Users',
      value: 892,
      change: 8.3,
      trend: 'up',
      icon: <UserCheck className="h-5 w-5" />,
      color: 'text-green-600'
    },
    {
      label: 'New Registrations',
      value: 47,
      change: -5.2,
      trend: 'down',
      icon: <TrendingUp className="h-5 w-5" />,
      color: 'text-purple-600'
    },
    {
      label: 'Suspended Users',
      value: 23,
      change: 15.8,
      trend: 'up',
      icon: <UserX className="h-5 w-5" />,
      color: 'text-red-600'
    },
    {
      label: 'Avg Session Duration',
      value: 24,
      change: 3.7,
      trend: 'up',
      icon: <Clock className="h-5 w-5" />,
      color: 'text-orange-600'
    },
    {
      label: 'Admin Actions',
      value: 156,
      change: -2.1,
      trend: 'down',
      icon: <Shield className="h-5 w-5" />,
      color: 'text-indigo-600'
    }
  ];

  const roleDistribution: ChartData[] = [
    { name: 'Clients', value: 1089, color: '#3B82F6' },
    { name: 'Loan Officers', value: 142, color: '#10B981' },
    { name: 'Support', value: 34, color: '#F59E0B' },
    { name: 'Admins', value: 19, color: '#EF4444' }
  ];

  const statusDistribution: ChartData[] = [
    { name: 'Active', value: 892, color: '#10B981' },
    { name: 'Inactive', value: 234, color: '#6B7280' },
    { name: 'Pending', value: 135, color: '#F59E0B' },
    { name: 'Suspended', value: 23, color: '#EF4444' }
  ];

  const registrationTrend = [
    { month: 'Jan', users: 45 },
    { month: 'Feb', users: 52 },
    { month: 'Mar', users: 48 },
    { month: 'Apr', users: 61 },
    { month: 'May', users: 55 },
    { month: 'Jun', users: 67 },
    { month: 'Jul', users: 73 },
    { month: 'Aug', users: 69 },
    { month: 'Sep', users: 78 },
    { month: 'Oct', users: 82 },
    { month: 'Nov', users: 76 },
    { month: 'Dec', users: 84 }
  ];

  const getTrendIcon = (trend: string, change: number) => {
    if (trend === 'up') {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    } else if (trend === 'down') {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    return <Activity className="h-4 w-4 text-gray-500" />;
  };

  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  const exportAnalytics = () => {
    const data = {
      metrics: userMetrics,
      roleDistribution,
      statusDistribution,
      registrationTrend,
      generatedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user-analytics-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Simple bar chart component
  const BarChart: React.FC<{ data: any[]; dataKey: string; height?: number }> = ({ 
    data, 
    dataKey, 
    height = 200 
  }) => {
    const maxValue = Math.max(...data.map(item => item[dataKey]));
    
    return (
      <div className="flex items-end justify-between h-48 px-4 py-2">
        {data.map((item, index) => (
          <div key={index} className="flex flex-col items-center">
            <div
              className="bg-blue-500 rounded-t min-w-[20px] flex items-end justify-center text-xs text-white font-medium"
              style={{
                height: `${(item[dataKey] / maxValue) * (height - 40)}px`,
                minHeight: '20px'
              }}
            >
              {item[dataKey]}
            </div>
            <span className="text-xs text-gray-600 mt-2 text-center">
              {item.month}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // Simple pie chart component
  const PieChart: React.FC<{ data: ChartData[] }> = ({ data }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    
    return (
      <div className="space-y-4">
        <div className="flex justify-center">
          <div className="relative w-48 h-48">
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
              {data.map((item, index) => {
                const percentage = (item.value / total) * 100;
                const strokeDasharray = `${percentage} ${100 - percentage}`;
                const strokeDashoffset = data
                  .slice(0, index)
                  .reduce((sum, prev) => sum + (prev.value / total) * 100, 0);
                
                return (
                  <circle
                    key={index}
                    cx="50"
                    cy="50"
                    r="15.9"
                    fill="transparent"
                    stroke={item.color}
                    strokeWidth="8"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={-strokeDashoffset}
                    className="transition-all duration-300"
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold">{total}</div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {data.map((item, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm">{item.name}</span>
              <span className="text-sm font-medium ml-auto">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">User Analytics</h2>
          <p className="text-gray-600">Comprehensive user metrics and insights</p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportAnalytics}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {userMetrics.map((metric, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{metric.label}</p>
                  <p className="text-2xl font-bold">
                    {metric.label.includes('Duration') ? `${metric.value}m` : metric.value.toLocaleString()}
                  </p>
                  <div className="flex items-center space-x-1 mt-1">
                    {getTrendIcon(metric.trend, metric.change)}
                    <span className={`text-sm ${
                      metric.trend === 'up' ? 'text-green-600' : 
                      metric.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {formatChange(metric.change)}
                    </span>
                  </div>
                </div>
                <div className={metric.color}>
                  {metric.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Registration Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              User Registration Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={registrationTrend} dataKey="users" />
          </CardContent>
        </Card>

        {/* Role Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChartIcon className="h-5 w-5 mr-2" />
              User Role Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PieChart data={roleDistribution} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>User Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <PieChart data={statusDistribution} />
          </CardContent>
        </Card>

        {/* Top User Activities */}
        <Card>
          <CardHeader>
            <CardTitle>Top User Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { action: 'Login', count: 2847, percentage: 45 },
                { action: 'View Dashboard', count: 1923, percentage: 30 },
                { action: 'Update Profile', count: 856, percentage: 13 },
                { action: 'Make Payment', count: 634, percentage: 10 },
                { action: 'Upload Document', count: 127, percentage: 2 }
              ].map((activity, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Activity className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">{activity.action}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${activity.percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">
                      {activity.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Table */}
      <Card>
        <CardHeader>
          <CardTitle>User Engagement Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Metric</th>
                  <th className="text-left p-2">Current Period</th>
                  <th className="text-left p-2">Previous Period</th>
                  <th className="text-left p-2">Change</th>
                  <th className="text-left p-2">Trend</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { metric: 'Daily Active Users', current: 234, previous: 218, change: 7.3 },
                  { metric: 'Weekly Active Users', current: 567, previous: 543, change: 4.4 },
                  { metric: 'Monthly Active Users', current: 892, previous: 823, change: 8.4 },
                  { metric: 'Average Session Length', current: '24m', previous: '22m', change: 9.1 },
                  { metric: 'Bounce Rate', current: '23%', previous: '28%', change: -17.9 },
                  { metric: 'User Retention (7d)', current: '68%', previous: '64%', change: 6.3 }
                ].map((row, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{row.metric}</td>
                    <td className="p-2">{row.current}</td>
                    <td className="p-2">{row.previous}</td>
                    <td className="p-2">
                      <span className={`${
                        row.change > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatChange(row.change)}
                      </span>
                    </td>
                    <td className="p-2">
                      {getTrendIcon(row.change > 0 ? 'up' : 'down', row.change)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserAnalytics;
