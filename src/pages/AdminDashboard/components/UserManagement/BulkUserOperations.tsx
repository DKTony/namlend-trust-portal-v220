import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  Upload,
  Download,
  Mail,
  UserX,
  UserCheck,
  Shield,
  AlertTriangle,
  CheckCircle,
  FileText,
  Settings,
  Trash2,
  Edit,
  Send,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';

interface BulkOperation {
  id: string;
  type:
    | 'role_change'
    | 'status_change'
    | 'permission_update'
    | 'notification'
    | 'export'
    | 'import';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  totalUsers: number;
  processedUsers: number;
  createdAt: string;
  completedAt?: string;
  details: string;
  errors?: string[];
}

interface BulkUserOperationsProps {
  selectedUsers?: string[];
  onSelectionChange?: (userIds: string[]) => void;
}

const BulkUserOperations: React.FC<BulkUserOperationsProps> = ({
  selectedUsers: externalSelectedUsers,
  onSelectionChange,
}) => {
  const [activeTab, setActiveTab] = useState('operations');
  const [internalSelectedUsers, setInternalSelectedUsers] = useState<string[]>([]);

  // Use external selected users if provided, otherwise use internal state
  const selectedUsers = externalSelectedUsers || internalSelectedUsers;
  const setSelectedUsers = (users: string[] | ((prev: string[]) => string[])) => {
    if (onSelectionChange) {
      // If controlled externally
      if (typeof users === 'function') {
        // We can't easily support functional updates with the current prop signature without more complex logic
        // For now, we'll assume direct array updates or handle simple cases
        // ideally onSelectionChange should handle this, but for this refactor we'll keep it simple
        const newUsers = users(selectedUsers);
        onSelectionChange(newUsers);
      } else {
        onSelectionChange(users);
      }
    } else {
      setInternalSelectedUsers(users);
    }
  };
  const [bulkAction, setBulkAction] = useState('');
  const [bulkValue, setBulkValue] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [operations, setOperations] = useState<BulkOperation[]>([
    {
      id: '1',
      type: 'role_change',
      status: 'completed',
      totalUsers: 25,
      processedUsers: 25,
      createdAt: '2024-01-15T10:30:00Z',
      completedAt: '2024-01-15T10:35:00Z',
      details: 'Changed role to loan_officer for 25 users',
      errors: [],
    },
    {
      id: '2',
      type: 'notification',
      status: 'in_progress',
      totalUsers: 150,
      processedUsers: 89,
      createdAt: '2024-01-15T11:00:00Z',
      details: 'Sending password reset notification',
      errors: [],
    },
    {
      id: '3',
      type: 'export',
      status: 'failed',
      totalUsers: 500,
      processedUsers: 0,
      createdAt: '2024-01-15T09:15:00Z',
      details: 'Export user data to CSV',
      errors: ['Database connection timeout', 'Insufficient permissions'],
    },
  ]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-NA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getOperationIcon = (type: string) => {
    const icons = {
      role_change: <Shield className="h-4 w-4" />,
      status_change: <UserCheck className="h-4 w-4" />,
      permission_update: <Settings className="h-4 w-4" />,
      notification: <Mail className="h-4 w-4" />,
      export: <Download className="h-4 w-4" />,
      import: <Upload className="h-4 w-4" />,
    };
    return icons[type as keyof typeof icons] || <FileText className="h-4 w-4" />;
  };

  const getOperationLabel = (type: string) => {
    const labels = {
      role_change: 'Role Change',
      status_change: 'Status Change',
      permission_update: 'Permission Update',
      notification: 'Notification',
      export: 'Data Export',
      import: 'Data Import',
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending:
        'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
      in_progress:
        'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-800',
      completed:
        'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800',
      failed:
        'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800',
    };

    const icons = {
      pending: <AlertTriangle className="h-3 w-3 mr-1" />,
      in_progress: <Settings className="h-3 w-3 mr-1 animate-spin" />,
      completed: <CheckCircle className="h-3 w-3 mr-1" />,
      failed: <AlertTriangle className="h-3 w-3 mr-1" />,
    };

    return (
      <Badge
        variant="outline"
        className={
          variants[status as keyof typeof variants] ||
          'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400'
        }
      >
        {icons[status as keyof typeof icons]}
        <span className="capitalize">{status.replace('_', ' ')}</span>
      </Badge>
    );
  };

  const handleBulkAction = () => {
    if (!bulkAction || selectedUsers.length === 0) {
      alert('Please select users and an action');
      return;
    }

    const newOperation: BulkOperation = {
      id: Date.now().toString(),
      type: bulkAction as any,
      status: 'pending',
      totalUsers: selectedUsers.length,
      processedUsers: 0,
      createdAt: new Date().toISOString(),
      details: `${getOperationLabel(bulkAction)} for ${selectedUsers.length} users`,
      errors: [],
    };

    setOperations((prev) => [newOperation, ...prev]);

    // Simulate processing
    setTimeout(() => {
      setOperations((prev) =>
        prev.map((op) =>
          op.id === newOperation.id ? { ...op, status: 'in_progress' as const } : op
        )
      );

      // Simulate completion
      setTimeout(() => {
        setOperations((prev) =>
          prev.map((op) =>
            op.id === newOperation.id
              ? {
                  ...op,
                  status: 'completed' as const,
                  processedUsers: op.totalUsers,
                  completedAt: new Date().toISOString(),
                }
              : op
          )
        );
      }, 3000);
    }, 1000);

    alert(
      `Bulk ${getOperationLabel(bulkAction)} operation started for ${selectedUsers.length} users`
    );
    setSelectedUsers([]);
    setBulkAction('');
    setBulkValue('');
  };

  const handleSendNotification = () => {
    if (!notificationMessage.trim() || selectedUsers.length === 0) {
      alert('Please select users and enter a message');
      return;
    }

    const newOperation: BulkOperation = {
      id: Date.now().toString(),
      type: 'notification',
      status: 'pending',
      totalUsers: selectedUsers.length,
      processedUsers: 0,
      createdAt: new Date().toISOString(),
      details: `Notification: "${notificationMessage.substring(0, 50)}${notificationMessage.length > 50 ? '...' : ''}"`,
      errors: [],
    };

    setOperations((prev) => [newOperation, ...prev]);
    alert(`Notification sent to ${selectedUsers.length} users`);
    setNotificationMessage('');
    setSelectedUsers([]);
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImportFile(file);
    }
  };

  const handleImportUsers = () => {
    if (!importFile) {
      alert('Please select a file to import');
      return;
    }

    const newOperation: BulkOperation = {
      id: Date.now().toString(),
      type: 'import',
      status: 'pending',
      totalUsers: 0, // Will be determined after file processing
      processedUsers: 0,
      createdAt: new Date().toISOString(),
      details: `Import users from ${importFile.name}`,
      errors: [],
    };

    setOperations((prev) => [newOperation, ...prev]);
    alert(`Import started for file: ${importFile.name}`);
    setImportFile(null);
  };

  const handleExportUsers = () => {
    const newOperation: BulkOperation = {
      id: Date.now().toString(),
      type: 'export',
      status: 'pending',
      totalUsers: selectedUsers.length || 500, // All users if none selected
      processedUsers: 0,
      createdAt: new Date().toISOString(),
      details:
        selectedUsers.length > 0
          ? `Export ${selectedUsers.length} selected users`
          : 'Export all users',
      errors: [],
    };

    setOperations((prev) => [newOperation, ...prev]);
    alert('Export operation started');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Bulk User Operations</h2>
          <p className="text-muted-foreground">Manage multiple users efficiently</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge
            variant="outline"
            className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400"
          >
            <Users className="h-3 w-3 mr-1" />
            {selectedUsers.length} Selected
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="operations">Bulk Operations</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="import-export">Import/Export</TabsTrigger>
          <TabsTrigger value="history">Operation History</TabsTrigger>
        </TabsList>

        <TabsContent value="operations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Bulk User Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="selected-users">Selected Users</Label>
                <div className="mt-2 p-3 bg-muted rounded-lg">
                  {selectedUsers.length === 0 ? (
                    <p className="text-muted-foreground">
                      No users selected. Go to Users tab to select users.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {selectedUsers.map((userId) => (
                        <Badge key={userId} variant="outline">
                          User {userId.slice(0, 8)}
                          <button
                            onClick={() =>
                              setSelectedUsers((prev) => prev.filter((id) => id !== userId))
                            }
                            className="ml-1 text-red-500 hover:text-red-700"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bulk-action">Action</Label>
                  <Select value={bulkAction} onValueChange={setBulkAction}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="role_change">Change Role</SelectItem>
                      <SelectItem value="status_change">Change Status</SelectItem>
                      <SelectItem value="permission_update">Update Permissions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="bulk-value">Value</Label>
                  {bulkAction === 'role_change' && (
                    <Select value={bulkValue} onValueChange={setBulkValue}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="loan_officer">Loan Officer</SelectItem>
                        <SelectItem value="client">Client</SelectItem>
                        <SelectItem value="support">Support</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {bulkAction === 'status_change' && (
                    <Select value={bulkValue} onValueChange={setBulkValue}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {bulkAction === 'permission_update' && (
                    <Input
                      placeholder="Enter permissions (comma-separated)"
                      value={bulkValue}
                      onChange={(e) => setBulkValue(e.target.value)}
                    />
                  )}
                </div>
              </div>

              <Button
                onClick={handleBulkAction}
                disabled={!bulkAction || selectedUsers.length === 0}
                className="w-full"
              >
                <Edit className="h-4 w-4 mr-2" />
                Execute Bulk Action
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Send Bulk Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="notification-message">Message</Label>
                <textarea
                  id="notification-message"
                  className="w-full p-3 border border-input bg-background rounded-md focus:ring-2 focus:ring-primary"
                  rows={4}
                  value={notificationMessage}
                  onChange={(e) => setNotificationMessage(e.target.value)}
                  placeholder="Enter notification message..."
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox id="email-notification" defaultChecked />
                <Label htmlFor="email-notification">Send via Email</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox id="in-app-notification" defaultChecked />
                <Label htmlFor="in-app-notification">Send In-App Notification</Label>
              </div>

              <Button
                onClick={handleSendNotification}
                disabled={!notificationMessage.trim() || selectedUsers.length === 0}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                Send Notification to {selectedUsers.length} Users
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import-export" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Import Users</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="import-file">CSV File</Label>
                  <Input
                    id="import-file"
                    type="file"
                    accept=".csv,.xlsx"
                    onChange={handleFileImport}
                  />
                  {importFile && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Selected: {importFile.name}
                    </p>
                  )}
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    <strong>Required columns:</strong> full_name, email, role, status
                  </p>
                </div>

                <Button onClick={handleImportUsers} disabled={!importFile} className="w-full">
                  <Upload className="h-4 w-4 mr-2" />
                  Import Users
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Export Users</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="export-all" defaultChecked />
                    <Label htmlFor="export-all">Export All Users</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="export-selected" />
                    <Label htmlFor="export-selected">Export Selected Users Only</Label>
                  </div>
                </div>

                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-sm text-green-800 dark:text-green-300">
                    Export will include: Profile data, roles, permissions, and activity summary
                  </p>
                </div>

                <Button onClick={handleExportUsers} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Export to CSV
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Operation History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {operations.map((operation) => (
                  <div
                    key={operation.id}
                    className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getOperationIcon(operation.type)}
                        <span className="font-medium text-foreground">
                          {getOperationLabel(operation.type)}
                        </span>
                        {getStatusBadge(operation.status)}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(operation.createdAt)}
                      </span>
                    </div>

                    <p className="text-muted-foreground mb-2">{operation.details}</p>

                    {operation.status === 'in_progress' && (
                      <div className="mb-2">
                        <div className="flex justify-between text-sm mb-1 text-foreground">
                          <span>Progress</span>
                          <span>
                            {operation.processedUsers}/{operation.totalUsers}
                          </span>
                        </div>
                        <Progress
                          value={(operation.processedUsers / operation.totalUsers) * 100}
                          className="h-2"
                        />
                      </div>
                    )}

                    {operation.errors && operation.errors.length > 0 && (
                      <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                        <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">
                          Errors:
                        </p>
                        <ul className="text-sm text-red-700 dark:text-red-400">
                          {operation.errors.map((error, index) => (
                            <li key={index}>• {error}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {operation.completedAt && (
                      <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                        Completed: {formatDate(operation.completedAt)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BulkUserOperations;
