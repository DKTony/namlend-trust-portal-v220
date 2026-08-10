import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  Edit,
  Eye,
  Mail,
  MapPin,
  MoreHorizontal,
  Phone,
  Settings,
  Shield,
  Trash2,
  User,
  UserCog,
  UserX,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useUsersList } from '../../hooks/useUsersList';
import RoleManagementModal from './RoleManagementModal';
import type { UserRole } from '@/types/admin';

interface User {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: UserRole;
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
  onBulkSelect,
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
  }, [
    searchTerm,
    filterRole,
    filterStatus,
    setHookSearchTerm,
    setHookFilterRole,
    setHookFilterStatus,
  ]);

  // Deduplicate by id to avoid duplicate keys and repeated rows when data comes from joins
  const uniqueUsers = React.useMemo(() => {
    const seen = new Set<string>();
    return (filteredUsers ?? users ?? []).filter((u) => {
      if (seen.has(u.id)) return false;
      seen.add(u.id);
      return true;
    });
  }, [filteredUsers, users]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active:
        'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800',
      inactive:
        'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700',
      suspended:
        'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800',
      pending:
        'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
    };

    const icons = {
      active: <CheckCircle className="h-3 w-3 mr-1" />,
      inactive: <Clock className="h-3 w-3 mr-1" />,
      suspended: <AlertTriangle className="h-3 w-3 mr-1" />,
      pending: <Clock className="h-3 w-3 mr-1" />,
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
        <span className="capitalize">{status}</span>
      </Badge>
    );
  };

  const getRoleBadge = (role: string) => {
    const variants = {
      admin:
        'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 border-purple-200 dark:border-purple-800',
      loan_officer:
        'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-800',
      client:
        'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800',
      tenant_admin:
        'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 border-purple-200 dark:border-purple-800',
    };

    const icons = {
      admin: <Shield className="h-3 w-3 mr-1" />,
      loan_officer: <User className="h-3 w-3 mr-1" />,
      client: <User className="h-3 w-3 mr-1" />,
      tenant_admin: <Shield className="h-3 w-3 mr-1" />,
    };

    const labels = {
      admin: 'Admin',
      loan_officer: 'Loan Officer',
      client: 'Client',
      tenant_admin: 'Tenant Admin',
    };

    return (
      <Badge
        variant="outline"
        className={
          variants[role as keyof typeof variants] ||
          'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400'
        }
      >
        {icons[role as keyof typeof icons]}
        <span>{labels[role as keyof typeof labels] || role}</span>
      </Badge>
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      onBulkSelect(uniqueUsers?.map((user) => user.id) || []);
    } else {
      onBulkSelect([]);
    }
  };

  const handleUserCheckbox = (userId: string, checked: boolean) => {
    if (checked) {
      onBulkSelect([...selectedUsers, userId]);
    } else {
      onBulkSelect(selectedUsers.filter((id) => id !== userId));
      setSelectAll(false);
    }
  };

  const handleUserAction = (
    action: string,
    userId: string,
    userName?: string,
    userEmail?: string
  ) => {
    switch (action) {
      case 'view':
        onUserSelect(userId);
        break;
      case 'manage_roles':
        setSelectedUserForRoles({
          id: userId,
          name: userName || 'Unknown User',
          email: userEmail || '',
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
          <Card key={i} className="animate-pulse bg-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="h-4 w-4 bg-muted rounded"></div>
                <div className="h-12 w-12 bg-muted rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
                <div className="h-8 bg-muted rounded w-20"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/10">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-destructive">
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
      <Card className="bg-card">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No users found</h3>
            <p className="text-muted-foreground">
              {searchTerm ? `No users match "${searchTerm}"` : `No users match the current filters`}
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
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <Checkbox checked={selectAll} onCheckedChange={handleSelectAll} />
                <span className="text-sm font-medium text-foreground">
                  Select All ({uniqueUsers.length} users)
                </span>
                {selectedUsers.length > 0 && (
                  <Badge
                    variant="outline"
                    className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400"
                  >
                    {selectedUsers.length} selected
                  </Badge>
                )}
              </div>
              {selectedUsers.length > 0 && (
                <div className="flex flex-col gap-2 sm:flex-row">
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
        <Card key={user.id} className="hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {/* Selection Checkbox */}
              <Checkbox
                checked={selectedUsers.includes(user.id)}
                onCheckedChange={(checked) => handleUserCheckbox(user.id, checked as boolean)}
              />

              {/* User Avatar */}
              <div className="flex-shrink-0">
                <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>

              {/* User Details */}
              <div className="flex-1 min-w-0">
                <div className="mb-2 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-foreground flex items-center truncate">
                      <span className="truncate" title={user.fullName}>
                        {user.fullName}
                      </span>
                      {user.isVerified && (
                        <CheckCircle className="h-4 w-4 text-green-500 ml-2 shrink-0" />
                      )}
                    </h3>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {getStatusBadge(user.status)}
                      {getRoleBadge(user.role)}
                    </div>
                  </div>
                  <div className="shrink-0 text-left lg:ml-2 lg:text-right">
                    <div className="text-sm font-medium text-foreground tabular-nums">
                      {user.loginCount} logins
                    </div>
                    <div className="text-xs text-muted-foreground">Total Sessions</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-2 min-w-0">
                    <Mail className="h-4 w-4 shrink-0" />
                    <span className="truncate" title={user.email}>
                      {user.email}
                    </span>
                  </div>
                  {user.phone && (
                    <div className="flex items-center space-x-2 shrink-0">
                      <Phone className="h-4 w-4 shrink-0" />
                      <span className="truncate">{user.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2 shrink-0">
                    <Calendar className="h-4 w-4 shrink-0" />
                    <span>Joined {formatDate(user.createdAt)}</span>
                  </div>
                  {user.department && (
                    <div className="flex items-center space-x-2 min-w-0">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span className="truncate" title={user.department}>
                        {user.department}
                      </span>
                    </div>
                  )}
                </div>

                {/* Additional Details */}
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      <div className="text-muted-foreground">
                        Permissions: {user.permissions.length} assigned
                      </div>
                    </div>
                    <div className="text-muted-foreground">
                      Last login: {formatDate(user.lastLogin)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 sm:w-36">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleUserAction('view', user.id, user.fullName, user.email)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() =>
                        handleUserAction('manage_roles', user.id, user.fullName, user.email)
                      }
                    >
                      <UserCog className="h-4 w-4 mr-2" />
                      Manage Roles
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleUserAction('edit', user.id, user.fullName, user.email)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit User
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        handleUserAction('suspend', user.id, user.fullName, user.email)
                      }
                    >
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
