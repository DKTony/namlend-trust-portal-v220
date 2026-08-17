import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/integrations/convex/api';
import type { Id } from '@/types/convex';
import {
  TENANT_ASSIGNABLE_ROLES,
  USER_ROLE_LABELS,
  toAssignableRole,
  type TenantAssignableRole,
  type UserRole,
} from '@/types/admin';
import { useMutation } from 'convex/react';
import React, { useEffect, useState } from 'react';

interface ChangeRoleDialogProps {
  open: boolean;
  userId: string | null;
  userName?: string | null;
  currentRole?: string | null;
  onClose: () => void;
  onRoleChanged?: () => void;
}

const ChangeRoleDialog: React.FC<ChangeRoleDialogProps> = ({
  open,
  userId,
  userName,
  currentRole,
  onClose,
  onRoleChanged,
}) => {
  const { toast } = useToast();
  const assignRole = useMutation(api.users.assignRole);
  const [role, setRole] = useState<TenantAssignableRole>(
    toAssignableRole(currentRole ?? undefined)
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setRole(toAssignableRole(currentRole ?? undefined));
    }
  }, [open, currentRole]);

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await assignRole({
        targetUserId: userId as Id<'users'>,
        role,
      });
      toast({
        title: 'Role updated',
        description: `${userName || 'User'} is now ${USER_ROLE_LABELS[role]}.`,
      });
      onRoleChanged?.();
      onClose();
    } catch (error) {
      toast({
        title: 'Could not change role',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const currentLabel =
    currentRole && currentRole in USER_ROLE_LABELS
      ? USER_ROLE_LABELS[currentRole as UserRole]
      : currentRole || 'Client';

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Change role{userName ? ` — ${userName}` : ''}</DialogTitle>
          <DialogDescription>
            Current role: {currentLabel}. Staff who signed in with Google start as Client until you
            promote them.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="tenant-role">Tenant role</Label>
          <Select value={role} onValueChange={(value) => setRole(value as TenantAssignableRole)}>
            <SelectTrigger id="tenant-role" data-testid="change-role-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TENANT_ASSIGNABLE_ROLES.map((option) => (
                <SelectItem key={option} value={option}>
                  {USER_ROLE_LABELS[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            data-testid="change-role-confirm"
            onClick={handleSave}
            disabled={saving || !userId}
          >
            {saving ? 'Saving…' : 'Save role'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ChangeRoleDialog;
