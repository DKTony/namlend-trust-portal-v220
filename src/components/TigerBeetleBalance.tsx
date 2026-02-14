import React from 'react';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { Badge } from '@/components/ui/badge';
import { Loader2, Database, AlertCircle, TrendingDown, TrendingUp } from 'lucide-react';
import { useTigerBeetleBalance } from '@/hooks/useTigerBeetleBalance';
import { formatCurrency } from '@/lib/utils';

interface TigerBeetleBalanceProps {
  loanId: string;
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
}

export function TigerBeetleBalance({ 
  loanId, 
  showDetails = true, 
  compact = false,
  className = '' 
}: TigerBeetleBalanceProps) {
  const { data: balance, isLoading, error, dataUpdatedAt } = useTigerBeetleBalance(loanId);

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 text-muted-foreground ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading balance...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center gap-2 text-destructive ${className}`}>
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm">Balance unavailable</span>
      </div>
    );
  }

  if (!balance) {
    return null;
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Database className="h-4 w-4 text-blue-500" />
        <span className="font-semibold">{formatCurrency(balance.total)}</span>
        <Badge variant="outline" className="text-xs">
          TigerBeetle
        </Badge>
      </div>
    );
  }

  return (
    <ThemedCard className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Database className="h-4 w-4 text-blue-500" />
            Ledger Balance
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            TigerBeetle
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Total Balance */}
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">{formatCurrency(balance.total)}</span>
            {balance.total > 0 ? (
              <TrendingDown className="h-5 w-5 text-amber-500" />
            ) : (
              <TrendingUp className="h-5 w-5 text-green-500" />
            )}
          </div>

          {/* Breakdown */}
          {showDetails && (
            <div className="grid grid-cols-3 gap-2 pt-2 border-t">
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Principal</div>
                <div className="font-medium text-sm">{formatCurrency(balance.principal)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Interest</div>
                <div className="font-medium text-sm">{formatCurrency(balance.interest)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Fees</div>
                <div className="font-medium text-sm">{formatCurrency(balance.fees)}</div>
              </div>
            </div>
          )}

          {/* Last Updated */}
          <div className="text-xs text-muted-foreground text-right">
            Updated: {new Date(dataUpdatedAt).toLocaleTimeString()}
          </div>
        </div>
      </CardContent>
    </ThemedCard>
  );
}

export function TigerBeetleBalanceInline({ loanId }: { loanId: string }) {
  const { data: balance, isLoading } = useTigerBeetleBalance(loanId);

  if (isLoading) {
    return <Loader2 className="h-3 w-3 animate-spin inline" />;
  }

  if (!balance) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <span className="font-medium">
      {formatCurrency(balance.total)}
    </span>
  );
}

export default TigerBeetleBalance;
