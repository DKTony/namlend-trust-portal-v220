import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock, 
  DollarSign, 
  User, 
  Calendar,
  TrendingUp,
  AlertTriangle,
  Briefcase,
  FileText
} from 'lucide-react';
import { useLoanApplications } from '../../hooks/useLoanApplications';
import { useLoanActions } from '../../hooks/useLoanActions';
import LoanDetailsModal from '@/components/LoanDetailsModal';

interface LoanApplication {
  id: string;
  applicantName: string;
  applicantEmail: string;
  amount: number;
  purpose: string;
  status: 'pending' | 'approved' | 'rejected' | 'disbursed';
  submittedAt: string;
  riskScore?: number;
  monthlyIncome?: number;
  employmentStatus?: string;
  creditScore?: number;
  // Indicates whether this row came from loans table or approvals view
  source?: 'loan' | 'approval';
}

interface LoanApplicationsListProps {
  status: 'pending' | 'approved' | 'rejected' | 'all';
  searchTerm: string;
  selectedLoans: string[];
  onLoanSelect: (loanId: string, selected: boolean) => void;
  onLoanClick?: (loanId: string) => void;
  // Enhanced filters
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  priority?: string;
  // Realtime refresh
  refreshKey?: number;
}

const LoanApplicationsList: React.FC<LoanApplicationsListProps> = ({
  status,
  searchTerm,
  selectedLoans,
  onLoanSelect,
  onLoanClick,
  dateFrom,
  dateTo,
  amountMin,
  amountMax,
  priority,
  refreshKey
}) => {
  const navigate = useNavigate();
  const { applications, loading, error, refetch } = useLoanApplications({ 
    status, 
    searchTerm,
    dateFrom,
    dateTo,
    amountMin,
    amountMax,
    priority,
    refreshKey
  });
  const { approveLoan, rejectLoan, loading: actionLoading } = useLoanActions();
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [loanDetailsOpen, setLoanDetailsOpen] = useState(false);

  const handleReview = (loanId: string) => {
    if (onLoanClick) {
      onLoanClick(loanId);
    } else {
      // Open loan details modal
      setSelectedLoanId(loanId);
      setLoanDetailsOpen(true);
    }
  };

  // Transform LoanApplication to format expected by LoanDetailsModal
  const getSelectedLoanForModal = () => {
    if (!selectedLoanId) return null;
    const application = applications.find(app => app.id === selectedLoanId);
    if (!application) return null;

    return {
      id: application.id,
      amount: application.amount,
      term_months: 12, // Default, could be added to LoanApplication interface
      interest_rate: 32, // Default NAD rate
      monthly_payment: application.amount / 12, // Simple calculation
      total_repayment: application.amount * 1.32, // With 32% interest
      purpose: application.purpose,
      status: application.status,
      created_at: application.submittedAt,
      request_data: {
        applicant_name: application.applicantName,
        applicant_email: application.applicantEmail,
        monthly_income: application.monthlyIncome,
        employment_status: application.employmentStatus,
        credit_score: application.creditScore,
        risk_score: application.riskScore
      }
    };
  };

  const formatCurrency = (amount: number) => {
    return `N$${amount.toLocaleString('en-NA', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'disbursed':
        return <DollarSign className="h-4 w-4 text-blue-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      disbursed: 'bg-blue-100 text-blue-800 border-blue-200'
    };

    return (
      <Badge variant="outline" className={variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800'}>
        {getStatusIcon(status)}
        <span className="ml-1 capitalize">{status}</span>
      </Badge>
    );
  };

  const getRiskBadge = (riskScore?: number) => {
    if (!riskScore) return null;

    if (riskScore >= 80) {
      return (
        <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
          <AlertTriangle className="h-3 w-3 mr-1" />
          High Risk
        </Badge>
      );
    } else if (riskScore >= 60) {
      return (
        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
          Medium Risk
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
          Low Risk
        </Badge>
      );
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="h-4 w-4 bg-gray-200 rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="h-8 bg-gray-200 rounded w-20"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <span>Failed to load loan applications: {error}</span>
            </div>
            <Button variant="outline" size="sm" onClick={refetch}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!applications || applications.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No applications found</h3>
            <p className="text-gray-500">
              {searchTerm 
                ? `No applications match "${searchTerm}"`
                : `No ${status === 'all' ? '' : status} applications at this time`
              }
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {applications.map((application) => (
        <Card 
          key={application.id} 
          className={`hover:shadow-md transition-shadow duration-200 ${
            selectedLoans.includes(application.id) ? 'ring-2 ring-blue-500 bg-blue-50' : ''
          }`}
        >
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              {/* Selection Checkbox */}
              <Checkbox
                checked={selectedLoans.includes(application.id)}
                onCheckedChange={(checked) => onLoanSelect(application.id, checked as boolean)}
              />

              {/* Application Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {application.applicantName}
                    </h3>
                    {getStatusBadge(application.status)}
                    {getRiskBadge(application.riskScore)}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      {formatCurrency(application.amount)}
                    </div>
                    <div className="text-sm text-gray-500">
                      Requested Amount
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span>{application.applicantEmail}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>Applied {formatDate(application.submittedAt)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4" />
                    <span>{application.purpose}</span>
                  </div>
                </div>

                {/* Additional Details */}
                {(application.monthlyIncome || application.employmentStatus || application.creditScore) && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      {application.monthlyIncome && (
                        <div>
                          <span className="text-gray-500">Monthly Income:</span>
                          <span className="ml-2 font-medium">{formatCurrency(application.monthlyIncome)}</span>
                        </div>
                      )}
                      {application.employmentStatus && (
                        <div>
                          <span className="text-gray-500">Employment:</span>
                          <span className="ml-2 font-medium capitalize">{application.employmentStatus}</span>
                        </div>
                      )}
                      {application.creditScore && (
                        <div>
                          <span className="text-gray-500">Credit Score:</span>
                          <span className="ml-2 font-medium">{application.creditScore}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleReview(application.id)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Review
                </Button>
                {application.status === 'pending' && application.source !== 'approval' && (
                  <>
                    <Button
                      variant="default"
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      disabled={actionLoading}
                      onClick={async () => {
                        const success = await approveLoan(application.id);
                        if (success) {
                          refetch();
                        }
                      }}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {actionLoading ? 'Approving...' : 'Approve'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      disabled={actionLoading}
                      onClick={async () => {
                        const success = await rejectLoan(application.id);
                        if (success) {
                          refetch();
                        }
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      {actionLoading ? 'Rejecting...' : 'Reject'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Loan Details Modal */}
      <LoanDetailsModal
        open={loanDetailsOpen}
        onClose={() => {
          setLoanDetailsOpen(false);
          setSelectedLoanId(null);
        }}
        loan={getSelectedLoanForModal()}
      />
    </div>
  );
};

export default LoanApplicationsList;
