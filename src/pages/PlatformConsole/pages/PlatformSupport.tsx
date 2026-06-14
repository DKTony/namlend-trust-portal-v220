/**
 * Support Console (Phase 4) — manage platform staff.
 *
 * Lists platform admins; owners can assign a new one (`assignPlatformAdmin`) or suspend an
 * existing one (`suspendPlatformAdmin`). Admins are never hard-deleted (audit retention).
 * Tenant impersonation / audited access lands in a later phase.
 */

import React, { useMemo, useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/integrations/convex/api';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { handleMutationError } from '@/lib/mutationError';
import { ThemedCard } from '@/components/ui/ThemedCard';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { Doc, Id } from '@/types/convex';
import { UserPlus } from 'lucide-react';

interface UserRow {
  userId: Id<'users'>;
  email?: string;
  role?: string;
}

const AssignDialog: React.FC<{ users: UserRow[]; existingIds: Set<string> }> = ({
  users,
  existingIds,
}) => {
  const assign = useMutation(api.platform.admins.assignPlatformAdmin);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState<'platform_owner' | 'platform_support'>('platform_support');

  const candidates = users.filter((u) => !existingIds.has(u.userId));

  const submit = async () => {
    setBusy(true);
    try {
      await assign({ targetUserId: userId as Id<'users'>, platformRole: role });
      toast({ title: 'Platform staff assigned', description: `Role: ${role}.` });
      setOpen(false);
      setUserId('');
    } catch (err) {
      toast({
        title: 'Assign failed',
        description: handleMutationError(err, 'Could not assign platform staff.'),
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <UserPlus className="h-4 w-4" /> Add platform staff
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign platform staff</DialogTitle>
            <DialogDescription>
              Grants control-plane access. Owners can manage everything; support is read-mostly.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="s-user">User</Label>
              <select
                id="s-user"
                className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              >
                <option value="">— select user —</option>
                {candidates.map((u) => (
                  <option key={u.userId} value={u.userId}>
                    {u.email ?? u.userId}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="s-role">Role</Label>
              <select
                id="s-role"
                className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                value={role}
                onChange={(e) => setRole(e.target.value as 'platform_owner' | 'platform_support')}
              >
                <option value="platform_support">platform_support</option>
                <option value="platform_owner">platform_owner</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={busy || !userId}>
              {busy ? 'Assigning…' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const PlatformSupport: React.FC = () => {
  const { isPlatformOwner } = useAuth();
  const { toast } = useToast();
  const admins = useQuery(api.platform.admins.listPlatformAdmins, {}) as
    | Doc<'platformAdmins'>[]
    | undefined;
  const users = (useQuery(api.platform.admins.listUserDirectory, {}) ?? []) as UserRow[];
  const suspend = useMutation(api.platform.admins.suspendPlatformAdmin);

  const emailById = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of users) if (u.email) m.set(u.userId, u.email);
    return m;
  }, [users]);

  const existingIds = useMemo(
    () => new Set((admins ?? []).map((a) => a.userId as string)),
    [admins]
  );

  const onSuspend = async (targetUserId: Id<'users'>) => {
    try {
      await suspend({ targetUserId });
      toast({ title: 'Platform staff suspended' });
    } catch (err) {
      toast({
        title: 'Suspend failed',
        description: handleMutationError(err, 'Could not suspend platform staff.'),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Support Console</h2>
          <p className="text-sm text-muted-foreground">Platform staff management.</p>
        </div>
        {isPlatformOwner && admins !== undefined && (
          <AssignDialog users={users} existingIds={existingIds} />
        )}
      </div>

      {admins === undefined ? (
        <div className="text-sm text-muted-foreground">Loading platform staff…</div>
      ) : admins.length === 0 ? (
        <ThemedCard>
          <p className="text-sm text-muted-foreground">
            No platform staff yet. The first owner is granted by the control-plane seed.
          </p>
        </ThemedCard>
      ) : (
        <ThemedCard className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="py-2 pr-4">User</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Status</th>
                {isPlatformOwner && <th className="py-2 pr-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {admins.map((a: Doc<'platformAdmins'>) => (
                <tr key={a._id} className="border-t">
                  <td className="py-2 pr-4">{emailById.get(a.userId as string) ?? a.userId}</td>
                  <td className="py-2 pr-4">{a.platformRole}</td>
                  <td className="py-2 pr-4">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs',
                        a.status === 'active'
                          ? 'bg-emerald-500/15 text-emerald-600'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {a.status}
                    </span>
                  </td>
                  {isPlatformOwner && (
                    <td className="py-2 pr-4 text-right">
                      {a.status === 'active' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onSuspend(a.userId as Id<'users'>)}
                        >
                          Suspend
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </ThemedCard>
      )}
    </div>
  );
};

export default PlatformSupport;
