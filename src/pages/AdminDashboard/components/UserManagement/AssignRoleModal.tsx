import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getProfilesWithRoles, AppRole } from '@/services/adminService';
import { assignRoleWithServiceRole } from '@/utils/serviceRoleAssignment';
import { useToast } from '@/hooks/use-toast';

interface AssignRoleModalProps {
  open: boolean;
  role: AppRole | null;
  onClose: () => void;
  onAssigned?: () => void;
}

interface UserResult {
  user_id?: string;
  id?: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  roles?: string[];
}

const AssignRoleModal: React.FC<AssignRoleModalProps> = ({ open, role, onClose, onAssigned }) => {
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<UserResult[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const title = useMemo(() => `Assign ${role ?? ''} role`, [role]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      setSelectedUserId(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await getProfilesWithRoles({ search: query, limit: 20 });
        if (res.success) setResults((res.results as UserResult[]) ?? []);
        else toast({ title: 'Search failed', description: res.error ?? 'Unknown error', variant: 'destructive' });
      } catch (e) {
        toast({ title: 'Search error', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, open, toast]);

  const handleAssign = async (userId: string) => {
    if (!role) return;
    try {
      const res = await assignRoleWithServiceRole(userId, role);
      if (!res.success) {
        toast({ title: 'Assignment failed', description: res.error ?? 'Unknown error', variant: 'destructive' });
        return;
      }
      toast({ title: 'Role assigned', description: `Assigned ${role} to ${userId}` });
      onAssigned?.();
    } catch (e) {
      toast({ title: 'Assignment error', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Search for a user and assign the selected role. Type a name, email, or UUID.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            placeholder="Search by name, email, or UUID..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <div className="text-sm text-muted-foreground">
            {loading ? 'Searching…' : results.length ? `${results.length} result(s)` : 'No results'}
          </div>

          <ScrollArea className="h-64 border rounded-md">
            <div className="p-2 space-y-2">
              {results.map((u, idx) => {
                const uid = u.user_id || u.id || '';
                const name = `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || '(no name)';
                const email = u.email ?? '';
                return (
                  <div key={`${uid}-${idx}`} className="flex items-center justify-between rounded-md border p-2">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{name}</div>
                      <div className="text-xs text-muted-foreground truncate">{email} · {uid}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={selectedUserId === uid ? 'default' : 'secondary'}
                        size="sm"
                        onClick={() => setSelectedUserId(uid)}
                      >
                        {selectedUserId === uid ? 'Selected' : 'Select'}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleAssign(uid)}
                        disabled={!role}
                        title={!role ? 'Select a role' : `Assign ${role}`}
                      >
                        Assign
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              onClick={() => selectedUserId && role && handleAssign(selectedUserId)}
              disabled={!selectedUserId || !role}
            >
              Assign Selected
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AssignRoleModal;
