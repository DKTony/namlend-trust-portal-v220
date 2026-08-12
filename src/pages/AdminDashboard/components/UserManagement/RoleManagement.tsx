import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/integrations/convex/api';
import { useQuery as useConvexQuery } from 'convex/react';
import {
  AlertTriangle,
  CheckCircle,
  Edit,
  Eye,
  Lock,
  Plus,
  Settings,
  Shield,
  Unlock,
  Users,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import AssignRoleModal from './AssignRoleModal';
type AppRole = 'admin' | 'loan_officer' | 'client';

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
  isSystemRole: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  isSystemPermission: boolean;
}

const RoleManagement: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([
    {
      id: 'admin',
      name: 'Admin',
      description: 'Full system access with all administrative privileges',
      permissions: [
        'user_management',
        'system_settings',
        'analytics_access',
        'audit_logs',
        'financial_reports',
      ],
      userCount: 0,
      isSystemRole: true,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'loan_officer',
      name: 'Loan Officer',
      description: 'Loan processing and client management capabilities',
      permissions: ['loan_processing', 'client_management', 'payment_processing'],
      userCount: 0,
      isSystemRole: true,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'client',
      name: 'Client',
      description: 'Standard client access to loan applications and account management',
      permissions: ['loan_application', 'account_view', 'payment_history'],
      userCount: 0,
      isSystemRole: true,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]);

  const [permissions] = useState<Permission[]>([
    {
      id: 'user_management',
      name: 'User Management',
      description: 'Create, edit, and delete users',
      category: 'Administration',
      isSystemPermission: true,
    },
    {
      id: 'system_settings',
      name: 'System Settings',
      description: 'Modify system configuration',
      category: 'Administration',
      isSystemPermission: true,
    },
    {
      id: 'analytics_access',
      name: 'Analytics Access',
      description: 'View analytics and reports',
      category: 'Analytics',
      isSystemPermission: false,
    },
    {
      id: 'audit_logs',
      name: 'Audit Logs',
      description: 'View system audit logs',
      category: 'Security',
      isSystemPermission: true,
    },
    {
      id: 'financial_reports',
      name: 'Financial Reports',
      description: 'Access financial reporting',
      category: 'Finance',
      isSystemPermission: false,
    },
    {
      id: 'loan_processing',
      name: 'Loan Processing',
      description: 'Process loan applications',
      category: 'Loans',
      isSystemPermission: false,
    },
    {
      id: 'client_management',
      name: 'Client Management',
      description: 'Manage client accounts',
      category: 'Clients',
      isSystemPermission: false,
    },
    {
      id: 'payment_processing',
      name: 'Payment Processing',
      description: 'Process payments',
      category: 'Payments',
      isSystemPermission: false,
    },
    {
      id: 'loan_application',
      name: 'Loan Application',
      description: 'Apply for loans',
      category: 'Loans',
      isSystemPermission: false,
    },
    {
      id: 'account_view',
      name: 'Account View',
      description: 'View account information',
      category: 'Account',
      isSystemPermission: false,
    },
    {
      id: 'payment_history',
      name: 'Payment History',
      description: 'View payment history',
      category: 'Payments',
      isSystemPermission: false,
    },
    {
      id: 'ticket_management',
      name: 'Ticket Management',
      description: 'Manage support tickets',
      category: 'Support',
      isSystemPermission: false,
    },
    {
      id: 'client_communication',
      name: 'Client Communication',
      description: 'Communicate with clients',
      category: 'Communication',
      isSystemPermission: false,
    },
    {
      id: 'basic_reports',
      name: 'Basic Reports',
      description: 'View basic reports',
      category: 'Reports',
      isSystemPermission: false,
    },
  ]);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [newRole, setNewRole] = useState({
    name: '',
    description: '',
    permissions: [] as string[],
  });
  const { toast } = useToast();
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedAppRole, setSelectedAppRole] = useState<AppRole | null>(null);
  const [viewUsersOpen, setViewUsersOpen] = useState(false);
  const [viewUsersRole, setViewUsersRole] = useState<string | null>(null);
  interface UserWithRole {
    user_id: string;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    phone_number?: string | null;
    account_status?: string | null;
  }

  const [viewUsersData, setViewUsersData] = useState<UserWithRole[]>([]);
  const [viewUsersLoading, setViewUsersLoading] = useState(false);

  const nameToAppRole = (roleName: string): 'admin' | 'loan_officer' | 'client' => {
    const n = roleName.toLowerCase();
    if (n === 'admin') return 'admin';
    if (n === 'loan officer') return 'loan_officer';
    return 'client';
  };

  // Convex reactive queries for each role
  const adminUsers = useConvexQuery(api.users.listUsers, { role: 'admin' });
  const officerUsers = useConvexQuery(api.users.listUsers, { role: 'loan_officer' });
  const clientUsers = useConvexQuery(api.users.listUsers, { role: 'client' });

  // Update role counts reactively
  useEffect(() => {
    if (adminUsers !== undefined && officerUsers !== undefined && clientUsers !== undefined) {
      setRoles((prev) =>
        prev.map((r) => {
          const roleKey = nameToAppRole(r.name);
          const count =
            roleKey === 'admin'
              ? adminUsers?.length || 0
              : roleKey === 'loan_officer'
                ? officerUsers?.length || 0
                : clientUsers?.length || 0;
          return { ...r, userCount: count, updatedAt: new Date().toISOString() };
        })
      );
    }
  }, [adminUsers, officerUsers, clientUsers]);

  const refreshRoleCounts = () => {}; // Convex is reactive

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getRoleIcon = (roleName: string) => {
    switch (roleName.toLowerCase()) {
      case 'admin':
        return <Shield className="h-5 w-5 text-purple-600 " />;
      case 'loan officer':
        return <Users className="h-5 w-5 text-blue-600 " />;
      case 'client':
        return <Users className="h-5 w-5 text-green-600 " />;
      case 'tenant admin':
        return <Shield className="h-5 w-5 text-purple-600 " />;
      default:
        return <Shield className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getPermissionsByCategory = () => {
    const categories: { [key: string]: Permission[] } = {};
    permissions.forEach((permission) => {
      if (!categories[permission.category]) {
        categories[permission.category] = [];
      }
      categories[permission.category].push(permission);
    });
    return categories;
  };

  const handleCreateRole = () => {
    toast({
      title: 'Not supported',
      description: 'Dynamic role creation is disabled. Use system roles only.',
    });
  };

  const handleUpdateRole = () => {
    toast({
      title: 'Not supported',
      description: 'Editing role definitions is disabled. Use role assignment per user.',
    });
  };

  const handleViewUsers = async (roleName: string) => {
    try {
      setViewUsersRole(roleName);
      setViewUsersLoading(true);
      setViewUsersOpen(true);
      setViewUsersData([]);

      const appRole = nameToAppRole(roleName);
      const users =
        appRole === 'admin' ? adminUsers : appRole === 'loan_officer' ? officerUsers : clientUsers;

      setViewUsersData(
        (users ?? []).map((user) => {
          const [firstName = '', ...rest] = (user.fullName ?? '').split(' ');
          return {
            user_id: String(user.userId),
            first_name: firstName || null,
            last_name: rest.join(' ') || null,
            email: user.email ?? null,
            phone_number: user.phone ?? null,
            account_status: user.status ?? 'active',
          };
        })
      );
    } catch (e) {
      toast({
        title: 'Load error',
        description: e instanceof Error ? e.message : String(e),
        variant: 'destructive',
      });
    } finally {
      setViewUsersLoading(false);
    }
  };

  const handleToggleRoleStatus = (roleId: string) => {
    const updatedRoles = roles.map((role) =>
      role.id === roleId
        ? { ...role, isActive: !role.isActive, updatedAt: new Date().toISOString() }
        : role
    );
    setRoles(updatedRoles);
  };

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    if (checked) {
      setNewRole((prev) => ({
        ...prev,
        permissions: [...prev.permissions, permissionId],
      }));
    } else {
      setNewRole((prev) => ({
        ...prev,
        permissions: prev.permissions.filter((p) => p !== permissionId),
      }));
    }
  };

  const permissionCategories = getPermissionsByCategory();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold">Role Management</h3>
          <p className="text-muted-foreground">
            Manage user roles and their associated permissions
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled title="Dynamic role creation is disabled">
              <Plus className="mr-2 h-4 w-4" />
              Create Role
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRole ? 'Edit Role' : 'Create New Role'}</DialogTitle>
              <DialogDescription>
                {editingRole
                  ? 'Modify the role details and permissions'
                  : 'Create a new role with specific permissions'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="roleName">Role Name</Label>
                  <Input
                    id="roleName"
                    value={newRole.name}
                    onChange={(e) => setNewRole((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter role name"
                  />
                </div>
                <div>
                  <Label htmlFor="roleDescription">Description</Label>
                  <Textarea
                    id="roleDescription"
                    value={newRole.description}
                    onChange={(e) =>
                      setNewRole((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="Enter role description"
                    rows={3}
                  />
                </div>
              </div>

              {/* Permissions */}
              <div>
                <Label className="text-base font-semibold">Permissions</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Select the permissions this role should have
                </p>

                <div className="space-y-6">
                  {Object.entries(permissionCategories).map(([category, categoryPermissions]) => (
                    <div key={category} className="border rounded-lg p-4">
                      <h4 className="font-semibold mb-3 flex items-center">
                        <Settings className="h-4 w-4 mr-2" />
                        {category}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {categoryPermissions.map((permission) => (
                          <div key={permission.id} className="flex items-start space-x-3">
                            <Checkbox
                              id={permission.id}
                              checked={newRole.permissions.includes(permission.id)}
                              onCheckedChange={(checked) =>
                                handlePermissionChange(permission.id, checked as boolean)
                              }
                            />
                            <div className="flex-1">
                              <Label
                                htmlFor={permission.id}
                                className="text-sm font-medium cursor-pointer"
                              >
                                {permission.name}
                                {permission.isSystemPermission && (
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    System
                                  </Badge>
                                )}
                              </Label>
                              <p className="text-xs text-muted-foreground">
                                {permission.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setEditingRole(null);
                    setNewRole({ name: '', description: '', permissions: [] });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={editingRole ? handleUpdateRole : handleCreateRole}
                  disabled={!newRole.name || !newRole.description}
                >
                  {editingRole ? 'Update Role' : 'Create Role'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map((role) => (
          <Card key={role.id} className={`${!role.isActive ? 'opacity-60' : ''}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="shrink-0">{getRoleIcon(role.name)}</div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-lg truncate" title={role.name}>
                      {role.name}
                    </CardTitle>
                    <div className="flex items-center space-x-2 mt-1 flex-wrap gap-y-1">
                      {role.isSystemRole && (
                        <Badge variant="outline" className="text-xs shrink-0">
                          System Role
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className={`${
                          role.isActive
                            ? 'bg-green-100  text-green-800  border-green-200 '
                            : 'bg-red-100  text-red-800  border-red-200 '
                        } shrink-0`}
                      >
                        {role.isActive ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Inactive
                          </>
                        )}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-1 shrink-0 ml-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const appRole = nameToAppRole(role.name);
                      setSelectedAppRole(appRole);
                      setAssignOpen(true);
                    }}
                    title="Assign this role to a user"
                  >
                    <Users className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewUsers(role.name)}
                    title="View users with this role"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleToggleRoleStatus(role.id)}>
                    {role.isActive ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      toast({
                        title: 'Not supported',
                        description: 'Editing role definitions is disabled.',
                      })
                    }
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{role.description}</p>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Users:</span>
                  <span className="font-medium">{role.userCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Permissions:</span>
                  <span className="font-medium">{role.permissions.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Created:</span>
                  <span className="font-medium">{formatDate(role.createdAt)}</span>
                </div>
                {role.updatedAt !== role.createdAt && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Updated:</span>
                    <span className="font-medium">{formatDate(role.updatedAt)}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t">
                <div className="flex flex-wrap gap-1">
                  {role.permissions.slice(0, 3).map((permissionId) => {
                    const permission = permissions.find((p) => p.id === permissionId);
                    return permission ? (
                      <Badge key={permissionId} variant="secondary" className="text-xs">
                        {permission.name}
                      </Badge>
                    ) : null;
                  })}
                  {role.permissions.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{role.permissions.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Assign Role Modal */}
      <AssignRoleModal
        open={assignOpen}
        role={selectedAppRole}
        onClose={() => setAssignOpen(false)}
        onAssigned={() => {
          refreshRoleCounts();
          setAssignOpen(false);
        }}
      />

      {/* View Users Dialog */}
      <Dialog open={viewUsersOpen} onOpenChange={setViewUsersOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewUsersRole && getRoleIcon(viewUsersRole)}
              {viewUsersRole} Users
            </DialogTitle>
            <DialogDescription>
              Users with the {viewUsersRole?.toLowerCase()} role
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4">
            {viewUsersLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-3 text-muted-foreground">Loading users...</span>
              </div>
            ) : viewUsersData.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No users found with this role</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {viewUsersData.map((user: UserWithRole, index: number) => (
                  <Card key={user.user_id || index} className="bg-muted/30">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-primary font-semibold text-sm">
                            {(user.first_name?.[0] || '').toUpperCase()}
                            {(user.last_name?.[0] || '').toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {user.first_name || ''} {user.last_name || ''}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {user.email || 'No email'}
                          </p>
                        </div>
                        <div className="shrink-0">
                          <Badge
                            variant="outline"
                            className={`${
                              user.account_status === 'active'
                                ? 'bg-green-100  text-green-800  border-green-200 '
                                : 'bg-yellow-100  text-yellow-800  border-yellow-200 '
                            }`}
                          >
                            {user.account_status || 'pending'}
                          </Badge>
                        </div>
                      </div>
                      {user.phone_number && (
                        <p className="text-xs text-muted-foreground mt-2 ml-14">
                          📞 {user.phone_number}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {viewUsersData.length} user{viewUsersData.length !== 1 ? 's' : ''} found
            </p>
            <Button variant="outline" onClick={() => setViewUsersOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RoleManagement;
