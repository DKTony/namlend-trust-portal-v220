import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { formatNAD } from '@/utils/currency';
import { useMutation as useConvexMutation, useQuery as useConvexQuery } from 'convex/react';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  Eye,
  FileText,
  Filter,
  Search,
  User,
  XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { ApprovalRequestDialog } from './ApprovalRequestDialog';
import {
  type ApprovalRequest,
  formatRequestTypeLabel,
  isLoanRequestType,
  matchesRequestTypeFilter,
  parseLoanApprovalFields,
} from './approvalRequestView';

interface ApprovalStats {
  total: number;
  pending: number;
  underReview: number;
  approved: number;
  rejected: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
  avgProcessingTime: number;
}

export default function ApprovalManagementDashboard() {
  const { toast } = useToast();
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    priority: 'all',
    search: '',
  });

  const rawApprovals = useConvexQuery(
    api.approvalWorkflow.adminListApprovals,
    filters.status !== 'all'
      ? {
          status: filters.status as 'pending' | 'approved' | 'rejected' | 'escalated' | 'withdrawn',
        }
      : {}
  );

  const processApprovalMutation = useConvexMutation(api.approvalWorkflow.processApprovalRequest);

  const loading = rawApprovals === undefined;

  const requests: ApprovalRequest[] = useMemo(() => {
    if (!rawApprovals) return [];

    let mapped: ApprovalRequest[] = rawApprovals.map((r) => ({
      id: String(r._id),
      request_type: r.entityType ?? 'loan',
      entity_id: String(r.entityId ?? ''),
      requested_by: String(r.requestedBy),
      status: r.status as ApprovalRequest['status'],
      priority: (r.priority ?? 'normal') as ApprovalRequest['priority'],
      request_data: (r.metadata ?? {}) as Record<string, unknown>,
      reviewer_notes: r.notes,
      created_at: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
      updated_at: r.updatedAt ? new Date(r.updatedAt).toISOString() : new Date().toISOString(),
    }));

    if (filters.type !== 'all') {
      mapped = mapped.filter((r) => matchesRequestTypeFilter(r.request_type, filters.type));
    }
    if (filters.priority !== 'all') mapped = mapped.filter((r) => r.priority === filters.priority);
    if (filters.search) {
      const lower = filters.search.toLowerCase();
      mapped = mapped.filter(
        (r) =>
          r.request_type.toLowerCase().includes(lower) ||
          formatRequestTypeLabel(r.request_type).toLowerCase().includes(lower) ||
          r.status.toLowerCase().includes(lower) ||
          r.entity_id.toLowerCase().includes(lower)
      );
    }

    return mapped;
  }, [rawApprovals, filters]);

  const stats: ApprovalStats | null = useMemo(() => {
    if (!rawApprovals) return null;
    return {
      total: rawApprovals.length,
      pending: rawApprovals.filter((r) => r.status === 'pending').length,
      underReview: rawApprovals.filter((r) => r.status === 'escalated').length,
      approved: rawApprovals.filter((r) => r.status === 'approved').length,
      rejected: rawApprovals.filter((r) => r.status === 'rejected').length,
      byType: {},
      byPriority: {},
      avgProcessingTime: 0,
    };
  }, [rawApprovals]);

  const closeReview = () => {
    setSelectedRequest(null);
    setReviewNotes('');
  };

  const openReview = (request: ApprovalRequest) => {
    setSelectedRequest(request);
    setReviewNotes('');
  };

  const handleStatusUpdate = async (requestId: string, newStatus: ApprovalRequest['status']) => {
    if (processing) return;
    setProcessing(true);
    try {
      await processApprovalMutation({
        requestId: requestId as Parameters<typeof processApprovalMutation>[0]['requestId'],
        action: newStatus === 'approved' ? 'approve' : 'reject',
        notes: reviewNotes || undefined,
      });
      toast({
        title: 'Status Updated',
        description:
          newStatus === 'approved'
            ? `Request approved and ${isLoanRequestType(selectedRequest?.request_type ?? '') ? 'loan created' : 'processed'} successfully`
            : `Request has been ${newStatus}`,
      });
      closeReview();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to update request status',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleEscalate = async () => {
    if (!selectedRequest || processing) return;
    setProcessing(true);
    try {
      await processApprovalMutation({
        requestId: selectedRequest.id as Parameters<typeof processApprovalMutation>[0]['requestId'],
        action: 'escalate',
        notes: reviewNotes || 'Escalated for additional review',
      });
      toast({
        title: 'Escalated',
        description: 'Request escalated for senior review',
      });
      closeReview();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to escalate request',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { icon: React.ElementType; color: string; badgeClass: string }> =
      {
        pending: {
          icon: Clock,
          color: 'text-yellow-600 ',
          badgeClass: 'bg-yellow-100  text-yellow-800  border-yellow-200 ',
        },
        under_review: {
          icon: Eye,
          color: 'text-blue-600 ',
          badgeClass: 'bg-blue-100  text-blue-800  border-blue-200 ',
        },
        escalated: {
          icon: Eye,
          color: 'text-blue-600 ',
          badgeClass: 'bg-blue-100  text-blue-800  border-blue-200 ',
        },
        approved: {
          icon: CheckCircle,
          color: 'text-green-600 ',
          badgeClass: 'bg-green-100  text-green-800  border-green-200 ',
        },
        rejected: {
          icon: XCircle,
          color: 'text-red-600 ',
          badgeClass: 'bg-red-100  text-red-800  border-red-200 ',
        },
        withdrawn: {
          icon: AlertTriangle,
          color: 'text-orange-600 ',
          badgeClass: 'bg-orange-100  text-orange-800  border-orange-200 ',
        },
      };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant="outline" className={`flex items-center gap-1 ${config.badgeClass}`}>
        <Icon className={`h-3 w-3 ${config.color}`} />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-gray-100  text-gray-800  border-gray-200 ',
      normal: 'bg-blue-100  text-blue-800  border-blue-200 ',
      high: 'bg-orange-100  text-orange-800  border-orange-200 ',
      urgent: 'bg-red-100  text-red-800  border-red-200 ',
    };

    return (
      <Badge variant="outline" className={colors[priority] || colors.normal}>
        {priority}
      </Badge>
    );
  };

  const getRequestTypeIcon = (type: string) => {
    const icons: Record<string, React.ElementType> = {
      loan: DollarSign,
      loan_application: DollarSign,
      kyc: FileText,
      profile_update: User,
      payment: DollarSign,
      document_upload: FileText,
    };

    const Icon = icons[type] || FileText;
    return <Icon className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <Clock className="mx-auto mb-2 h-8 w-8 animate-spin" />
          <p>Loading approval requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {stats && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="truncate text-xl font-bold tabular-nums sm:text-2xl">
                {stats.total}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600 " />
            </CardHeader>
            <CardContent>
              <div className="truncate text-xl font-bold tabular-nums text-yellow-600 sm:text-2xl">
                {stats.pending}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Under Review</CardTitle>
              <Eye className="h-4 w-4 text-blue-600 " />
            </CardHeader>
            <CardContent>
              <div className="truncate text-xl font-bold tabular-nums text-blue-600 sm:text-2xl">
                {stats.underReview}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600 " />
            </CardHeader>
            <CardContent>
              <div className="truncate text-xl font-bold tabular-nums text-green-600 sm:text-2xl">
                {stats.approved}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Processing</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="truncate text-xl font-bold tabular-nums sm:text-2xl">
                {Math.round(stats.avgProcessingTime)}h
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters({ ...filters, status: value })}
              >
                <SelectTrigger data-testid="approvals-filter-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="escalated">Under Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={filters.type}
                onValueChange={(value) => setFilters({ ...filters, type: value })}
              >
                <SelectTrigger data-testid="approvals-filter-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="loan">Loan Applications</SelectItem>
                  <SelectItem value="kyc">KYC Packages</SelectItem>
                  <SelectItem value="profile_update">Profile Updates</SelectItem>
                  <SelectItem value="payment">Payments</SelectItem>
                  <SelectItem value="document_upload">Document Uploads</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={filters.priority}
                onValueChange={(value) => setFilters({ ...filters, priority: value })}
              >
                <SelectTrigger data-testid="approvals-filter-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search requests..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-8"
                  data-testid="approvals-search-input"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Approval Requests</CardTitle>
          <CardDescription>{requests.length} requests found</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[min(40rem,calc(100dvh-20rem))] space-y-4 overflow-y-auto">
            {requests.map((request) => {
              const loanAmount = isLoanRequestType(request.request_type)
                ? parseLoanApprovalFields(request.request_data).amount
                : null;

              return (
                <div
                  key={request.id}
                  className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                    selectedRequest?.id === request.id ? 'bg-muted' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => openReview(request)}
                  data-testid={`approvals-request-${request.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="mr-2 flex min-w-0 flex-1 items-center gap-2">
                      <div className="shrink-0">{getRequestTypeIcon(request.request_type)}</div>
                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate font-medium"
                          title={formatRequestTypeLabel(request.request_type)}
                        >
                          {formatRequestTypeLabel(request.request_type)}
                        </p>
                        <p
                          className="truncate text-sm text-muted-foreground"
                          title={request.entity_id}
                        >
                          {request.entity_id.slice(-12) || 'Unknown entity'}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {getStatusBadge(request.status)}
                      {getPriorityBadge(request.priority)}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="truncate tabular-nums">
                      {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                    </span>
                    <div className="flex items-center gap-2">
                      {loanAmount !== null && (
                        <span className="truncate tabular-nums">{formatNAD(loanAmount)}</span>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        data-testid={`approvals-review-${request.id}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          openReview(request);
                        }}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Review
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}

            {requests.length === 0 && (
              <div className="py-8 text-center text-muted-foreground">
                <FileText className="mx-auto mb-2 h-8 w-8" />
                <p>No approval requests found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <ApprovalRequestDialog
        request={selectedRequest}
        open={selectedRequest !== null}
        onClose={closeReview}
        reviewNotes={reviewNotes}
        onReviewNotesChange={setReviewNotes}
        processing={processing}
        onApprove={() => selectedRequest && handleStatusUpdate(selectedRequest.id, 'approved')}
        onReject={() => selectedRequest && handleStatusUpdate(selectedRequest.id, 'rejected')}
        onEscalate={handleEscalate}
        onKycComplete={closeReview}
        statusBadge={selectedRequest ? getStatusBadge(selectedRequest.status) : null}
        priorityBadge={selectedRequest ? getPriorityBadge(selectedRequest.priority) : null}
      />
    </div>
  );
}
