import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Search, 
  Filter, 
  Download, 
  Plus,
  Shield,
  Settings,
  UserCheck,
  AlertTriangle,
  Activity,
  BarChart3
} from 'lucide-react';

// Sub-components
import UsersList from './UsersList';
import RoleManagement from './RoleManagement';
import PermissionMatrix from './PermissionMatrix';
import BulkUserOperations from './BulkUserOperations';
import UserAuditLog from './UserAuditLog';
import UserAnalytics from './UserAnalytics';
import UserActivityMonitor from './UserActivityMonitor';
import UserImportWizard from './UserImportWizard';
import UserProfile from './UserProfile';

interface UserManagementDashboardProps {
  onUserSelect?: (userId: string) => void;
}

const UserManagementDashboard: React.FC<UserManagementDashboardProps> = ({ 
  onUserSelect 
}) => {
  const [activeTab, setActiveTab] = useState('users');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showImportWizard, setShowImportWizard] = useState(false);

  const handleUserSelection = (userId: string) => {
    setSelectedUser(userId);
    onUserSelect?.(userId);
  };

  const handleBulkSelection = (userIds: string[]) => {
    setSelectedUsers(userIds);
  };

  const handleCloseProfile = () => {
    setSelectedUser(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
          <p className="text-muted-foreground">
            Comprehensive user administration, role management, and access control
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Advanced Filters
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export Users
          </Button>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-2xl font-bold">1,247</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Users</p>
                <p className="text-2xl font-bold">1,156</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Admin Users</p>
                <p className="text-2xl font-bold">12</p>
              </div>
              <Shield className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Actions</p>
                <p className="text-2xl font-bold">23</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            All Users
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Roles
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Permissions
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Bulk Operations
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Audit Log
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Activity Monitor
          </TabsTrigger>
          <TabsTrigger value="import" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Import Users
          </TabsTrigger>
        </TabsList>

        {/* Search and Filter Bar */}
        <div className="flex space-x-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search by name, email, role, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="loan_officer">Loan Officer</option>
            <option value="client">Client</option>
            <option value="support">Support</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        {/* Tab Content */}
        <TabsContent value="users" className="space-y-4">
          <UsersList
            searchTerm={searchTerm}
            filterRole={filterRole}
            filterStatus={filterStatus}
            selectedUsers={selectedUsers}
            onUserSelect={handleUserSelection}
            onBulkSelect={handleBulkSelection}
          />
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <RoleManagement />
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <PermissionMatrix />
        </TabsContent>

        <TabsContent value="bulk" className="space-y-4">
          <BulkUserOperations 
            selectedUsers={selectedUsers}
            onSelectionChange={setSelectedUsers}
          />
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <UserAuditLog />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <UserAnalytics />
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <UserActivityMonitor />
        </TabsContent>

        <TabsContent value="import" className="space-y-6">
          <UserImportWizard 
            onClose={() => setShowImportWizard(false)}
            onComplete={(users) => {
              console.log('Imported users:', users);
              setShowImportWizard(false);
            }} 
          />
        </TabsContent>
      </Tabs>

      {/* User Profile Modal */}
      {selectedUser && (
        <UserProfile
          userId={selectedUser}
          onClose={handleCloseProfile}
        />
      )}
    </div>
  );
};

export default UserManagementDashboard;
