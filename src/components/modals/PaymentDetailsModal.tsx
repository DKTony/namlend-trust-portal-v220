import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { formatNAD } from '@/utils/currency';
import { cn } from '@/lib/utils';
import {
  DollarSign,
  Calendar,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  CreditCard,
  Hash,
  ArrowDownLeft,
  Banknote,
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
  payment,
}) => {
  if (!payment) return null;

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-NA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; icon: React.ReactNode }> = {
      pending: {
        className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
        icon: <Clock className="h-3 w-3" />,
      },
      completed: {
        className: 'bg-green-500/10 text-green-500 border-green-500/20',
        icon: <CheckCircle className="h-3 w-3" />,
      },
      failed: {
        className: 'bg-red-500/10 text-red-500 border-red-500/20',
        icon: <AlertCircle className="h-3 w-3" />,
      },
    };

    const variant = variants[status] || variants.pending;

    return (
      <Badge
        variant="outline"
        className={cn(
          'flex items-center space-x-1.5 px-2.5 py-0.5 border-0 font-medium',
          variant.className
        )}
      >
        {variant.icon}
        <span className="capitalize">{status}</span>
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0 gap-0 bg-background border-border">
        <DialogHeader className="p-6 border-b border-border bg-background/95 backdrop-blur-xl sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center border border-green-500/20">
                <ArrowDownLeft className="h-5 w-5 text-green-600 dark:text-green-500" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                  Payment Receipt
                </DialogTitle>
                <p className="text-muted-foreground text-xs mt-0.5 font-mono">
                  ID: {payment.id.slice(0, 8)}
                </p>
              </div>
            </div>
            {getStatusBadge(payment.status)}
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Amount Section */}
          <div className="bg-card rounded-2xl border border-border p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
              <Banknote className="h-24 w-24 text-foreground" />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase tracking-wider">
                    Payment Amount
                  </span>
                </div>
                <p className="text-4xl font-bold text-foreground tracking-tight">
                  {formatNAD(payment.amount)}
                </p>
              </div>
              <div className="text-left md:text-right">
                <div className="flex items-center gap-2 text-muted-foreground mb-1 md:justify-end">
                  <CreditCard className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase tracking-wider">Method</span>
                </div>
                <p className="text-xl font-semibold text-foreground capitalize tracking-wide">
                  {payment.payment_method}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Transaction Info */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Hash className="h-3.5 w-3.5" /> Transaction Details
              </h3>
              <div className="bg-muted/30 rounded-xl border border-border p-1">
                {[
                  {
                    label: 'Loan ID',
                    value: payment.loan_id.slice(-8),
                    icon: FileText,
                    mono: true,
                  },
                  { label: 'Payment ID', value: payment.id.slice(-8), icon: Hash, mono: true },
                  {
                    label: 'Reference',
                    value: payment.reference_number || 'N/A',
                    icon: Hash,
                    mono: true,
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center p-3 hover:bg-muted/50 rounded-lg transition-colors"
                  >
                    <span className="text-xs text-muted-foreground flex items-center gap-2">
                      <item.icon className="h-3 w-3" /> {item.label}
                    </span>
                    <span
                      className={cn(
                        'text-sm font-medium text-foreground',
                        item.mono && 'font-mono'
                      )}
                    >
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" /> Timeline
              </h3>
              <div className="space-y-4 pl-2">
                {[
                  { label: 'Initiated', date: payment.created_at, icon: Clock, active: true },
                  {
                    label: 'Completed',
                    date: payment.paid_at,
                    icon: CheckCircle,
                    active: !!payment.paid_at,
                    highlight: true,
                  },
                ].map((step, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex items-center gap-3',
                      !step.active && 'opacity-40 grayscale'
                    )}
                  >
                    <div
                      className={cn(
                        'h-8 w-8 rounded-lg flex items-center justify-center border',
                        step.highlight
                          ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-500'
                          : 'bg-muted border-border text-muted-foreground'
                      )}
                    >
                      <step.icon className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p
                        className={cn(
                          'text-xs font-medium',
                          step.highlight ? 'text-green-600 dark:text-green-400' : 'text-foreground'
                        )}
                      >
                        {step.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {step.date ? formatDate(step.date) : 'Pending'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Notes */}
          {payment.notes && (
            <div className="bg-muted/30 border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Notes
                </span>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed font-mono">
                {payment.notes}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentDetailsModal;
