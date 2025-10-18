import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  Users, 
  LogIn, 
  LogOut, 
  Eye, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Globe,
  Monitor,
  Smartphone,
  Tablet
} from 'lucide-react';

interface ActiveUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  status: 'online' | 'idle' | 'away';
  lastActivity: string;
  currentPage: string;
  ipAddress: string;
  userAgent: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  sessionDuration: number;
}

interface ActivityEvent {
  id: string;
  userId: string;
  userName: string;
  action: string;
  timestamp: string;
  details: string;
  severity: 'info' | 'warning' | 'error';
}

const UserActivityMonitor: React.FC = () => {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityEvent[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Mock data for demonstration
  const mockActiveUsers: ActiveUser[] = [
    {
      id: 'user-1',
      fullName: 'John Doe',
      email: 'john.doe@namlend.com',
      role: 'loan_officer',
      status: 'online',
      lastActivity: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      currentPage: '/admin/loans',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      deviceType: 'desktop',
      sessionDuration: 3600
    },
    {
      id: 'user-2',
      fullName: 'Jane Smith',
      email: 'jane.smith@namlend.com',
      role: 'admin',
      status: 'online',
      lastActivity: new Date(Date.now() - 30 * 1000).toISOString(),
      currentPage: '/admin/users',
      ipAddress: '192.168.1.101',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      deviceType: 'desktop',
      sessionDuration: 7200
    },
    {
      id: 'user-3',
      fullName: 'Bob Johnson',
      email: 'bob.johnson@example.com',
      role: 'client',
      status: 'idle',
      lastActivity: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      currentPage: '/dashboard',
      ipAddress: '203.0.113.45',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
      deviceType: 'mobile',
      sessionDuration: 1800
    },
    {
      id: 'user-4',
      fullName: 'Alice Wilson',
      email: 'alice.wilson@namlend.com',
      role: 'support',
      status: 'away',
      lastActivity: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      currentPage: '/support/tickets',
      ipAddress: '192.168.1.102',
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
      deviceType: 'tablet',
      sessionDuration: 5400
    }
  ];

  const mockRecentActivity: ActivityEvent[] = [
    {
      id: 'activity-1',
      userId: 'user-2',
      userName: 'Jane Smith',
      action: 'User role updated',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      details: 'Changed user role from client to loan_officer',
      severity: 'info'
    },
    {
      id: 'activity-2',
      userId: 'user-1',
      userName: 'John Doe',
      action: 'Loan approved',
      timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      details: 'Approved loan application #LA-2024-001',
      severity: 'info'
    },
    {
      id: 'activity-3',
      userId: 'user-3',
      userName: 'Bob Johnson',
      action: 'Failed login attempt',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      details: 'Multiple failed login attempts detected',
      severity: 'warning'
    },
    {
      id: 'activity-4',
      userId: 'user-4',
      userName: 'Alice Wilson',
      action: 'Support ticket created',
      timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      details: 'Created support ticket #ST-2024-045',
      severity: 'info'
    },
    {
      id: 'activity-5',
      userId: 'system',
      userName: 'System',
      action: 'Database backup completed',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      details: 'Automated database backup completed successfully',
      severity: 'info'
    }
  ];

  useEffect(() => {
    // Initialize with mock data
    setActiveUsers(mockActiveUsers);
    setRecentActivity(mockRecentActivity);

    // Set up real-time monitoring
    if (isMonitoring) {
      const interval = setInterval(() => {
        // Simulate real-time updates
        setLastUpdate(new Date());
        
        // Update user statuses randomly
        setActiveUsers(prev => prev.map(user => ({
          ...user,
          lastActivity: Math.random() > 0.7 ? new Date().toISOString() : user.lastActivity,
          status: Math.random() > 0.8 ? 
            (['online', 'idle', 'away'][Math.floor(Math.random() * 3)] as any) : 
            user.status
        })));
      }, 30000); // Update every 30 seconds

      return () => clearInterval(interval);
    }
  }, [isMonitoring]);

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      online: 'bg-green-100 text-green-800 border-green-200',
      idle: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      away: 'bg-gray-100 text-gray-800 border-gray-200'
    };

    const icons = {
      online: <CheckCircle className="h-3 w-3 mr-1" />,
      idle: <Clock className="h-3 w-3 mr-1" />,
      away: <AlertCircle className="h-3 w-3 mr-1" />
    };

    return (
      <Badge variant="outline" className={variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800'}>
        {icons[status as keyof typeof icons]}
        <span className="capitalize">{status}</span>
      </Badge>
    );
  };

  const getDeviceIcon = (deviceType: string) => {
    const icons = {
      desktop: <Monitor className="h-4 w-4" />,
      mobile: <Smartphone className="h-4 w-4" />,
      tablet: <Tablet className="h-4 w-4" />
    };
    return icons[deviceType as keyof typeof icons] || <Monitor className="h-4 w-4" />;
  };

  const getSeverityBadge = (severity: string) => {
    const variants = {
      info: 'bg-blue-100 text-blue-800 border-blue-200',
      warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      error: 'bg-red-100 text-red-800 border-red-200'
    };

    return (
      <Badge variant="outline" className={variants[severity as keyof typeof variants] || 'bg-gray-100 text-gray-800'}>
        <span className="capitalize">{severity}</span>
      </Badge>
    );
  };

  const handleRefresh = () => {
    setLastUpdate(new Date());
    // In a real implementation, this would fetch fresh data
  };

  const toggleMonitoring = () => {
    setIsMonitoring(!isMonitoring);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">User Activity Monitor</h2>
          <p className="text-gray-600">Real-time monitoring of user activity and system events</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className={isMonitoring ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
            <Activity className="h-3 w-3 mr-1" />
            {isMonitoring ? 'Monitoring' : 'Paused'}
          </Badge>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={toggleMonitoring}>
            {isMonitoring ? 'Pause' : 'Resume'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Users</p>
                <p className="text-2xl font-bold">{activeUsers.filter(u => u.status === 'online').length}</p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Sessions</p>
                <p className="text-2xl font-bold">{activeUsers.length}</p>
              </div>
              <Globe className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Idle Users</p>
                <p className="text-2xl font-bold">{activeUsers.filter(u => u.status === 'idle').length}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Last Update</p>
                <p className="text-sm font-semibold">{formatTimeAgo(lastUpdate.toISOString())}</p>
              </div>
              <RefreshCw className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Users */}
        <Card>
          <CardHeader>
            <CardTitle>Active Users ({activeUsers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {activeUsers.map(user => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      {getDeviceIcon(user.deviceType)}
                      <div>
                        <p className="font-medium">{user.fullName}</p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-2 mb-1">
                      {getStatusBadge(user.status)}
                    </div>
                    <p className="text-xs text-gray-500">
                      {formatTimeAgo(user.lastActivity)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Session: {formatDuration(user.sessionDuration)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {recentActivity.map(activity => (
                <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Activity className="h-4 w-4 mt-1 text-gray-500" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium">{activity.action}</p>
                      {getSeverityBadge(activity.severity)}
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{activity.details}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>by {activity.userName}</span>
                      <span>{formatTimeAgo(activity.timestamp)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed User Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>User Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">User</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Current Page</th>
                  <th className="text-left p-2">Device</th>
                  <th className="text-left p-2">IP Address</th>
                  <th className="text-left p-2">Session Duration</th>
                  <th className="text-left p-2">Last Activity</th>
                </tr>
              </thead>
              <tbody>
                {activeUsers.map(user => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">
                      <div>
                        <p className="font-medium">{user.fullName}</p>
                        <p className="text-sm text-gray-600">{user.role}</p>
                      </div>
                    </td>
                    <td className="p-2">
                      {getStatusBadge(user.status)}
                    </td>
                    <td className="p-2">
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                        {user.currentPage}
                      </code>
                    </td>
                    <td className="p-2">
                      <div className="flex items-center space-x-1">
                        {getDeviceIcon(user.deviceType)}
                        <span className="text-sm capitalize">{user.deviceType}</span>
                      </div>
                    </td>
                    <td className="p-2">
                      <code className="text-sm">{user.ipAddress}</code>
                    </td>
                    <td className="p-2">
                      {formatDuration(user.sessionDuration)}
                    </td>
                    <td className="p-2">
                      {formatTimeAgo(user.lastActivity)}
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

export default UserActivityMonitor;
