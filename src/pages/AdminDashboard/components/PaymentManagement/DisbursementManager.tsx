import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  User,
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  AlertTriangle,
  Eye,
} from 'lucide-react';
import { useDisbursements } from '../../hooks/useDisbursements';
import { formatNAD } from '@/utils/currency';
import DisbursementDetailsModal from '@/components/modals/DisbursementDetailsModal';

type DisbursementStatus = 'all' | 'pending' | 'approved' | 'processing' | 'completed' | 'failed';

interface Props {
  status?: DisbursementStatus;
  searchTerm?: string;
}

const DisbursementManager: React.FC<Props> = ({ status = 'all', searchTerm = '' }) => {
  const { disbursements, loading, error } = useDisbursements(status, searchTerm);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  interface DisbursementDetails {
    id: string;
    loan_id: string;
    client_name: string;
    amount: number;
    status: string;
    method: string;
    reference: string | null;
    payment_reference: string | null;
    scheduled_at: string;
    created_at: string;
  }

  const [selectedDisbursementDetails, setSelectedDisbursementDetails] =
    useState<DisbursementDetails | null>(null);

  const formatCurrency = (amount: number) => formatNAD(amount);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending:
        'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
      approved:
        'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-800',
      processing:
        'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 border-orange-200 dark:border-orange-800',
      completed:
        'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800',
      failed:
        'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800',
    };

    const icons = {
      pending: <Clock className="h-3 w-3 mr-1" />,
      approved: <CheckCircle className="h-3 w-3 mr-1" />,
      processing: <Clock className="h-3 w-3 mr-1" />,
      completed: <CheckCircle className="h-3 w-3 mr-1" />,
      failed: <AlertTriangle className="h-3 w-3 mr-1" />,
    };

    return (
      <Badge variant="outline" className={variants[status as keyof typeof variants]}>
        {icons[status as keyof typeof icons]}
        <span className="capitalize">{status}</span>
      </Badge>
    );
  };

  // Type for disbursement row data
  interface DisbursementRow {
    id: string;
    amount: number;
    client_name: string;
    loan_id: string;
    status: string;
    method: string;
    reference: string | null;
    payment_reference?: string | null;
    scheduled_at: string;
    created_at: string;
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <span>Failed to load disbursements: {error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Disbursement Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1 mr-2">
                <p className="text-sm text-muted-foreground truncate">Pending Disbursements</p>
                <p className="text-xl sm:text-2xl font-bold truncate tabular-nums">
                  {disbursements?.filter((d) => d.status === 'pending').length || 0}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600 shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1 mr-2">
                <p className="text-sm text-muted-foreground truncate">Total Amount</p>
                <p
                  className="text-xl sm:text-2xl font-bold truncate tabular-nums"
                  title={formatCurrency(disbursements?.reduce((sum, d) => sum + d.amount, 0) || 0)}
                >
                  {formatCurrency(disbursements?.reduce((sum, d) => sum + d.amount, 0) || 0)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600 shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1 mr-2">
                <p className="text-sm text-muted-foreground truncate">Processing Today</p>
                <p className="text-xl sm:text-2xl font-bold truncate tabular-nums">
                  {disbursements?.filter((d) => d.status === 'processing').length || 0}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600 shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1 mr-2">
                <p className="text-sm text-muted-foreground truncate">Success Rate</p>
                <p className="text-xl sm:text-2xl font-bold truncate tabular-nums">98.5%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600 shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Disbursement Details Modal (View Only) */}
      <DisbursementDetailsModal
        open={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false);
          setSelectedDisbursementDetails(null);
        }}
        disbursement={selectedDisbursementDetails}
      />

      {/* Disbursements List */}
      <div className="space-y-4">
        {disbursements?.map((disbursement) => (
          <Card key={disbursement.id} className="hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                {/* Disbursement Icon */}
                <div className="flex-shrink-0">
                  <div
                    className={`h-12 w-12 rounded-full flex items-center justify-center ${
                      disbursement.status === 'completed'
                        ? 'bg-green-100'
                        : disbursement.status === 'failed'
                          ? 'bg-red-100'
                          : disbursement.status === 'processing'
                            ? 'bg-orange-100'
                            : 'bg-blue-100'
                    }`}
                  >
                    <TrendingUp
                      className={`h-6 w-6 ${
                        disbursement.status === 'completed'
                          ? 'text-green-600'
                          : disbursement.status === 'failed'
                            ? 'text-red-600'
                            : disbursement.status === 'processing'
                              ? 'text-orange-600'
                              : 'text-blue-600'
                      }`}
                    />
                  </div>
                </div>

                {/* Disbursement Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-semibold text-foreground">
                        {formatCurrency(disbursement.amount)}
                      </h3>
                      {getStatusBadge(disbursement.status)}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-foreground">
                        Loan: {disbursement.loan_id.slice(-6)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(disbursement.scheduled_at)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span className="truncate">{disbursement.client_name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>Scheduled: {formatDate(disbursement.scheduled_at)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4" />
                      <span>{disbursement.method}</span>
                    </div>
                  </div>

                  {/* Actions - View Only (Disbursement actions moved to Loan Management) */}
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        Created: {formatDate(disbursement.created_at)}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedDisbursementDetails({
                              id: disbursement.id,
                              loan_id: disbursement.loan_id,
                              client_name: disbursement.client_name,
                              amount: disbursement.amount,
                              status: disbursement.status,
                              method: disbursement.method,
                              reference: disbursement.reference,
                              payment_reference:
                                (disbursement as DisbursementRow).payment_reference ?? null,
                              scheduled_at: disbursement.scheduled_at,
                              created_at: disbursement.created_at,
                            });
                            setDetailsModalOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Details
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DisbursementManager;
