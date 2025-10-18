import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Shield, 
  Settings, 
  Eye, 
  Edit, 
  Save,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  isSystemPermission: boolean;
  riskLevel: 'low' | 'medium' | 'high';
}

interface Role {
  id: string;
  name: string;
  permissions: string[];
  isSystemRole: boolean;
}

const PermissionMatrix: React.FC = () => {
  const [roles] = useState<Role[]>([
    {
      id: '1',
      name: 'Admin',
      permissions: ['user_management', 'system_settings', 'analytics_access', 'audit_logs', 'financial_reports'],
      isSystemRole: true
    },
    {
      id: '2',
      name: 'Loan Officer',
      permissions: ['loan_processing', 'client_management', 'payment_processing', 'basic_reports'],
      isSystemRole: true
    },
    {
      id: '3',
      name: 'Client',
      permissions: ['loan_application', 'account_view', 'payment_history'],
      isSystemRole: true
    },
    {
      id: '4',
      name: 'Support',
      permissions: ['ticket_management', 'client_communication', 'basic_reports'],
      isSystemRole: false
    }
  ]);

  const [permissions] = useState<Permission[]>([
    { id: 'user_management', name: 'User Management', description: 'Create, edit, and delete users', category: 'Administration', isSystemPermission: true, riskLevel: 'high' },
    { id: 'system_settings', name: 'System Settings', description: 'Modify system configuration', category: 'Administration', isSystemPermission: true, riskLevel: 'high' },
    { id: 'analytics_access', name: 'Analytics Access', description: 'View analytics and reports', category: 'Analytics', isSystemPermission: false, riskLevel: 'medium' },
    { id: 'audit_logs', name: 'Audit Logs', description: 'View system audit logs', category: 'Security', isSystemPermission: true, riskLevel: 'high' },
    { id: 'financial_reports', name: 'Financial Reports', description: 'Access financial reporting', category: 'Finance', isSystemPermission: false, riskLevel: 'medium' },
    { id: 'loan_processing', name: 'Loan Processing', description: 'Process loan applications', category: 'Loans', isSystemPermission: false, riskLevel: 'medium' },
    { id: 'client_management', name: 'Client Management', description: 'Manage client accounts', category: 'Clients', isSystemPermission: false, riskLevel: 'low' },
    { id: 'payment_processing', name: 'Payment Processing', description: 'Process payments', category: 'Payments', isSystemPermission: false, riskLevel: 'medium' },
    { id: 'loan_application', name: 'Loan Application', description: 'Apply for loans', category: 'Loans', isSystemPermission: false, riskLevel: 'low' },
    { id: 'account_view', name: 'Account View', description: 'View account information', category: 'Account', isSystemPermission: false, riskLevel: 'low' },
    { id: 'payment_history', name: 'Payment History', description: 'View payment history', category: 'Payments', isSystemPermission: false, riskLevel: 'low' },
    { id: 'ticket_management', name: 'Ticket Management', description: 'Manage support tickets', category: 'Support', isSystemPermission: false, riskLevel: 'low' },
    { id: 'client_communication', name: 'Client Communication', description: 'Communicate with clients', category: 'Communication', isSystemPermission: false, riskLevel: 'low' },
    { id: 'basic_reports', name: 'Basic Reports', description: 'View basic reports', category: 'Reports', isSystemPermission: false, riskLevel: 'low' }
  ]);

  const [permissionMatrix, setPermissionMatrix] = useState<{ [roleId: string]: { [permissionId: string]: boolean } }>(() => {
    const matrix: { [roleId: string]: { [permissionId: string]: boolean } } = {};
    roles.forEach(role => {
      matrix[role.id] = {};
      permissions.forEach(permission => {
        matrix[role.id][permission.id] = role.permissions.includes(permission.id);
      });
    });
    return matrix;
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [viewMode, setViewMode] = useState<'matrix' | 'category'>('matrix');

  const handlePermissionToggle = (roleId: string, permissionId: string) => {
    const role = roles.find(r => r.id === roleId);
    if (role?.isSystemRole) {
      alert('Cannot modify permissions for system roles');
      return;
    }

    setPermissionMatrix(prev => ({
      ...prev,
      [roleId]: {
        ...prev[roleId],
        [permissionId]: !prev[roleId][permissionId]
      }
    }));
    setHasChanges(true);
  };

  const handleSaveChanges = () => {
    // Here you would typically save to backend
    console.log('Saving permission changes:', permissionMatrix);
    setHasChanges(false);
    alert('Permission changes saved successfully!');
  };

  const handleResetChanges = () => {
    const matrix: { [roleId: string]: { [permissionId: string]: boolean } } = {};
    roles.forEach(role => {
      matrix[role.id] = {};
      permissions.forEach(permission => {
        matrix[role.id][permission.id] = role.permissions.includes(permission.id);
      });
    });
    setPermissionMatrix(matrix);
    setHasChanges(false);
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high':
        return 'text-red-600 bg-red-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getRoleIcon = (roleName: string) => {
    switch (roleName.toLowerCase()) {
      case 'admin':
        return <Shield className="h-4 w-4 text-purple-600" />;
      case 'loan officer':
        return <Settings className="h-4 w-4 text-blue-600" />;
      case 'client':
        return <Eye className="h-4 w-4 text-green-600" />;
      case 'support':
        return <Settings className="h-4 w-4 text-orange-600" />;
      default:
        return <Shield className="h-4 w-4 text-gray-600" />;
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

  const permissionCategories = getPermissionsByCategory();

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-semibold">Permission Matrix</h3>
            <p className="text-muted-foreground">
              Manage granular permissions for each role
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'matrix' ? 'category' : 'matrix')}
            >
              {viewMode === 'matrix' ? 'Category View' : 'Matrix View'}
            </Button>
            {hasChanges && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetChanges}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveChanges}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Changes Alert */}
        {hasChanges && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 text-yellow-800">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">You have unsaved changes</span>
                <span className="text-sm">Remember to save your permission changes</span>
              </div>
            </CardContent>
          </Card>
        )}

        {viewMode === 'matrix' ? (
          /* Matrix View */
          <Card>
            <CardHeader>
              <CardTitle>Permission Matrix</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Permission</th>
                      {roles.map(role => (
                        <th key={role.id} className="text-center p-3 font-medium min-w-[120px]">
                          <div className="flex flex-col items-center space-y-1">
                            <div className="flex items-center space-x-1">
                              {getRoleIcon(role.name)}
                              <span>{role.name}</span>
                            </div>
                            {role.isSystemRole && (
                              <Badge variant="outline" className="text-xs">
                                System
                              </Badge>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {permissions.map(permission => (
                      <tr key={permission.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div className="flex items-center space-x-3">
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">{permission.name}</span>
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${getRiskLevelColor(permission.riskLevel)}`}
                                >
                                  {permission.riskLevel}
                                </Badge>
                                {permission.isSystemPermission && (
                                  <Badge variant="outline" className="text-xs">
                                    System
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {permission.description}
                              </p>
                              <Badge variant="secondary" className="text-xs mt-1">
                                {permission.category}
                              </Badge>
                            </div>
                          </div>
                        </td>
                        {roles.map(role => (
                          <td key={role.id} className="p-3 text-center">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex justify-center">
                                  <Switch
                                    checked={permissionMatrix[role.id]?.[permission.id] || false}
                                    onCheckedChange={() => handlePermissionToggle(role.id, permission.id)}
                                    disabled={role.isSystemRole}
                                  />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                {role.isSystemRole 
                                  ? 'System roles cannot be modified'
                                  : `Toggle ${permission.name} for ${role.name}`
                                }
                              </TooltipContent>
                            </Tooltip>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Category View */
          <div className="space-y-6">
            {Object.entries(permissionCategories).map(([category, categoryPermissions]) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="h-5 w-5" />
                    <span>{category} Permissions</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {categoryPermissions.map(permission => (
                      <div key={permission.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{permission.name}</span>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getRiskLevelColor(permission.riskLevel)}`}
                            >
                              {permission.riskLevel}
                            </Badge>
                            {permission.isSystemPermission && (
                              <Badge variant="outline" className="text-xs">
                                System
                              </Badge>
                            )}
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{permission.description}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                          {permission.description}
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {roles.map(role => (
                            <div key={role.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div className="flex items-center space-x-2">
                                {getRoleIcon(role.name)}
                                <span className="text-sm font-medium">{role.name}</span>
                              </div>
                              <Switch
                                checked={permissionMatrix[role.id]?.[permission.id] || false}
                                onCheckedChange={() => handlePermissionToggle(role.id, permission.id)}
                                disabled={role.isSystemRole}
                                size="sm"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Legend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h4 className="font-medium mb-2">Risk Levels</h4>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs bg-red-100 text-red-800">High</Badge>
                    <span className="text-sm">Critical system permissions</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800">Medium</Badge>
                    <span className="text-sm">Important business permissions</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs bg-green-100 text-green-800">Low</Badge>
                    <span className="text-sm">Standard user permissions</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Permission Types</h4>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">System</Badge>
                    <span className="text-sm">Core system permissions</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="text-xs">Category</Badge>
                    <span className="text-sm">Permission grouping</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Role Types</h4>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">System</Badge>
                    <span className="text-sm">Built-in roles (read-only)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    <span className="text-sm">Custom roles (editable)</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
};

export default PermissionMatrix;
