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
import { useToast } from '@/hooks/use-toast';
import { api } from '@/integrations/convex/api';
import { formatNAD } from '@/utils/currency';
import { useMutation, useQuery } from 'convex/react';
import {
  AlertTriangle,
  Calendar,
  Clock,
  DollarSign,
  Filter,
  Mail,
  Search,
  User,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import type { Id } from '../../../../../convex/_generated/dataModel';

const OverdueManager: React.FC = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const [asOf] = useState(() => Date.now());
  const sendCommunication = useMutation(api.communications.sendCommunication);
  const rows = useQuery(api.payments.getOverduePayments, { asOf, limit: 200 });

  const overduePayments = useMemo(
    () =>
      (rows ?? []).map((row) => ({
        id: String(row._id),
        clientName: row.clientName,
        clientUserId: row.clientUserId,
        loanId: String(row.loanId),
        amount: row.remainingAmount,
        daysOverdue: row.daysOverdue,
        originalDueDate: new Date(row.dueDate).toISOString(),
        riskLevel: row.riskLevel,
        totalOwed: row.outstandingBalance,
      })),
    [rows]
  );

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'bg-green-100  text-green-800 ';
      case 'medium':
        return 'bg-yellow-100  text-yellow-800 ';
      case 'high':
        return 'bg-red-100  text-red-800 ';
      default:
        return 'bg-gray-100  text-gray-800 ';
    }
  };

  const getDaysOverdueColor = (days: number) => {
    if (days <= 7) return 'text-yellow-600 ';
    if (days <= 30) return 'text-orange-600 ';
    return 'text-red-600 ';
  };

  const filteredPayments = overduePayments.filter((payment) => {
    const matchesSearch =
      payment.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.loanId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRisk = riskFilter === 'all' || payment.riskLevel === riskFilter;
    return matchesSearch && matchesRisk;
  });

  const handleSelectPayment = (paymentId: string) => {
    setSelectedPayments((prev) =>
      prev.includes(paymentId) ? prev.filter((id) => id !== paymentId) : [...prev, paymentId]
    );
  };

  const sendReminders = async (paymentIds: string[]) => {
    const targets = overduePayments.filter((p) => paymentIds.includes(p.id) && p.clientUserId);
    if (targets.length === 0) {
      toast({
        title: 'No recipients',
        description: 'Selected installments have no linked borrower.',
        variant: 'destructive',
      });
      return;
    }
    let sent = 0;
    let failed = 0;
    for (const payment of targets) {
      try {
        await sendCommunication({
          userId: payment.clientUserId as Id<'users'>,
          type: 'in_app',
          subject: 'Overdue payment reminder',
          message: `Your loan installment of ${formatNAD(payment.amount)} is ${payment.daysOverdue} day(s) overdue.`,
          priority: payment.riskLevel === 'high' ? 'high' : 'medium',
        });
        sent += 1;
      } catch {
        failed += 1;
      }
    }
    toast({
      title: failed === 0 ? 'Reminders sent' : 'Reminders partially sent',
      description: `${sent} in-app reminder${sent === 1 ? '' : 's'} delivered${failed > 0 ? `, ${failed} failed` : ''}.`,
      variant: failed === 0 ? 'default' : 'destructive',
    });
  };

  const handleBulkAction = async (action: string) => {
    if (action === 'Send Reminder') {
      await sendReminders(selectedPayments);
      setSelectedPayments([]);
      return;
    }
    toast({
      title: 'Use Collections',
      description:
        'Payment plans and escalation are recorded on the Collections workqueue, not as a bulk overdue shortcut.',
    });
  };

  const totalOverdue = overduePayments.reduce((sum, p) => sum + p.totalOwed, 0);
  const avgDays =
    overduePayments.length === 0
      ? 0
      : Math.round(
          overduePayments.reduce((sum, p) => sum + p.daysOverdue, 0) / overduePayments.length
        );

  if (rows === undefined) {
    return <div className="text-sm text-muted-foreground">Loading overdue installments…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Overdue Payments</h2>
          <p className="text-muted-foreground">Past-due installments from payment schedules</p>
        </div>
        <Badge variant="destructive" className="text-sm">
          {filteredPayments.length} overdue
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Overdue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-red-600 truncate tabular-nums">
              {formatNAD(totalOverdue)}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              Across {overduePayments.length} installments
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">High Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-red-600 truncate tabular-nums">
              {overduePayments.filter((p) => p.riskLevel === 'high').length}
            </div>
            <p className="text-xs text-muted-foreground truncate">More than 30 days past due</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Collections</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Record PTPs and collector activity on the Collections tab.
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Days Overdue
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-orange-600 truncate tabular-nums">
              {avgDays}
            </div>
            <p className="text-xs text-muted-foreground truncate">Days past due</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by client name or loan ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 bg-background border-input text-foreground"
            />
          </div>
        </div>
        <Select
          value={riskFilter}
          onValueChange={(value: 'all' | 'low' | 'medium' | 'high') => setRiskFilter(value)}
        >
          <SelectTrigger className="w-48 bg-background border-input text-foreground">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter by risk" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Risk Levels</SelectItem>
            <SelectItem value="low">Low Risk</SelectItem>
            <SelectItem value="medium">Medium Risk</SelectItem>
            <SelectItem value="high">High Risk</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selectedPayments.length > 0 && (
        <div className="flex items-center space-x-2 p-4 bg-muted rounded-lg">
          <span className="text-sm font-medium text-foreground">
            {selectedPayments.length} installment(s) selected
          </span>
          <Button variant="outline" size="sm" onClick={() => handleBulkAction('Send Reminder')}>
            <Mail className="mr-2 h-4 w-4" />
            Send Reminders
          </Button>
        </div>
      )}

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Overdue Payments</CardTitle>
          <CardDescription className="text-muted-foreground">
            Payments that are past their due date
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredPayments.length === 0 && (
              <p className="text-sm text-muted-foreground">No overdue installments.</p>
            )}
            {filteredPayments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors bg-card"
              >
                <div className="flex items-center space-x-4">
                  <input
                    type="checkbox"
                    checked={selectedPayments.includes(payment.id)}
                    onChange={() => handleSelectPayment(payment.id)}
                    className="rounded border-input bg-background"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-foreground">{payment.clientName}</span>
                      <Badge
                        variant="outline"
                        className="text-xs border-border text-muted-foreground"
                      >
                        {payment.loanId}
                      </Badge>
                      <Badge variant="secondary" className={getRiskColor(payment.riskLevel)}>
                        {payment.riskLevel} risk
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span>Amount: {formatNAD(payment.amount)}</span>
                      <span>Outstanding: {formatNAD(payment.totalOwed)}</span>
                      <span className={getDaysOverdueColor(payment.daysOverdue)}>
                        {payment.daysOverdue} days overdue
                      </span>
                      <span>Due: {new Date(payment.originalDueDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <Button variant="outline" size="sm" onClick={() => sendReminders([payment.id])}>
                  <Mail className="h-4 w-4 mr-1" />
                  Remind
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OverdueManager;
