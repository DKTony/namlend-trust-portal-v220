import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Send,
  Eye,
  PlayCircle,
  XCircle
} from 'lucide-react';
import { useDisbursements } from '../../hooks/useDisbursements';
import { formatNAD } from '@/utils/currency';
import { useToast } from '@/hooks/use-toast';
import CompleteDisbursementModal from './CompleteDisbursementModal';
import DisbursementDetailsModal from '@/components/DisbursementDetailsModal';

type DisbursementStatus = 'all' | 'pending' | 'approved' | 'processing' | 'completed' | 'failed';

interface Props {
  status?: DisbursementStatus;
  searchTerm?: string;
}

const DisbursementManager: React.FC<Props> = ({ status = 'all', searchTerm = '' }) => {
  const { 
    disbursements, 
    loading, 
    error, 
    refetch,
    approveDisbursement,
    markProcessing,
    completeDisbursement: completeDisbursementAction,
    failDisbursement
  } = useDisbursements(status, searchTerm);
  const [selectedDisbursements, setSelectedDisbursements] = useState<string[]>([]);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedDisbursement, setSelectedDisbursement] = useState<{
    id: string;
    amount: number;
    clientName: string;
    loanId: string;
  } | null>(null);
  const [selectedDisbursementDetails, setSelectedDisbursementDetails] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const formatCurrency = (amount: number) => formatNAD(amount);

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
      approved: 'bg-blue-100 text-blue-800 border-blue-200',
      processing: 'bg-orange-100 text-orange-800 border-orange-200',
      completed: 'bg-green-100 text-green-800 border-green-200',
      failed: 'bg-red-100 text-red-800 border-red-200'
    };

    const icons = {
      pending: <Clock className="h-3 w-3 mr-1" />,
      approved: <CheckCircle className="h-3 w-3 mr-1" />,
      processing: <Clock className="h-3 w-3 mr-1" />,
      completed: <CheckCircle className="h-3 w-3 mr-1" />,
      failed: <AlertTriangle className="h-3 w-3 mr-1" />
    };

    return (
      <Badge variant="outline" className={variants[status as keyof typeof variants]}>
        {icons[status as keyof typeof icons]}
        <span className="capitalize">{status}</span>
      </Badge>
    );
  };

  const handleApprove = async (disbursementId: string) => {
    setActionLoading(disbursementId);
    try {
      await approveDisbursement(disbursementId);
      toast({
        title: 'Success',
        description: 'Disbursement approved successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to approve disbursement',
        variant: 'destructive'
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkProcessing = async (disbursementId: string) => {
    setActionLoading(disbursementId);
    try {
      await markProcessing(disbursementId);
      toast({
        title: 'Success',
        description: 'Disbursement marked as processing'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to mark as processing',
        variant: 'destructive'
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenCompleteModal = (disbursement: any) => {
    setSelectedDisbursement({
      id: disbursement.id,
      amount: disbursement.amount,
      clientName: disbursement.client_name,
      loanId: disbursement.loan_id
    });
    setCompleteModalOpen(true);
  };

  const handleCompleteSuccess = () => {
    refetch();
    setSelectedDisbursement(null);
  };

  const handleFail = async (disbursementId: string) => {
    const reason = prompt('Enter reason for failure:');
    if (!reason) return;

    setActionLoading(disbursementId);
    try {
      await failDisbursement(disbursementId, reason);
      toast({
        title: 'Success',
        description: 'Disbursement marked as failed'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to mark as failed',
        variant: 'destructive'
      });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-gray-200 rounded"></div>
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
              <div>
                <p className="text-sm text-gray-600">Pending Disbursements</p>
                <p className="text-2xl font-bold">{disbursements?.filter(d => d.status === 'pending').length || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(disbursements?.reduce((sum, d) => sum + d.amount, 0) || 0)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Processing Today</p>
                <p className="text-2xl font-bold">{disbursements?.filter(d => d.status === 'processing').length || 0}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold">98.5%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Complete Disbursement Modal */}
      <CompleteDisbursementModal
        open={completeModalOpen}
        onClose={() => {
          setCompleteModalOpen(false);
          setSelectedDisbursement(null);
        }}
        onSuccess={handleCompleteSuccess}
        disbursement={selectedDisbursement}
      />

      {/* Disbursement Details Modal */}
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
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                    disbursement.status === 'completed' ? 'bg-green-100' :
                    disbursement.status === 'failed' ? 'bg-red-100' :
                    disbursement.status === 'processing' ? 'bg-orange-100' :
                    'bg-blue-100'
                  }`}>
                    <TrendingUp className={`h-6 w-6 ${
                      disbursement.status === 'completed' ? 'text-green-600' :
                      disbursement.status === 'failed' ? 'text-red-600' :
                      disbursement.status === 'processing' ? 'text-orange-600' :
                      'text-blue-600'
                    }`} />
                  </div>
                </div>

                {/* Disbursement Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {formatCurrency(disbursement.amount)}
                      </h3>
                      {getStatusBadge(disbursement.status)}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        Loan: {disbursement.loan_id.slice(-6)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDate(disbursement.scheduled_at)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
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

                  {/* Actions */}
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        Created: {formatDate(disbursement.created_at)}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {disbursement.status === 'pending' && (
                          <Button 
                            size="sm"
                            onClick={() => handleApprove(disbursement.id)}
                            disabled={actionLoading === disbursement.id}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                        )}
                        {disbursement.status === 'approved' && (
                          <Button 
                            size="sm"
                            onClick={() => handleMarkProcessing(disbursement.id)}
                            disabled={actionLoading === disbursement.id}
                            className="bg-orange-600 hover:bg-orange-700"
                          >
                            <PlayCircle className="h-4 w-4 mr-2" />
                            Mark Processing
                          </Button>
                        )}
                        {disbursement.status === 'processing' && (
                          <>
                            <Button 
                              size="sm"
                              onClick={() => handleOpenCompleteModal(disbursement)}
                              disabled={actionLoading === disbursement.id}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Complete
                            </Button>
                            <Button 
                              size="sm"
                              variant="destructive"
                              onClick={() => handleFail(disbursement.id)}
                              disabled={actionLoading === disbursement.id}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Mark Failed
                            </Button>
                          </>
                        )}
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
                              payment_reference: (disbursement as any).payment_reference,
                              scheduled_at: disbursement.scheduled_at,
                              created_at: disbursement.created_at
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
