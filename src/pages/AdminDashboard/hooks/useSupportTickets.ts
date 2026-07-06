import { api, type Id } from '@/integrations/convex/api';
import { useQuery } from 'convex/react';
import { useMemo } from 'react';

export interface TicketResponse {
  byUserId: Id<'users'>;
  byName: string;
  message: string;
  at: number;
}

export interface SupportTicket {
  id: string;
  ticketId: Id<'supportTickets'>;
  clientId: Id<'users'>;
  clientName: string;
  subject: string;
  description: string;
  category: 'technical' | 'billing' | 'loan' | 'account' | 'general';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  assignedTo?: string;
  responses: TicketResponse[];
  resolvedAt?: number;
  createdAt: string;
  updatedAt: string;
}

const PRIORITY_ORDER = { urgent: 4, high: 3, medium: 2, low: 1 } as const;

/**
 * Live support tickets from Convex (api.supportTickets.listTickets),
 * filtered/searched client-side, sorted urgent-first. Reactive — refetch is a
 * no-op kept for API compatibility.
 */
export const useSupportTickets = (filter: string, searchTerm: string) => {
  const raw = useQuery(api.supportTickets.listTickets, {});

  const tickets = useMemo(() => {
    if (!raw) return undefined;
    const mapped: SupportTicket[] = raw.map((t) => ({
      id: String(t._id),
      ticketId: t._id,
      clientId: t.userId,
      clientName: t.clientName,
      subject: t.subject,
      description: t.description,
      category: t.category,
      priority: t.priority,
      status: t.status === 'in_progress' ? ('in-progress' as const) : t.status,
      assignedTo: t.assignedToName,
      responses: t.responses,
      resolvedAt: t.resolvedAt,
      createdAt: new Date(t.createdAt).toISOString(),
      updatedAt: new Date(t.updatedAt).toISOString(),
    }));

    let filtered =
      filter === 'all'
        ? mapped
        : mapped.filter((t) => t.status === filter || t.priority === filter);

    if (searchTerm.trim()) {
      const needle = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.clientName.toLowerCase().includes(needle) ||
          t.subject.toLowerCase().includes(needle) ||
          t.description.toLowerCase().includes(needle)
      );
    }

    return [...filtered].sort((a, b) => {
      const priorityDiff = PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [raw, filter, searchTerm]);

  return {
    tickets,
    loading: raw === undefined,
    error: null as string | null,
    refetch: () => {},
  };
};
