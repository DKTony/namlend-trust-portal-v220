/**
 * Loan Details Page
 *
 * Displays detailed information about a specific loan with IPS payment option
 */

import DashboardLayout from '@/components/Layout/DashboardLayout';
import { LoanDocumentsPanel } from '@/components/documents/LoanDocumentsPanel';
import { IPSHistoryList, IPSPaymentModal } from '@/components/ips';
import { ThemedBadge } from '@/components/ui/ThemedBadge';
import { ThemedButton } from '@/components/ui/ThemedButton';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTheme } from '@/context/ThemeContext';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/integrations/convex/api';
import { cn } from '@/lib/utils';
import type { Id } from '@/types/convex';
import { formatNAD } from '@/utils/currency';
import { useQuery } from 'convex/react';
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  CreditCard,
  DollarSign,
  FileText,
  History,
  Loader2,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

interface Loan {
  id: string;
  user_id: string;
  amount: number;
  purpose: string;
  term_months: number;
  interest_rate: number;
  monthly_payment: number;
  total_repayment: number;
  total_paid: number;
  outstanding_balance: number;
  status: string;
  created_at: string;
  disbursed_at: string | null;
  settled_at: string | null;
}

interface Payment {
  id: string;
  amount: number;
  payment_method: string;
  status: string;
  paid_at: string;
  reference_number: string;
}

// Guards against empty strings and malformed timestamps rendering "Invalid Date"
function formatDateSafe(
  iso: string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!iso) return 'N/A';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString('en-ZA', options);
}

export default function LoanDetails() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { styles } = useTheme();

  // Validate ID format before passing to Convex (prevents ArgumentValidationError on invalid URLs)
  const isValidConvexId = id ? /^[a-zA-Z0-9_-]{10,}$/.test(id) : false;

  // Convex reactive queries — skip if ID is missing or malformed
  const rawLoan = useQuery(
    api.loans.getLoan,
    isValidConvexId ? { loanId: id as Id<'loans'> } : 'skip'
  );
  const rawPayments = useQuery(
    api.payments.getPaymentsByLoan,
    isValidConvexId ? { loanId: id as Id<'loans'> } : 'skip'
  );

  // Map Convex loan document to Loan shape
  const loan: Loan | null = rawLoan
    ? {
        id: rawLoan._id,
        user_id: rawLoan.userId,
        amount: rawLoan.principal ?? rawLoan.amount ?? 0,
        purpose: rawLoan.purpose ?? '',
        term_months: rawLoan.termMonths ?? 0,
        interest_rate: rawLoan.interestRate ?? 0,
        monthly_payment: rawLoan.monthlyPayment ?? 0,
        total_repayment: rawLoan.totalRepayment ?? rawLoan.principal ?? 0,
        total_paid: rawLoan.totalPaid ?? 0,
        outstanding_balance: rawLoan.outstandingBalance ?? rawLoan.principal ?? 0,
        status: rawLoan.status,
        created_at: rawLoan.createdAt ? new Date(rawLoan.createdAt).toISOString() : '',
        disbursed_at: rawLoan.disbursedAt ? new Date(rawLoan.disbursedAt).toISOString() : null,
        settled_at: rawLoan.completedAt ? new Date(rawLoan.completedAt).toISOString() : null,
      }
    : null;

  // Map Convex payment documents to Payment shape
  const payments: Payment[] = (rawPayments ?? []).map((p: any) => ({
    id: p._id,
    amount: p.amount ?? 0,
    payment_method: p.method ?? '',
    status: p.status ?? 'pending',
    paid_at: p.paymentDate
      ? new Date(p.paymentDate).toISOString()
      : p.createdAt
        ? new Date(p.createdAt).toISOString()
        : '',
    reference_number: p.referenceNumber ?? '',
  }));

  const loading = isValidConvexId && rawLoan === undefined;
  const [showIPSModal, setShowIPSModal] = useState(false);
  const [activeTab] = useState('loans');

  const handleTabChange = (tab: string) => {
    if (tab === 'loans') {
      navigate('/dashboard', { state: { tab: 'loans' } });
      return;
    }
    if (tab === 'budget') {
      navigate('/budget');
      return;
    }
    if (tab === 'documents') {
      navigate('/kyc');
      return;
    }
    navigate('/dashboard', { state: { tab } });
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout activeTab={activeTab} onTabChange={handleTabChange} title="Loan Details">
        <div className="flex items-center justify-center py-16">
          <Loader2 className={cn('h-8 w-8 animate-spin', styles.textClass)} />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!loan) {
    return (
      <DashboardLayout activeTab={activeTab} onTabChange={handleTabChange} title="Loan Details">
        <div className="max-w-4xl">
          <ThemedCard>
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className={cn('text-lg font-medium mb-2', styles.textClass)}>Loan Not Found</h3>
              <p className="text-muted-foreground text-center mb-4">
                The loan you're looking for doesn't exist or you don't have access to it.
              </p>
              <ThemedButton onClick={() => navigate('/dashboard')}>
                Return to Dashboard
              </ThemedButton>
            </div>
          </ThemedCard>
        </div>
      </DashboardLayout>
    );
  }

  const isActive = ['active', 'disbursed', 'funded'].includes(loan.status);
  const isSettled = loan.status === 'paid_off';
  const rawProgress =
    loan.total_paid && loan.total_repayment
      ? Math.round((loan.total_paid / loan.total_repayment) * 100)
      : 0;
  const progressPercent = Number.isFinite(rawProgress)
    ? Math.min(100, Math.max(0, rawProgress))
    : 0;
  const outstandingBalance = Math.max(
    0,
    loan.outstanding_balance || loan.total_repayment - (loan.total_paid || 0)
  );

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={handleTabChange} title="Loan Details">
      <div className="max-w-4xl">
        <div className="mb-6">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <h1 className={cn('text-3xl font-bold', styles.textClass)} data-testid="loan-amount">
                {formatNAD(loan.amount)}
              </h1>
              <p className="text-muted-foreground">{loan.purpose}</p>
            </div>
            <ThemedBadge
              variant="default" // ThemedBadge handles variants differently, let's use className for specific colors if needed
              className={cn(
                'text-sm px-3 py-1',
                isSettled ? 'bg-green-600 hover:bg-green-700' : 'bg-primary hover:bg-primary/90'
              )}
              data-testid="loan-status"
            >
              {isSettled ? '✓ Settled' : loan.status}
            </ThemedBadge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Progress Card */}
            <ThemedCard data-testid="loan-progress-card">
              <div className="mb-4">
                <h3 className={cn('text-lg font-bold', styles.textClass)}>Payment Progress</h3>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {formatNAD(loan.total_paid || 0)} paid
                    </span>
                    <span className={cn('font-medium', styles.textClass)}>{progressPercent}%</span>
                  </div>
                  <Progress
                    value={progressPercent}
                    className={`h-3 ${isSettled ? '[&>div]:bg-green-600' : ''}`}
                    data-testid="payment-progress"
                  />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Outstanding</span>
                    <span
                      className={cn('font-semibold', styles.textClass)}
                      data-testid="outstanding-balance"
                    >
                      {formatNAD(outstandingBalance)}
                    </span>
                  </div>
                </div>

                {isSettled && loan.settled_at && (
                  <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                    <CheckCircle className="h-5 w-5" />
                    <span className="text-sm font-medium">
                      Settled on{' '}
                      {formatDateSafe(loan.settled_at, {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                )}
              </div>
            </ThemedCard>

            {/* Loan Details */}
            <ThemedCard data-testid="loan-details-card">
              <div className="mb-4">
                <h3 className={cn('text-lg font-bold', styles.textClass)}>Loan Details</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Term</p>
                  <p className={cn('font-medium', styles.textClass)}>{loan.term_months} months</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Interest Rate</p>
                  <p className={cn('font-medium', styles.textClass)}>{loan.interest_rate}%</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Monthly Payment</p>
                  <p className={cn('font-medium', styles.textClass)} data-testid="monthly-payment">
                    {formatNAD(loan.monthly_payment)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Repayment</p>
                  <p className={cn('font-medium', styles.textClass)}>
                    {formatNAD(loan.total_repayment)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Disbursed</p>
                  <p className={cn('font-medium', styles.textClass)}>
                    {loan.disbursed_at ? formatDateSafe(loan.disbursed_at) : 'Pending'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className={cn('font-medium', styles.textClass)}>
                    {formatDateSafe(loan.created_at)}
                  </p>
                </div>
              </div>
            </ThemedCard>

            {/* Tabs for History */}
            <Tabs defaultValue="payments" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1">
                <TabsTrigger value="payments" className="data-[state=active]:bg-background">
                  <History className="h-4 w-4 mr-2" />
                  Payments
                </TabsTrigger>
                <TabsTrigger
                  value="ips"
                  className="data-[state=active]:bg-background"
                  data-testid="ips-history-tab"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  IPS
                </TabsTrigger>
                <TabsTrigger
                  value="documents"
                  className="data-[state=active]:bg-background"
                  data-testid="loan-documents-tab"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Documents
                </TabsTrigger>
              </TabsList>

              <TabsContent value="payments">
                <ThemedCard className="mt-4">
                  <div className="pt-2">
                    {payments.length > 0 ? (
                      <div className="space-y-3" data-testid="payments-list">
                        {payments.map((payment) => (
                          <div
                            key={payment.id}
                            className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                                <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                              </div>
                              <div>
                                <p className={cn('font-medium', styles.textClass)}>
                                  {formatNAD(payment.amount)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {payment.paid_at ? formatDateSafe(payment.paid_at) : 'Pending'}
                                </p>
                              </div>
                            </div>
                            <ThemedBadge variant="secondary">{payment.status}</ThemedBadge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No payments yet</p>
                      </div>
                    )}
                  </div>
                </ThemedCard>
              </TabsContent>

              <TabsContent value="ips">
                <ThemedCard className="mt-4">
                  <div className="pt-2" data-testid="ips-history">
                    <IPSHistoryList loanId={loan.id} />
                  </div>
                </ThemedCard>
              </TabsContent>

              <TabsContent value="documents">
                <ThemedCard className="mt-4">
                  <LoanDocumentsPanel
                    loanId={loan.id}
                    allowUpload={['draft', 'submitted', 'under_review'].includes(loan.status)}
                  />
                </ThemedCard>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            {isActive && outstandingBalance > 0 && (
              <ThemedCard data-testid="quick-actions-card">
                <div className="mb-4">
                  <h3 className={cn('text-lg font-bold', styles.textClass)}>Make a Payment</h3>
                  <p className="text-sm text-muted-foreground">Pay your loan instantly</p>
                </div>
                <div className="space-y-3">
                  {/* IPS Payment Button */}
                  <ThemedButton
                    className="w-full gap-2"
                    onClick={() => setShowIPSModal(true)}
                    data-testid="ips-payment-button"
                  >
                    <Zap className="h-4 w-4" />
                    Pay with IPS
                  </ThemedButton>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">or</span>
                    </div>
                  </div>

                  <ThemedButton
                    variant="secondary"
                    className="w-full gap-2"
                    onClick={() => navigate('/payment')}
                    data-testid="other-payment-button"
                  >
                    <CreditCard className="h-4 w-4" />
                    Other Payment Methods
                  </ThemedButton>
                </div>
              </ThemedCard>
            )}

            {/* Payment Summary */}
            <ThemedCard>
              <div className="mb-4">
                <h3 className={cn('text-lg font-bold', styles.textClass)}>Summary</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Principal</span>
                  <span className={cn('font-medium', styles.textClass)}>
                    {formatNAD(loan.amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Interest</span>
                  <span className={cn('font-medium', styles.textClass)}>
                    {formatNAD(loan.total_repayment - loan.amount)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Due</span>
                  <span className={cn('font-semibold', styles.textClass)}>
                    {formatNAD(loan.total_repayment)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Paid</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {formatNAD(loan.total_paid || 0)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className={cn('font-medium', styles.textClass)}>Outstanding</span>
                  <span className={cn('font-bold text-lg', styles.textClass)}>
                    {formatNAD(outstandingBalance)}
                  </span>
                </div>
              </div>
            </ThemedCard>

            {/* Next Payment Info */}
            {isActive && (
              <ThemedCard>
                <div className="mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <h3 className={cn('text-lg font-bold', styles.textClass)}>Next Payment</h3>
                </div>
                <div className="text-center py-2">
                  <p className={cn('text-2xl font-bold', styles.textClass)}>
                    {formatNAD(loan.monthly_payment)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Due monthly</p>
                </div>
              </ThemedCard>
            )}
          </div>
        </div>

        {/* IPS Payment Modal */}
        <IPSPaymentModal
          isOpen={showIPSModal}
          onClose={() => setShowIPSModal(false)}
          loanId={loan.id}
          outstandingBalance={outstandingBalance}
          monthlyPayment={loan.monthly_payment}
          onSuccess={() => {
            setShowIPSModal(false);
            // Convex reactive query auto-updates — no manual refetch needed
            toast({
              title: 'Payment Successful',
              description: 'Your IPS payment has been processed.',
            });
          }}
          onError={(error) => {
            toast({
              title: 'Payment Failed',
              description: error,
              variant: 'destructive',
            });
          }}
        />
      </div>
    </DashboardLayout>
  );
}
