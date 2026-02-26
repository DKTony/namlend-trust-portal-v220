import React, { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/integrations/convex/api';
import type { Id, QueryItem } from '@/types/convex';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  User,
  DollarSign,
  FileText,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Download,
  Eye,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoanReviewPanelProps {
  loanId: string;
  status?: string;
  onClose: () => void;
  onApprove: (loanId: string, comments?: string) => void;
  onReject: (loanId: string, reason: string) => void;
}

/** Canonical recommendation badge config */
const RECOMMENDATION_CONFIG = {
  approve: {
    label: 'Approve',
    className:
      'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800',
  },
  review: {
    label: 'Manual Review',
    className:
      'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
  },
  reject: {
    label: 'Reject',
    className:
      'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800',
  },
} as const;

function getCreditScoreLabel(score: number): string {
  if (score >= 750) return 'Excellent';
  if (score >= 670) return 'Good';
  if (score >= 580) return 'Fair';
  return 'Poor';
}

function getCreditScoreClass(score: number): string {
  if (score >= 750) return 'text-green-600 dark:text-green-400';
  if (score >= 670) return 'text-blue-600 dark:text-blue-400';
  if (score >= 580) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

const LoanReviewPanel: React.FC<LoanReviewPanelProps> = ({
  loanId,
  status: propStatus,
  onClose,
  onApprove,
  onReject,
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [comments, setComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(false);

  // Convex reactive queries
  const rawLoan = useQuery(api.loans.getLoan, loanId ? { loanId: loanId as Id<'loans'> } : 'skip');
  const rawClient = useQuery(
    api.users.getUserProfile,
    rawLoan?.userId ? { userId: rawLoan.userId } : 'skip'
  );
  const rawDocuments = useQuery(
    api.loanDocuments.getLoanDocuments,
    loanId ? { loanId: loanId as Id<'loans'> } : 'skip'
  );

  const dataLoading = rawLoan === undefined;

  // Derive loan details from Convex data
  const loanDetails = useMemo(() => {
    if (!rawLoan) return null;

    const amount = rawLoan.amount ?? rawLoan.principal ?? 0;
    const termMonths = rawLoan.termMonths ?? 12;
    const interestRate = rawLoan.interestRate ?? 18;

    // Canonical scoring fields (N1) — preferred over legacy approval_requests.request_data
    const creditScore = rawLoan.creditScore ?? null;
    const debtToIncomeRatio = rawLoan.debtToIncomeRatio ?? null;
    const recommendation = rawLoan.recommendation ?? null;

    const applicantName = rawClient?.fullName?.trim() || 'Unknown';
    const applicantEmail = rawClient?.email || '';
    const phone = rawClient?.phone || '+264 XX XXX XXXX';

    type RawDoc = QueryItem<typeof api.loanDocuments.getLoanDocuments>;
    const documents = (rawDocuments ?? []).map((doc: RawDoc) => ({
      id: String(doc._id),
      name: doc.fileName || 'Document',
      type: doc.documentType || 'other',
      status: (doc.status as 'verified' | 'pending' | 'rejected') || 'pending',
      uploadedAt: doc._creationTime
        ? new Date(doc._creationTime).toISOString()
        : new Date().toISOString(),
    }));

    return {
      id: loanId,
      applicantName,
      applicantEmail,
      phone,
      address: 'Address not provided',
      amount,
      purpose: rawLoan.purpose || 'Not specified',
      term: termMonths,
      interestRate,
      monthlyIncome: 0,
      employmentStatus: 'Not specified',
      employer: 'Not specified',
      // Canonical scoring (N1) — null means not yet computed
      creditScore,
      debtToIncomeRatio,
      recommendation,
      submittedAt: rawLoan._creationTime
        ? new Date(rawLoan._creationTime).toISOString()
        : new Date().toISOString(),
      status: rawLoan.status || propStatus || 'pending',
      approvedAt: rawLoan.approvedAt ? new Date(rawLoan.approvedAt).toISOString() : undefined,
      disbursedAt: rawLoan.disbursedAt ? new Date(rawLoan.disbursedAt).toISOString() : undefined,
      documents,
      creditHistory: [] as Array<{ type: string; amount: number; status: string; date: string }>,
    };
  }, [rawLoan, rawClient, rawDocuments, loanId, propStatus]);

  const formatCurrency = (amount: number) => {
    return `N$${amount.toLocaleString('en-NA', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getDocumentStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case 'pending':
        return <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const handleApprove = async () => {
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      onApprove(loanId, comments);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) return;

    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      onReject(loanId, rejectionReason);
    } finally {
      setLoading(false);
    }
  };

  // Helper to check if actions are allowed based on status
  const canTakeAction =
    loanDetails &&
    !['approved', 'rejected', 'disbursed', 'active', 'settled'].includes(loanDetails.status);

  // Loading state
  if (dataLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-background rounded-lg shadow-xl p-8 border border-border">
          <div className="flex items-center space-x-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-foreground">Loading loan details...</p>
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (!loanDetails) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-background rounded-lg shadow-xl p-8 border border-border">
          <div className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-foreground mb-4">Failed to load loan details</p>
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    );
  }

  const monthlyPayment =
    (loanDetails.amount * (loanDetails.interestRate / 100 / 12)) /
    (1 - Math.pow(1 + loanDetails.interestRate / 100 / 12, -loanDetails.term));

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-background rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Loan Application Review</h2>
            <p className="text-muted-foreground">Application ID: {loanId}</p>
          </div>
          <Button variant="ghost" onClick={onClose}>
            <XCircle className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex h-[calc(90vh-200px)]">
          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="financial">Financial</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="history">Credit History</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6 mt-6">
                {/* Applicant Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <User className="h-5 w-5" />
                      <span>Applicant Information</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Full Name
                        </label>
                        <p className="text-lg font-semibold text-foreground">
                          {loanDetails.applicantName}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Email</label>
                        <p className="flex items-center space-x-2 text-foreground">
                          <Mail className="h-4 w-4" />
                          <span>{loanDetails.applicantEmail}</span>
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Phone</label>
                        <p className="flex items-center space-x-2 text-foreground">
                          <Phone className="h-4 w-4" />
                          <span>{loanDetails.phone}</span>
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Address</label>
                        <p className="flex items-center space-x-2 text-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{loanDetails.address}</span>
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Loan Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <DollarSign className="h-5 w-5" />
                      <span>Loan Details</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-4 min-w-0">
                        <div className="min-w-0">
                          <label className="text-sm font-medium text-muted-foreground">
                            Requested Amount
                          </label>
                          <p
                            className="text-2xl font-bold text-green-600 dark:text-green-400 truncate tabular-nums"
                            title={formatCurrency(loanDetails.amount)}
                          >
                            {formatCurrency(loanDetails.amount)}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <label className="text-sm font-medium text-muted-foreground">
                            Purpose
                          </label>
                          <p
                            className="text-lg truncate text-foreground"
                            title={loanDetails.purpose}
                          >
                            {loanDetails.purpose}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <label className="text-sm font-medium text-muted-foreground">
                            Credit Score
                          </label>
                          <div className="flex items-center gap-2">
                            {loanDetails.creditScore != null ? (
                              <>
                                <span
                                  className={cn(
                                    'font-semibold tabular-nums',
                                    getCreditScoreClass(loanDetails.creditScore)
                                  )}
                                >
                                  {loanDetails.creditScore}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'shrink-0',
                                    getCreditScoreClass(loanDetails.creditScore)
                                  )}
                                >
                                  {getCreditScoreLabel(loanDetails.creditScore)}
                                </Badge>
                              </>
                            ) : (
                              <span className="text-sm text-muted-foreground">Not Available</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4 min-w-0">
                        <div className="min-w-0">
                          <label className="text-sm font-medium text-muted-foreground">Term</label>
                          <p className="text-lg tabular-nums text-foreground">
                            {loanDetails.term} months
                          </p>
                        </div>
                        <div className="min-w-0">
                          <label className="text-sm font-medium text-muted-foreground">
                            Interest Rate
                          </label>
                          <p className="text-lg tabular-nums text-foreground">
                            {loanDetails.interestRate}% per annum
                          </p>
                        </div>
                        <div className="min-w-0">
                          <label className="text-sm font-medium text-muted-foreground">
                            Monthly Payment
                          </label>
                          <p
                            className="text-lg font-semibold truncate tabular-nums text-foreground"
                            title={formatCurrency(monthlyPayment)}
                          >
                            {formatCurrency(monthlyPayment)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="financial" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Briefcase className="h-5 w-5" />
                      <span>Financial Information</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-4 min-w-0">
                        <div className="min-w-0">
                          <label className="text-sm font-medium text-muted-foreground">
                            Monthly Income
                          </label>
                          <p className="text-xl font-semibold tabular-nums text-foreground">
                            {formatCurrency(loanDetails.monthlyIncome)}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <label className="text-sm font-medium text-muted-foreground">
                            Employment Status
                          </label>
                          <p
                            className="text-lg truncate text-foreground"
                            title={loanDetails.employmentStatus}
                          >
                            {loanDetails.employmentStatus}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <label className="text-sm font-medium text-muted-foreground">
                            Employer
                          </label>
                          <p
                            className="text-lg truncate text-foreground"
                            title={loanDetails.employer}
                          >
                            {loanDetails.employer}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-4 min-w-0">
                        <div className="min-w-0">
                          <label className="text-sm font-medium text-muted-foreground">
                            Credit Score
                          </label>
                          <p className="text-xl font-semibold tabular-nums text-foreground">
                            {loanDetails.creditScore != null ? (
                              <span className={getCreditScoreClass(loanDetails.creditScore)}>
                                {loanDetails.creditScore}{' '}
                                <span className="text-sm font-normal">
                                  ({getCreditScoreLabel(loanDetails.creditScore)})
                                </span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-base">Not Available</span>
                            )}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <label className="text-sm font-medium text-muted-foreground">
                            Debt-to-Income Ratio
                          </label>
                          <p className="text-lg tabular-nums text-foreground">
                            {loanDetails.debtToIncomeRatio != null
                              ? `${(loanDetails.debtToIncomeRatio * 100).toFixed(1)}%`
                              : 'Not Available'}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <label className="text-sm font-medium text-muted-foreground">
                            Application Date
                          </label>
                          <p className="text-lg tabular-nums text-foreground">
                            {formatDate(loanDetails.submittedAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="documents" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <FileText className="h-5 w-5" />
                      <span>Required Documents</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {loanDetails.documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-4 border border-border rounded-lg bg-card"
                        >
                          <div className="flex items-center space-x-3">
                            {getDocumentStatusIcon(doc.status)}
                            <div>
                              <p className="font-medium text-foreground">{doc.name}</p>
                              <p className="text-sm text-muted-foreground">
                                Uploaded {formatDate(doc.uploadedAt)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge
                              variant="outline"
                              className={
                                doc.status === 'verified'
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800'
                                  : doc.status === 'pending'
                                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800'
                                    : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800'
                              }
                            >
                              {doc.status}
                            </Badge>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <CreditCard className="h-5 w-5" />
                      <span>Credit History</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {loanDetails.creditHistory.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-4 border border-border rounded-lg bg-card"
                        >
                          <div>
                            <p className="font-medium text-foreground">{item.type}</p>
                            <p className="text-sm text-muted-foreground">{formatDate(item.date)}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-foreground">
                              {formatCurrency(item.amount)}
                            </p>
                            <Badge
                              variant="outline"
                              className={
                                item.status === 'Paid'
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800'
                                  : item.status === 'Active'
                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                                    : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800'
                              }
                            >
                              {item.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Decision Panel */}
          <div className="w-80 border-l border-border bg-muted/30 p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 text-foreground">Decision Panel</h3>

              {/* Credit Scoring Quick Stats (N1 — canonical fields from Convex loans table) */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Credit Score:</span>
                  {loanDetails.creditScore != null ? (
                    <span
                      className={cn(
                        'font-semibold tabular-nums',
                        getCreditScoreClass(loanDetails.creditScore)
                      )}
                    >
                      {loanDetails.creditScore}
                      <span className="text-xs font-normal ml-1 text-muted-foreground">
                        ({getCreditScoreLabel(loanDetails.creditScore)})
                      </span>
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">N/A</span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">DTI Ratio:</span>
                  {loanDetails.debtToIncomeRatio != null ? (
                    <span
                      className={cn(
                        'font-semibold tabular-nums',
                        loanDetails.debtToIncomeRatio > 0.43
                          ? 'text-red-600 dark:text-red-400'
                          : loanDetails.debtToIncomeRatio > 0.36
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : 'text-green-600 dark:text-green-400'
                      )}
                    >
                      {(loanDetails.debtToIncomeRatio * 100).toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">N/A</span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Monthly Payment:</span>
                  <span className="font-medium tabular-nums text-foreground">
                    {formatCurrency(monthlyPayment)}
                  </span>
                </div>
              </div>

              {/* AI Recommendation (canonical — from Convex loans.recommendation) */}
              <div className="mb-6 p-3 rounded-lg border border-border bg-card">
                <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4" />
                  AI Recommendation
                </h4>
                {loanDetails.recommendation != null ? (
                  <Badge
                    variant="outline"
                    className={RECOMMENDATION_CONFIG[loanDetails.recommendation].className}
                  >
                    {RECOMMENDATION_CONFIG[loanDetails.recommendation].label}
                  </Badge>
                ) : (
                  <p className="text-xs text-muted-foreground">Not yet computed</p>
                )}
              </div>

              {/* Comments */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Comments (Optional)</label>
                <Textarea
                  placeholder="Add any comments or notes about this application..."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={3}
                  className="bg-background border-input text-foreground"
                />
              </div>

              {/* Rejection Reason */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Rejection Reason</label>
                <Textarea
                  placeholder="Required if rejecting the application..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  className="bg-background border-input text-foreground"
                />
              </div>

              {/* Action Buttons - Conditional based on status */}
              <div className="space-y-3 pt-4">
                {canTakeAction ? (
                  <>
                    <Button
                      onClick={handleApprove}
                      disabled={loading}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                      data-testid="approve-loan-button"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {loading ? 'Processing...' : 'Approve Application'}
                    </Button>

                    <Button
                      onClick={handleReject}
                      disabled={loading || !rejectionReason.trim()}
                      variant="outline"
                      className="w-full border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                      data-testid="reject-loan-button"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      {loading ? 'Processing...' : 'Reject Application'}
                    </Button>
                  </>
                ) : (
                  <div className="p-4 rounded-lg bg-muted border border-border">
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span>
                        This application has been{' '}
                        <strong className="text-foreground">{loanDetails.status}</strong>. No
                        further action required.
                      </span>
                    </div>
                    {loanDetails.approvedAt && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Approved on: {new Date(loanDetails.approvedAt).toLocaleDateString()}
                      </p>
                    )}
                    {loanDetails.disbursedAt && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Disbursed on: {new Date(loanDetails.disbursedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}

                <Button
                  onClick={onClose}
                  variant="ghost"
                  className="w-full text-muted-foreground hover:text-foreground"
                >
                  Close Review
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoanReviewPanel;
