/**
 * IPS History List Component
 * 
 * Displays a list of IPS transactions for a loan or user
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Wallet,
} from 'lucide-react';
import { useLoanIPSTransactions } from '@/hooks/useIPSTransactionStatus';
import {
  IPS_STATUS_LABELS,
  IPS_STATUS_COLORS,
  isIPSStatusSuccess,
} from '@/types/ips';
import type { IPSTransactionStatus, IPSTransactionType } from '@/types/ips';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface IPSHistoryListProps {
  loanId: string;
  maxHeight?: string;
  showTitle?: boolean;
  className?: string;
}

export function IPSHistoryList({
  loanId,
  maxHeight = '400px',
  showTitle = true,
  className,
}: IPSHistoryListProps) {
  const { data, isLoading, isError } = useLoanIPSTransactions(loanId);

  if (isLoading) {
    return (
      <Card className={className}>
        {showTitle && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="h-4 w-4" />
              IPS Transactions
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (isError || !data?.success) {
    return (
      <Card className={className}>
        {showTitle && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="h-4 w-4" />
              IPS Transactions
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Failed to load transaction history
          </p>
        </CardContent>
      </Card>
    );
  }

  const transactions = data.transactions || [];

  if (transactions.length === 0) {
    return (
      <Card className={className}>
        {showTitle && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="h-4 w-4" />
              IPS Transactions
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No IPS transactions yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {showTitle && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="h-4 w-4" />
            IPS Transactions ({transactions.length})
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="p-0">
        <ScrollArea style={{ maxHeight }}>
          <div className="divide-y">
            {transactions.map((txn) => (
              <TransactionRow key={txn.id} transaction={txn} />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

interface TransactionRowProps {
  transaction: {
    id: string;
    transaction_type: IPSTransactionType;
    status: IPSTransactionStatus;
    amount: number;
    payer_vpa: string;
    payee_vpa: string;
    ips_result: string | null;
    ips_rrn: string | null;
    error_message: string | null;
    initiated_at: string;
    completed_at: string | null;
  };
}

function TransactionRow({ transaction }: TransactionRowProps) {
  const isDisbursement = transaction.transaction_type === 'DISBURSEMENT';
  const isSuccess = isIPSStatusSuccess(transaction.status);

  const StatusIcon = () => {
    const status = transaction.status;
    if (status === 'pending' || status === 'sent' || status === 'initiated') {
      return <Clock className="h-4 w-4 text-yellow-500" />;
    }
    if (isSuccess) {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    }
    if (status === 'failed') {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
    if (status === 'reversed') {
      return <AlertTriangle className="h-4 w-4 text-purple-500" />;
    }
    return <Clock className="h-4 w-4 text-gray-500" />;
  };

  return (
    <div className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors">
      {/* Icon */}
      <div
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-full',
          isDisbursement ? 'bg-blue-100' : 'bg-green-100'
        )}
      >
        {isDisbursement ? (
          <ArrowUpRight className="h-5 w-5 text-blue-600" />
        ) : (
          <ArrowDownLeft className="h-5 w-5 text-green-600" />
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">
            {isDisbursement ? 'Disbursement' : 'Payment'}
          </span>
          <StatusIcon />
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {isDisbursement ? `To: ${transaction.payee_vpa}` : `From: ${transaction.payer_vpa}`}
        </div>
        <div className="text-xs text-muted-foreground">
          {new Date(transaction.initiated_at).toLocaleDateString('en-ZA', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>

      {/* Amount and Status */}
      <div className="text-right">
        <div
          className={cn(
            'font-semibold',
            isDisbursement ? 'text-blue-600' : 'text-green-600'
          )}
        >
          {isDisbursement ? '-' : '+'}{formatCurrency(transaction.amount)}
        </div>
        <Badge
          variant="secondary"
          className={cn('text-xs', IPS_STATUS_COLORS[transaction.status])}
        >
          {IPS_STATUS_LABELS[transaction.status]}
        </Badge>
      </div>
    </div>
  );
}

export default IPSHistoryList;
