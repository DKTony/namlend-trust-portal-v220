import { api, type Id } from '@/integrations/convex/api';
import { useQuery } from 'convex/react';
import { useMemo } from 'react';

export interface Communication {
  id: string;
  communicationId: Id<'communications'>;
  clientId: Id<'users'>;
  clientName: string;
  type: 'email' | 'sms' | 'call' | 'in-app';
  subject: string;
  message: string;
  status: 'sent' | 'delivered' | 'read' | 'replied' | 'failed';
  createdAt: string;
  updatedAt: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

/**
 * Live communications from Convex (api.communications.listCommunications),
 * filtered and searched client-side. Reactive — refetch is a no-op kept for
 * API compatibility.
 */
export const useCommunications = (filter: string, searchTerm: string) => {
  const raw = useQuery(api.communications.listCommunications, {});

  const communications = useMemo(() => {
    if (!raw) return undefined;
    const mapped: Communication[] = raw.map((c) => ({
      id: String(c._id),
      communicationId: c._id,
      clientId: c.userId,
      clientName: c.clientName,
      type: c.type === 'in_app' ? ('in-app' as const) : c.type,
      subject: c.subject,
      message: c.message,
      status: c.status,
      createdAt: new Date(c.createdAt).toISOString(),
      updatedAt: new Date(c.updatedAt).toISOString(),
      priority: c.priority,
    }));

    const byFilter =
      filter === 'all'
        ? mapped
        : filter === 'pending'
          ? mapped.filter((c) => c.status === 'sent')
          : mapped.filter((c) => c.type === filter);

    if (!searchTerm.trim()) return byFilter;
    const needle = searchTerm.toLowerCase();
    return byFilter.filter(
      (c) =>
        c.clientName.toLowerCase().includes(needle) ||
        c.subject.toLowerCase().includes(needle) ||
        c.message.toLowerCase().includes(needle)
    );
  }, [raw, filter, searchTerm]);

  return {
    communications,
    loading: raw === undefined,
    error: null as string | null,
    refetch: () => {},
  };
};
