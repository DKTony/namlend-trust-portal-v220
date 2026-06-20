/**
 * Support Console (Phase 4) — manage platform staff.
 *
 * Lists platform admins; owners can assign a new one (`assignPlatformAdmin`) or suspend an
 * existing one (`suspendPlatformAdmin`). Admins are never hard-deleted (audit retention).
 * Support access is audited and restricted to L0/L1 safe metadata in this phase.
 */

import { ThemedCard } from '@/components/ui/ThemedCard';
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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/integrations/convex/api';
import { handleMutationError } from '@/lib/mutationError';
import { cn } from '@/lib/utils';
import type { Doc, Id } from '@/types/convex';
import { useMutation, useQuery } from 'convex/react';
import { LifeBuoy, StopCircle, UserPlus } from 'lucide-react';
import React, { useMemo, useState } from 'react';

interface UserRow {
  userId: Id<'users'>;
  email?: string;
  role?: string;
}

interface TenantOption {
  _id: Id<'institutions'>;
  name: string;
  shortCode: string;
}

function formatDateTime(ms?: number) {
  return ms ? new Date(ms).toLocaleString() : 'Active';
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

const StartSupportSessionDialog: React.FC<{ tenants: TenantOption[] }> = ({ tenants }) => {
  const startSession = useMutation(api.platform.support.startSupportAccessSession);
  const recordViewed = useMutation(api.platform.support.recordViewedResourceCategory);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [accessType, setAccessType] = useState<'L0' | 'L1'>('L0');
  const [institutionId, setInstitutionId] = useState('');
  const [reason, setReason] = useState('');
  const [ticketRef, setTicketRef] = useState('');

  const submit = async () => {
    setBusy(true);
    try {
      const sessionId = await startSession({
        accessType,
        institutionId:
          accessType === 'L1' && institutionId ? (institutionId as Id<'institutions'>) : undefined,
        reason: reason.trim() || undefined,
        ticketRef: ticketRef.trim() || undefined,
      });
      await recordViewed({
        sessionId,
        resourceCategory: accessType === 'L1' ? 'tenant_metadata' : 'platform_health',
      });
      toast({ title: 'Support session started', description: `${accessType} access recorded.` });
      setOpen(false);
      setInstitutionId('');
      setReason('');
      setTicketRef('');
    } catch (err) {
      toast({
        title: 'Session failed',
        description: handleMutationError(err, 'Could not start support session.'),
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="gap-2">
        <LifeBuoy className="h-4 w-4" /> Start support session
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start support session</DialogTitle>
            <DialogDescription>
              L0/L1 sessions record safe metadata access only. Break-glass and impersonation are not
              available in this phase.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="support-level">Access level</Label>
              <select
                id="support-level"
                className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                value={accessType}
                onChange={(e) => setAccessType(e.target.value as 'L0' | 'L1')}
              >
                <option value="L0">L0 · platform health</option>
                <option value="L1">L1 · tenant metadata, no borrower PII</option>
              </select>
            </div>
            {accessType === 'L1' && (
              <div>
                <Label htmlFor="support-tenant">Tenant</Label>
                <select
                  id="support-tenant"
                  className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                  value={institutionId}
                  onChange={(e) => setInstitutionId(e.target.value)}
                >
                  <option value="">— select tenant —</option>
                  {tenants.map((tenant) => (
                    <option key={tenant._id} value={tenant._id}>
                      {tenant.name} ({tenant.shortCode})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <Label htmlFor="support-reason">
                Reason {accessType === 'L1' ? '' : '(optional)'}
              </Label>
              <textarea
                id="support-reason"
                className="min-h-20 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ticket, incident, or diagnostic reason"
              />
            </div>
            <div>
              <Label htmlFor="support-ticket">Ticket reference (optional)</Label>
              <input
                id="support-ticket"
                className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                value={ticketRef}
                onChange={(e) => setTicketRef(e.target.value)}
                placeholder="SUP-123"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              onClick={submit}
              disabled={busy || (accessType === 'L1' && (!institutionId || !reason.trim()))}
            >
              {busy ? 'Starting…' : 'Start session'}
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
  const tenants = (useQuery(api.platform.tenants.listTenants, {}) ?? []) as TenantOption[];
  const sessions = useQuery(api.platform.support.listSupportAccessSessions, { limit: 100 }) as
    | Doc<'supportAccessAudit'>[]
    | undefined;
  const suspend = useMutation(api.platform.admins.suspendPlatformAdmin);
  const endSession = useMutation(api.platform.support.endSupportAccessSession);

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

  const onEndSession = async (sessionId: Id<'supportAccessAudit'>) => {
    try {
      await endSession({ sessionId });
      toast({ title: 'Support session ended' });
    } catch (err) {
      toast({
        title: 'End session failed',
        description: handleMutationError(err, 'Could not end the support session.'),
        variant: 'destructive',
      });
    }
  };

  return (
    <div data-testid="platform-support" className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Support Console</h2>
          <p className="text-sm text-muted-foreground">
            Platform staff management and audited L0/L1 support access.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <StartSupportSessionDialog tenants={tenants} />
          {isPlatformOwner && admins !== undefined && (
            <AssignDialog users={users} existingIds={existingIds} />
          )}
        </div>
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

      <ThemedCard className="space-y-3 overflow-x-auto">
        <div>
          <h3 className="text-sm font-semibold">Support access audit</h3>
          <p className="text-xs text-muted-foreground">
            Recent L0/L1 sessions. L2 break-glass and L3 impersonation are not exposed.
          </p>
        </div>
        {sessions === undefined ? (
          <p className="text-sm text-muted-foreground">Loading support audit…</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No support sessions recorded yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="py-2 pr-4">Actor</th>
                <th className="py-2 pr-4">Level</th>
                <th className="py-2 pr-4">Tenant</th>
                <th className="py-2 pr-4">Started</th>
                <th className="py-2 pr-4">Ended</th>
                <th className="py-2 pr-4">Viewed</th>
                <th className="py-2 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session._id} className="border-t">
                  <td className="py-2 pr-4">
                    {emailById.get(session.actorUserId as string) ?? session.actorUserId}
                  </td>
                  <td className="py-2 pr-4">{session.accessType}</td>
                  <td className="py-2 pr-4">
                    {session.institutionId
                      ? (tenants.find((tenant) => tenant._id === session.institutionId)?.name ??
                        session.institutionId)
                      : 'Platform'}
                  </td>
                  <td className="py-2 pr-4">{formatDateTime(session.startedAt)}</td>
                  <td className="py-2 pr-4">{formatDateTime(session.endedAt)}</td>
                  <td className="py-2 pr-4">{(session.viewedResources ?? []).join(', ') || '—'}</td>
                  <td className="py-2 pr-4 text-right">
                    {session.endedAt === undefined && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => onEndSession(session._id)}
                      >
                        <StopCircle className="h-4 w-4" /> End
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ThemedCard>
    </div>
  );
};

export default PlatformSupport;
