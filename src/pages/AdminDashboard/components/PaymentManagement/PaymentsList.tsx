import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Eye, 
  CreditCard, 
  Calendar, 
  User, 
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { usePaymentsList } from '../../hooks/usePaymentsList';

interface Payment {
  id: string;
  clientId: string;
  clientName: string;
  loanId: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: 'pending' | 'completed' | 'failed' | 'overdue' | 'partial';
  paymentMethod: 'bank_transfer' | 'mobile_money' | 'cash' | 'debit_order';
  reference: string;
  createdAt: string;
  updatedAt: string;
}

interface PaymentsListProps {
  status: 'all' | 'pending' | 'completed' | 'failed' | 'overdue';
  searchTerm: string;
  onPaymentSelect?: (paymentId: string) => void;
}

const PaymentsList: React.FC<PaymentsListProps> = ({
  status,
  searchTerm,
  onPaymentSelect
}) => {
  const { payments, loading, error, refetch } = usePaymentsList(status, searchTerm);

  const formatCurrency = (amount: number) => {
    return `N$${amount.toLocaleString('en-NA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      completed: 'bg-green-100 text-green-800 border-green-200',
      failed: 'bg-red-100 text-red-800 border-red-200',
      overdue: 'bg-red-100 text-red-800 border-red-200',
      partial: 'bg-orange-100 text-orange-800 border-orange-200'
    };

    const icons = {
      pending: <Clock className="h-3 w-3 mr-1" />,
      completed: <CheckCircle className="h-3 w-3 mr-1" />,
      failed: <XCircle className="h-3 w-3 mr-1" />,
      overdue: <AlertTriangle className="h-3 w-3 mr-1" />,
      partial: <Clock className="h-3 w-3 mr-1" />
    };

    return (
      <Badge variant="outline" className={variants[status as keyof typeof variants]}>
        {icons[status as keyof typeof icons]}
        <span className="capitalize">{status}</span>
      </Badge>
    );
  };

  const getPaymentMethodBadge = (method: string) => {
    const variants = {
      bank_transfer: 'bg-blue-100 text-blue-800 border-blue-200',
      mobile_money: 'bg-green-100 text-green-800 border-green-200',
      cash: 'bg-gray-100 text-gray-800 border-gray-200',
      debit_order: 'bg-purple-100 text-purple-800 border-purple-200'
    };

    const labels = {
      bank_transfer: 'Bank Transfer',
      mobile_money: 'Mobile Money',
      cash: 'Cash',
      debit_order: 'Debit Order'
    };

    return (
      <Badge variant="outline" className={variants[method as keyof typeof variants]}>
        {labels[method as keyof typeof labels]}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
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
              <span>Failed to load payments: {error}</span>
            </div>
            <Button variant="outline" size="sm" onClick={refetch}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!payments || payments.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No payments found</h3>
            <p className="text-gray-500">
              {searchTerm 
                ? `No payments match "${searchTerm}"`
                : `No ${status === 'all' ? '' : status} payments at this time`
              }
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {payments.map((payment) => (
        <Card 
          key={payment.id} 
          className={`hover:shadow-md transition-shadow duration-200 cursor-pointer ${
            payment.status === 'overdue' ? 'ring-2 ring-red-200 shadow-md' : ''
          }`}
          onClick={() => onPaymentSelect?.(payment.id)}
        >
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              {/* Payment Icon */}
              <div className="flex-shrink-0">
                <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                  payment.status === 'completed' ? 'bg-green-100' :
                  payment.status === 'overdue' || payment.status === 'failed' ? 'bg-red-100' :
                  'bg-yellow-100'
                }`}>
                  <CreditCard className={`h-6 w-6 ${
                    payment.status === 'completed' ? 'text-green-600' :
                    payment.status === 'overdue' || payment.status === 'failed' ? 'text-red-600' :
                    'text-yellow-600'
                  }`} />
                </div>
              </div>

              {/* Payment Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {formatCurrency(payment.amount)}
                    </h3>
                    {getStatusBadge(payment.status)}
                    {getPaymentMethodBadge(payment.paymentMethod)}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      Ref: {payment.reference}
                    </div>
                    <div className="text-xs text-gray-500">
                      {payment.status === 'overdue' ? 'Overdue' : 
                       payment.paidDate ? `Paid ${formatDate(payment.paidDate)}` :
                       `Due ${formatDate(payment.dueDate)}`}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span className="truncate">{payment.clientName}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>Due: {formatDate(payment.dueDate)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CreditCard className="h-4 w-4" />
                    <span>Loan: {payment.loanId.slice(-6)}</span>
                  </div>
                </div>

                {/* Additional Details */}
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between text-sm">
                    <div className="text-gray-500">
                      Created: {formatDate(payment.createdAt)}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPaymentSelect?.(payment.id);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                      {payment.status === 'failed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Handle retry payment
                          }}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Retry
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default PaymentsList;
