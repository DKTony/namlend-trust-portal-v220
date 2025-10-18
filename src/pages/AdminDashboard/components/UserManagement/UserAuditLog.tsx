import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Activity, 
  User, 
  Shield, 
  Settings, 
  Mail, 
  Key, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  UserPlus,
  UserX,
  LogIn,
  LogOut
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  adminId: string;
  adminName: string;
  action: string;
  actionType: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'permission' | 'role' | 'status';
  details: string;
  ipAddress: string;
  userAgent: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  changes?: {
    field: string;
    oldValue: string;
    newValue: string;
  }[];
}

const UserAuditLog: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterDateRange, setFilterDateRange] = useState('7d');
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);

  // Mock audit log data
  const auditLogs: AuditLogEntry[] = [
    {
      id: '1',
      timestamp: '2024-01-15T14:30:00Z',
      userId: 'user-123',
      userName: 'John Doe',
      adminId: 'admin-456',
      adminName: 'Admin User',
      action: 'Role Changed',
      actionType: 'role',
      details: 'User role changed from client to loan_officer',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      severity: 'medium',
      changes: [
        { field: 'role', oldValue: 'client', newValue: 'loan_officer' }
      ]
    },
    {
      id: '2',
      timestamp: '2024-01-15T14:25:00Z',
      userId: 'user-789',
      userName: 'Jane Smith',
      adminId: 'admin-456',
      adminName: 'Admin User',
      action: 'Account Suspended',
      actionType: 'status',
      details: 'User account suspended due to policy violation',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      severity: 'high',
      changes: [
        { field: 'status', oldValue: 'active', newValue: 'suspended' }
      ]
    },
    {
      id: '3',
      timestamp: '2024-01-15T14:20:00Z',
      userId: 'user-456',
      userName: 'Bob Johnson',
      adminId: 'system',
      adminName: 'System',
      action: 'Failed Login Attempt',
      actionType: 'login',
      details: 'Multiple failed login attempts detected',
      ipAddress: '203.0.113.45',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      severity: 'medium'
    },
    {
      id: '4',
      timestamp: '2024-01-15T14:15:00Z',
      userId: 'user-321',
      userName: 'Alice Wilson',
      adminId: 'admin-789',
      adminName: 'Super Admin',
      action: 'Permissions Updated',
      actionType: 'permission',
      details: 'Added loan_processing and client_management permissions',
      ipAddress: '192.168.1.101',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      severity: 'medium',
      changes: [
        { field: 'permissions', oldValue: 'basic_access', newValue: 'basic_access,loan_processing,client_management' }
      ]
    },
    {
      id: '5',
      timestamp: '2024-01-15T14:10:00Z',
      userId: 'user-654',
      userName: 'Charlie Brown',
      adminId: 'admin-456',
      adminName: 'Admin User',
      action: 'User Created',
      actionType: 'create',
      details: 'New user account created with client role',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      severity: 'low'
    },
    {
      id: '6',
      timestamp: '2024-01-15T14:05:00Z',
      userId: 'user-987',
      userName: 'Diana Prince',
      adminId: 'system',
      adminName: 'System',
      action: 'Password Reset',
      actionType: 'update',
      details: 'User requested password reset via email',
      ipAddress: '198.51.100.23',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
      severity: 'low'
    }
  ];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-NA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getActionIcon = (actionType: string) => {
    const icons = {
      create: <UserPlus className="h-4 w-4" />,
      update: <Edit className="h-4 w-4" />,
      delete: <Trash2 className="h-4 w-4" />,
      login: <LogIn className="h-4 w-4" />,
      logout: <LogOut className="h-4 w-4" />,
      permission: <Key className="h-4 w-4" />,
      role: <Shield className="h-4 w-4" />,
      status: <Settings className="h-4 w-4" />
    };
    return icons[actionType as keyof typeof icons] || <Activity className="h-4 w-4" />;
  };

  const getSeverityBadge = (severity: string) => {
    const variants = {
      low: 'bg-green-100 text-green-800 border-green-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      critical: 'bg-red-100 text-red-800 border-red-200'
    };

    return (
      <Badge variant="outline" className={variants[severity as keyof typeof variants] || 'bg-gray-100 text-gray-800'}>
        <span className="capitalize">{severity}</span>
      </Badge>
    );
  };

  const getActionTypeBadge = (actionType: string) => {
    const variants = {
      create: 'bg-blue-100 text-blue-800 border-blue-200',
      update: 'bg-purple-100 text-purple-800 border-purple-200',
      delete: 'bg-red-100 text-red-800 border-red-200',
      login: 'bg-green-100 text-green-800 border-green-200',
      logout: 'bg-gray-100 text-gray-800 border-gray-200',
      permission: 'bg-orange-100 text-orange-800 border-orange-200',
      role: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      status: 'bg-teal-100 text-teal-800 border-teal-200'
    };

    return (
      <Badge variant="outline" className={variants[actionType as keyof typeof variants] || 'bg-gray-100 text-gray-800'}>
        {getActionIcon(actionType)}
        <span className="ml-1 capitalize">{actionType}</span>
      </Badge>
    );
  };

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = searchTerm === '' || 
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.adminName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = filterAction === 'all' || log.actionType === filterAction;
    const matchesSeverity = filterSeverity === 'all' || log.severity === filterSeverity;

    return matchesSearch && matchesAction && matchesSeverity;
  });

  const handleExportLogs = () => {
    const csvContent = [
      ['Timestamp', 'User', 'Admin', 'Action', 'Type', 'Severity', 'Details', 'IP Address'].join(','),
      ...filteredLogs.map(log => [
        log.timestamp,
        log.userName,
        log.adminName,
        log.action,
        log.actionType,
        log.severity,
        `"${log.details}"`,
        log.ipAddress
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">User Audit Log</h2>
          <p className="text-gray-600">Track all user-related administrative actions</p>
        </div>
        <Button onClick={handleExportLogs} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Logs
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="search"
                  placeholder="Search users, actions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="action-filter">Action Type</Label>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="create">Create</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                  <SelectItem value="login">Login</SelectItem>
                  <SelectItem value="logout">Logout</SelectItem>
                  <SelectItem value="permission">Permission</SelectItem>
                  <SelectItem value="role">Role</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="severity-filter">Severity</Label>
              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="date-range">Date Range</Label>
              <Select value={filterDateRange} onValueChange={setFilterDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1d">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="90d">Last 90 Days</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Entries ({filteredLogs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredLogs.map(log => (
              <div key={log.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      {getActionTypeBadge(log.actionType)}
                      {getSeverityBadge(log.severity)}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">{formatDate(log.timestamp)}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedEntry(log)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                  <div>
                    <p className="text-sm text-gray-600">User</p>
                    <p className="font-medium">{log.userName}</p>
                    <p className="text-xs text-gray-500">ID: {log.userId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Admin</p>
                    <p className="font-medium">{log.adminName}</p>
                    <p className="text-xs text-gray-500">ID: {log.adminId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Action</p>
                    <p className="font-medium">{log.action}</p>
                  </div>
                </div>

                <div className="mb-2">
                  <p className="text-sm text-gray-600">Details</p>
                  <p className="text-gray-800">{log.details}</p>
                </div>

                {log.changes && log.changes.length > 0 && (
                  <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                    <p className="text-sm font-medium text-blue-800 mb-1">Changes:</p>
                    <div className="space-y-1">
                      {log.changes.map((change, index) => (
                        <div key={index} className="text-sm text-blue-700">
                          <span className="font-medium">{change.field}:</span>
                          <span className="text-red-600 line-through mx-1">{change.oldValue}</span>
                          →
                          <span className="text-green-600 mx-1">{change.newValue}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                  <div className="text-xs text-gray-500">
                    IP: {log.ipAddress}
                  </div>
                  <div className="text-xs text-gray-500">
                    {log.userAgent.substring(0, 50)}...
                  </div>
                </div>
              </div>
            ))}

            {filteredLogs.length === 0 && (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No audit entries found matching your filters</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Entry Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Audit Entry Details</h3>
              <Button variant="ghost" size="sm" onClick={() => setSelectedEntry(null)}>
                ×
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Timestamp</Label>
                  <p className="font-medium">{formatDate(selectedEntry.timestamp)}</p>
                </div>
                <div>
                  <Label>Severity</Label>
                  <div className="mt-1">{getSeverityBadge(selectedEntry.severity)}</div>
                </div>
                <div>
                  <Label>User</Label>
                  <p className="font-medium">{selectedEntry.userName}</p>
                  <p className="text-sm text-gray-500">ID: {selectedEntry.userId}</p>
                </div>
                <div>
                  <Label>Admin</Label>
                  <p className="font-medium">{selectedEntry.adminName}</p>
                  <p className="text-sm text-gray-500">ID: {selectedEntry.adminId}</p>
                </div>
                <div>
                  <Label>Action</Label>
                  <div className="mt-1">{getActionTypeBadge(selectedEntry.actionType)}</div>
                  <p className="font-medium mt-1">{selectedEntry.action}</p>
                </div>
                <div>
                  <Label>IP Address</Label>
                  <p className="font-medium">{selectedEntry.ipAddress}</p>
                </div>
              </div>
              
              <div>
                <Label>Details</Label>
                <p className="mt-1 p-3 bg-gray-50 rounded">{selectedEntry.details}</p>
              </div>

              <div>
                <Label>User Agent</Label>
                <p className="mt-1 p-3 bg-gray-50 rounded text-sm break-all">{selectedEntry.userAgent}</p>
              </div>

              {selectedEntry.changes && selectedEntry.changes.length > 0 && (
                <div>
                  <Label>Changes Made</Label>
                  <div className="mt-1 space-y-2">
                    {selectedEntry.changes.map((change, index) => (
                      <div key={index} className="p-3 bg-blue-50 rounded border border-blue-200">
                        <p className="font-medium text-blue-800">{change.field}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-sm text-red-600 line-through">{change.oldValue}</span>
                          <span className="text-gray-500">→</span>
                          <span className="text-sm text-green-600">{change.newValue}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserAuditLog;
