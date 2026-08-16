import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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
import { useMutation } from 'convex/react';
import { Copy, Loader2, Mail } from 'lucide-react';
import { useState } from 'react';

export type InviteTrack = 'staff' | 'client';
type StaffRole = 'loan_officer' | 'tenant_admin';

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  track: InviteTrack;
}

function inviteLink(token: string): string {
  return `${window.location.origin}/auth?invite=${encodeURIComponent(token)}`;
}

export function InviteUserDialog({ open, onOpenChange, track }: InviteUserDialogProps) {
  const { toast } = useToast();
  const createInvite = useMutation(api.invites.createInvite);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StaffRole>('loan_officer');
  const [submitting, setSubmitting] = useState(false);
  const [copyLink, setCopyLink] = useState<string | null>(null);

  const reset = () => {
    setEmail('');
    setRole('loan_officer');
    setSubmitting(false);
    setCopyLink(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    if (!email.trim()) {
      toast({ title: 'Email is required', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const intendedRole = track === 'client' ? 'client' : role;
      const result = await createInvite({ email: email.trim(), intendedRole });
      if (result.token) {
        setCopyLink(inviteLink(result.token));
        toast({
          title: 'Invite created',
          description: result.emailQueued
            ? 'An email is on its way. You can also copy the link below.'
            : 'Email is not configured here — copy the link and send it yourself.',
        });
      } else {
        toast({
          title: 'Invite sent',
          description: `An email was queued for ${email.trim()}.`,
        });
        handleOpenChange(false);
      }
    } catch (error) {
      toast({
        title: 'Could not send invite',
        description: error instanceof Error ? error.message : 'Try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!copyLink) return;
    await navigator.clipboard.writeText(copyLink);
    toast({ title: 'Link copied' });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="invite-user-dialog">
        <DialogHeader>
          <DialogTitle>{track === 'client' ? 'Invite client' : 'Invite staff'}</DialogTitle>
          <DialogDescription>
            {track === 'client'
              ? 'Send a 72-hour invite so they can register as a client.'
              : 'Send a 72-hour invite for a loan officer or tenant admin.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              data-testid="invite-email"
              type="email"
              autoComplete="off"
              placeholder="person@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={Boolean(copyLink)}
            />
          </div>
          {track === 'staff' && (
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <Select value={role} onValueChange={(value) => setRole(value as StaffRole)}>
                <SelectTrigger id="invite-role" data-testid="invite-role" className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="loan_officer">Loan Officer</SelectItem>
                  <SelectItem value="tenant_admin">Tenant Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {copyLink && (
            <div className="space-y-2">
              <Label htmlFor="invite-copy-link">Invite link</Label>
              <div className="flex gap-2">
                <Input
                  id="invite-copy-link"
                  data-testid="invite-copy-link"
                  readOnly
                  value={copyLink}
                />
                <Button type="button" variant="outline" onClick={() => void handleCopy()}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {copyLink ? 'Done' : 'Cancel'}
          </Button>
          {!copyLink && (
            <Button
              data-testid="invite-submit"
              onClick={() => void handleSubmit()}
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Mail className="mr-2 h-4 w-4" />
              )}
              Send invite
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
