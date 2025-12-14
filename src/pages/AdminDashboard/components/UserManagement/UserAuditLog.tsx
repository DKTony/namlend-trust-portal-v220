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
      low: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800',
      medium: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
      high: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 border-orange-200 dark:border-orange-800',
      critical: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800'
    };

    return (
      <Badge variant="outline" className={variants[severity as keyof typeof variants] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400'}>
        <span className="capitalize">{severity}</span>
      </Badge>
    );
  };

  const getActionTypeBadge = (actionType: string) => {
    const variants = {
      create: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-800',
      update: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 border-purple-200 dark:border-purple-800',
      delete: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800',
      login: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800',
      logout: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700',
      permission: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 border-orange-200 dark:border-orange-800',
      role: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
      status: 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-400 border-teal-200 dark:border-teal-800'
    };

    return (
      <Badge variant="outline" className={variants[actionType as keyof typeof variants] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400'}>
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
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="search"
                  placeholder="Search users, actions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-background border-input text-foreground"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="action-filter">Action Type</Label>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger className="bg-background border-input text-foreground">
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
                <SelectTrigger className="bg-background border-input text-foreground">
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
                <SelectTrigger className="bg-background border-input text-foreground">
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
              <div key={log.id} className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="flex items-center space-x-2 shrink-0">
                      {getActionTypeBadge(log.actionType)}
                      {getSeverityBadge(log.severity)}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0 ml-2">
                    <span className="text-sm text-muted-foreground tabular-nums">{formatDate(log.timestamp)}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedEntry(log)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2 text-sm">
                  <div className="min-w-0">
                    <p className="text-muted-foreground">User</p>
                    <p className="font-medium truncate text-foreground" title={log.userName}>{log.userName}</p>
                    <p className="text-xs text-muted-foreground truncate tabular-nums" title={log.userId}>ID: {log.userId}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-muted-foreground">Admin</p>
                    <p className="font-medium truncate text-foreground" title={log.adminName}>{log.adminName}</p>
                    <p className="text-xs text-muted-foreground truncate tabular-nums" title={log.adminId}>ID: {log.adminId}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-muted-foreground">Action</p>
                    <p className="font-medium truncate text-foreground" title={log.action}>{log.action}</p>
                  </div>
                </div>

                <div className="mb-2">
                  <p className="text-sm text-muted-foreground">Details</p>
                  <p className="text-foreground truncate" title={log.details}>{log.details}</p>
                </div>

                {log.changes && log.changes.length > 0 && (
                  <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">Changes:</p>
                    <div className="space-y-1">
                      {log.changes.map((change, index) => (
                        <div key={index} className="text-sm text-blue-700 dark:text-blue-400">
                          <span className="font-medium">{change.field}:</span>
                          <span className="text-red-600 dark:text-red-400 line-through mx-1">{change.oldValue}</span>
                          →
                          <span className="text-green-600 dark:text-green-400 mx-1">{change.newValue}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                  <div className="text-xs text-muted-foreground">
                    IP: {log.ipAddress}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {log.userAgent.substring(0, 50)}...
                  </div>
                </div>
              </div>
            ))}

            {filteredLogs.length === 0 && (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No audit entries found matching your filters</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Entry Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-background rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-border shadow-lg">
            <div className="sticky top-0 bg-background border-b border-border px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-semibold text-foreground">Audit Entry Details</h3>
              <Button variant="ghost" size="sm" onClick={() => setSelectedEntry(null)}>
                ×
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Timestamp</Label>
                  <p className="font-medium text-foreground">{formatDate(selectedEntry.timestamp)}</p>
                </div>
                <div>
                  <Label>Severity</Label>
                  <div className="mt-1">{getSeverityBadge(selectedEntry.severity)}</div>
                </div>
                <div>
                  <Label>User</Label>
                  <p className="font-medium text-foreground">{selectedEntry.userName}</p>
                  <p className="text-sm text-muted-foreground">ID: {selectedEntry.userId}</p>
                </div>
                <div>
                  <Label>Admin</Label>
                  <p className="font-medium text-foreground">{selectedEntry.adminName}</p>
                  <p className="text-sm text-muted-foreground">ID: {selectedEntry.adminId}</p>
                </div>
                <div>
                  <Label>Action</Label>
                  <div className="mt-1">{getActionTypeBadge(selectedEntry.actionType)}</div>
                  <p className="font-medium mt-1 text-foreground">{selectedEntry.action}</p>
                </div>
                <div>
                  <Label>IP Address</Label>
                  <p className="font-medium text-foreground">{selectedEntry.ipAddress}</p>
                </div>
              </div>
              
              <div>
                <Label>Details</Label>
                <p className="mt-1 p-3 bg-muted rounded text-foreground">{selectedEntry.details}</p>
              </div>

              <div>
                <Label>User Agent</Label>
                <p className="mt-1 p-3 bg-muted rounded text-sm break-all text-foreground">{selectedEntry.userAgent}</p>
              </div>

              {selectedEntry.changes && selectedEntry.changes.length > 0 && (
                <div>
                  <Label>Changes Made</Label>
                  <div className="mt-1 space-y-2">
                    {selectedEntry.changes.map((change, index) => (
                      <div key={index} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                        <p className="font-medium text-blue-800 dark:text-blue-300">{change.field}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-sm text-red-600 dark:text-red-400 line-through">{change.oldValue}</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="text-sm text-green-600 dark:text-green-400">{change.newValue}</span>
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
