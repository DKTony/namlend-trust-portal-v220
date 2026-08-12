import { ThemedBadge } from '@/components/ui/ThemedBadge';
import { ThemedButton } from '@/components/ui/ThemedButton';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { toast } from '@/hooks/use-toast';
import { api, type Id } from '@/integrations/convex/api';
import { cn } from '@/lib/utils';
import { formatNAD } from '@/utils/currency';
import { useMutation, useQuery } from 'convex/react';
import { Calendar, CalendarClock, CheckCircle, Clock, User, XCircle } from 'lucide-react';
import React, { useState } from 'react';

type StatusFilter = 'pending' | 'approved' | 'rejected' | 'all';

const RescheduleRequests: React.FC = () => {
  const [filter, setFilter] = useState<StatusFilter>('pending');
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const requests = useQuery(api.collections.listRescheduleRequests, {
    status: filter === 'all' ? undefined : filter,
  });
  const reviewMutation = useMutation(api.collections.reviewRescheduleRequest);

  const loading = requests === undefined;

  const formatDate = (value: string) => {
    const d = new Date(value);
    return Number.isNaN(d.getTime())
      ? value
      : d.toLocaleDateString('en-NA', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const handleReview = async (
    requestId: Id<'rescheduleRequests'>,
    decision: 'approved' | 'rejected'
  ) => {
    setBusyId(requestId);
    try {
      await reviewMutation({
        requestId,
        decision,
        adminNotes: notesById[requestId]?.trim() || undefined,
      });
      toast({
        title: decision === 'approved' ? 'Request approved' : 'Request rejected',
        description: 'The client has been notified.',
      });
    } catch (err) {
      toast({
        title: 'Action failed',
        description: err instanceof Error ? err.message : String(err),
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <ThemedBadge className="bg-green-100  text-green-800  border-green-200 ">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </ThemedBadge>
        );
      case 'rejected':
        return (
          <ThemedBadge className="bg-red-100  text-red-800  border-red-200 ">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </ThemedBadge>
        );
      default:
        return (
          <ThemedBadge className="bg-yellow-100  text-yellow-800  border-yellow-200 ">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </ThemedBadge>
        );
    }
  };

  const filterOptions: { value: StatusFilter; label: string }[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'all', label: 'All' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className={cn('text-lg font-semibold', 'font-sans text-[#274F35]')}>
            Payment Reschedule Requests
          </h3>
          <p className="text-sm text-muted-foreground">
            Review and action client requests to move a payment due date
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {filterOptions.map((opt) => (
            <ThemedButton
              key={opt.value}
              variant={filter === opt.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(opt.value)}
            >
              {opt.label}
              {opt.value === 'pending' && requests && filter !== 'pending' ? null : null}
            </ThemedButton>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <ThemedCard key={i} className="animate-pulse">
              <div className="h-20 bg-muted rounded" />
            </ThemedCard>
          ))}
        </div>
      ) : !requests || requests.length === 0 ? (
        <ThemedCard>
          <div className="text-center py-10">
            <CalendarClock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h4 className={cn('font-medium', 'font-sans text-[#274F35]')}>No {filter} requests</h4>
            <p className="text-sm text-muted-foreground">
              Reschedule requests submitted by clients appear here for review.
            </p>
          </div>
        </ThemedCard>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <ThemedCard key={String(req._id)} className="hover:shadow-md transition-shadow">
              <div className="space-y-3">
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className={cn('font-semibold truncate', 'font-sans text-[#274F35]')}>
                        {req.clientName}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {req.loanPrincipal != null ? formatNAD(req.loanPrincipal) : 'Loan'}
                      {req.loanPurpose ? ` · ${req.loanPurpose}` : ''} · submitted{' '}
                      {formatDate(new Date(req.createdAt).toISOString())}
                    </p>
                  </div>
                  {getStatusBadge(req.status)}
                </div>

                {/* Date change */}
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">From</span>
                  <span className="font-medium">{formatDate(req.originalDueDate)}</span>
                  <span className="text-muted-foreground">to</span>
                  <span className="font-medium text-blue-600 ">
                    {formatDate(req.requestedDate)}
                  </span>
                </div>

                {/* Reason */}
                <div className="rounded-lg bg-muted/50 p-3 text-sm text-foreground">
                  {req.reason}
                </div>

                {/* Prior admin note (reviewed requests) */}
                {req.adminNotes && (
                  <div className="rounded-lg border border-border p-3 text-sm">
                    <span className="font-medium">Admin note: </span>
                    {req.adminNotes}
                  </div>
                )}

                {/* Actions (pending only) */}
                {req.status === 'pending' && (
                  <div className="space-y-2 border-t border-border pt-3">
                    <textarea
                      rows={2}
                      value={notesById[String(req._id)] ?? ''}
                      onChange={(e) =>
                        setNotesById((m) => ({ ...m, [String(req._id)]: e.target.value }))
                      }
                      placeholder="Optional note to the client (sent with the decision)…"
                      className="w-full p-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground text-sm"
                    />
                    <div className="flex justify-end gap-2">
                      <ThemedButton
                        variant="outline"
                        size="sm"
                        disabled={busyId === String(req._id)}
                        className="text-red-600 "
                        onClick={() => handleReview(req._id, 'rejected')}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-2" />
                        Reject
                      </ThemedButton>
                      <ThemedButton
                        size="sm"
                        disabled={busyId === String(req._id)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleReview(req._id, 'approved')}
                      >
                        <CheckCircle className="h-3.5 w-3.5 mr-2" />
                        Approve
                      </ThemedButton>
                    </div>
                  </div>
                )}
              </div>
            </ThemedCard>
          ))}
        </div>
      )}
    </div>
  );
};

export default RescheduleRequests;
