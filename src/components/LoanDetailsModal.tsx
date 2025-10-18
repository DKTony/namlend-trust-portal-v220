import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatNAD } from '@/utils/currency';
import {
  DollarSign,
  Calendar,
  TrendingUp,
  User,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Percent,
  CreditCard
} from 'lucide-react';

interface LoanDetailsModalProps {
  open: boolean;
  onClose: () => void;
  loan: {
    id: string;
    amount: number;
    term_months?: number;
    interest_rate: number;
    monthly_payment?: number;
    total_repayment?: number;
    purpose: string;
    status: string;
    created_at: string;
    disbursed_at?: string;
    approved_at?: string;
    request_data?: any;
  } | null;
}

export const LoanDetailsModal: React.FC<LoanDetailsModalProps> = ({
  open,
  onClose,
  loan
}) => {
  if (!loan) return null;

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-NA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { bg: string; icon: React.ReactNode }> = {
      pending: { bg: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: <Clock className="h-3 w-3" /> },
      approved: { bg: 'bg-blue-100 text-blue-800 border-blue-200', icon: <CheckCircle className="h-3 w-3" /> },
      disbursed: { bg: 'bg-green-100 text-green-800 border-green-200', icon: <CheckCircle className="h-3 w-3" /> },
      active: { bg: 'bg-green-100 text-green-800 border-green-200', icon: <TrendingUp className="h-3 w-3" /> },
      rejected: { bg: 'bg-red-100 text-red-800 border-red-200', icon: <AlertCircle className="h-3 w-3" /> },
      completed: { bg: 'bg-gray-100 text-gray-800 border-gray-200', icon: <CheckCircle className="h-3 w-3" /> }
    };

    const variant = variants[status] || variants.pending;

    return (
      <Badge variant="outline" className={`${variant.bg} flex items-center space-x-1`}>
        {variant.icon}
        <span className="capitalize">{status}</span>
      </Badge>
    );
  };

  // Parse request data for user-friendly display
  const requestData = loan.request_data || {};
  const employmentStatus = requestData.employment_status || 'Not provided';
  const monthlyIncome = requestData.monthly_income || 0;
  const existingDebt = requestData.existing_debt || 0;
  const creditScore = requestData.credit_score || 'Not assessed';
  const userVerified = requestData.user_verified || false;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold">Loan Details</DialogTitle>
            {getStatusBadge(loan.status)}
          </div>
          <p className="text-sm text-gray-500">Loan ID: {loan.id.slice(-8)}</p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Loan Amount Section */}
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center space-x-2 text-gray-600 mb-2">
                    <DollarSign className="h-5 w-5" />
                    <span className="text-sm font-medium">Loan Amount</span>
                  </div>
                  <p className="text-3xl font-bold text-green-600">{formatNAD(loan.amount)}</p>
                </div>
                <div>
                  <div className="flex items-center space-x-2 text-gray-600 mb-2">
                    <CreditCard className="h-5 w-5" />
                    <span className="text-sm font-medium">Monthly Payment</span>
                  </div>
                  <p className="text-3xl font-bold text-blue-600">
                    {loan.monthly_payment ? formatNAD(loan.monthly_payment) : 'Calculating...'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Loan Terms */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <span>Loan Terms</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2 text-gray-600 mb-1">
                    <Calendar className="h-4 w-4" />
                    <span className="text-xs">Term</span>
                  </div>
                  <p className="text-xl font-bold">{loan.term_months || 'N/A'} months</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2 text-gray-600 mb-1">
                    <Percent className="h-4 w-4" />
                    <span className="text-xs">Interest Rate</span>
                  </div>
                  <p className="text-xl font-bold">{loan.interest_rate}% p.a.</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2 text-gray-600 mb-1">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-xs">Total Repayment</span>
                  </div>
                  <p className="text-lg font-bold">
                    {loan.total_repayment ? formatNAD(loan.total_repayment) : 'N/A'}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2 text-gray-600 mb-1">
                    <FileText className="h-4 w-4" />
                    <span className="text-xs">Purpose</span>
                  </div>
                  <p className="text-sm font-medium capitalize">{loan.purpose}</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Applicant Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
              <User className="h-5 w-5 text-purple-600" />
              <span>Applicant Information</span>
            </h3>
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Employment Status:</span>
                      <span className="font-medium capitalize">{employmentStatus}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Monthly Income:</span>
                      <span className="font-medium">{formatNAD(monthlyIncome)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Existing Debt:</span>
                      <span className="font-medium">{formatNAD(existingDebt)}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Credit Score:</span>
                      <span className="font-medium">{creditScore}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Verified:</span>
                      <Badge variant={userVerified ? "default" : "outline"}>
                        {userVerified ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Debt-to-Income:</span>
                      <span className="font-medium">
                        {monthlyIncome > 0 
                          ? `${((existingDebt / monthlyIncome) * 100).toFixed(1)}%`
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Timeline */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <span>Timeline</span>
            </h3>
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Application Submitted</p>
                      <p className="text-sm text-gray-500">{formatDate(loan.created_at)}</p>
                    </div>
                  </div>
                  {loan.approved_at && (
                    <div className="flex items-start space-x-3">
                      <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Loan Approved</p>
                        <p className="text-sm text-gray-500">{formatDate(loan.approved_at)}</p>
                      </div>
                    </div>
                  )}
                  {loan.disbursed_at && (
                    <div className="flex items-start space-x-3">
                      <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <DollarSign className="h-4 w-4 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Funds Disbursed</p>
                        <p className="text-sm text-gray-500">{formatDate(loan.disbursed_at)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Request Data */}
          {Object.keys(requestData).length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Additional Information</h3>
              <Card className="bg-gray-50">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    {Object.entries(requestData)
                      .filter(([key]) => !['employment_status', 'monthly_income', 'existing_debt', 'credit_score', 'user_verified'].includes(key))
                      .map(([key, value]) => (
                        <div key={key} className="flex justify-between items-center py-2 border-b border-gray-200">
                          <span className="text-gray-600 capitalize">{key.replace(/_/g, ' ')}:</span>
                          <span className="font-medium text-right">
                            {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : 
                             typeof value === 'number' ? value.toLocaleString() : 
                             String(value)}
                          </span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoanDetailsModal;
