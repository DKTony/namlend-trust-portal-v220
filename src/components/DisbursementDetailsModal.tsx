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
  User,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  CreditCard,
  TrendingUp,
  Hash
} from 'lucide-react';

interface DisbursementDetailsModalProps {
  open: boolean;
  onClose: () => void;
  disbursement: {
    id: string;
    loan_id: string;
    client_name?: string;
    amount: number;
    status: string;
    method: string;
    reference: string;
    payment_reference?: string;
    scheduled_at: string;
    processed_at?: string;
    processing_notes?: string;
    created_at: string;
  } | null;
}

export const DisbursementDetailsModal: React.FC<DisbursementDetailsModalProps> = ({
  open,
  onClose,
  disbursement
}) => {
  if (!disbursement) return null;

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
      processing: { bg: 'bg-orange-100 text-orange-800 border-orange-200', icon: <TrendingUp className="h-3 w-3" /> },
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
            <DialogTitle className="text-2xl font-bold">Disbursement Details</DialogTitle>
            {getStatusBadge(disbursement.status)}
          </div>
          <p className="text-sm text-gray-500">Reference: {disbursement.reference}</p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Amount Section */}
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 text-gray-600 mb-2">
                    <DollarSign className="h-5 w-5" />
                    <span className="text-sm font-medium">Disbursement Amount</span>
                  </div>
                  <p className="text-4xl font-bold text-green-600">{formatNAD(disbursement.amount)}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-2 text-gray-600 mb-2">
                    <CreditCard className="h-5 w-5" />
                    <span className="text-sm font-medium">Method</span>
                  </div>
                  <p className="text-xl font-semibold uppercase">{disbursement.method}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Client & Loan Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
              <User className="h-5 w-5 text-blue-600" />
              <span>Client & Loan Information</span>
            </h3>
            <Card>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-gray-600">Client Name:</span>
                    <span className="font-medium">{disbursement.client_name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-gray-600">Loan ID:</span>
                    <span className="font-mono text-sm">{disbursement.loan_id.slice(-12)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-600">Disbursement ID:</span>
                    <span className="font-mono text-sm">{disbursement.id.slice(-12)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Reference (if completed) */}
          {disbursement.payment_reference && (
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                <Hash className="h-5 w-5 text-purple-600" />
                <span>Payment Reference</span>
              </h3>
              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Bank Payment Reference</p>
                      <p className="text-xl font-mono font-bold text-purple-900">
                        {disbursement.payment_reference}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Processing Notes */}
          {disbursement.processing_notes && (
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                <FileText className="h-5 w-5 text-orange-600" />
                <span>Processing Notes</span>
              </h3>
              <Card className="bg-orange-50 border-orange-200">
                <CardContent className="p-6">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {disbursement.processing_notes}
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
                      <p className="font-medium">Disbursement Created</p>
                      <p className="text-sm text-gray-500">{formatDate(disbursement.created_at)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <Calendar className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Scheduled For</p>
                      <p className="text-sm text-gray-500">{formatDate(disbursement.scheduled_at)}</p>
                    </div>
                  </div>

                  {disbursement.processed_at && (
                    <div className="flex items-start space-x-3">
                      <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Processed</p>
                        <p className="text-sm text-gray-500">{formatDate(disbursement.processed_at)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status Information */}
          <Card className="bg-gray-50">
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 mb-1">Current Status</p>
                  <p className="font-semibold capitalize">{disbursement.status}</p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Payment Method</p>
                  <p className="font-semibold uppercase">{disbursement.method}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DisbursementDetailsModal;
