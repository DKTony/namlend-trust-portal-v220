import React, { useState } from 'react';
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
  RefreshCw,
} from 'lucide-react';
import { usePaymentsList } from '../../hooks/usePaymentsList';
import { formatNAD } from '@/utils/currency';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from 'convex/react';
import { api } from '@/integrations/convex/api';
import type { Id } from '../../../../../convex/_generated/dataModel';
import PaymentDetailsModal from '@/components/modals/PaymentDetailsModal';

interface Payment {
  id: string;
  clientId: string;
  clientName: string;
  loanId: string;
  amount: number;
  dueDate: string;
  paidAt?: string;
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

const PaymentsList: React.FC<PaymentsListProps> = ({ status, searchTerm, onPaymentSelect }) => {
  const { payments, loading, error, refetch } = usePaymentsList(status, searchTerm);
  const { toast } = useToast();
  const recordPaymentMutation = useMutation(api.payments.recordPayment);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  const formatCurrency = (amount: number) => formatNAD(amount);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleRetryPayment = async (p: {
    loanId: string;
    amount: number;
    paymentMethod: string;
    reference: string;
  }) => {
    try {
      await recordPaymentMutation({
        loanId: p.loanId as Id<'loans'>,
        amount: p.amount,
        method: p.paymentMethod,
        referenceNumber: p.reference,
      });
      toast({ title: 'Retry queued', description: 'Payment recorded as pending.' });
    } catch (err) {
      toast({
        title: 'Retry failed',
        description: err instanceof Error ? err.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending:
        'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
      completed:
        'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800',
      failed:
        'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800',
      overdue:
        'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800',
      partial:
        'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 border-orange-200 dark:border-orange-800',
    };

    const icons = {
      pending: <Clock className="h-3 w-3 mr-1" />,
      completed: <CheckCircle className="h-3 w-3 mr-1" />,
      failed: <XCircle className="h-3 w-3 mr-1" />,
      overdue: <AlertTriangle className="h-3 w-3 mr-1" />,
      partial: <Clock className="h-3 w-3 mr-1" />,
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
      bank_transfer:
        'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-800',
      mobile_money:
        'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800',
      cash: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700',
      debit_order:
        'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 border-purple-200 dark:border-purple-800',
    };

    const labels = {
      bank_transfer: 'Bank Transfer',
      mobile_money: 'Mobile Money',
      cash: 'Cash',
      debit_order: 'Debit Order',
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
          <Card key={i} className="animate-pulse bg-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 bg-muted rounded-full"></div>
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
      <Card className="bg-card">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No payments found</h3>
            <p className="text-muted-foreground">
              {searchTerm
                ? `No payments match "${searchTerm}"`
                : `No ${status === 'all' ? '' : status} payments at this time`}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <PaymentDetailsModal
        open={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false);
          setSelectedPayment(null);
        }}
        payment={selectedPayment}
      />

      <div className="space-y-4">
        {payments.map((payment) => (
          <Card
            key={payment.id}
            className={`hover:shadow-md transition-shadow duration-200 cursor-pointer bg-card border-border ${
              payment.status === 'overdue' ? 'ring-2 ring-red-200 dark:ring-red-800 shadow-md' : ''
            }`}
            onClick={() => onPaymentSelect?.(payment.id)}
          >
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                {/* Payment Icon */}
                <div className="flex-shrink-0">
                  <div
                    className={`h-12 w-12 rounded-full flex items-center justify-center ${
                      payment.status === 'completed'
                        ? 'bg-green-100 dark:bg-green-900/30'
                        : payment.status === 'overdue' || payment.status === 'failed'
                          ? 'bg-red-100 dark:bg-red-900/30'
                          : 'bg-yellow-100 dark:bg-yellow-900/30'
                    }`}
                  >
                    <CreditCard
                      className={`h-6 w-6 ${
                        payment.status === 'completed'
                          ? 'text-green-600 dark:text-green-400'
                          : payment.status === 'overdue' || payment.status === 'failed'
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-yellow-600 dark:text-yellow-400'
                      }`}
                    />
                  </div>
                </div>

                {/* Payment Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3 min-w-0">
                      <h3
                        className="text-lg font-semibold text-foreground truncate tabular-nums"
                        title={formatCurrency(payment.amount)}
                      >
                        {formatCurrency(payment.amount)}
                      </h3>
                      <div className="shrink-0 flex space-x-2">
                        {getStatusBadge(payment.status)}
                        {getPaymentMethodBadge(payment.paymentMethod)}
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <div className="text-sm font-medium text-foreground">
                        Ref: {payment.reference}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {payment.status === 'overdue'
                          ? 'Overdue'
                          : payment.paidAt
                            ? `Paid ${formatDate(payment.paidAt)}`
                            : `Due ${formatDate(payment.dueDate)}`}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-2 min-w-0">
                      <User className="h-4 w-4 shrink-0" />
                      <span className="truncate" title={payment.clientName}>
                        {payment.clientName}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      <Calendar className="h-4 w-4 shrink-0" />
                      <span>Due: {formatDate(payment.dueDate)}</span>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      <CreditCard className="h-4 w-4 shrink-0" />
                      <span>Loan: {payment.loanId.slice(-6)}</span>
                    </div>
                  </div>

                  {/* Additional Details */}
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="flex items-center justify-between text-sm">
                      <div className="text-muted-foreground">
                        Created: {formatDate(payment.createdAt)}
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPayment({
                              id: payment.id,
                              loan_id: payment.loanId,
                              amount: payment.amount,
                              payment_method: payment.paymentMethod,
                              status: payment.status,
                              reference_number: payment.reference,
                              created_at: payment.createdAt,
                              paid_at: payment.paidAt,
                            });
                            setDetailsModalOpen(true);
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
                              handleRetryPayment({
                                loanId: payment.loanId,
                                amount: payment.amount,
                                paymentMethod: payment.paymentMethod,
                                reference: payment.reference,
                              });
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
    </>
  );
};

export default PaymentsList;
