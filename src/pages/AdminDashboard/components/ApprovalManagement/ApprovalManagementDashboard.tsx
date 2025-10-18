import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  getAllApprovalRequests, 
  updateApprovalStatus, 
  getApprovalStatistics,
  processApprovedLoanApplication,
  processApprovedKYCDocument,
  type ApprovalRequest 
} from '@/services/approvalWorkflow';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Eye, 
  User, 
  FileText, 
  DollarSign,
  Calendar,
  Filter,
  Search
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { formatNAD } from '@/utils/currency';
import LoanDetailsModal from '@/components/LoanDetailsModal';

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
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [stats, setStats] = useState<ApprovalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [loanDetailsModalOpen, setLoanDetailsModalOpen] = useState(false);
  const [selectedLoanForModal, setSelectedLoanForModal] = useState<any>(null);
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    priority: 'all',
    search: ''
  });

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load approval requests with filters
      const requestFilters: any = {};
      if (filters.status !== 'all') requestFilters.status = filters.status;
      if (filters.type !== 'all') requestFilters.requestType = filters.type;
      if (filters.priority !== 'all') requestFilters.priority = filters.priority;

      const [requestsResult, statsResult] = await Promise.all([
        getAllApprovalRequests(requestFilters),
        getApprovalStatistics()
      ]);

      if (requestsResult.success && requestsResult.requests) {
        let filteredRequests = requestsResult.requests;
        
        // Apply search filter
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          filteredRequests = filteredRequests.filter(request => {
            const reqAny = request as any;
            const name = `${reqAny.user_first_name || ''} ${reqAny.user_last_name || ''}`.trim();
            const email = reqAny.user_email || (reqAny.request_data?.user_email) || (reqAny.user?.email);
            return (
              request.request_type.toLowerCase().includes(searchLower) ||
              request.status.toLowerCase().includes(searchLower) ||
              (name && name.toLowerCase().includes(searchLower)) ||
              (email && String(email).toLowerCase().includes(searchLower))
            );
          });
        }

        setRequests(filteredRequests);
      }

      if (statsResult.success && statsResult.stats) {
        setStats(statsResult.stats);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load approval data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (requestId: string, newStatus: ApprovalRequest['status']) => {
    // Prevent double-submission with processing flag
    if (processing) {
      console.warn('⚠️ Update already in progress, ignoring duplicate request');
      return;
    }
    
    setProcessing(true);
    try {
      const result = await updateApprovalStatus(requestId, newStatus, reviewNotes);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      // If approved, process the request
      if (newStatus === 'approved' && selectedRequest) {
        if (selectedRequest.request_type === 'loan_application') {
          await processApprovedLoanApplication(requestId);
        } else if (selectedRequest.request_type === 'kyc_document') {
          await processApprovedKYCDocument(requestId);
        }
      }

      toast({
        title: "Status Updated",
        description: `Request has been ${newStatus}`
      });

      setSelectedRequest(null);
      setReviewNotes('');
      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update request status",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { variant: 'secondary', icon: Clock, color: 'text-yellow-600' },
      under_review: { variant: 'default', icon: Eye, color: 'text-blue-600' },
      approved: { variant: 'default', icon: CheckCircle, color: 'text-green-600' },
      rejected: { variant: 'destructive', icon: XCircle, color: 'text-red-600' },
      requires_info: { variant: 'outline', icon: AlertTriangle, color: 'text-orange-600' }
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className={`h-3 w-3 ${config.color}`} />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-gray-100 text-gray-800',
      normal: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };

    return (
      <Badge className={colors[priority] || colors.normal}>
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
      document_upload: FileText
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
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Under Review</CardTitle>
              <Eye className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.underReview}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Processing</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(stats.avgProcessingTime)}h</div>
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
              <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
                <SelectTrigger data-testid="approvals-filter-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="requires_info">Requires Info</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={filters.type} onValueChange={(value) => setFilters({...filters, type: value})}>
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
              <Select value={filters.priority} onValueChange={(value) => setFilters({...filters, priority: value})}>
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
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
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
            <CardDescription>
              {requests.length} requests found
            </CardDescription>
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
                    <div className="flex items-center gap-2">
                      {getRequestTypeIcon(request.request_type)}
                      <div>
                        <p className="font-medium">
                          {request.request_type.replace('_', ' ').toUpperCase()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {(() => {
                            const reqAny = request as any;
                            const fullName = `${reqAny.user_first_name || ''} ${reqAny.user_last_name || ''}`.trim();
                            const fallbackEmail = reqAny.user_email || (reqAny.request_data?.user_email) || (reqAny.user as any)?.email;
                            return fullName || fallbackEmail || 'Unknown user';
                          })()}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {getStatusBadge(request.status)}
                      {getPriorityBadge(request.priority)}
                    </div>
                  </div>
                  
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                    </span>
                    {request.request_type === 'loan_application' && (
                      <span>
                        {formatNAD(request.request_data.amount)}
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
                      {formatDistanceToNow(new Date(selectedRequest.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">USER</Label>
                  <p className="font-medium">
                    {(() => {
                      const srAny = selectedRequest as any;
                      const fullName = `${srAny.user_first_name || ''} ${srAny.user_last_name || ''}`.trim();
                      const fallbackEmail = srAny.user_email || (srAny.request_data?.user_email);
                      return fullName || fallbackEmail || 'Unknown user';
                    })()}
                  </p>
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
                            id: selectedRequest.id,
                            amount: selectedRequest.request_data?.amount || 0,
                            term_months: selectedRequest.request_data?.term_months || selectedRequest.request_data?.term || 0,
                            interest_rate: selectedRequest.request_data?.interest_rate || 32,
                            monthly_payment: selectedRequest.request_data?.monthly_payment || 0,
                            total_repayment: selectedRequest.request_data?.total_repayment || 0,
                            purpose: selectedRequest.request_data?.purpose || 'Not specified',
                            status: selectedRequest.status,
                            created_at: selectedRequest.created_at,
                            request_data: selectedRequest.request_data
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

                {selectedRequest.review_notes && (
                  <div>
                    <Label className="text-xs text-muted-foreground">PREVIOUS NOTES</Label>
                    <p className="text-sm mt-1">{selectedRequest.review_notes}</p>
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

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleStatusUpdate(selectedRequest.id, 'approved')}
                    disabled={processing}
                    className="flex-1"
                    data-testid="approvals-approve-btn"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleStatusUpdate(selectedRequest.id, 'rejected')}
                    disabled={processing}
                    className="flex-1"
                    data-testid="approvals-reject-btn"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleStatusUpdate(selectedRequest.id, 'requires_info')}
                    disabled={processing}
                    data-testid="approvals-requestinfo-btn"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Request Info
                  </Button>
                </div>
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
        loan={selectedLoanForModal}
      />
    </div>
  );
}
