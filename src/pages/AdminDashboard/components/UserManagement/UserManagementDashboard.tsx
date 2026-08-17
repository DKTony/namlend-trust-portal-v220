import { AdaptiveTabs, ResponsiveActionBar } from '@/components/adaptive';
import { InviteUserDialog } from '@/components/invites/InviteUserDialog';
import { PendingInvitesPanel } from '@/components/invites/PendingInvitesPanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/integrations/convex/api';
import { useQuery } from 'convex/react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Download,
  Filter,
  Loader2,
  Mail,
  Plus,
  Search,
  Settings,
  Shield,
  UserCheck,
  Users,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';

// Sub-components
import BulkUserOperations from './BulkUserOperations';
import PermissionMatrix from './PermissionMatrix';
import RoleManagement from './RoleManagement';
import UserActivityMonitor from './UserActivityMonitor';
import UserAnalytics from './UserAnalytics';
import UserAuditLog from './UserAuditLog';
import UserImportWizard from './UserImportWizard';
import UserProfile from './UserProfile';
import UsersList from './UsersList';

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
  pendingActions: number;
}

interface UserManagementDashboardProps {
  onUserSelect?: (userId: string) => void;
}

const UserManagementDashboard: React.FC<UserManagementDashboardProps> = ({ onUserSelect }) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('users');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Convex reactive queries for stats (N2 — no as any)
  const rawUsers = useQuery(api.users.listUsers, {});
  const rawApprovals = useQuery(api.approvalWorkflow.adminListApprovals, { status: 'pending' });
  const inviteStatus = useQuery(api.invites.isEnabled, {});
  const invitesStatusKnown = inviteStatus !== undefined;
  const invitesEnabled = inviteStatus?.enabled === true;

  const statsLoading = rawUsers === undefined;
  const stats: UserStats = useMemo(() => {
    if (!rawUsers) return { totalUsers: 0, activeUsers: 0, adminUsers: 0, pendingActions: 0 };
    return {
      totalUsers: rawUsers.length,
      activeUsers: rawUsers.length,
      adminUsers: rawUsers.filter((u) => u.role === 'admin' || u.role === 'tenant_admin').length,
      pendingActions: rawApprovals?.length ?? 0,
    };
  }, [rawUsers, rawApprovals]);

  // Add User Modal
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [newUserData, setNewUserData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'client',
  });
  const [addingUser, setAddingUser] = useState(false);

  // Advanced Filters Modal
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  const handleExportUsers = () => {
    if (!rawUsers) return;
    toast({ title: 'Exporting...', description: 'Preparing user data for export' });

    const headers = ['ID', 'Full Name', 'Email', 'Phone', 'Role', 'Created At'];
    const csvContent = [
      headers.join(','),
      ...rawUsers.map((u: any) =>
        [
          String(u._id),
          u.fullName || '',
          u.email || '',
          u.phone || '',
          u.role || 'client',
          u.createdAt ? new Date(u.createdAt).toISOString() : '',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({ title: 'Export Complete', description: `Exported ${rawUsers.length} users` });
  };

  const handleAddUser = async () => {
    if (!newUserData.email) {
      toast({ title: 'Error', description: 'Email is required', variant: 'destructive' });
      return;
    }

    setAddingUser(true);
    try {
      toast({
        title: 'Accounts are created at sign-up',
        description:
          'There is no invite-mailer in this environment. Ask the person to register at /auth, then assign their role here.',
        variant: 'destructive',
      });
    } finally {
      setAddingUser(false);
    }
  };

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
      <ResponsiveActionBar
        title={<h2 className="text-2xl font-bold tracking-tight">User Management</h2>}
        description={
          <p className="text-muted-foreground">
            Comprehensive user administration, role management, and access control
          </p>
        }
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setShowFiltersModal(true)}>
              <Filter className="mr-2 h-4 w-4" />
              Advanced Filters
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportUsers}>
              <Download className="mr-2 h-4 w-4" />
              Export Users
            </Button>
            <Button
              size="sm"
              data-testid="add-user-button"
              disabled={!invitesStatusKnown}
              onClick={() =>
                invitesEnabled ? setShowInviteDialog(true) : setShowAddUserModal(true)
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </>
        }
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                {statsLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <p className="text-xl sm:text-2xl font-bold truncate tabular-nums text-foreground">
                    {stats.totalUsers.toLocaleString()}
                  </p>
                )}
              </div>
              <Users className="h-8 w-8 text-blue-600 " />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Users</p>
                {statsLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <p className="text-xl sm:text-2xl font-bold truncate tabular-nums text-foreground">
                    {stats.activeUsers.toLocaleString()}
                  </p>
                )}
              </div>
              <UserCheck className="h-8 w-8 text-green-600 " />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Admin Users</p>
                {statsLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <p className="text-xl sm:text-2xl font-bold truncate tabular-nums text-foreground">
                    {stats.adminUsers.toLocaleString()}
                  </p>
                )}
              </div>
              <Shield className="h-8 w-8 text-purple-600 " />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Actions</p>
                {statsLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <p className="text-xl sm:text-2xl font-bold truncate tabular-nums text-foreground">
                    {stats.pendingActions.toLocaleString()}
                  </p>
                )}
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600 " />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <AdaptiveTabs
          desktopColumns={invitesEnabled ? 9 : 8}
          compactIconOnly
          items={[
            { value: 'users', label: 'All Users', shortLabel: 'Users', icon: Users },
            { value: 'roles', label: 'Roles', icon: Shield },
            { value: 'permissions', label: 'Permissions', shortLabel: 'Perms', icon: Settings },
            { value: 'bulk', label: 'Bulk Operations', shortLabel: 'Bulk', icon: UserCheck },
            { value: 'audit', label: 'Audit Log', shortLabel: 'Audit', icon: Activity },
            { value: 'analytics', label: 'Analytics', icon: BarChart3 },
            {
              value: 'activity',
              label: 'Activity Monitor',
              shortLabel: 'Activity',
              icon: Activity,
            },
            { value: 'import', label: 'Import Users', shortLabel: 'Import', icon: Download },
            ...(invitesEnabled ? [{ value: 'invites', label: 'Invites', icon: Mail }] : []),
          ]}
        />

        {/* Search and Filter Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <input
              type="text"
              placeholder="Search by name, email, role, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-input text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring text-foreground sm:w-44"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="loan_officer">Loan Officer</option>
            <option value="client">Client</option>
            <option value="tenant_admin">Tenant Admin</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring text-foreground sm:w-44"
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
          <BulkUserOperations selectedUsers={selectedUsers} onSelectionChange={setSelectedUsers} />
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
            onClose={() => setActiveTab('users')}
            onComplete={(users) => {
              toast({
                title: 'CSV preview only',
                description: `${users.length} row(s) validated. Convex Auth users must register through sign-up; this wizard cannot create accounts.`,
              });
              setActiveTab('users');
            }}
          />
        </TabsContent>

        {invitesEnabled && (
          <TabsContent value="invites" className="space-y-4">
            <PendingInvitesPanel roleFilter="staff" />
          </TabsContent>
        )}
      </Tabs>

      <InviteUserDialog open={showInviteDialog} onOpenChange={setShowInviteDialog} track="staff" />

      {/* User Profile Modal */}
      {selectedUser && <UserProfile userId={selectedUser} onClose={handleCloseProfile} />}

      {/* Add User Modal */}
      <Dialog open={showAddUserModal} onOpenChange={setShowAddUserModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Send an invitation to a new user to join the platform
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={newUserData.email}
                onChange={(e) => setNewUserData((prev) => ({ ...prev, email: e.target.value }))}
                className="bg-background"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  value={newUserData.firstName}
                  onChange={(e) =>
                    setNewUserData((prev) => ({ ...prev, firstName: e.target.value }))
                  }
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  value={newUserData.lastName}
                  onChange={(e) =>
                    setNewUserData((prev) => ({ ...prev, lastName: e.target.value }))
                  }
                  className="bg-background"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Initial Role</Label>
              <Select
                value={newUserData.role}
                onValueChange={(value) => setNewUserData((prev) => ({ ...prev, role: value }))}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="loan_officer">Loan Officer</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddUserModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddUser} disabled={addingUser}>
              {addingUser ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Advanced Filters Modal */}
      <Dialog open={showFiltersModal} onOpenChange={setShowFiltersModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Advanced Filters</DialogTitle>
            <DialogDescription>Filter users by multiple criteria</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="tenant_admin">Tenant Admin</SelectItem>
                  <SelectItem value="loan_officer">Loan Officer</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Search</Label>
              <Input
                placeholder="Search by name, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-background"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setFilterRole('all');
                setFilterStatus('all');
                setSearchTerm('');
              }}
            >
              Clear Filters
            </Button>
            <Button onClick={() => setShowFiltersModal(false)}>Apply Filters</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagementDashboard;
