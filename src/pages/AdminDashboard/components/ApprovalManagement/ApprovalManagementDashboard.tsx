import LoanDetailsModal from '@/components/modals/LoanDetailsModal';
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
import { Textarea } from '@/components/ui/textarea';
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

// ---------------------------------------------------------------------------
// Local view model — typed to match actual Convex approvalRequests schema (N2)
// ---------------------------------------------------------------------------
interface ApprovalRequest {
  id: string;
  /** Convex entityType field */
  request_type: string;
  entity_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'escalated' | 'withdrawn';
  priority: 'low' | 'medium' | 'high' | 'urgent' | 'normal';
  /** Convex metadata field — typed as unknown, accessed safely */
  request_data: Record<string, unknown>;
  reviewer_notes?: string;
  created_at: string;
  updated_at: string;
}

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
  const [loanDetailsModalOpen, setLoanDetailsModalOpen] = useState(false);
  const [selectedLoanForModal, setSelectedLoanForModal] = useState<Record<string, unknown> | null>(
    null
  );
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    priority: 'all',
    search: '',
  });

  // Convex reactive query — pass status filter only when not 'all'
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

  // Derive typed view model from Convex query result (N2 — no as any)
  const requests: ApprovalRequest[] = useMemo(() => {
    if (!rawApprovals) return [];

    let mapped: ApprovalRequest[] = rawApprovals.map((r) => ({
      id: String(r._id),
      request_type: r.entityType ?? 'loan_application',
      entity_id: String(r.entityId ?? ''),
      status: r.status as ApprovalRequest['status'],
      priority: (r.priority ?? 'normal') as ApprovalRequest['priority'],
      request_data: (r.metadata ?? {}) as Record<string, unknown>,
      reviewer_notes: r.notes,
      created_at: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
      updated_at: r.updatedAt ? new Date(r.updatedAt).toISOString() : new Date().toISOString(),
    }));

    if (filters.type !== 'all') mapped = mapped.filter((r) => r.request_type === filters.type);
    if (filters.priority !== 'all') mapped = mapped.filter((r) => r.priority === filters.priority);
    if (filters.search) {
      const lower = filters.search.toLowerCase();
      mapped = mapped.filter(
        (r) =>
          r.request_type.toLowerCase().includes(lower) ||
          r.status.toLowerCase().includes(lower) ||
          r.entity_id.toLowerCase().includes(lower)
      );
    }

    return mapped;
  }, [rawApprovals, filters]);

  // Derive stats from the same reactive data
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
            ? `Request approved and ${selectedRequest?.request_type === 'loan_application' ? 'loan created' : 'processed'} successfully`
            : `Request has been ${newStatus}`,
      });
      setSelectedRequest(null);
      setReviewNotes('');
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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { icon: React.ElementType; color: string; badgeClass: string }> =
      {
        pending: {
          icon: Clock,
          color: 'text-yellow-600 dark:text-yellow-400',
          badgeClass:
            'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
        },
        under_review: {
          icon: Eye,
          color: 'text-blue-600 dark:text-blue-400',
          badgeClass:
            'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-800',
        },
        escalated: {
          icon: Eye,
          color: 'text-blue-600 dark:text-blue-400',
          badgeClass:
            'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-800',
        },
        approved: {
          icon: CheckCircle,
          color: 'text-green-600 dark:text-green-400',
          badgeClass:
            'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800',
        },
        rejected: {
          icon: XCircle,
          color: 'text-red-600 dark:text-red-400',
          badgeClass:
            'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800',
        },
        withdrawn: {
          icon: AlertTriangle,
          color: 'text-orange-600 dark:text-orange-400',
          badgeClass:
            'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 border-orange-200 dark:border-orange-800',
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
      low: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700',
      normal:
        'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-800',
      high: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 border-orange-200 dark:border-orange-800',
      urgent:
        'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800',
    };

    return (
      <Badge variant="outline" className={colors[priority] || colors.normal}>
        {priority}
      </Badge>
    );
  };

  const getRequestTypeIcon = (type: string) => {
    const icons: Record<string, any> = {
      loan_application: DollarSign,
      kyc_document: FileText,
      profile_update: User,
      payment: DollarSign,
      document_upload: FileText,
    };

    const Icon = icons[type] || FileText;
    return <Icon className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading approval requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold truncate tabular-nums">
                {stats.total}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-yellow-600 dark:text-yellow-400 truncate tabular-nums">
                {stats.pending}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Under Review</CardTitle>
              <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400 truncate tabular-nums">
                {stats.underReview}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400 truncate tabular-nums">
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
              <div className="text-xl sm:text-2xl font-bold truncate tabular-nums">
                {Math.round(stats.avgProcessingTime)}h
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  <SelectItem value="under_review">Under Review</SelectItem>
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
                  <SelectItem value="loan_application">Loan Applications</SelectItem>
                  <SelectItem value="kyc_document">KYC Documents</SelectItem>
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

      {/* Requests List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Approval Requests</CardTitle>
            <CardDescription>{requests.length} requests found</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedRequest?.id === request.id ? 'bg-muted' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedRequest(request)}
                  data-testid={`approvals-request-${request.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                      <div className="shrink-0">{getRequestTypeIcon(request.request_type)}</div>
                      <div className="min-w-0 flex-1">
                        <p
                          className="font-medium truncate"
                          title={request.request_type.replace('_', ' ').toUpperCase()}
                        >
                          {request.request_type.replace('_', ' ').toUpperCase()}
                        </p>
                        <p
                          className="text-sm text-muted-foreground truncate"
                          title={request.entity_id}
                        >
                          {request.entity_id.slice(-12) || 'Unknown entity'}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {getStatusBadge(request.status)}
                      {getPriorityBadge(request.priority)}
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="truncate tabular-nums">
                      {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                    </span>
                    {request.request_type === 'loan_application' && (
                      <span className="truncate tabular-nums ml-2">
                        {formatNAD(Number(request.request_data.amount) || 0)}
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {requests.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2" />
                  <p>No approval requests found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Request Details */}
        <Card>
          <CardHeader>
            <CardTitle>Request Details</CardTitle>
            <CardDescription>
              {selectedRequest ? 'Review and take action' : 'Select a request to view details'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedRequest ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">TYPE</Label>
                    <p className="font-medium">{selectedRequest.request_type.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">STATUS</Label>
                    <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">PRIORITY</Label>
                    <div className="mt-1">{getPriorityBadge(selectedRequest.priority)}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">SUBMITTED</Label>
                    <p className="text-sm">
                      {formatDistanceToNow(new Date(selectedRequest.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">ENTITY ID</Label>
                  <p className="font-medium font-mono text-sm">{selectedRequest.entity_id}</p>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">REQUEST DATA</Label>
                  <div className="mt-2">
                    {selectedRequest.request_type === 'loan_application' ? (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          setSelectedLoanForModal({
                            id: selectedRequest.entity_id,
                            status: selectedRequest.status,
                            created_at: selectedRequest.created_at,
                            approved_at:
                              selectedRequest.status === 'approved'
                                ? selectedRequest.updated_at
                                : undefined,
                          });
                          setLoanDetailsModalOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Loan Application Details
                      </Button>
                    ) : (
                      <div className="p-3 bg-muted rounded-lg">
                        <pre className="text-xs overflow-x-auto">
                          {JSON.stringify(selectedRequest.request_data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>

                {selectedRequest.reviewer_notes && (
                  <div>
                    <Label className="text-xs text-muted-foreground">PREVIOUS NOTES</Label>
                    <p className="text-sm mt-1">{selectedRequest.reviewer_notes}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="review-notes">Review Notes</Label>
                  <Textarea
                    id="review-notes"
                    placeholder="Add your review notes..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Only show action buttons if request is not already approved/rejected */}
                {selectedRequest.status !== 'approved' && selectedRequest.status !== 'rejected' ? (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      onClick={() => handleStatusUpdate(selectedRequest.id, 'approved')}
                      disabled={processing}
                      className="w-full flex-1"
                      data-testid="approvals-approve-btn"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleStatusUpdate(selectedRequest.id, 'rejected')}
                      disabled={processing}
                      className="w-full flex-1"
                      data-testid="approvals-reject-btn"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        if (processing) return;
                        setProcessing(true);
                        try {
                          await processApprovalMutation({
                            requestId: selectedRequest.id as Parameters<
                              typeof processApprovalMutation
                            >[0]['requestId'],
                            action: 'escalate',
                            notes: reviewNotes || 'Escalated for additional review',
                          });
                          toast({
                            title: 'Escalated',
                            description: 'Request escalated for senior review',
                          });
                          setSelectedRequest(null);
                          setReviewNotes('');
                        } catch {
                          toast({
                            title: 'Error',
                            description: 'Failed to escalate request',
                            variant: 'destructive',
                          });
                        } finally {
                          setProcessing(false);
                        }
                      }}
                      disabled={processing}
                      className="w-full sm:w-auto"
                      data-testid="approvals-requestinfo-btn"
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Escalate
                    </Button>
                  </div>
                ) : (
                  <div
                    className="p-3 bg-muted rounded-lg text-center text-sm text-muted-foreground"
                    data-testid="approvals-processed-state"
                  >
                    <CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-500" />
                    This request has been {selectedRequest.status}. No further action required.
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Eye className="h-8 w-8 mx-auto mb-2" />
                <p>Select a request to view details and take action</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Loan Details Modal */}
      <LoanDetailsModal
        open={loanDetailsModalOpen}
        onClose={() => {
          setLoanDetailsModalOpen(false);
          setSelectedLoanForModal(null);
        }}
        loan={selectedLoanForModal as React.ComponentProps<typeof LoanDetailsModal>['loan']}
      />
    </div>
  );
}
