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
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  CreditCard,
  Hash,
  User
} from 'lucide-react';

interface PaymentDetailsModalProps {
  open: boolean;
  onClose: () => void;
  payment: {
    id: string;
    loan_id: string;
    amount: number;
    payment_method: string;
    status: string;
    reference_number?: string;
    created_at: string;
    paid_at?: string;
    notes?: string;
  } | null;
}

export const PaymentDetailsModal: React.FC<PaymentDetailsModalProps> = ({
  open,
  onClose,
  payment
}) => {
  if (!payment) return null;

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
      completed: { bg: 'bg-green-100 text-green-800 border-green-200', icon: <CheckCircle className="h-3 w-3" /> },
      failed: { bg: 'bg-red-100 text-red-800 border-red-200', icon: <AlertCircle className="h-3 w-3" /> }
    };

    const variant = variants[status] || variants.pending;

    return (
      <Badge variant="outline" className={`${variant.bg} flex items-center space-x-1`}>
        {variant.icon}
        <span className="capitalize">{status}</span>
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold">Payment Details</DialogTitle>
            {getStatusBadge(payment.status)}
          </div>
          <p className="text-sm text-gray-500">Payment ID: {payment.id.slice(-12)}</p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Amount Section */}
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 text-gray-600 mb-2">
                    <DollarSign className="h-5 w-5" />
                    <span className="text-sm font-medium">Payment Amount</span>
                  </div>
                  <p className="text-4xl font-bold text-green-600">{formatNAD(payment.amount)}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-2 text-gray-600 mb-2">
                    <CreditCard className="h-5 w-5" />
                    <span className="text-sm font-medium">Method</span>
                  </div>
                  <p className="text-xl font-semibold capitalize">{payment.payment_method}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <span>Payment Information</span>
            </h3>
            <Card>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-gray-600">Loan ID:</span>
                    <span className="font-mono text-sm">{payment.loan_id.slice(-12)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-gray-600">Payment ID:</span>
                    <span className="font-mono text-sm">{payment.id.slice(-12)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-gray-600">Payment Method:</span>
                    <span className="font-medium capitalize">{payment.payment_method}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-600">Status:</span>
                    {getStatusBadge(payment.status)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Reference Number */}
          {payment.reference_number && (
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                <Hash className="h-5 w-5 text-purple-600" />
                <span>Reference Number</span>
              </h3>
              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                      <Hash className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Transaction Reference</p>
                      <p className="text-xl font-mono font-bold text-purple-900">
                        {payment.reference_number}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Notes */}
          {payment.notes && (
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                <FileText className="h-5 w-5 text-orange-600" />
                <span>Notes</span>
              </h3>
              <Card className="bg-orange-50 border-orange-200">
                <CardContent className="p-6">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {payment.notes}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Timeline */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
              <Clock className="h-5 w-5 text-gray-600" />
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
                      <p className="font-medium">Payment Initiated</p>
                      <p className="text-sm text-gray-500">{formatDate(payment.created_at)}</p>
                    </div>
                  </div>

                  {payment.paid_at && (
                    <div className="flex items-start space-x-3">
                      <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Payment Completed</p>
                        <p className="text-sm text-gray-500">{formatDate(payment.paid_at)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary Card */}
          <Card className="bg-gray-50">
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 mb-1">Amount Paid</p>
                  <p className="text-xl font-bold text-green-600">{formatNAD(payment.amount)}</p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Payment Date</p>
                  <p className="font-semibold">
                    {payment.paid_at ? formatDate(payment.paid_at) : 'Pending'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentDetailsModal;
