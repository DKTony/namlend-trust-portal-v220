import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Eye, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Shield, 
  User, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Settings,
  MoreHorizontal,
  Edit,
  Trash2,
  UserX,
  UserCog
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useUsersList } from '../../hooks/useUsersList';
import RoleManagementModal from './RoleManagementModal';

interface User {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: 'admin' | 'loan_officer' | 'client' | 'support';
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  lastLogin: string;
  createdAt: string;
  permissions: string[];
  isVerified: boolean;
  loginCount: number;
  department?: string;
}

interface UsersListProps {
  searchTerm: string;
  filterRole: string;
  filterStatus: string;
  selectedUsers: string[];
  onUserSelect: (userId: string) => void;
  onBulkSelect: (userIds: string[]) => void;
}

const UsersList: React.FC<UsersListProps> = ({
  searchTerm,
  filterRole,
  filterStatus,
  selectedUsers,
  onUserSelect,
  onBulkSelect
}) => {
  const {
    users,
    loading,
    error,
    filteredUsers,
    setSearchTerm: setHookSearchTerm,
    setFilterRole: setHookFilterRole,
    setFilterStatus: setHookFilterStatus,
    refreshUsers,
  } = useUsersList();
  const [selectAll, setSelectAll] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedUserForRoles, setSelectedUserForRoles] = useState<{
    id: string;
    name: string;
    email: string;
  } | null>(null);
  
  // Sync external filters into the hook's internal state
  useEffect(() => {
    setHookSearchTerm(searchTerm || '');
    setHookFilterRole(filterRole || 'all');
    setHookFilterStatus(filterStatus || 'all');
  }, [searchTerm, filterRole, filterStatus, setHookSearchTerm, setHookFilterRole, setHookFilterStatus]);
  
  // Deduplicate by id to avoid duplicate keys and repeated rows when data comes from joins
  const uniqueUsers = React.useMemo(() => {
    const seen = new Set<string>();
    return ((filteredUsers ?? users) ?? []).filter((u) => {
      if (seen.has(u.id)) return false;
      seen.add(u.id);
      return true;
    });
  }, [filteredUsers, users]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'bg-green-100 text-green-800 border-green-200',
      inactive: 'bg-gray-100 text-gray-800 border-gray-200',
      suspended: 'bg-red-100 text-red-800 border-red-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    };

    const icons = {
      active: <CheckCircle className="h-3 w-3 mr-1" />,
      inactive: <Clock className="h-3 w-3 mr-1" />,
      suspended: <AlertTriangle className="h-3 w-3 mr-1" />,
      pending: <Clock className="h-3 w-3 mr-1" />
    };

    return (
      <Badge variant="outline" className={variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800'}>
        {icons[status as keyof typeof icons]}
        <span className="capitalize">{status}</span>
      </Badge>
    );
  };

  const getRoleBadge = (role: string) => {
    const variants = {
      admin: 'bg-purple-100 text-purple-800 border-purple-200',
      loan_officer: 'bg-blue-100 text-blue-800 border-blue-200',
      client: 'bg-green-100 text-green-800 border-green-200',
      support: 'bg-orange-100 text-orange-800 border-orange-200'
    };

    const icons = {
      admin: <Shield className="h-3 w-3 mr-1" />,
      loan_officer: <User className="h-3 w-3 mr-1" />,
      client: <User className="h-3 w-3 mr-1" />,
      support: <Settings className="h-3 w-3 mr-1" />
    };

    const labels = {
      admin: 'Admin',
      loan_officer: 'Loan Officer',
      client: 'Client',
      support: 'Support'
    };

    return (
      <Badge variant="outline" className={variants[role as keyof typeof variants] || 'bg-gray-100 text-gray-800'}>
        {icons[role as keyof typeof icons]}
        <span>{labels[role as keyof typeof labels] || role}</span>
      </Badge>
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      onBulkSelect(uniqueUsers?.map(user => user.id) || []);
    } else {
      onBulkSelect([]);
    }
  };

  const handleUserCheckbox = (userId: string, checked: boolean) => {
    if (checked) {
      onBulkSelect([...selectedUsers, userId]);
    } else {
      onBulkSelect(selectedUsers.filter(id => id !== userId));
      setSelectAll(false);
    }
  };

  const handleUserAction = (action: string, userId: string, userName?: string, userEmail?: string) => {
    switch (action) {
      case 'view':
        onUserSelect(userId);
        break;
      case 'manage_roles':
        setSelectedUserForRoles({ 
          id: userId, 
          name: userName || 'Unknown User',
          email: userEmail || ''
        });
        setRoleModalOpen(true);
        break;
      case 'edit':
        // Handle edit user
        console.log('Edit user:', userId);
        break;
      case 'suspend':
        // Handle suspend user
        console.log('Suspend user:', userId);
        break;
      case 'delete':
        // Handle delete user
        console.log('Delete user:', userId);
        break;
      default:
        break;
    }
  };

  const handleRoleModalClose = () => {
    setRoleModalOpen(false);
    setSelectedUserForRoles(null);
  };

  const handleRoleChanged = () => {
    // Refresh the user list to show updated roles
    refreshUsers();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="h-4 w-4 bg-gray-200 rounded"></div>
                <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="h-8 bg-gray-200 rounded w-20"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <span>Failed to load users: {error}</span>
            </div>
            <Button variant="outline" size="sm" onClick={refreshUsers}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!uniqueUsers || uniqueUsers.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
            <p className="text-gray-500">
              {searchTerm 
                ? `No users match "${searchTerm}"`
                : `No users match the current filters`
              }
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk Selection Header */}
      {uniqueUsers.length > 0 && (
        <Card className="bg-gray-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Checkbox
                  checked={selectAll}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm font-medium">
                  Select All ({uniqueUsers.length} users)
                </span>
                {selectedUsers.length > 0 && (
                  <Badge variant="outline" className="bg-blue-100 text-blue-800">
                    {selectedUsers.length} selected
                  </Badge>
                )}
              </div>
              {selectedUsers.length > 0 && (
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    Bulk Edit
                  </Button>
                  <Button variant="outline" size="sm">
                    Export Selected
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users List */}
      {uniqueUsers.map((user) => (
        <Card 
          key={user.id} 
          className="hover:shadow-md transition-shadow duration-200"
        >
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              {/* Selection Checkbox */}
              <Checkbox
                checked={selectedUsers.includes(user.id)}
                onCheckedChange={(checked) => handleUserCheckbox(user.id, checked as boolean)}
              />

              {/* User Avatar */}
              <div className="flex-shrink-0">
                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
              </div>

              {/* User Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      {user.fullName}
                      {user.isVerified && (
                        <CheckCircle className="h-4 w-4 text-green-500 ml-2" />
                      )}
                    </h3>
                    {getStatusBadge(user.status)}
                    {getRoleBadge(user.role)}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {user.loginCount} logins
                    </div>
                    <div className="text-xs text-gray-500">
                      Total Sessions
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{user.email}</span>
                  </div>
                  {user.phone && (
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4" />
                      <span>{user.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>Joined {formatDate(user.createdAt)}</span>
                  </div>
                  {user.department && (
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4" />
                      <span>{user.department}</span>
                    </div>
                  )}
                </div>

                {/* Additional Details */}
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-4">
                      <div className="text-gray-500">
                        Permissions: {user.permissions.length} assigned
                      </div>
                    </div>
                    <div className="text-gray-500">
                      Last login: {formatDate(user.lastLogin)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleUserAction('view', user.id, user.fullName, user.email)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleUserAction('manage_roles', user.id, user.fullName, user.email)}>
                      <UserCog className="h-4 w-4 mr-2" />
                      Manage Roles
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleUserAction('edit', user.id, user.fullName, user.email)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit User
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleUserAction('suspend', user.id, user.fullName, user.email)}>
                      <UserX className="h-4 w-4 mr-2" />
                      Suspend User
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => handleUserAction('delete', user.id, user.fullName, user.email)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete User
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Role Management Modal */}
      <RoleManagementModal
        open={roleModalOpen}
        userId={selectedUserForRoles?.id || null}
        userName={selectedUserForRoles?.name || null}
        userEmail={selectedUserForRoles?.email || null}
        onClose={handleRoleModalClose}
        onRoleChanged={handleRoleChanged}
      />
    </div>
  );
};

export default UsersList;
