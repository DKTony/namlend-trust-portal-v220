import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Shield, 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Settings,
  Eye,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { getProfilesWithRoles, AppRole } from '@/services/adminService';
import { assignRoleWithServiceRole } from '@/utils/serviceRoleAssignment';
import AssignRoleModal from './AssignRoleModal';

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
      permissions: ['user_management', 'system_settings', 'analytics_access', 'audit_logs', 'financial_reports'],
      userCount: 0,
      isSystemRole: true,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
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
      updatedAt: new Date().toISOString()
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
      updatedAt: new Date().toISOString()
    }
  ]);

  const [permissions] = useState<Permission[]>([
    { id: 'user_management', name: 'User Management', description: 'Create, edit, and delete users', category: 'Administration', isSystemPermission: true },
    { id: 'system_settings', name: 'System Settings', description: 'Modify system configuration', category: 'Administration', isSystemPermission: true },
    { id: 'analytics_access', name: 'Analytics Access', description: 'View analytics and reports', category: 'Analytics', isSystemPermission: false },
    { id: 'audit_logs', name: 'Audit Logs', description: 'View system audit logs', category: 'Security', isSystemPermission: true },
    { id: 'financial_reports', name: 'Financial Reports', description: 'Access financial reporting', category: 'Finance', isSystemPermission: false },
    { id: 'loan_processing', name: 'Loan Processing', description: 'Process loan applications', category: 'Loans', isSystemPermission: false },
    { id: 'client_management', name: 'Client Management', description: 'Manage client accounts', category: 'Clients', isSystemPermission: false },
    { id: 'payment_processing', name: 'Payment Processing', description: 'Process payments', category: 'Payments', isSystemPermission: false },
    { id: 'loan_application', name: 'Loan Application', description: 'Apply for loans', category: 'Loans', isSystemPermission: false },
    { id: 'account_view', name: 'Account View', description: 'View account information', category: 'Account', isSystemPermission: false },
    { id: 'payment_history', name: 'Payment History', description: 'View payment history', category: 'Payments', isSystemPermission: false },
    { id: 'ticket_management', name: 'Ticket Management', description: 'Manage support tickets', category: 'Support', isSystemPermission: false },
    { id: 'client_communication', name: 'Client Communication', description: 'Communicate with clients', category: 'Communication', isSystemPermission: false },
    { id: 'basic_reports', name: 'Basic Reports', description: 'View basic reports', category: 'Reports', isSystemPermission: false }
  ]);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [newRole, setNewRole] = useState({
    name: '',
    description: '',
    permissions: [] as string[]
  });
  const { toast } = useToast();
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedAppRole, setSelectedAppRole] = useState<AppRole | null>(null);

  const nameToAppRole = (roleName: string): 'admin' | 'loan_officer' | 'client' => {
    const n = roleName.toLowerCase();
    if (n === 'admin') return 'admin';
    if (n === 'loan officer') return 'loan_officer';
    return 'client';
  };

  const refreshRoleCounts = async () => {
    try {
      setLoadingCounts(true);
      const [admins, officers, clients] = await Promise.all([
        getProfilesWithRoles({ role: 'admin' }),
        getProfilesWithRoles({ role: 'loan_officer' }),
        getProfilesWithRoles({ role: 'client' })
      ]);
      setRoles(prev => prev.map(r => {
        const roleKey = nameToAppRole(r.name);
        const count = roleKey === 'admin' ? (admins.results?.length || 0)
          : roleKey === 'loan_officer' ? (officers.results?.length || 0)
          : (clients.results?.length || 0);
        return { ...r, userCount: count, updatedAt: new Date().toISOString() };
      }));
    } catch (e) {
      console.error('Failed to refresh role counts', e);
    } finally {
      setLoadingCounts(false);
    }
  };

  useEffect(() => {
    refreshRoleCounts();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getRoleIcon = (roleName: string) => {
    switch (roleName.toLowerCase()) {
      case 'admin':
        return <Shield className="h-5 w-5 text-purple-600" />;
      case 'loan officer':
        return <Users className="h-5 w-5 text-blue-600" />;
      case 'client':
        return <Users className="h-5 w-5 text-green-600" />;
      case 'support':
        return <Settings className="h-5 w-5 text-orange-600" />;
      default:
        return <Shield className="h-5 w-5 text-gray-600" />;
    }
  };

  const getPermissionsByCategory = () => {
    const categories: { [key: string]: Permission[] } = {};
    permissions.forEach(permission => {
      if (!categories[permission.category]) {
        categories[permission.category] = [];
      }
      categories[permission.category].push(permission);
    });
    return categories;
  };

  const handleCreateRole = () => {
    toast({ title: 'Not supported', description: 'Dynamic role creation is disabled. Use system roles only.' });
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setNewRole({
      name: role.name,
      description: role.description,
      permissions: role.permissions
    });
  };

  const handleUpdateRole = () => {
    toast({ title: 'Not supported', description: 'Editing role definitions is disabled. Use role assignment per user.' });
  };

  const handleDeleteRole = () => {
    toast({ title: 'Not supported', description: 'Deleting roles is disabled. Use system roles only.' });
  };

  const handleAssignToUser = async (roleName: string) => {
    const userId = typeof window !== 'undefined' ? window.prompt('Enter target user UUID') : null;
    if (!userId) return;
    try {
      const appRole = nameToAppRole(roleName);
      const res = await assignRoleWithServiceRole(userId, appRole);
      if (res.success) {
        toast({ title: 'Role assigned', description: `Assigned ${appRole} to ${userId}` });
        refreshRoleCounts();
      } else {
        toast({ title: 'Assignment failed', description: res.error || 'Unknown error', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Assignment error', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    }
  };

  const handleViewUsers = async (roleName: string) => {
    try {
      const appRole = nameToAppRole(roleName);
      const res = await getProfilesWithRoles({ role: appRole, limit: 50, offset: 0 });
      if (res.success) {
        const names = (res.results || []).map((u: any) => `${u.first_name || ''} ${u.last_name || ''} <${u.email || ''}>`.trim());
        const text = names.length ? names.join('\n') : 'No users found for this role';
        if (typeof window !== 'undefined') window.alert(text);
      } else {
        toast({ title: 'Load users failed', description: res.error || 'Unknown error', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Load error', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    }
  };

  const handleToggleRoleStatus = (roleId: string) => {
    const updatedRoles = roles.map(role => 
      role.id === roleId 
        ? { ...role, isActive: !role.isActive, updatedAt: new Date().toISOString() }
        : role
    );
    setRoles(updatedRoles);
  };

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    if (checked) {
      setNewRole(prev => ({
        ...prev,
        permissions: [...prev.permissions, permissionId]
      }));
    } else {
      setNewRole(prev => ({
        ...prev,
        permissions: prev.permissions.filter(p => p !== permissionId)
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
              <DialogTitle>
                {editingRole ? 'Edit Role' : 'Create New Role'}
              </DialogTitle>
              <DialogDescription>
                {editingRole 
                  ? 'Modify the role details and permissions' 
                  : 'Create a new role with specific permissions'
                }
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
                    onChange={(e) => setNewRole(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter role name"
                  />
                </div>
                <div>
                  <Label htmlFor="roleDescription">Description</Label>
                  <Textarea
                    id="roleDescription"
                    value={newRole.description}
                    onChange={(e) => setNewRole(prev => ({ ...prev, description: e.target.value }))}
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
                        {categoryPermissions.map(permission => (
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
                <div className="flex items-center space-x-3">
                  {getRoleIcon(role.name)}
                  <div>
                    <CardTitle className="text-lg">{role.name}</CardTitle>
                    <div className="flex items-center space-x-2 mt-1">
                      {role.isSystemRole && (
                        <Badge variant="outline" className="text-xs">
                          System Role
                        </Badge>
                      )}
                      <Badge 
                        variant="outline" 
                        className={role.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                        }
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
                <div className="flex items-center space-x-1">
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleRoleStatus(role.id)}
                  >
                    {role.isActive ? (
                      <Lock className="h-4 w-4" />
                    ) : (
                      <Unlock className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toast({ title: 'Not supported', description: 'Editing role definitions is disabled.' })}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {role.description}
              </p>
              
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
                  {role.permissions.slice(0, 3).map(permissionId => {
                    const permission = permissions.find(p => p.id === permissionId);
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
    </div>
  );
};

export default RoleManagement;
