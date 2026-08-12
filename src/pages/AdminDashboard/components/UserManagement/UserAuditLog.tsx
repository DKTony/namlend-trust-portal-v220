import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/integrations/convex/api';
import { useQuery } from 'convex/react';
import {
  Activity,
  AlertTriangle,
  Download,
  Edit,
  Eye,
  Key,
  LogIn,
  LogOut,
  Search,
  Settings,
  Shield,
  Trash2,
  UserPlus,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';

interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  adminId: string;
  adminName: string;
  action: string;
  actionType:
    | 'create'
    | 'update'
    | 'delete'
    | 'login'
    | 'logout'
    | 'permission'
    | 'role'
    | 'status';
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
  const fetchAuditLogs = () => undefined;

  // Calculate date range for Convex query
  const startDateMs = useMemo(() => {
    const now = Date.now();
    switch (filterDateRange) {
      case '1d':
        return now - 24 * 60 * 60 * 1000;
      case '7d':
        return now - 7 * 24 * 60 * 60 * 1000;
      case '30d':
        return now - 30 * 24 * 60 * 60 * 1000;
      case '90d':
        return now - 90 * 24 * 60 * 60 * 1000;
      default:
        return undefined;
    }
  }, [filterDateRange]);

  const rawLogs = useQuery(api.audit.getAuditLogs, {
    startDate: startDateMs,
    limit: 100,
  });

  const loading = rawLogs === undefined;
  const error: string | null = null;

  // Map action types to severity
  const getActionSeverity = (action: string): 'low' | 'medium' | 'high' | 'critical' => {
    switch (action) {
      case 'delete':
      case 'reject':
        return 'high';
      case 'approve':
      case 'update':
        return 'medium';
      case 'login':
      case 'logout':
      case 'view':
        return 'low';
      case 'create':
        return 'low';
      default:
        return 'medium';
    }
  };

  // Map database action to UI action type
  const mapActionType = (action: string): AuditLogEntry['actionType'] => {
    switch (action) {
      case 'login':
        return 'login';
      case 'logout':
        return 'logout';
      case 'create':
        return 'create';
      case 'update':
        return 'update';
      case 'delete':
        return 'delete';
      case 'approve':
      case 'reject':
        return 'status';
      default:
        return 'update';
    }
  };

  // Transform Convex audit logs to UI format
  const auditLogs: AuditLogEntry[] = useMemo(() => {
    if (!rawLogs) return [];
    return rawLogs.map((log: any) => {
      const oldState = log.oldState ?? {};
      const newState = log.newState ?? {};
      const userName =
        newState?.full_name ||
        oldState?.full_name ||
        `User ${String(log.userId ?? '').slice(0, 8) || 'Unknown'}`;

      const changes: { field: string; oldValue: string; newValue: string }[] = [];
      if (oldState && newState && typeof oldState === 'object' && typeof newState === 'object') {
        const allKeys = [...new Set([...Object.keys(oldState), ...Object.keys(newState)])];
        allKeys.forEach((key) => {
          if (JSON.stringify(oldState[key]) !== JSON.stringify(newState[key])) {
            changes.push({
              field: key,
              oldValue: String(oldState[key] ?? ''),
              newValue: String(newState[key] ?? ''),
            });
          }
        });
      }

      return {
        id: String(log._id),
        timestamp: log.timestamp ? new Date(log.timestamp).toISOString() : new Date().toISOString(),
        userId: log.entityId || String(log.userId ?? ''),
        userName: String(userName),
        adminId: String(log.userId ?? 'system'),
        adminName: 'Admin',
        action: `${log.action} ${log.entityType || ''}`.trim(),
        actionType: mapActionType(log.action),
        details: `${log.action} performed on ${log.entityType || 'record'}`,
        ipAddress: log.metadata?.ipAddress || 'Unknown',
        userAgent: log.metadata?.userAgent || 'Unknown',
        severity: getActionSeverity(log.action),
        changes: changes.length > 0 ? changes : undefined,
      };
    });
  }, [rawLogs]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-NA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
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
      status: <Settings className="h-4 w-4" />,
    };
    return icons[actionType as keyof typeof icons] || <Activity className="h-4 w-4" />;
  };

  const getSeverityBadge = (severity: string) => {
    const variants = {
      low: 'bg-green-100  text-green-800  border-green-200 ',
      medium: 'bg-yellow-100  text-yellow-800  border-yellow-200 ',
      high: 'bg-orange-100  text-orange-800  border-orange-200 ',
      critical: 'bg-red-100  text-red-800  border-red-200 ',
    };

    return (
      <Badge
        variant="outline"
        className={variants[severity as keyof typeof variants] || 'bg-gray-100  text-gray-800 '}
      >
        <span className="capitalize">{severity}</span>
      </Badge>
    );
  };

  const getActionTypeBadge = (actionType: string) => {
    const variants = {
      create: 'bg-blue-100  text-blue-800  border-blue-200 ',
      update: 'bg-purple-100  text-purple-800  border-purple-200 ',
      delete: 'bg-red-100  text-red-800  border-red-200 ',
      login: 'bg-green-100  text-green-800  border-green-200 ',
      logout: 'bg-gray-100  text-gray-800  border-gray-200 ',
      permission: 'bg-orange-100  text-orange-800  border-orange-200 ',
      role: 'bg-indigo-100  text-indigo-800  border-indigo-200 ',
      status: 'bg-teal-100  text-teal-800  border-teal-200 ',
    };

    return (
      <Badge
        variant="outline"
        className={variants[actionType as keyof typeof variants] || 'bg-gray-100  text-gray-800 '}
      >
        {getActionIcon(actionType)}
        <span className="ml-1 capitalize">{actionType}</span>
      </Badge>
    );
  };

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      searchTerm === '' ||
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
      ['Timestamp', 'User', 'Admin', 'Action', 'Type', 'Severity', 'Details', 'IP Address'].join(
        ','
      ),
      ...filteredLogs.map((log) =>
        [
          log.timestamp,
          log.userName,
          log.adminName,
          log.action,
          log.actionType,
          log.severity,
          `"${log.details}"`,
          log.ipAddress,
        ].join(',')
      ),
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
          <h2 className="text-2xl font-bold text-foreground">User Audit Log</h2>
          <p className="text-muted-foreground">Track all user-related administrative actions</p>
        </div>
        <div className="flex gap-2">
          {/* Convex queries are reactive — data auto-refreshes */}
          <Button
            onClick={handleExportLogs}
            variant="outline"
            disabled={loading || filteredLogs.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Logs
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <span>Failed to load audit logs: {error}</span>
              </div>
              <Button variant="outline" size="sm" onClick={fetchAuditLogs}>
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="flex items-center space-x-2 shrink-0">
                      {getActionTypeBadge(log.actionType)}
                      {getSeverityBadge(log.severity)}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0 ml-2">
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {formatDate(log.timestamp)}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedEntry(log)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2 text-sm">
                  <div className="min-w-0">
                    <p className="text-muted-foreground">User</p>
                    <p className="font-medium truncate text-foreground" title={log.userName}>
                      {log.userName}
                    </p>
                    <p
                      className="text-xs text-muted-foreground truncate tabular-nums"
                      title={log.userId}
                    >
                      ID: {log.userId}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-muted-foreground">Admin</p>
                    <p className="font-medium truncate text-foreground" title={log.adminName}>
                      {log.adminName}
                    </p>
                    <p
                      className="text-xs text-muted-foreground truncate tabular-nums"
                      title={log.adminId}
                    >
                      ID: {log.adminId}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-muted-foreground">Action</p>
                    <p className="font-medium truncate text-foreground" title={log.action}>
                      {log.action}
                    </p>
                  </div>
                </div>

                <div className="mb-2">
                  <p className="text-sm text-muted-foreground">Details</p>
                  <p className="text-foreground truncate" title={log.details}>
                    {log.details}
                  </p>
                </div>

                {log.changes && log.changes.length > 0 && (
                  <div className="mt-2 p-2 bg-blue-50  rounded border border-blue-200 ">
                    <p className="text-sm font-medium text-blue-800  mb-1">Changes:</p>
                    <div className="space-y-1">
                      {log.changes.map((change, index) => (
                        <div key={index} className="text-sm text-blue-700 ">
                          <span className="font-medium">{change.field}:</span>
                          <span className="text-red-600  line-through mx-1">{change.oldValue}</span>
                          →<span className="text-green-600  mx-1">{change.newValue}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                  <div className="text-xs text-muted-foreground">IP: {log.ipAddress}</div>
                  <div className="text-xs text-muted-foreground">
                    {log.userAgent.substring(0, 50)}...
                  </div>
                </div>
              </div>
            ))}

            {filteredLogs.length === 0 && (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No audit entries found matching your filters
                </p>
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
                  <p className="font-medium text-foreground">
                    {formatDate(selectedEntry.timestamp)}
                  </p>
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
                <p className="mt-1 p-3 bg-muted rounded text-sm break-all text-foreground">
                  {selectedEntry.userAgent}
                </p>
              </div>

              {selectedEntry.changes && selectedEntry.changes.length > 0 && (
                <div>
                  <Label>Changes Made</Label>
                  <div className="mt-1 space-y-2">
                    {selectedEntry.changes.map((change, index) => (
                      <div key={index} className="p-3 bg-blue-50  rounded border border-blue-200 ">
                        <p className="font-medium text-blue-800 ">{change.field}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-sm text-red-600  line-through">
                            {change.oldValue}
                          </span>
                          <span className="text-muted-foreground">→</span>
                          <span className="text-sm text-green-600 ">{change.newValue}</span>
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
