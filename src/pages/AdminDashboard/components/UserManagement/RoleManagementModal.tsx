import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Shield, 
  User, 
  Settings, 
  Plus, 
  Minus, 
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';
import {
  AppRole,
  getUserRoles,
  assignUserRole,
  removeUserRole,
  getAllowedRoles,
  isRoleOperationAllowed,
  UserRole
} from '@/services/roleManagementService';

interface RoleManagementModalProps {
  open: boolean;
  userId: string | null;
  userName: string | null;
  userEmail?: string | null;
  onClose: () => void;
  onRoleChanged?: () => void;
}

const roleConfig = {
  admin: {
    label: 'Admin',
    icon: Shield,
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    description: 'Full system access and user management'
  },
  loan_officer: {
    label: 'Loan Officer',
    icon: User,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'Loan approval and client management'
  },
  client: {
    label: 'Client',
    icon: User,
    color: 'bg-green-100 text-green-800 border-green-200',
    description: 'Basic client access and loan applications'
  }
};

const RoleManagementModal: React.FC<RoleManagementModalProps> = ({
  open,
  userId,
  userName,
  userEmail,
  onClose,
  onRoleChanged
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [currentRoles, setCurrentRoles] = useState<UserRole[]>([]);
  const [allowedOperations, setAllowedOperations] = useState<{
    canAdd: AppRole[];
    canRemove: AppRole[];
    description: string;
  }>({ canAdd: [], canRemove: [], description: '' });

  // Load user roles when modal opens
  useEffect(() => {
    if (open && userId) {
      loadUserRoles();
    } else {
      setCurrentRoles([]);
      setAllowedOperations({ canAdd: [], canRemove: [], description: '' });
    }
  }, [open, userId]);

  // Update allowed operations when roles change
  useEffect(() => {
    const roleNames = currentRoles.map(r => r.role);
    const operations = getAllowedRoles(roleNames, userEmail || undefined);
    setAllowedOperations(operations);
  }, [currentRoles, userEmail]);

  const loadUserRoles = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const result = await getUserRoles(userId);
      if (result.success && result.roles) {
        setCurrentRoles(result.roles);
      } else {
        toast({
          title: 'Failed to load roles',
          description: result.error || 'Unknown error',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error loading roles',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddRole = async (role: AppRole) => {
    if (!userId) return;

    const currentRoleNames = currentRoles.map(r => r.role);
    const check = isRoleOperationAllowed(currentRoleNames, 'add', role);
    
    if (!check.allowed) {
      toast({
        title: 'Cannot add role',
        description: check.reason,
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const result = await assignUserRole(userId, role);
      if (result.success) {
        toast({
          title: 'Role added',
          description: `Successfully added ${roleConfig[role].label} role`
        });
        await loadUserRoles();
        onRoleChanged?.();
      } else {
        toast({
          title: 'Failed to add role',
          description: result.error || 'Unknown error',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error adding role',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveRole = async (role: AppRole) => {
    if (!userId) return;

    const currentRoleNames = currentRoles.map(r => r.role);
    const check = isRoleOperationAllowed(currentRoleNames, 'remove', role);
    
    if (!check.allowed) {
      toast({
        title: 'Cannot remove role',
        description: check.reason,
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const result = await removeUserRole(userId, role);
      if (result.success) {
        toast({
          title: 'Role removed',
          description: `Successfully removed ${roleConfig[role].label} role`
        });
        await loadUserRoles();
        onRoleChanged?.();
      } else {
        toast({
          title: 'Failed to remove role',
          description: result.error || 'Unknown error',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error removing role',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const currentRoleNames = currentRoles.map(r => r.role);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Manage Roles - {userName || 'User'}
          </DialogTitle>
          <DialogDescription>
            Add or remove roles for this user. Role changes are subject to hierarchy rules.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Roles */}
          <div>
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Current Roles
            </h3>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading roles...</div>
            ) : currentRoles.length > 0 ? (
              <div className="space-y-2">
                {currentRoles.map((userRole) => {
                  const config = roleConfig[userRole.role];
                  const Icon = config.icon;
                  const canRemove = allowedOperations.canRemove.includes(userRole.role);
                  
                  return (
                    <div key={userRole.role} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={config.color}>
                          <Icon className="h-3 w-3 mr-1" />
                          {config.label}
                        </Badge>
                        <div className="text-sm text-muted-foreground">
                          Added {formatDate(userRole.created_at)}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveRole(userRole.role)}
                        disabled={!canRemove || loading}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Minus className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No roles assigned</div>
            )}
          </div>

          <Separator />

          {/* Available Roles to Add */}
          <div>
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Plus className="h-4 w-4 text-blue-600" />
              Available Roles
            </h3>
            {allowedOperations.canAdd.length > 0 ? (
              <div className="space-y-2">
                {allowedOperations.canAdd.map((role) => {
                  const config = roleConfig[role];
                  const Icon = config.icon;
                  
                  return (
                    <div key={role} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={config.color}>
                          <Icon className="h-3 w-3 mr-1" />
                          {config.label}
                        </Badge>
                        <div className="text-sm text-muted-foreground">
                          {config.description}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddRole(role)}
                        disabled={loading}
                        className="text-green-600 hover:text-green-700"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No additional roles can be added
              </div>
            )}
          </div>

          <Separator />

          {/* Role Hierarchy Info */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-600" />
              Role Hierarchy Rules
            </h4>
            <div className="text-sm text-blue-800 mb-2">
              {allowedOperations.description}
            </div>
            <div className="text-xs text-blue-600 space-y-1">
              <div>• <strong>Super Admin:</strong> Can have any role combination</div>
              <div>• <strong>Client:</strong> Can only be a client (no multiple roles)</div>
              <div>• <strong>Loan Officer:</strong> Can only be a loan officer (single role)</div>
              <div>• <strong>Admin:</strong> Can be admin + loan officer (but NOT client)</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={loadUserRoles} disabled={loading}>
              Refresh Roles
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RoleManagementModal;
