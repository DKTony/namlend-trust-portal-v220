import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/integrations/convex/api';
import { useMutation, useQuery } from 'convex/react';
import { Loader2, RefreshCw, X } from 'lucide-react';
import { useState } from 'react';

const ROLE_LABEL: Record<string, string> = {
  client: 'Client',
  loan_officer: 'Loan Officer',
  tenant_admin: 'Tenant Admin',
};

interface PendingInvitesPanelProps {
  roleFilter?: 'client' | 'staff';
}

export function PendingInvitesPanel({ roleFilter }: PendingInvitesPanelProps) {
  const { toast } = useToast();
  const invites = useQuery(api.invites.listInvites, { status: 'pending' });
  const resendInvite = useMutation(api.invites.resendInvite);
  const revokeInvite = useMutation(api.invites.revokeInvite);
  const [busyId, setBusyId] = useState<string | null>(null);

  const rows = (invites ?? []).filter((invite) => {
    if (roleFilter === 'client') return invite.intendedRole === 'client';
    if (roleFilter === 'staff') return invite.intendedRole !== 'client';
    return true;
  });

  const handleResend = async (inviteId: (typeof rows)[number]['_id']) => {
    setBusyId(inviteId);
    try {
      const result = await resendInvite({ inviteId });
      if (result.token) {
        const link = `${window.location.origin}/auth?invite=${encodeURIComponent(result.token)}`;
        await navigator.clipboard.writeText(link);
        toast({
          title: 'Invite rotated',
          description: 'A fresh link was copied to the clipboard.',
        });
      } else {
        toast({ title: 'Invite resent' });
      }
    } catch (error) {
      toast({
        title: 'Could not resend',
        description: error instanceof Error ? error.message : 'Try again.',
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleRevoke = async (inviteId: (typeof rows)[number]['_id']) => {
    setBusyId(inviteId);
    try {
      await revokeInvite({ inviteId });
      toast({ title: 'Invite revoked' });
    } catch (error) {
      toast({
        title: 'Could not revoke',
        description: error instanceof Error ? error.message : 'Try again.',
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  if (invites === undefined) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No pending invites.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-md border" data-testid="pending-invites">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left">
          <tr>
            <th className="px-3 py-2 font-medium">Email</th>
            <th className="px-3 py-2 font-medium">Role</th>
            <th className="px-3 py-2 font-medium">Expires</th>
            <th className="px-3 py-2 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((invite) => (
            <tr key={invite._id} className="border-t">
              <td className="px-3 py-2">{invite.email}</td>
              <td className="px-3 py-2">
                {ROLE_LABEL[invite.intendedRole] ?? invite.intendedRole}
              </td>
              <td className="px-3 py-2 tabular-nums">
                {new Date(invite.expiresAt).toLocaleString()}
              </td>
              <td className="px-3 py-2 text-right space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyId === invite._id}
                  onClick={() => void handleResend(invite._id)}
                >
                  <RefreshCw className="mr-1 h-3.5 w-3.5" />
                  Resend
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={busyId === invite._id}
                  onClick={() => void handleRevoke(invite._id)}
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  Revoke
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
