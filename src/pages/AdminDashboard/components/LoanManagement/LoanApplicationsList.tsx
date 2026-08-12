import LoanDetailsModal from '@/components/modals/LoanDetailsModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { formatNAD } from '@/utils/currency';
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  Eye,
  FileText,
  User,
  XCircle,
} from 'lucide-react';
import React, { useState } from 'react';
import { useLoanActions } from '../../hooks/useLoanActions';
import { LoanApplication, useLoanApplications } from '../../hooks/useLoanApplications';
import { CompleteDisbursementModal } from '../PaymentManagement/CompleteDisbursementModal';

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
  refreshKey,
}) => {
  const { applications, loading, error, refetch } = useLoanApplications({
    status,
    searchTerm,
    dateFrom,
    dateTo,
    amountMin,
    amountMax,
    priority,
    refreshKey,
  });
  const { approveLoan, rejectLoan, loading: actionLoading } = useLoanActions();
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [loanDetailsOpen, setLoanDetailsOpen] = useState(false);
  const [disbursementModalOpen, setDisbursementModalOpen] = useState(false);
  const [selectedDisbursement, setSelectedDisbursement] = useState<{
    amount: number;
    clientName: string;
    loanId: string;
  } | null>(null);

  const handleReview = (loanId: string) => {
    if (onLoanClick) {
      onLoanClick(loanId);
    } else {
      // Open loan details modal
      setSelectedLoanId(loanId);
      setLoanDetailsOpen(true);
    }
  };

  const handleDisburse = (application: LoanApplication) => {
    setSelectedDisbursement({
      amount: application.amount,
      clientName: application.applicantName,
      loanId: application.id,
    });
    setDisbursementModalOpen(true);
  };

  const handleDisbursementSuccess = () => {
    setDisbursementModalOpen(false);
    setSelectedDisbursement(null);
    refetch(); // Refresh the list to show updated status
  };

  // Transform LoanApplication to format expected by LoanDetailsModal
  const getSelectedLoanForModal = () => {
    if (!selectedLoanId) return null;
    const application = applications.find((app) => app.id === selectedLoanId);
    if (!application) return null;

    // Use actual term/rate from data if available, otherwise defaults
    const termMonths = application.termMonths || 12;
    const annualRate = application.interestRate || 32; // 32% APR as per Namibian regulations
    const monthlyRate = annualRate / 100 / 12;
    const principal = application.amount;

    // Amortization formula: P * (r * (1+r)^n) / ((1+r)^n - 1)
    const monthlyPayment =
      monthlyRate > 0
        ? (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
          (Math.pow(1 + monthlyRate, termMonths) - 1)
        : principal / termMonths;
    const totalRepayment = monthlyPayment * termMonths;

    return {
      id: application.id,
      amount: application.amount,
      term_months: termMonths,
      interest_rate: annualRate,
      monthly_payment: isNaN(monthlyPayment) ? 0 : monthlyPayment,
      total_repayment: isNaN(totalRepayment) ? 0 : totalRepayment,
      purpose: application.purpose,
      status: application.status,
      created_at: application.submittedAt,
      // Include approval/disbursement timestamps for status history
      approved_at: application.approvedAt || undefined,
      disbursed_at: application.disbursedAt || undefined,
      request_data: {
        applicant_name: application.applicantName,
        applicant_email: application.applicantEmail,
        monthly_income: application.monthlyIncome,
        employment_status: application.employmentStatus,
        credit_score: application.creditScore,
        risk_score: application.riskScore,
      },
    };
  };

  const formatCurrency = formatNAD;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />;
      case 'disbursed':
        return <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending:
        'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
      approved:
        'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800',
      rejected:
        'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800',
      disbursed:
        'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    };

    return (
      <Badge
        variant="outline"
        className={
          variants[status as keyof typeof variants] ||
          'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400'
        }
      >
        {getStatusIcon(status)}
        <span className="ml-1 capitalize">{status}</span>
      </Badge>
    );
  };

  const getRiskBadge = (riskScore?: number) => {
    if (!riskScore) return null;

    if (riskScore >= 80) {
      return (
        <Badge
          variant="outline"
          className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800"
        >
          <AlertTriangle className="h-3 w-3 mr-1" />
          High Risk
        </Badge>
      );
    } else if (riskScore >= 60) {
      return (
        <Badge
          variant="outline"
          className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800"
        >
          Medium Risk
        </Badge>
      );
    } else {
      return (
        <Badge
          variant="outline"
          className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800"
        >
          Low Risk
        </Badge>
      );
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse bg-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="h-4 w-4 bg-muted rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
                <div className="h-8 bg-muted rounded w-20"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/10">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-destructive">
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
      <Card className="bg-card">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No applications found</h3>
            <p className="text-muted-foreground">
              {searchTerm
                ? `No applications match "${searchTerm}"`
                : `No ${status === 'all' ? '' : status} applications at this time`}
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
          data-testid={`loan-card-${application.id}`}
          className={`hover:shadow-md transition-shadow duration-200 bg-card border-border ${
            selectedLoans.includes(application.id)
              ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : ''
          }`}
        >
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {/* Selection Checkbox */}
              <div className="flex items-center justify-between sm:block">
                <Checkbox
                  checked={selectedLoans.includes(application.id)}
                  onCheckedChange={(checked) => onLoanSelect(application.id, checked as boolean)}
                />
                <span className="text-xs text-muted-foreground sm:hidden">Select</span>
              </div>

              {/* Application Details */}
              <div className="flex-1 min-w-0">
                <div className="mb-2 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-foreground">
                      {application.applicantName}
                    </h3>
                    {getStatusBadge(application.status)}
                    {getRiskBadge(application.riskScore)}
                  </div>
                  <div className="shrink-0 text-left lg:text-right">
                    <div
                      className="text-xl sm:text-2xl font-bold text-foreground truncate tabular-nums"
                      title={formatCurrency(application.amount)}
                    >
                      {formatCurrency(application.amount)}
                    </div>
                    <div className="text-sm text-muted-foreground">Requested Amount</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-2 min-w-0">
                    <User className="h-4 w-4 shrink-0" />
                    <span className="truncate" title={application.applicantEmail}>
                      {application.applicantEmail}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <Calendar className="h-4 w-4 shrink-0" />
                    <span>Applied {formatDate(application.submittedAt)}</span>
                  </div>
                  <div className="flex items-center space-x-2 min-w-0">
                    <FileText className="h-4 w-4 shrink-0" />
                    <span className="truncate" title={application.purpose}>
                      {application.purpose}
                    </span>
                  </div>
                </div>

                {/* Additional Details */}
                {(application.monthlyIncome ||
                  application.employmentStatus ||
                  application.creditScore) && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      {application.monthlyIncome && (
                        <div>
                          <span className="text-muted-foreground">Monthly Income:</span>
                          <span className="ml-2 font-medium text-foreground">
                            {formatCurrency(application.monthlyIncome)}
                          </span>
                        </div>
                      )}
                      {application.employmentStatus && (
                        <div>
                          <span className="text-muted-foreground">Employment:</span>
                          <span className="ml-2 font-medium capitalize text-foreground">
                            {application.employmentStatus}
                          </span>
                        </div>
                      )}
                      {application.creditScore && (
                        <div>
                          <span className="text-muted-foreground">Credit Score:</span>
                          <span className="ml-2 font-medium text-foreground">
                            {application.creditScore}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="grid grid-cols-1 gap-2 sm:w-40">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
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
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
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
                      className="w-full text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20"
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
                {application.status === 'approved' && application.source !== 'approval' && (
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => handleDisburse(application)}
                    data-testid={`disburse-loan-${application.id}`}
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Disburse
                  </Button>
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

      {/* Disbursement Modal */}
      <CompleteDisbursementModal
        open={disbursementModalOpen}
        onClose={() => {
          setDisbursementModalOpen(false);
          setSelectedDisbursement(null);
        }}
        onSuccess={handleDisbursementSuccess}
        disbursement={selectedDisbursement}
      />
    </div>
  );
};

export default LoanApplicationsList;
