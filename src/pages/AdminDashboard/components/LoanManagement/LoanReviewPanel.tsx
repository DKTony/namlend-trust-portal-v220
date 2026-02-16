import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';

interface LoanReviewPanelProps {
  loanId: string;
  status?: string;
  onClose: () => void;
  onApprove: (loanId: string, comments?: string) => void;
  onReject: (loanId: string, reason: string) => void;
}

// Type definitions for Supabase query responses
interface LoanRow {
  id: string;
  user_id: string;
  amount: number;
  purpose?: string;
  term_months?: number;
  interest_rate?: number;
  status: string;
  created_at: string;
  approved_at?: string;
  disbursed_at?: string;
}

interface ProfileRow {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  address?: string;
  monthly_income?: number;
  employment_status?: string;
  employer_name?: string;
}

interface DocumentRow {
  id: string;
  file_name?: string;
  document_type?: string;
  status?: string;
  created_at: string;
}

interface CreditScoringData {
  credit_score?: number;
  credit_score_range?: string;
  risk_level?: string;
  debt_to_income_ratio?: number;
  affordability_score?: number;
  max_approved_amount?: number;
  suggested_interest_rate?: number;
  scoring_factors?: Array<{
    category: string;
    factor: string;
    impact: string;
    weight: number;
    description: string;
  }>;
  scoring_recommendations?: string[];
  loan_recommendation?: {
    approved: boolean;
    approved_amount: number;
    suggested_term: number;
    reasons: string[];
    conditions?: string[];
  };
}

interface LoanDetails {
  id: string;
  applicantName: string;
  applicantEmail: string;
  phone: string;
  address: string;
  amount: number;
  purpose: string;
  term: number;
  interestRate: number;
  monthlyIncome: number;
  employmentStatus: string;
  employer: string;
  creditScore: number;
  riskScore: number;
  submittedAt: string;
  status: string;
  approvedAt?: string;
  disbursedAt?: string;
  scoringData?: CreditScoringData;
  documents: Array<{
    id: string;
    name: string;
    type: string;
    status: 'verified' | 'pending' | 'rejected';
    uploadedAt: string;
  }>;
  creditHistory: Array<{
    type: string;
    amount: number;
    status: string;
    date: string;
  }>;
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
  const [dataLoading, setDataLoading] = useState(true);
  const [loanDetails, setLoanDetails] = useState<LoanDetails | null>(null);

  // Fetch real loan data
  useEffect(() => {
    const fetchLoanDetails = async () => {
      setDataLoading(true);
      try {
        // Import supabase dynamically to avoid circular deps
        const { supabase } = await import('@/integrations/supabase/client');

        // Fetch loan data - use select('*') to avoid complex type inference
        const loanResult = await supabase.from('loans').select('*').eq('id', loanId).single();

        if (loanResult.error || !loanResult.data) {
          console.error('Error fetching loan:', loanResult.error);
          return;
        }

        // Cast through unknown to bypass strict type checking
        const loanData = loanResult.data as unknown as LoanRow;

        // Fetch profile data
        const profileResult = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', loanData.user_id)
          .single();

        const profileData = (profileResult.data as unknown as ProfileRow) || null;

        // Fetch credit scoring data from approval_requests
        const approvalResult = await supabase
          .from('approval_requests')
          .select('request_data')
          .eq('reference_id', loanId)
          .eq('request_type', 'loan_application')
          .order('created_at', { ascending: false })
          .limit(1);

        const approvalData = approvalResult.data?.[0]?.request_data as
          | CreditScoringData
          | undefined;

        // Fetch documents
        const docsResult = await supabase
          .from('documents')
          .select('*')
          .eq('user_id', loanData.user_id)
          .order('created_at', { ascending: false });

        const docsData = (docsResult.data || []) as unknown as DocumentRow[];

        // Transform to LoanDetails format
        const details: LoanDetails = {
          id: loanData.id,
          applicantName: profileData
            ? `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() || 'Unknown'
            : 'Unknown',
          applicantEmail: profileData?.email || `user-${loanData.user_id?.slice(0, 8)}@namlend.com`,
          phone: profileData?.phone_number || '+264 XX XXX XXXX',
          address: profileData?.address || 'Address not provided',
          amount: loanData.amount || 0,
          purpose: loanData.purpose || 'Not specified',
          term: loanData.term_months || 12,
          interestRate: loanData.interest_rate || 18,
          monthlyIncome: profileData?.monthly_income || 0,
          employmentStatus: profileData?.employment_status || 'Not specified',
          employer: profileData?.employer_name || 'Not specified',
          creditScore: approvalData?.credit_score || 0,
          riskScore:
            approvalData?.risk_level === 'very_high'
              ? 85
              : approvalData?.risk_level === 'high'
                ? 65
                : approvalData?.risk_level === 'medium'
                  ? 40
                  : approvalData?.risk_level === 'low'
                    ? 15
                    : 0,
          submittedAt: loanData.created_at,
          status: loanData.status || propStatus || 'pending',
          approvedAt: loanData.approved_at,
          disbursedAt: loanData.disbursed_at,
          documents: docsData.map((doc) => ({
            id: doc.id,
            name: doc.file_name || 'Document',
            type: doc.document_type || 'other',
            status: (doc.status as 'verified' | 'pending' | 'rejected') || 'pending',
            uploadedAt: doc.created_at,
          })),
          creditHistory: [],
          scoringData: approvalData || undefined,
        };

        setLoanDetails(details);
      } catch (error) {
        console.error('Error fetching loan details:', error);
      } finally {
        setDataLoading(false);
      }
    };

    if (loanId) {
      fetchLoanDetails();
    }
  }, [loanId, propStatus]);

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

  const getRiskLevel = (score: number) => {
    if (score >= 70)
      return {
        label: 'High',
        color:
          'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800',
      };
    if (score >= 40)
      return {
        label: 'Medium',
        color:
          'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
      };
    return {
      label: 'Low',
      color:
        'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800',
    };
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

  const riskLevel = getRiskLevel(loanDetails.riskScore);
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
                            Risk Assessment
                          </label>
                          <div className="flex">
                            {loanDetails.riskScore > 0 ? (
                              <Badge variant="outline" className={`${riskLevel.color} shrink-0`}>
                                {riskLevel.label} Risk ({loanDetails.riskScore}%)
                              </Badge>
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
                            {loanDetails.creditScore > 0 ? (
                              loanDetails.creditScore
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
                            {((monthlyPayment / loanDetails.monthlyIncome) * 100).toFixed(1)}%
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

              {/* Quick Stats */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Risk Score:</span>
                  {loanDetails.riskScore > 0 ? (
                    <Badge variant="outline" className={riskLevel.color}>
                      {loanDetails.riskScore}%
                    </Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">N/A</span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Credit Score:</span>
                  <span className="font-medium text-foreground">
                    {loanDetails.creditScore > 0 ? loanDetails.creditScore : 'N/A'}
                  </span>
                </div>
                {loanDetails.scoringData?.credit_score_range && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Score Range:</span>
                    <Badge
                      variant="outline"
                      className={
                        loanDetails.scoringData.credit_score_range === 'EXCELLENT'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800'
                          : loanDetails.scoringData.credit_score_range === 'GOOD'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                            : loanDetails.scoringData.credit_score_range === 'FAIR'
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800'
                      }
                    >
                      {loanDetails.scoringData.credit_score_range}
                    </Badge>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">DTI Ratio:</span>
                  <span className="font-medium text-foreground">
                    {loanDetails.scoringData?.debt_to_income_ratio != null
                      ? `${loanDetails.scoringData.debt_to_income_ratio.toFixed(1)}%`
                      : `${((monthlyPayment / loanDetails.monthlyIncome) * 100).toFixed(1)}%`}
                  </span>
                </div>
                {loanDetails.scoringData?.max_approved_amount != null && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Max Approved:</span>
                    <span className="font-medium text-foreground">
                      {formatCurrency(loanDetails.scoringData.max_approved_amount)}
                    </span>
                  </div>
                )}
                {loanDetails.scoringData?.suggested_interest_rate != null && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Suggested Rate:</span>
                    <span className="font-medium text-foreground">
                      {loanDetails.scoringData.suggested_interest_rate}%
                    </span>
                  </div>
                )}
              </div>

              {/* AI Recommendation */}
              {loanDetails.scoringData?.loan_recommendation && (
                <div className="mb-6 p-3 rounded-lg border border-border bg-card">
                  <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                    <CreditCard className="h-4 w-4" />
                    AI Recommendation
                  </h4>
                  <Badge
                    variant="outline"
                    className={
                      loanDetails.scoringData.loan_recommendation.approved
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800 mb-2'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800 mb-2'
                    }
                  >
                    {loanDetails.scoringData.loan_recommendation.approved
                      ? 'Recommend Approve'
                      : 'Recommend Reject'}
                  </Badge>
                  {loanDetails.scoringData.loan_recommendation.reasons?.length > 0 && (
                    <ul className="text-xs text-muted-foreground space-y-1 mt-1">
                      {loanDetails.scoringData.loan_recommendation.reasons
                        .slice(0, 3)
                        .map((r, i) => (
                          <li key={i}>• {r}</li>
                        ))}
                    </ul>
                  )}
                  {loanDetails.scoringData.loan_recommendation.conditions?.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <p className="text-xs font-medium text-yellow-600 dark:text-yellow-400 mb-1">
                        Conditions:
                      </p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {loanDetails.scoringData.loan_recommendation.conditions.map((c, i) => (
                          <li key={i}>⚠ {c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

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
