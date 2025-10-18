import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatNAD } from '@/utils/currency';
import { getPaymentSchedule, PaymentSchedule } from '@/services/paymentService';
import { 
  Calendar, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  TrendingUp,
  Download
} from 'lucide-react';

interface Props {
  loanId: string;
  viewMode?: 'client' | 'admin';
  showSummary?: boolean;
}

export const PaymentScheduleViewer: React.FC<Props> = ({ 
  loanId, 
  viewMode = 'admin',
  showSummary = true 
}) => {
  const [schedule, setSchedule] = useState<PaymentSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSchedule();
  }, [loanId]);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getPaymentSchedule(loanId);
      
      if (result.success) {
        setSchedule(result.schedule || []);
      } else {
        setError(result.error || 'Failed to load payment schedule');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Error loading payment schedule:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string, daysOverdue: number) => {
    const variants = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      paid: 'bg-green-100 text-green-800 border-green-200',
      overdue: 'bg-red-100 text-red-800 border-red-200',
      partially_paid: 'bg-blue-100 text-blue-800 border-blue-200',
      waived: 'bg-gray-100 text-gray-800 border-gray-200'
    };

    const icons = {
      pending: <Clock className="h-3 w-3 mr-1" />,
      paid: <CheckCircle className="h-3 w-3 mr-1" />,
      overdue: <AlertTriangle className="h-3 w-3 mr-1" />,
      partially_paid: <TrendingUp className="h-3 w-3 mr-1" />,
      waived: <CheckCircle className="h-3 w-3 mr-1" />
    };

    return (
      <div className="flex items-center space-x-1">
        <Badge variant="outline" className={variants[status as keyof typeof variants]}>
          {icons[status as keyof typeof icons]}
          <span className="capitalize">{status.replace('_', ' ')}</span>
        </Badge>
        {status === 'overdue' && daysOverdue > 0 && (
          <span className="text-xs text-red-600 font-medium">
            ({daysOverdue} days)
          </span>
        )}
      </div>
    );
  };

  const calculateSummary = () => {
    const totalAmount = schedule.reduce((sum, item) => sum + item.total_amount, 0);
    const totalPaid = schedule.reduce((sum, item) => sum + item.amount_paid, 0);
    const totalBalance = schedule.reduce((sum, item) => sum + item.balance, 0);
    const totalLateFees = schedule.reduce((sum, item) => sum + item.late_fee_applied, 0);
    const overdueCount = schedule.filter(item => item.status === 'overdue').length;
    const paidCount = schedule.filter(item => item.status === 'paid').length;

    return {
      totalAmount,
      totalPaid,
      totalBalance,
      totalLateFees,
      overdueCount,
      paidCount,
      totalInstallments: schedule.length
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
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
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

  if (schedule.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-400" />
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
                  <p className="text-xs text-gray-600">Total Amount</p>
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
                  <p className="text-xs text-gray-600">Total Paid</p>
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
                  <p className="text-xs text-gray-600">Balance</p>
                  <p className="text-lg font-bold text-orange-600">{formatNAD(summary.totalBalance)}</p>
                </div>
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Progress</p>
                  <p className="text-lg font-bold">
                    {summary.paidCount}/{summary.totalInstallments}
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
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Overdue Warning */}
          {summary.overdueCount > 0 && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">
                <p className="font-medium">
                  {summary.overdueCount} installment{summary.overdueCount > 1 ? 's' : ''} overdue
                </p>
                <p className="mt-1">
                  Late fees: {formatNAD(summary.totalLateFees)}
                </p>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-3 text-sm font-medium text-gray-700">#</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-700">Due Date</th>
                  <th className="text-right p-3 text-sm font-medium text-gray-700">Principal</th>
                  <th className="text-right p-3 text-sm font-medium text-gray-700">Interest</th>
                  {viewMode === 'admin' && (
                    <th className="text-right p-3 text-sm font-medium text-gray-700">Fees</th>
                  )}
                  <th className="text-right p-3 text-sm font-medium text-gray-700">Total</th>
                  <th className="text-right p-3 text-sm font-medium text-gray-700">Paid</th>
                  <th className="text-right p-3 text-sm font-medium text-gray-700">Balance</th>
                  <th className="text-center p-3 text-sm font-medium text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((item) => (
                  <tr 
                    key={item.id} 
                    className={`border-b hover:bg-gray-50 transition-colors ${
                      item.status === 'overdue' ? 'bg-red-50' : ''
                    }`}
                  >
                    <td className="p-3 font-medium">{item.installment_number}</td>
                    <td className="p-3 text-sm">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        <span>{formatDate(item.due_date)}</span>
                      </div>
                    </td>
                    <td className="text-right p-3 text-sm">{formatNAD(item.principal_amount)}</td>
                    <td className="text-right p-3 text-sm">{formatNAD(item.interest_amount)}</td>
                    {viewMode === 'admin' && (
                      <td className="text-right p-3 text-sm">
                        {item.late_fee_applied > 0 ? (
                          <span className="text-red-600 font-medium">
                            {formatNAD(item.late_fee_applied)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    )}
                    <td className="text-right p-3 font-medium">{formatNAD(item.total_amount)}</td>
                    <td className="text-right p-3 text-sm text-green-600">
                      {item.amount_paid > 0 ? formatNAD(item.amount_paid) : '-'}
                    </td>
                    <td className="text-right p-3 text-sm font-medium">
                      {item.balance > 0 ? (
                        <span className={item.status === 'overdue' ? 'text-red-600' : ''}>
                          {formatNAD(item.balance)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="text-center p-3">
                      {getStatusBadge(item.status, item.days_overdue)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 bg-gray-50 font-medium">
                  <td colSpan={2} className="p-3 text-sm">Total</td>
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
                  <td className="text-right p-3 text-green-600">{formatNAD(summary.totalPaid)}</td>
                  <td className="text-right p-3">{formatNAD(summary.totalBalance)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentScheduleViewer;
