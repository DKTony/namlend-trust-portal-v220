/**
 * Self-Service Portal Component
 * Allows clients to manage their loans and request services
 */

import { useState, useEffect } from 'react';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { ThemedButton } from '@/components/ui/ThemedButton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Download,
  FileText,
  Calendar,
  Receipt,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatNAD } from '@/utils/currency';
import {
  requestReschedule,
  getRescheduleRequests,
  type RescheduleRequest,
} from '@/services/collectionsService';

interface Loan {
  id: string;
  amount: number;
  term_months: number;
  interest_rate: number;
  monthly_payment: number;
  total_repayment: number;
  purpose: string;
  status: string;
  created_at: string;
  disbursed_at?: string;
}

interface Payment {
  id: string;
  loan_id: string;
  amount: number;
  payment_method: string;
  status: string;
  paid_at: string;
  reference_number: string;
}

export function SelfServicePortal() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [rescheduleRequests, setRescheduleRequests] = useState<RescheduleRequest[]>([]);
  const [activeTab, setActiveTab] = useState('statements');

  // Reschedule dialog state
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [originalDueDate, setOriginalDueDate] = useState('');
  const [requestedDate, setRequestedDate] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch loans
      const { data: loansData } = await supabase
        .from('loans')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      setLoans(loansData || []);

      // Fetch payments
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('*')
        .in(
          'loan_id',
          (loansData || []).map((l) => l.id)
        )
        .order('paid_at', { ascending: false });

      setPayments(paymentsData || []);

      // Fetch reschedule requests
      const result = await getRescheduleRequests();
      if (result.success && result.data) {
        setRescheduleRequests(result.data.filter((r) => r.user_id === user?.id));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateStatement = (loan: Loan) => {
    // Generate a simple text statement (in production, use PDF library)
    const loanPayments = payments.filter((p) => p.loan_id === loan.id);
    const totalPaid = loanPayments.reduce((sum, p) => sum + p.amount, 0);

    const statement = `
=====================================
NAMLEND TRUST - LOAN STATEMENT
=====================================

Account Holder: ${user?.email}
Statement Date: ${new Date().toLocaleDateString('en-ZA')}

LOAN DETAILS
-------------------------------------
Loan ID: ${loan.id.substring(0, 8)}...
Amount: ${formatNAD(loan.amount)}
Interest Rate: ${loan.interest_rate}% APR
Term: ${loan.term_months} months
Monthly Payment: ${formatNAD(loan.monthly_payment)}
Total Repayment: ${formatNAD(loan.total_repayment)}
Status: ${loan.status.toUpperCase()}
Disbursed: ${loan.disbursed_at ? new Date(loan.disbursed_at).toLocaleDateString('en-ZA') : 'N/A'}

PAYMENT HISTORY
-------------------------------------
${
  loanPayments.length > 0
    ? loanPayments
        .map(
          (p) =>
            `${new Date(p.paid_at).toLocaleDateString('en-ZA')} - ${formatNAD(p.amount)} - ${p.payment_method} - Ref: ${p.reference_number}`
        )
        .join('\n')
    : 'No payments recorded yet'
}

SUMMARY
-------------------------------------
Total Paid: ${formatNAD(totalPaid)}
Remaining: ${formatNAD(loan.total_repayment - totalPaid)}

=====================================
This is an official statement from NamLend Trust.
For queries, contact support@namlend.com
=====================================
    `.trim();

    // Download as text file
    const blob = new Blob([statement], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NamLend_Statement_${loan.id.substring(0, 8)}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Statement Downloaded',
      description: 'Your loan statement has been downloaded.',
    });
  };

  const generateReceipt = (payment: Payment) => {
    const loan = loans.find((l) => l.id === payment.loan_id);

    const receipt = `
=====================================
NAMLEND TRUST - PAYMENT RECEIPT
=====================================

Receipt No: ${payment.reference_number}
Date: ${new Date(payment.paid_at).toLocaleDateString('en-ZA')}
Time: ${new Date(payment.paid_at).toLocaleTimeString('en-ZA')}

PAYMENT DETAILS
-------------------------------------
Amount: ${formatNAD(payment.amount)}
Payment Method: ${payment.payment_method.replace('_', ' ').toUpperCase()}
Status: ${payment.status.toUpperCase()}
Reference: ${payment.reference_number}

LOAN INFORMATION
-------------------------------------
Loan ID: ${payment.loan_id.substring(0, 8)}...
Original Amount: ${loan ? formatNAD(loan.amount) : 'N/A'}

=====================================
Thank you for your payment!
For queries, contact support@namlend.com
=====================================
    `.trim();

    const blob = new Blob([receipt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NamLend_Receipt_${payment.reference_number}_${new Date(payment.paid_at).toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Receipt Downloaded',
      description: 'Your payment receipt has been downloaded.',
    });
  };

  const handleRescheduleSubmit = async () => {
    if (!selectedLoan || !originalDueDate || !requestedDate || !rescheduleReason) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const result = await requestReschedule(
        selectedLoan.id,
        originalDueDate,
        requestedDate,
        rescheduleReason
      );

      if (result.success) {
        toast({
          title: 'Request Submitted',
          description: 'Your reschedule request has been submitted for review.',
        });
        setShowRescheduleDialog(false);
        resetRescheduleForm();
        fetchData();
      } else {
        throw new Error(result.error);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to submit request';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetRescheduleForm = () => {
    setSelectedLoan(null);
    setOriginalDueDate('');
    setRequestedDate('');
    setRescheduleReason('');
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return (
          <Badge className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-100/80 dark:hover:bg-green-900/40">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Self-Service Portal</h2>
          <p className="text-muted-foreground">
            Download statements, receipts, and manage your account
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="statements">
            <FileText className="h-4 w-4 mr-2" />
            Statements
          </TabsTrigger>
          <TabsTrigger value="receipts">
            <Receipt className="h-4 w-4 mr-2" />
            Receipts
          </TabsTrigger>
          <TabsTrigger value="requests">
            <Calendar className="h-4 w-4 mr-2" />
            Requests
          </TabsTrigger>
        </TabsList>

        {/* Statements Tab */}
        <TabsContent value="statements" className="space-y-4">
          <ThemedCard>
            <CardHeader>
              <CardTitle>Loan Statements</CardTitle>
              <CardDescription>Download statements for your active and past loans</CardDescription>
            </CardHeader>
            <CardContent>
              {loans.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">No Loans Found</h3>
                  <p className="text-sm text-muted-foreground">
                    Your loan statements will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {loans.map((loan) => (
                    <div
                      key={loan.id}
                      className="flex items-center justify-between p-4 border border-border rounded-lg bg-card"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-foreground">{formatNAD(loan.amount)}</h4>
                          <Badge variant={loan.status === 'active' ? 'default' : 'secondary'}>
                            {loan.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {loan.purpose} • {loan.term_months} months • {loan.interest_rate}% APR
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Created: {new Date(loan.created_at).toLocaleDateString('en-ZA')}
                        </p>
                      </div>
                      <ThemedButton
                        variant="outline"
                        size="sm"
                        onClick={() => generateStatement(loan)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </ThemedButton>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </ThemedCard>
        </TabsContent>

        {/* Receipts Tab */}
        <TabsContent value="receipts" className="space-y-4">
          <ThemedCard>
            <CardHeader>
              <CardTitle>Payment Receipts</CardTitle>
              <CardDescription>Download receipts for all your payments</CardDescription>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">No Payments Found</h3>
                  <p className="text-sm text-muted-foreground">
                    Your payment receipts will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{formatNAD(payment.amount)}</h4>
                          <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'}>
                            {payment.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {payment.payment_method.replace('_', ' ')} • Ref:{' '}
                          {payment.reference_number}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(payment.paid_at).toLocaleDateString('en-ZA')} at{' '}
                          {new Date(payment.paid_at).toLocaleTimeString('en-ZA')}
                        </p>
                      </div>
                      <ThemedButton
                        variant="outline"
                        size="sm"
                        onClick={() => generateReceipt(payment)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Receipt
                      </ThemedButton>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </ThemedCard>
        </TabsContent>

        {/* Requests Tab */}
        <TabsContent value="requests" className="space-y-4">
          <ThemedCard>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Service Requests</CardTitle>
                  <CardDescription>
                    Request payment reschedules and view request status
                  </CardDescription>
                </div>
                <ThemedButton
                  onClick={() => setShowRescheduleDialog(true)}
                  disabled={
                    loans.filter((l) => l.status === 'active' || l.status === 'disbursed')
                      .length === 0
                  }
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Request Reschedule
                </ThemedButton>
              </div>
            </CardHeader>
            <CardContent>
              {rescheduleRequests.length === 0 ? (
                <div className="text-center py-8">
                  <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">No Requests</h3>
                  <p className="text-sm text-muted-foreground">
                    Your service requests will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {rescheduleRequests.map((request) => (
                    <div key={request.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium">Payment Reschedule Request</h4>
                          <p className="text-sm text-muted-foreground">
                            From {new Date(request.original_due_date).toLocaleDateString('en-ZA')}{' '}
                            to {new Date(request.requested_date).toLocaleDateString('en-ZA')}
                          </p>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>
                      <p className="text-sm mb-2">{request.reason}</p>
                      {request.admin_notes && (
                        <div className="p-2 bg-muted rounded text-sm">
                          <strong>Admin Response:</strong> {request.admin_notes}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Submitted: {new Date(request.created_at).toLocaleDateString('en-ZA')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </ThemedCard>

          {/* Help Card */}
          <ThemedCard>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Need Help?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <p>
                  <strong>Payment Issues:</strong> If you're experiencing difficulties making a
                  payment, contact us immediately to discuss options.
                </p>
                <p>
                  <strong>Reschedule Requests:</strong> Submit your request at least 3 days before
                  the original due date. Requests are typically processed within 24-48 hours.
                </p>
                <p>
                  <strong>Contact Support:</strong> Email support@namlend.com or call +264 61 123
                  4567
                </p>
              </div>
            </CardContent>
          </ThemedCard>
        </TabsContent>
      </Tabs>

      {/* Reschedule Request Dialog */}
      <Dialog open={showRescheduleDialog} onOpenChange={setShowRescheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Payment Reschedule</DialogTitle>
            <DialogDescription>
              Submit a request to change your payment due date. Requests are reviewed within 24-48
              hours.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Loan</Label>
              <Select
                value={selectedLoan?.id || ''}
                onValueChange={(value) =>
                  setSelectedLoan(loans.find((l) => l.id === value) || null)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a loan..." />
                </SelectTrigger>
                <SelectContent>
                  {loans
                    .filter((l) => l.status === 'active' || l.status === 'disbursed')
                    .map((loan) => (
                      <SelectItem key={loan.id} value={loan.id}>
                        {formatNAD(loan.amount)} - {loan.purpose}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Original Due Date</Label>
              <Input
                type="date"
                value={originalDueDate}
                onChange={(e) => setOriginalDueDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Requested New Date</Label>
              <Input
                type="date"
                value={requestedDate}
                onChange={(e) => setRequestedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="space-y-2">
              <Label>Reason for Request</Label>
              <Textarea
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                placeholder="Please explain why you need to reschedule this payment..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <ThemedButton variant="outline" onClick={() => setShowRescheduleDialog(false)}>
              Cancel
            </ThemedButton>
            <ThemedButton
              onClick={handleRescheduleSubmit}
              disabled={
                submitting ||
                !selectedLoan ||
                !originalDueDate ||
                !requestedDate ||
                !rescheduleReason
              }
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit Request
            </ThemedButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SelfServicePortal;
