/**
 * IPS Transaction Status Component
 *
 * Displays real-time status of an IPS transaction with polling
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { formatNAD } from '@/utils/currency';
import { useIPSTransactionStatus } from '@/hooks/useIPSTransactionStatus';
import { cn } from '@/lib/utils';
import type { IPSTransactionStatus as IPSStatus } from '@/types/ips';
import {
  IPS_STATUS_COLORS,
  IPS_STATUS_LABELS,
  isIPSStatusFinal,
  isIPSStatusSuccess,
} from '@/types/ips';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  XCircle,
} from 'lucide-react';

interface IPSTransactionStatusProps {
  transactionId: string;
  onComplete?: (status: IPSStatus) => void;
  compact?: boolean;
  showDetails?: boolean;
  className?: string;
}

export function IPSTransactionStatus({
  transactionId,
  onComplete,
  compact = false,
  showDetails = true,
  className,
}: IPSTransactionStatusProps) {
  const { data, isLoading, isError, isPolling, checkStatus, refresh } = useIPSTransactionStatus(
    transactionId,
    {
      enablePolling: true,
      onComplete,
    }
  );

  if (isLoading) {
    return (
      <div className={cn('space-y-2', className)}>
        <Skeleton className="h-8 w-32" />
        {!compact && <Skeleton className="h-4 w-48" />}
      </div>
    );
  }

  if (isError || !data?.success) {
    return (
      <div className={cn('flex items-center gap-2 text-red-500', className)}>
        <XCircle className="h-4 w-4" />
        <span className="text-sm">Failed to load transaction status</span>
        <Button variant="ghost" size="sm" onClick={refresh}>
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  const status = data.status || 'unknown';
  const isFinal = isIPSStatusFinal(status);
  const isSuccess = isIPSStatusSuccess(status);

  const StatusIcon = () => {
    if (isPolling || status === 'pending' || status === 'sent') {
      return <Loader2 className="h-5 w-5 animate-spin text-yellow-500" />;
    }
    if (isSuccess) {
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    }
    if (status === 'failed') {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }
    if (status === 'timeout') {
      return <Clock className="h-5 w-5 text-orange-500" />;
    }
    if (status === 'reversed') {
      return <AlertTriangle className="h-5 w-5 text-purple-500" />;
    }
    return <Clock className="h-5 w-5 text-gray-500" />;
  };

  const TransactionIcon = () => {
    if (data.transaction_type === 'DISBURSEMENT') {
      return <ArrowUpRight className="h-4 w-4" />;
    }
    return <ArrowDownLeft className="h-4 w-4" />;
  };

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <StatusIcon />
        <Badge className={IPS_STATUS_COLORS[status]}>{IPS_STATUS_LABELS[status]}</Badge>
        {isPolling && <span className="text-xs text-muted-foreground">Checking...</span>}
        {!isFinal && (
          <Button variant="ghost" size="sm" onClick={() => checkStatus()}>
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <ThemedCard className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <TransactionIcon />
            <span>{data.transaction_type === 'DISBURSEMENT' ? 'Disbursement' : 'Payment'}</span>
          </div>
          <Badge className={IPS_STATUS_COLORS[status]}>{IPS_STATUS_LABELS[status]}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Amount */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Amount</span>
          <span className="font-semibold">{formatNAD(data.amount || 0)}</span>
        </div>

        {/* Status with icon */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Status</span>
          <div className="flex items-center gap-2">
            <StatusIcon />
            <span className="text-sm font-medium">{IPS_STATUS_LABELS[status]}</span>
          </div>
        </div>

        {showDetails && (
          <>
            {/* VPAs */}
            {data.payer_vpa && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">From</span>
                <span className="text-sm font-mono">{data.payer_vpa}</span>
              </div>
            )}
            {data.payee_vpa && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">To</span>
                <span className="text-sm font-mono">{data.payee_vpa}</span>
              </div>
            )}

            {/* Reference */}
            {data.ips_rrn && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Reference</span>
                <span className="text-sm font-mono">{data.ips_rrn}</span>
              </div>
            )}

            {/* Error message */}
            {data.error_message && status === 'failed' && (
              <div className="rounded-md bg-red-50 p-2 text-sm text-red-600">
                {data.error_message}
              </div>
            )}

            {/* Timestamps */}
            {data.initiated_at && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Initiated</span>
                <span>{new Date(data.initiated_at).toLocaleString()}</span>
              </div>
            )}
            {data.completed_at && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Completed</span>
                <span>{new Date(data.completed_at).toLocaleString()}</span>
              </div>
            )}
          </>
        )}

        {/* Actions */}
        {!isFinal && (
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => checkStatus()} disabled={isPolling}>
              {isPolling ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <RefreshCw className="h-3 w-3 mr-1" />
              )}
              Check Status
            </Button>
          </div>
        )}

        {/* Retry option for failed transactions */}
        {status === 'failed' && data.is_retryable && (
          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              size="sm"
              disabled
              title="Retry is not implemented; start a new IPS payment"
            >
              Retry Payment
            </Button>
          </div>
        )}
      </CardContent>
    </ThemedCard>
  );
}

export default IPSTransactionStatus;
