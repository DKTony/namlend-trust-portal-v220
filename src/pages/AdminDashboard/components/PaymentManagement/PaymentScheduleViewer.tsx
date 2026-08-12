import { AdaptiveCollection } from '@/components/adaptive/AdaptiveCollection';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/integrations/convex/api';
import type { Id } from '@/types/convex';
import { formatNAD } from '@/utils/currency';
import { downloadCsv } from '@/utils/downloadFile';
import { useQuery as useConvexQuery } from 'convex/react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  Download,
  TrendingUp,
} from 'lucide-react';
import React, { useMemo } from 'react';

interface PaymentSchedule {
  id: string;
  loan_id: string;
  installment_number: number;
  due_date: string;
  amount_due: number;
  amount_paid: number;
  principal_amount: number;
  interest_amount: number;
  total_amount: number;
  balance: number;
  status: string;
  days_overdue: number;
  late_fee: number;
  late_fee_applied: number;
}

interface RawPaymentSchedule {
  _id?: unknown;
  loanId?: unknown;
  amount?: number;
  amountDue?: number;
  amountPaid?: number;
  balance?: number;
  daysOverdue?: number;
  dueDate?: number | string;
  installmentNumber?: number;
  interestAmount?: number;
  lateFee?: number;
  lateFeeApplied?: number;
  paidAmount?: number;
  principalAmount?: number;
  status?: string;
  totalAmount?: number;
}

interface Props {
  loanId: string;
  viewMode?: 'client' | 'admin';
  showSummary?: boolean;
}

export const PaymentScheduleViewer: React.FC<Props> = ({
  loanId,
  viewMode = 'admin',
  showSummary = true,
}) => {
  // Convex reactive query for payment schedules
  const rawSchedule = useConvexQuery(
    api.payments.getPaymentSchedule,
    loanId ? { loanId: loanId as Id<'loans'> } : 'skip'
  );

  const loading = rawSchedule === undefined;
  const error: string | null = null;

  const schedule: PaymentSchedule[] = useMemo(() => {
    if (!rawSchedule) return [];
    return (rawSchedule as unknown as RawPaymentSchedule[]).map((s, i) => {
      const amountDue = s.amountDue ?? s.amount ?? 0;
      const amountPaid = s.amountPaid ?? s.paidAmount ?? 0;
      const principalAmount = s.principalAmount ?? amountDue * 0.8;
      const interestAmount = s.interestAmount ?? amountDue * 0.2;
      const lateFeeApplied = s.lateFeeApplied ?? s.lateFee ?? 0;
      const totalAmount = s.totalAmount ?? amountDue + lateFeeApplied;
      const balance = s.balance ?? Math.max(0, totalAmount - amountPaid);
      return {
        id: String(s._id ?? i),
        loan_id: String(s.loanId ?? loanId),
        installment_number: s.installmentNumber ?? i + 1,
        due_date: s.dueDate ? new Date(s.dueDate).toISOString() : '',
        amount_due: amountDue,
        amount_paid: amountPaid,
        principal_amount: principalAmount,
        interest_amount: interestAmount,
        total_amount: totalAmount,
        balance,
        status: s.status ?? 'pending',
        days_overdue: s.daysOverdue ?? 0,
        late_fee: s.lateFee ?? 0,
        late_fee_applied: lateFeeApplied,
      };
    });
  }, [rawSchedule, loanId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (rawStatus: string, daysOverdue: number) => {
    // Backend rows use 'scheduled'; render it with the 'pending' styling.
    const status = rawStatus === 'scheduled' ? 'pending' : rawStatus;
    const variants = {
      pending: 'bg-yellow-100  text-yellow-800  border-yellow-200 ',
      paid: 'bg-green-100  text-green-800  border-green-200 ',
      overdue: 'bg-red-100  text-red-800  border-red-200 ',
      partially_paid: 'bg-blue-100  text-blue-800  border-blue-200 ',
      waived: 'bg-muted text-muted-foreground border-border',
    };

    const icons = {
      pending: <Clock className="h-3 w-3 mr-1" />,
      paid: <CheckCircle className="h-3 w-3 mr-1" />,
      overdue: <AlertTriangle className="h-3 w-3 mr-1" />,
      partially_paid: <TrendingUp className="h-3 w-3 mr-1" />,
      waived: <CheckCircle className="h-3 w-3 mr-1" />,
    };

    return (
      <div className="flex items-center space-x-1">
        <Badge variant="outline" className={variants[status as keyof typeof variants]}>
          {icons[status as keyof typeof icons]}
          <span className="capitalize">{status.replace('_', ' ')}</span>
        </Badge>
        {status === 'overdue' && daysOverdue > 0 && (
          <span className="text-xs text-red-600 font-medium">({daysOverdue} days)</span>
        )}
      </div>
    );
  };

  const calculateSummary = () => {
    const totalAmount = schedule.reduce((sum, item) => sum + item.total_amount, 0);
    const totalPaid = schedule.reduce((sum, item) => sum + item.amount_paid, 0);
    const totalBalance = schedule.reduce((sum, item) => sum + item.balance, 0);
    const totalLateFees = schedule.reduce((sum, item) => sum + item.late_fee_applied, 0);
    const overdueCount = schedule.filter((item) => item.status === 'overdue').length;
    const paidCount = schedule.filter((item) => item.status === 'paid').length;
    const partiallyPaidCount = schedule.filter((item) => item.status === 'partially_paid').length;

    return {
      totalAmount,
      totalPaid,
      totalBalance,
      totalLateFees,
      overdueCount,
      paidCount,
      partiallyPaidCount,
      totalInstallments: schedule.length,
    };
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200  bg-red-50 ">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (schedule.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground/60" />
            <p>No payment schedule available yet.</p>
            <p className="text-sm mt-1">Schedule will be generated after disbursement.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const summary = calculateSummary();

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      {showSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Amount</p>
                  <p className="text-lg font-bold">{formatNAD(summary.totalAmount)}</p>
                </div>
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Paid</p>
                  <p className="text-lg font-bold text-green-600">{formatNAD(summary.totalPaid)}</p>
                </div>
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Balance</p>
                  <p className="text-lg font-bold text-orange-600">
                    {formatNAD(summary.totalBalance)}
                  </p>
                </div>
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Progress</p>
                  <p className="text-lg font-bold">
                    {summary.paidCount}/{summary.totalInstallments}
                    {summary.partiallyPaidCount > 0 && (
                      <span className="ml-1 text-xs font-medium text-blue-600">
                        +{summary.partiallyPaidCount} partial
                      </span>
                    )}
                  </p>
                </div>
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Schedule Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Payment Schedule</span>
            </CardTitle>
            {viewMode === 'admin' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  downloadCsv(
                    `payment-schedule-${loanId}.csv`,
                    [
                      '#',
                      'Due Date',
                      'Principal',
                      'Interest',
                      'Total',
                      'Paid',
                      'Balance',
                      'Status',
                    ],
                    schedule.map((item) => [
                      item.installment_number,
                      formatDate(item.due_date),
                      item.principal_amount.toFixed(2),
                      item.interest_amount.toFixed(2),
                      item.total_amount.toFixed(2),
                      item.amount_paid.toFixed(2),
                      item.balance.toFixed(2),
                      item.status,
                    ])
                  )
                }
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Overdue Warning */}
          {summary.overdueCount > 0 && (
            <div className="mb-4 bg-red-50  border border-red-200  rounded-lg p-3 flex items-start space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800 ">
                <p className="font-medium">
                  {summary.overdueCount} installment{summary.overdueCount > 1 ? 's' : ''} overdue
                </p>
                <p className="mt-1">Late fees: {formatNAD(summary.totalLateFees)}</p>
              </div>
            </div>
          )}

          {/* Wide: table · Compact (<640px): stacked installment cards */}
          <AdaptiveCollection
            items={schedule}
            getKey={(item) => item.id}
            renderCard={(item) => (
              <div
                className={`rounded-lg border p-3 space-y-2 ${
                  item.status === 'overdue' ? 'border-red-200  bg-red-50 ' : 'border-border'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">
                    #{item.installment_number} · {formatDate(item.due_date)}
                  </span>
                  {getStatusBadge(item.status, item.days_overdue)}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total due</span>
                  <span className="font-medium tabular-nums">{formatNAD(item.total_amount)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Paid</span>
                  <span className="text-green-600 tabular-nums">
                    {item.amount_paid > 0 ? formatNAD(item.amount_paid) : '—'}
                  </span>
                </div>
                <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>Principal {formatNAD(item.principal_amount)}</span>
                  <span>Interest {formatNAD(item.interest_amount)}</span>
                  <span className={item.status === 'overdue' ? 'text-red-600 font-medium' : ''}>
                    Balance {item.balance > 0 ? formatNAD(item.balance) : '—'}
                  </span>
                </div>
                {viewMode === 'admin' && item.late_fee_applied > 0 && (
                  <div className="text-xs font-medium text-red-600">
                    Late fee: {formatNAD(item.late_fee_applied)}
                  </div>
                )}
              </div>
            )}
            renderWide={() => (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 text-sm font-medium text-muted-foreground">#</th>
                      <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                        Due Date
                      </th>
                      <th className="text-right p-3 text-sm font-medium text-muted-foreground">
                        Principal
                      </th>
                      <th className="text-right p-3 text-sm font-medium text-muted-foreground">
                        Interest
                      </th>
                      {viewMode === 'admin' && (
                        <th className="text-right p-3 text-sm font-medium text-muted-foreground">
                          Fees
                        </th>
                      )}
                      <th className="text-right p-3 text-sm font-medium text-muted-foreground">
                        Total
                      </th>
                      <th className="text-right p-3 text-sm font-medium text-muted-foreground">
                        Paid
                      </th>
                      <th className="text-right p-3 text-sm font-medium text-muted-foreground">
                        Balance
                      </th>
                      <th className="text-center p-3 text-sm font-medium text-muted-foreground">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.map((item) => (
                      <tr
                        key={item.id}
                        className={`border-b hover:bg-muted/50 transition-colors ${
                          item.status === 'overdue' ? 'bg-red-50 ' : ''
                        }`}
                      >
                        <td className="p-3 font-medium">{item.installment_number}</td>
                        <td className="p-3 text-sm">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span>{formatDate(item.due_date)}</span>
                          </div>
                        </td>
                        <td className="text-right p-3 text-sm">
                          {formatNAD(item.principal_amount)}
                        </td>
                        <td className="text-right p-3 text-sm">
                          {formatNAD(item.interest_amount)}
                        </td>
                        {viewMode === 'admin' && (
                          <td className="text-right p-3 text-sm">
                            {item.late_fee_applied > 0 ? (
                              <span className="text-red-600 font-medium">
                                {formatNAD(item.late_fee_applied)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                        )}
                        <td className="text-right p-3 font-medium">
                          {formatNAD(item.total_amount)}
                        </td>
                        <td className="text-right p-3 text-sm text-green-600">
                          {item.amount_paid > 0 ? formatNAD(item.amount_paid) : '-'}
                        </td>
                        <td className="text-right p-3 text-sm font-medium">
                          {item.balance > 0 ? (
                            <span className={item.status === 'overdue' ? 'text-red-600' : ''}>
                              {formatNAD(item.balance)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="text-center p-3">
                          {getStatusBadge(item.status, item.days_overdue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 bg-muted/50 font-medium">
                      <td colSpan={2} className="p-3 text-sm">
                        Total
                      </td>
                      <td className="text-right p-3 text-sm">
                        {formatNAD(schedule.reduce((sum, item) => sum + item.principal_amount, 0))}
                      </td>
                      <td className="text-right p-3 text-sm">
                        {formatNAD(schedule.reduce((sum, item) => sum + item.interest_amount, 0))}
                      </td>
                      {viewMode === 'admin' && (
                        <td className="text-right p-3 text-sm text-red-600">
                          {formatNAD(summary.totalLateFees)}
                        </td>
                      )}
                      <td className="text-right p-3">{formatNAD(summary.totalAmount)}</td>
                      <td className="text-right p-3 text-green-600">
                        {formatNAD(summary.totalPaid)}
                      </td>
                      <td className="text-right p-3">{formatNAD(summary.totalBalance)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          />

          {/* Compact-only totals (tfoot equivalent); sm:hidden matches the isCompact <640px switch */}
          <div className="sm:hidden mt-3 rounded-lg border bg-muted/50 p-3 space-y-1 text-sm font-medium">
            <div className="flex justify-between">
              <span>Total</span>
              <span className="tabular-nums">{formatNAD(summary.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Paid</span>
              <span className="tabular-nums">{formatNAD(summary.totalPaid)}</span>
            </div>
            <div className="flex justify-between">
              <span>Balance</span>
              <span className="tabular-nums">{formatNAD(summary.totalBalance)}</span>
            </div>
            {viewMode === 'admin' && summary.totalLateFees > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Late fees</span>
                <span className="tabular-nums">{formatNAD(summary.totalLateFees)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentScheduleViewer;
