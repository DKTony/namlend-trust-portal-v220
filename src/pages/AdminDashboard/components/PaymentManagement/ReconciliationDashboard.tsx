import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/integrations/convex/api';
import { formatNAD } from '@/utils/currency';
import { useQuery as useConvexQuery, useMutation } from 'convex/react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  DollarSign,
  Link2,
  RefreshCw,
  TrendingUp,
  Upload,
} from 'lucide-react';
import React, { useState } from 'react';
import type { Id } from '../../../../../convex/_generated/dataModel';
import ImportTransactionsModal from './ImportTransactionsModal';
// Inline type (previously from reconciliationService)
interface BankTransaction {
  id: string;
  external_id: string;
  transaction_date: string;
  amount: number;
  transaction_type: string;
  reference: string;
  description?: string;
  source: string;
  matched_payment_id?: string;
  status: string;
}

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
  const error: string | null = null;
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<string | null>(null);
  const { toast } = useToast();
  const matchTransactionMutation = useMutation(api.reconciliation.matchTransaction);

  // Reactive queries for reconciliation data
  const rawTransactions = useConvexQuery(api.reconciliation.listBankTransactions, {});
  const rawPayments = useConvexQuery(api.payments.adminListPayments, { status: 'pending' });
  const loadData = () => {
    setLoading(rawTransactions === undefined);
  };

  // Sync reactive data into local state
  React.useEffect(() => {
    if (rawTransactions !== undefined) {
      setTransactions(
        rawTransactions
          .filter((t: any) => !t.matchedPaymentId)
          .map((t: any) => ({
            id: String(t._id),
            external_id: t.externalId ?? '',
            transaction_date: t.transactionDate ?? '',
            amount: t.amount ?? 0,
            transaction_type: t.transactionType ?? 'credit',
            reference: t.reference ?? '',
            description: t.description,
            source: t.source ?? 'manual',
            matched_payment_id: t.matchedPaymentId ? String(t.matchedPaymentId) : undefined,
            status: t.status ?? 'unmatched',
          }))
      );
      setLoading(false);
    }
  }, [rawTransactions]);

  React.useEffect(() => {
    if (rawPayments !== undefined) {
      setPayments(
        rawPayments.map((p: any) => ({
          id: String(p._id),
          loan_id: String(p.loanId ?? ''),
          amount: p.amount ?? 0,
          payment_method: p.method ?? '',
          reference_number: p.referenceNumber,
          created_at: p.createdAt ? new Date(p.createdAt).toISOString() : '',
          status: p.status ?? 'pending',
        }))
      );
    }
  }, [rawPayments]);

  const handleAutoMatch = async () => {
    setMatchingLoading(true);
    try {
      // Auto-match: find transactions and payments with matching references/amounts
      let matchedCount = 0;
      for (const txn of transactions) {
        if (txn.status === 'matched') continue;
        const matchingPayment = payments.find(
          (p) => p.amount === txn.amount && p.reference_number === txn.reference
        );
        if (matchingPayment) {
          await matchTransactionMutation({
            transactionId: txn.id as Id<'bankTransactions'>,
            paymentId: matchingPayment.id as Id<'paymentTransactions'>,
            matchConfidence: 1.0,
            matchNotes: 'Auto-matched by reference and amount',
          });
          matchedCount++;
        }
      }
      toast({
        title: 'Auto-Match Complete',
        description: `Matched ${matchedCount} payment(s)`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
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
        variant: 'destructive',
      });
      return;
    }

    setMatchingLoading(true);
    try {
      await matchTransactionMutation({
        transactionId: selectedTransaction as Id<'bankTransactions'>,
        paymentId: selectedPayment as Id<'paymentTransactions'>,
        matchConfidence: 1.0,
        matchNotes: 'Manually matched by staff',
      });
      toast({
        title: 'Manual Match Complete',
        description: 'Payment matched successfully',
      });
      setSelectedPayment(null);
      setSelectedTransaction(null);
    } catch (error) {
      toast({
        title: 'Match Failed',
        description: error instanceof Error ? error.message : 'Failed to match payment',
        variant: 'destructive',
      });
    } finally {
      setMatchingLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
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
              <div key={i} className="h-20 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/10">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2 text-destructive">
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
                <p className="text-xs text-muted-foreground">Unmatched Transactions</p>
                <p className="text-2xl font-bold">{transactions.length}</p>
              </div>
              <Upload className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Unmatched Payments</p>
                <p className="text-2xl font-bold">{payments.length}</p>
              </div>
              <DollarSign className="h-8 w-8 text-orange-600 dark:text-orange-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold">
                  {formatNAD(transactions.reduce((sum, t) => sum + t.amount, 0))}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Match Rate</p>
                <p className="text-2xl font-bold">{transactions.length > 0 ? '0%' : '100%'}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-purple-600 dark:text-purple-400" />
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
                <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                  {matchedCount} selected for matching
                </Badge>
              )}
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={loadData} disabled={matchingLoading}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={() => setImportModalOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Import Transactions
              </Button>
              <Button
                size="sm"
                onClick={handleAutoMatch}
                disabled={matchingLoading || transactions.length === 0 || payments.length === 0}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Auto-Match
              </Button>
              {matchedCount > 0 && (
                <Button
                  size="sm"
                  onClick={handleManualMatch}
                  disabled={matchingLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
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
              <div className="text-center py-8 text-muted-foreground">
                <Upload className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
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
                    onClick={() =>
                      setSelectedTransaction(selectedTransaction === txn.id ? null : txn.id)
                    }
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedTransaction === txn.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-mono text-sm font-medium">
                          {txn.reference || txn.external_id}
                        </p>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(txn.transaction_date)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600 dark:text-green-400">
                          {formatNAD(txn.amount)}
                        </p>
                        <Badge variant="outline" className="text-xs mt-1">
                          {txn.transaction_type}
                        </Badge>
                      </div>
                    </div>
                    {txn.description && (
                      <p className="text-xs text-muted-foreground truncate">{txn.description}</p>
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
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <p>All payments matched!</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    onClick={() =>
                      setSelectedPayment(selectedPayment === payment.id ? null : payment.id)
                    }
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedPayment === payment.id
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-mono text-sm font-medium">
                          {payment.reference_number || 'No reference'}
                        </p>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(payment.created_at)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                          {formatNAD(payment.amount)}
                        </p>
                        <Badge variant="outline" className="text-xs mt-1">
                          {payment.payment_method}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Loan: {payment.loan_id.slice(-8)}
                    </p>
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
