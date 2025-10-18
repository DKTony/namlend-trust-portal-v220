import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatNAD } from '@/utils/currency';
import { 
  getUnmatchedTransactions,
  getUnmatchedPayments,
  autoMatchPayments,
  manualMatchPayment,
  BankTransaction
} from '@/services/reconciliationService';
import { 
  Upload, 
  CheckCircle, 
  AlertTriangle, 
  DollarSign, 
  Calendar,
  RefreshCw,
  Link2,
  TrendingUp
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ImportTransactionsModal from './ImportTransactionsModal';

interface UnmatchedPayment {
  id: string;
  loan_id: string;
  amount: number;
  payment_method: string;
  reference_number?: string;
  created_at: string;
  status: string;
}

export const ReconciliationDashboard: React.FC = () => {
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [payments, setPayments] = useState<UnmatchedPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [txnResult, payResult] = await Promise.all([
        getUnmatchedTransactions(),
        getUnmatchedPayments()
      ]);

      if (txnResult.success) {
        setTransactions(txnResult.transactions || []);
      } else {
        setError(txnResult.error || 'Failed to load transactions');
      }

      if (payResult.success) {
        setPayments(payResult.payments || []);
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Error loading reconciliation data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoMatch = async () => {
    setMatchingLoading(true);
    try {
      const result = await autoMatchPayments();
      
      if (result.success) {
        toast({
          title: 'Auto-Match Complete',
          description: `Matched ${result.matched_count || 0} payment(s)`
        });
        loadData();
      } else {
        toast({
          title: 'Auto-Match Failed',
          description: result.error || 'Failed to auto-match payments',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setMatchingLoading(false);
    }
  };

  const handleManualMatch = async () => {
    if (!selectedPayment || !selectedTransaction) {
      toast({
        title: 'Selection Required',
        description: 'Please select both a payment and a transaction to match',
        variant: 'destructive'
      });
      return;
    }

    setMatchingLoading(true);
    try {
      const result = await manualMatchPayment(selectedPayment, selectedTransaction);
      
      if (result.success) {
        toast({
          title: 'Manual Match Complete',
          description: 'Payment matched successfully'
        });
        setSelectedPayment(null);
        setSelectedTransaction(null);
        loadData();
      } else {
        toast({
          title: 'Match Failed',
          description: result.error || 'Failed to match payment',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setMatchingLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Reconciliation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const matchedCount = selectedPayment && selectedTransaction ? 1 : 0;

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Unmatched Transactions</p>
                <p className="text-2xl font-bold">{transactions.length}</p>
              </div>
              <Upload className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Unmatched Payments</p>
                <p className="text-2xl font-bold">{payments.length}</p>
              </div>
              <DollarSign className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold">
                  {formatNAD(transactions.reduce((sum, t) => sum + t.transaction_amount, 0))}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Match Rate</p>
                <p className="text-2xl font-bold">
                  {transactions.length > 0 ? '0%' : '100%'}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Import Modal */}
      <ImportTransactionsModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={loadData}
      />

      {/* Action Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {matchedCount > 0 && (
                <Badge className="bg-blue-100 text-blue-800">
                  {matchedCount} selected for matching
                </Badge>
              )}
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                disabled={matchingLoading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setImportModalOpen(true)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Import Transactions
              </Button>
              <Button
                size="sm"
                onClick={handleAutoMatch}
                disabled={matchingLoading || transactions.length === 0 || payments.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Auto-Match
              </Button>
              {matchedCount > 0 && (
                <Button
                  size="sm"
                  onClick={handleManualMatch}
                  disabled={matchingLoading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Link2 className="h-4 w-4 mr-2" />
                  Manual Match
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two-Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bank Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bank Transactions ({transactions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Upload className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>No unmatched transactions</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setImportModalOpen(true)}
                >
                  Import Transactions
                </Button>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {transactions.map((txn) => (
                  <div
                    key={txn.id}
                    onClick={() => setSelectedTransaction(
                      selectedTransaction === txn.id ? null : txn.id
                    )}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedTransaction === txn.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-mono text-sm font-medium">{txn.transaction_reference}</p>
                        <div className="flex items-center space-x-2 text-xs text-gray-600 mt-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(txn.transaction_date)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">
                          {formatNAD(txn.transaction_amount)}
                        </p>
                        <Badge variant="outline" className="text-xs mt-1">
                          {txn.transaction_type}
                        </Badge>
                      </div>
                    </div>
                    {txn.description && (
                      <p className="text-xs text-gray-600 truncate">{txn.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Unmatched Payments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Unmatched Payments ({payments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>All payments matched!</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    onClick={() => setSelectedPayment(
                      selectedPayment === payment.id ? null : payment.id
                    )}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedPayment === payment.id
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-mono text-sm font-medium">
                          {payment.reference_number || 'No reference'}
                        </p>
                        <div className="flex items-center space-x-2 text-xs text-gray-600 mt-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(payment.created_at)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-orange-600">
                          {formatNAD(payment.amount)}
                        </p>
                        <Badge variant="outline" className="text-xs mt-1">
                          {payment.payment_method}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600">Loan: {payment.loan_id.slice(-8)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReconciliationDashboard;
