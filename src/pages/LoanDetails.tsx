/**
 * Loan Details Page
 * 
 * Displays detailed information about a specific loan with IPS payment option
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { ThemedButton } from '@/components/ui/ThemedButton';
import { ThemedBadge } from '@/components/ui/ThemedBadge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Wallet,
  Zap,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  CreditCard,
  History,
  FileText,
} from 'lucide-react';
import Header from '@/components/Header';
import { formatNAD } from '@/utils/currency';
import { IPSPaymentModal, IPSHistoryList } from '@/components/ips';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

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

export default function LoanDetails() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { styles } = useTheme();
  
  const [loan, setLoan] = useState<Loan | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIPSModal, setShowIPSModal] = useState(false);

  useEffect(() => {
    if (user && id) {
      fetchLoanDetails();
    }
  }, [user, id]);

  const fetchLoanDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch loan
      let loanQuery = supabase
        .from('loans')
        .select('*');
        
      if (id) {
        loanQuery = loanQuery.eq('id', id);
      }
      
      if (user?.id) {
        loanQuery = loanQuery.eq('user_id', user.id);
      }

      const { data: loanData, error: loanError } = await loanQuery.single();

      if (loanError) throw loanError;
      setLoan(loanData);

      // Fetch payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('loan_id', id)
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;
      setPayments(paymentsData || []);
    } catch (error) {
      console.error('Error fetching loan details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load loan details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className={cn("min-h-screen flex items-center justify-center", styles.background)}>
        <Loader2 className={cn("h-8 w-8 animate-spin", styles.textClass)} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!loan) {
    return (
      <div className={cn("min-h-screen", styles.background)}>
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <ThemedButton variant="ghost" onClick={() => navigate('/dashboard')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </ThemedButton>
          <ThemedCard>
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className={cn("text-lg font-medium mb-2", styles.textClass)}>Loan Not Found</h3>
              <p className="text-muted-foreground text-center mb-4">
                The loan you're looking for doesn't exist or you don't have access to it.
              </p>
              <ThemedButton onClick={() => navigate('/dashboard')}>Return to Dashboard</ThemedButton>
            </div>
          </ThemedCard>
        </main>
      </div>
    );
  }

  const isActive = ['active', 'disbursed'].includes(loan.status);
  const isSettled = loan.status === 'settled';
  const progressPercent = loan.total_paid && loan.total_repayment
    ? Math.round((loan.total_paid / loan.total_repayment) * 100)
    : 0;
  const outstandingBalance = loan.outstanding_balance || (loan.total_repayment - (loan.total_paid || 0));

  return (
    <div className={cn("min-h-screen", styles.background)}>
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <ThemedButton
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-4"
            data-testid="back-to-dashboard"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </ThemedButton>
          
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <h1 className={cn("text-3xl font-bold", styles.textClass)} data-testid="loan-amount">
                {formatNAD(loan.amount)}
              </h1>
              <p className="text-muted-foreground">{loan.purpose}</p>
            </div>
            <ThemedBadge
              variant="default" // ThemedBadge handles variants differently, let's use className for specific colors if needed
              className={cn(
                "text-sm px-3 py-1", 
                isSettled ? "bg-green-600 hover:bg-green-700" : "bg-primary hover:bg-primary/90"
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
                <h3 className={cn("text-lg font-bold", styles.textClass)}>Payment Progress</h3>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {formatNAD(loan.total_paid || 0)} paid
                    </span>
                    <span className={cn("font-medium", styles.textClass)}>{progressPercent}%</span>
                  </div>
                  <Progress
                    value={progressPercent}
                    className={`h-3 ${isSettled ? '[&>div]:bg-green-600' : ''}`}
                    data-testid="payment-progress"
                  />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Outstanding</span>
                    <span className={cn("font-semibold", styles.textClass)} data-testid="outstanding-balance">
                      {formatNAD(outstandingBalance)}
                    </span>
                  </div>
                </div>

                {isSettled && loan.settled_at && (
                  <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                    <CheckCircle className="h-5 w-5" />
                    <span className="text-sm font-medium">
                      Settled on {new Date(loan.settled_at).toLocaleDateString('en-ZA', {
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
                <h3 className={cn("text-lg font-bold", styles.textClass)}>Loan Details</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Term</p>
                  <p className={cn("font-medium", styles.textClass)}>{loan.term_months} months</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Interest Rate</p>
                  <p className={cn("font-medium", styles.textClass)}>{loan.interest_rate}%</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Monthly Payment</p>
                  <p className={cn("font-medium", styles.textClass)} data-testid="monthly-payment">
                    {formatNAD(loan.monthly_payment)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Repayment</p>
                  <p className={cn("font-medium", styles.textClass)}>{formatNAD(loan.total_repayment)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Disbursed</p>
                  <p className={cn("font-medium", styles.textClass)}>
                    {loan.disbursed_at
                      ? new Date(loan.disbursed_at).toLocaleDateString()
                      : 'Pending'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className={cn("font-medium", styles.textClass)}>
                    {new Date(loan.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </ThemedCard>

            {/* Tabs for History */}
            <Tabs defaultValue="payments" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1">
                <TabsTrigger value="payments" className="data-[state=active]:bg-background">
                  <History className="h-4 w-4 mr-2" />
                  Payments
                </TabsTrigger>
                <TabsTrigger value="ips" className="data-[state=active]:bg-background" data-testid="ips-history-tab">
                  <Zap className="h-4 w-4 mr-2" />
                  IPS Transactions
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
                                <p className={cn("font-medium", styles.textClass)}>{formatNAD(payment.amount)}</p>
                                <p className="text-xs text-muted-foreground">
                                  {payment.paid_at
                                    ? new Date(payment.paid_at).toLocaleDateString()
                                    : 'Pending'}
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
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            {isActive && outstandingBalance > 0 && (
              <ThemedCard data-testid="quick-actions-card">
                <div className="mb-4">
                  <h3 className={cn("text-lg font-bold", styles.textClass)}>Make a Payment</h3>
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
                <h3 className={cn("text-lg font-bold", styles.textClass)}>Summary</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Principal</span>
                  <span className={cn("font-medium", styles.textClass)}>{formatNAD(loan.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Interest</span>
                  <span className={cn("font-medium", styles.textClass)}>
                    {formatNAD(loan.total_repayment - loan.amount)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Due</span>
                  <span className={cn("font-semibold", styles.textClass)}>{formatNAD(loan.total_repayment)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Paid</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {formatNAD(loan.total_paid || 0)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className={cn("font-medium", styles.textClass)}>Outstanding</span>
                  <span className={cn("font-bold text-lg", styles.textClass)}>{formatNAD(outstandingBalance)}</span>
                </div>
              </div>
            </ThemedCard>

            {/* Next Payment Info */}
            {isActive && (
              <ThemedCard>
                <div className="mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <h3 className={cn("text-lg font-bold", styles.textClass)}>Next Payment</h3>
                </div>
                <div className="text-center py-2">
                  <p className={cn("text-2xl font-bold", styles.textClass)}>{formatNAD(loan.monthly_payment)}</p>
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
            fetchLoanDetails();
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
      </main>
    </div>
  );
}
