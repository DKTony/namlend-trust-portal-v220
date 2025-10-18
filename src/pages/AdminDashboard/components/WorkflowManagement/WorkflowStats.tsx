/**
 * Workflow Statistics Component
 * Dashboard stats for workflow engine
 * Version: v2.4.0
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GitBranch, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useWorkflowStats } from '@/hooks/useWorkflow';

const WorkflowStats: React.FC = () => {
  const { stats, loading } = useWorkflowStats();

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="py-8">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: 'Active Workflows',
      value: stats?.total_active || 0,
      icon: GitBranch,
      color: 'text-blue-500',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Pending My Action',
      value: stats?.pending_my_action || 0,
      icon: Clock,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-100'
    },
    {
      title: 'Completed Today',
      value: stats?.completed_today || 0,
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Rejected Today',
      value: stats?.rejected_today || 0,
      icon: XCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-100'
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${stat.bgColor}`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default WorkflowStats;
