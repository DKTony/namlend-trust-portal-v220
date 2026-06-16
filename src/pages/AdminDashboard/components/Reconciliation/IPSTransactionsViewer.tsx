/**
 * IPS Transactions Viewer
 * View and reconcile IPS/IPP transactions
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatNAD } from '@/constants/regulatory';
import { api } from '@/integrations/convex/api';
import { useQuery as useConvexQuery } from 'convex/react';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  RefreshCw,
  Search,
  XCircle,
  Zap,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';

interface IPSTransaction {
  id: string;
  transaction_type: string;
  status: string;
  ips_result: string | null;
  amount: number;
  currency: string;
  payer_vpa: string | null;
  payee_vpa: string | null;
  msg_id: string;
  txn_id: string;
  ips_txn_id: string | null;
  ips_rrn: string | null;
  ips_error_code: string | null;
  created_at: string;
  completed_at: string | null;
  loan_id: string | null;
  disbursement_id: string | null;
  payment_id: string | null;
}

type ConvexIpsStatus = 'completed' | 'failed' | 'pending' | 'processing' | 'reversed' | 'timeout';

const STATUS_BADGES: Record<
  string,
  { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }
> = {
  success: { variant: 'default', icon: <CheckCircle className="h-3 w-3" /> },
  completed: { variant: 'default', icon: <CheckCircle className="h-3 w-3" /> },
  pending: { variant: 'secondary', icon: <Clock className="h-3 w-3" /> },
  initiated: { variant: 'secondary', icon: <Clock className="h-3 w-3" /> },
  sent: { variant: 'outline', icon: <Zap className="h-3 w-3" /> },
  failed: { variant: 'destructive', icon: <XCircle className="h-3 w-3" /> },
  deemed: { variant: 'outline', icon: <AlertTriangle className="h-3 w-3" /> },
};

export function IPSTransactionsViewer() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Convex reactive query
  const rawTransactions = useConvexQuery(api.ips.ipsTransactions.adminListIpsTransactions, {
    ...(statusFilter !== 'all' ? { status: statusFilter as ConvexIpsStatus } : {}),
    limit: 100,
  });

  const isLoading = rawTransactions === undefined;
  const isRefetching = false; // Convex is always reactive

  // Transform Convex data to expected shape and apply type filter client-side
  const transactions: IPSTransaction[] | undefined = useMemo(() => {
    if (!rawTransactions) return undefined;
    let filtered = rawTransactions;
    if (typeFilter !== 'all') {
      filtered = filtered.filter(
        (t: any) => t.txType === typeFilter || t.transactionType === typeFilter
      );
    }
    return filtered.map((t: any) => ({
      id: String(t._id),
      transaction_type: t.txType ?? t.transactionType ?? '',
      status: t.status ?? 'pending',
      ips_result: t.ipsResult ?? null,
      amount: t.amount ?? 0,
      currency: t.currency ?? 'NAD',
      payer_vpa: t.payerVpa ?? null,
      payee_vpa: t.payeeVpa ?? null,
      msg_id: t.msgId ?? '',
      txn_id: t.txnId ?? String(t._id),
      ips_txn_id: t.ipsTxnId ?? null,
      ips_rrn: t.ipsRrn ?? null,
      ips_error_code: t.ipsErrorCode ?? null,
      created_at: t.createdAt ? new Date(t.createdAt).toISOString() : new Date().toISOString(),
      completed_at: t.completedAt ? new Date(t.completedAt).toISOString() : null,
      loan_id: t.loanId ? String(t.loanId) : null,
      disbursement_id: t.disbursementId ? String(t.disbursementId) : null,
      payment_id: t.paymentId ? String(t.paymentId) : null,
    }));
  }, [rawTransactions, typeFilter]);

  const refetch = () => {}; // Convex is reactive, no manual refetch needed

  const filteredTransactions = transactions?.filter((txn) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      txn.msg_id?.toLowerCase().includes(search) ||
      txn.txn_id?.toLowerCase().includes(search) ||
      txn.ips_txn_id?.toLowerCase().includes(search) ||
      txn.payer_vpa?.toLowerCase().includes(search) ||
      txn.payee_vpa?.toLowerCase().includes(search)
    );
  });

  const stats = {
    total: transactions?.length || 0,
    success:
      transactions?.filter((t) => t.status === 'success' || t.status === 'completed').length || 0,
    pending:
      transactions?.filter((t) => ['pending', 'initiated', 'sent'].includes(t.status)).length || 0,
    failed: transactions?.filter((t) => t.status === 'failed').length || 0,
    deemed: transactions?.filter((t) => t.status === 'deemed').length || 0,
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.success}
            </div>
            <p className="text-xs text-muted-foreground">Successful</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {stats.pending}
            </div>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.failed}</div>
            <p className="text-xs text-muted-foreground">Failed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {stats.deemed}
            </div>
            <p className="text-xs text-muted-foreground">Deemed</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            IPS Transactions
          </CardTitle>
          <CardDescription>View and reconcile IPS/IPP payment transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by ID, VPA..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="deemed">Deemed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="DISBURSEMENT">Disbursement</SelectItem>
                <SelectItem value="REPAYMENT">Repayment</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={refetch} disabled={isRefetching}>
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTransactions?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No IPS transactions found</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payer → Payee</TableHead>
                    <TableHead>IPS Ref</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions?.map((txn) => {
                    const statusInfo = STATUS_BADGES[txn.status] || STATUS_BADGES.pending;
                    return (
                      <TableRow key={txn.id}>
                        <TableCell>
                          <Badge variant="outline">{txn.transaction_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusInfo.variant} className="gap-1">
                            {statusInfo.icon}
                            {txn.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono">{formatNAD(txn.amount)}</TableCell>
                        <TableCell className="text-sm">
                          <div className="max-w-[200px] truncate">
                            {txn.payer_vpa || '-'} → {txn.payee_vpa || '-'}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {txn.ips_txn_id || txn.txn_id?.slice(0, 12) || '-'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(txn.created_at).toLocaleString('en-ZA', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default IPSTransactionsViewer;
