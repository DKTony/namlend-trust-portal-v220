import React, { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getUserApprovalRequests } from '@/services/approvalWorkflow';
import { useTheme } from '@/context/ThemeContext';
import { useKYCEligibility } from '@/hooks/useKYCEligibility';
import { useTranslation } from 'react-i18next';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Wallet,
  CheckCircle,
  AlertCircle,
  FileText,
  CreditCard,
  Plus,
  Loader2,
  Shield,
  ChevronRight,
  Menu,
  ArrowUpRight,
  X,
} from 'lucide-react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import StatCard from '@/components/shared/StatCard';
import { formatNAD } from '@/utils/currency';
import { useIsMobile } from '@/hooks/use-mobile';
import PaymentModal from '@/components/modals/PaymentModal';
import { LoanStatusTimeline, generateLoanTimeline } from '@/components/workflow/LoanStatusTimeline';
import { SelfServicePortal } from '@/components/dashboards/SelfServicePortal';
import ClientProfileDashboard from '@/components/ClientProfileDashboard';
import { BankingSection } from '@/components/BankingSection';
import { NotificationCenter } from '@/components/shared/NotificationCenter';
import { HeroCard } from '@/components/ui/HeroCard';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { ThemedButton } from '@/components/ui/ThemedButton';
import { ThemedBadge } from '@/components/ui/ThemedBadge';
import { cn } from '@/lib/utils';

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  id_number: string;
  employment_status: string;
  monthly_income: number;
  verified: boolean;
}

interface LoanApplication {
  id: string;
  amount: number;
  purpose: string;
  status: string;
  submittedAt: string;
  termMonths: number;
  interestRate: number;
  monthlyPayment: number;
  priority: string;
  created_at: string;
  request_data?: any;
}

export default function Dashboard() {
  const { user, loading: authLoading, userRole } = useAuth();
  const { styles, theme } = useTheme();
  const navigate = useNavigate();
  const { handleAsyncOperation, trackAction } = useErrorHandler();
  const isMobile = useIsMobile();
  const { t } = useTranslation('dashboard');

  // Data State
  const [profile, setProfile] = useState<any>(null);
  const [loans, setLoans] = useState<any[]>([]);
  const [loanApplications, setLoanApplications] = useState<LoanApplication[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  // UI State
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // KYC eligibility for status indicator
  const {
    eligibility,
    isEligible,
    verificationProgress,
    loading: eligibilityLoading,
  } = useKYCEligibility();

  // Mock Chart Data (replace with real aggregation if available)
  const chartData = [
    { name: 'Jan', amount: 2400 },
    { name: 'Feb', amount: 1398 },
    { name: 'Mar', amount: 9800 },
    { name: 'Apr', amount: 3908 },
    { name: 'May', amount: 4800 },
    { name: 'Jun', amount: 3800 },
    { name: 'Jul', amount: 4300 },
  ];

  useEffect(() => {
    if (user) {
      trackAction('dashboard_load', { userId: user.id });
      fetchDashboardData();
    }
  }, [user, trackAction]);

  const fetchDashboardData = async () => {
    await handleAsyncOperation(
      async () => {
        setLoading(true);

        // Run all queries in parallel for better performance
        const [profileResult, loansResult, applicationsResult, paymentsResult] = await Promise.all([
          // Fetch user profile
          supabase.from('profiles').select('*').eq('user_id', user?.id).single(),

          // Fetch user's loans with balance info
          supabase
            .from('loans')
            .select('*')
            .eq('user_id', user?.id)
            .order('created_at', { ascending: false }),

          // Fetch user's loan applications
          getUserApprovalRequests('pending'),

          // Fetch user's payments (limit to recent 50 for performance)
          supabase
            .from('payments')
            .select(`*, loans!inner(user_id)`)
            .eq('loans.user_id', user?.id)
            .order('created_at', { ascending: false })
            .limit(50),
        ]);

        // Process profile
        if (profileResult.error)
          throw new Error(`Profile fetch failed: ${profileResult.error.message}`);
        setProfile(profileResult.data);

        // Process loans
        if (loansResult.error) throw new Error(`Loans fetch failed: ${loansResult.error.message}`);
        setLoans(loansResult.data || []);

        // Process applications
        if (applicationsResult.requests) {
          const loanApps = applicationsResult.requests
            .filter((req) => req.request_type === 'loan_application')
            .map((req) => {
              const data = (req.request_data as any) || {};
              return {
                id: req.id,
                amount: Number(data.amount || 0),
                purpose: String(data.purpose || 'Not specified'),
                status: req.status || 'pending',
                submittedAt: req.created_at || new Date().toISOString(),
                termMonths: Number(data.term_months || data.term || 0),
                interestRate: Number(data.interest_rate || 0),
                monthlyPayment: Number(data.monthly_payment || 0),
                priority: req.priority || 'normal',
                created_at: req.created_at,
                request_data: req.request_data,
              };
            });
          setLoanApplications(loanApps);
        }

        // Process payments
        if (paymentsResult.error)
          throw new Error(`Payments fetch failed: ${paymentsResult.error.message}`);
        setPayments(paymentsResult.data || []);
      },
      'fetch_dashboard_data',
      { showErrorToast: true, retries: 2 }
    ).finally(() => setLoading(false));
  };

  if (authLoading || loading) {
    return (
      <div className={cn('min-h-screen flex items-center justify-center', styles.background)}>
        <Loader2 className={cn('h-8 w-8 animate-spin', styles.textClass)} />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const activeLoan = loans.find((loan) => loan.status === 'active' || loan.status === 'disbursed');
  const pendingLoan = loanApplications.find((app) => app.status === 'pending');

  const handleTabChange = (tab: string) => {
    // Handle sidebar menu items that map to different tab names
    if (tab === 'dashboard') {
      setActiveTab('overview');
      return;
    }

    // Handle sidebar items that route to external pages
    if (tab === 'budget') {
      navigate('/budget');
      return;
    }
    if (tab === 'documents') {
      navigate('/kyc');
      return;
    }

    // Handle internal tabs (self-service, profile, loans, payments, etc.)
    setActiveTab(tab);
  };

  // Render Content based on Active Tab
  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
              <div>
                <h2
                  className={cn(
                    'text-3xl md:text-4xl font-extrabold tracking-tight',
                    styles.textClass
                  )}
                >
                  {t('greeting', { name: profile?.first_name || 'Client' })}
                </h2>
                <p className="text-muted-foreground mt-2 text-base md:text-lg">{t('subtitle')}</p>
              </div>
              <ThemedButton
                onClick={() => navigate('/loan-application')}
                variant="primary"
                className="w-full md:w-auto rounded-full shadow-lg shadow-primary/20"
              >
                <Plus size={20} /> <span className="md:inline">{t('newApplication')}</span>
              </ThemedButton>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              <StatCard
                label={t('stats.totalBalance')}
                value={activeLoan ? formatNAD(activeLoan.amount) : 'N$0.00'}
                icon={Wallet}
                color="black"
              />
              <StatCard
                label={t('stats.creditScore')}
                value={720} // Mocked for now as per snippet
                subValue={t('stats.excellent')}
                icon={TrendingUp}
                color="green"
              />
              <StatCard
                label={t('stats.nextPayment')}
                value={
                  activeLoan
                    ? new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : '--'
                }
                subValue={activeLoan ? formatNAD(activeLoan.monthly_payment) : ''}
                icon={Calendar}
                color="blue"
              />
            </div>

            {/* KYC Verification Status Card */}
            {!eligibilityLoading && !isEligible && (
              <ThemedCard className="border-yellow-500/20 bg-gradient-to-r from-yellow-500/5 to-transparent">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                      <Shield className="h-6 w-6 text-yellow-500" />
                    </div>
                    <div>
                      <h3 className={cn('font-bold', styles.textClass)}>
                        {t('kyc.completeVerification')}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {eligibility
                          ? t('kyc.docsVerified', {
                              verified: eligibility.verified_docs,
                              required: eligibility.required_docs,
                            })
                          : t('kyc.uploadDocuments')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 w-full md:w-auto">
                    {eligibility && (
                      <div className="flex-1 md:w-32">
                        <Progress value={verificationProgress} className="h-2 bg-muted" />
                        <p className="text-xs text-muted-foreground mt-1 text-center">
                          {verificationProgress}%
                        </p>
                      </div>
                    )}
                    <ThemedButton
                      onClick={() => navigate('/kyc')}
                      variant="secondary"
                      className="whitespace-nowrap"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      {t('kyc.uploadButton')}
                    </ThemedButton>
                  </div>
                </div>
              </ThemedCard>
            )}

            {/* KYC Verified Success Badge */}
            {!eligibilityLoading && isEligible && (
              <ThemedCard className="border-green-500/20 bg-gradient-to-r from-green-500/5 to-transparent">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <h3 className={cn('font-medium', styles.textClass)}>
                        {t('kyc.verificationComplete')}
                      </h3>
                      <p className="text-sm text-muted-foreground">{t('kyc.readyToApply')}</p>
                    </div>
                  </div>
                  <ThemedBadge className="bg-green-500/10 text-green-500 border-green-500/20">
                    {t('kyc.verified')}
                  </ThemedBadge>
                </div>
              </ThemedCard>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Chart Section */}
              <div className="lg:col-span-2">
                <ThemedCard className="h-full">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-2">
                    <h3 className={cn('text-xl font-bold', styles.textClass)}>
                      {t('chart.title')}
                    </h3>
                    <select className="bg-muted border-none text-sm font-medium text-muted-foreground rounded-lg px-3 py-1 cursor-pointer hover:text-foreground">
                      <option>{t('chart.last6Months')}</option>
                      <option>{t('chart.thisYear')}</option>
                    </select>
                  </div>
                  <div className="h-64 md:h-72 flex items-end justify-between gap-2 px-4 pb-4 pt-8 bg-gradient-to-b from-transparent to-primary/5 rounded-xl border-b border-l border-border/50">
                    {/* CSS-only Mock Chart */}
                    {chartData.map((item, index) => (
                      <div
                        key={index}
                        className="flex flex-col items-center gap-2 w-full group cursor-pointer"
                      >
                        <div className="relative w-full flex items-end justify-center h-48">
                          <div
                            className="w-full max-w-[40px] bg-primary/20 rounded-t-lg transition-all duration-300 group-hover:bg-primary/40 relative overflow-hidden"
                            style={{ height: `${(item.amount / 10000) * 100}%` }}
                          >
                            <div className="absolute bottom-0 left-0 w-full h-full bg-gradient-to-t from-primary/30 to-transparent" />
                          </div>
                          <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold bg-foreground text-background px-2 py-1 rounded">
                            {formatNAD(item.amount)}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">
                          {item.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </ThemedCard>
              </div>

              {/* Side Action Panel */}
              <div className="space-y-6">
                <div
                  className={cn(
                    'p-8 relative overflow-hidden',
                    styles.cardClass,
                    styles.radius,
                    'bg-primary text-primary-foreground border-none'
                  )}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white blur-[80px] rounded-full opacity-20"></div>
                  <div className="relative z-10">
                    <h3 className="text-lg font-bold mb-2">{t('needFunds.title')}</h3>
                    <p className="text-primary-foreground/80 text-sm mb-6 leading-relaxed">
                      {t('needFunds.description')}
                    </p>

                    {pendingLoan ? (
                      <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold uppercase text-white/70 tracking-wider">
                            {t('needFunds.processing')}
                          </span>
                          <span
                            className="text-white font-bold truncate tabular-nums max-w-[120px] text-right"
                            title={formatNAD(pendingLoan.amount)}
                          >
                            {formatNAD(pendingLoan.amount)}
                          </span>
                        </div>
                        <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-white h-full w-2/3 animate-pulse"></div>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => navigate('/loan-application')}
                        className="w-full bg-background text-primary py-3 rounded-xl font-bold text-sm hover:bg-muted transition-colors flex justify-center items-center gap-2"
                      >
                        {t('needFunds.applyNow')} <ArrowUpRight size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <ThemedCard>
                  <h3 className={cn('text-lg font-bold mb-4', styles.textClass)}>
                    {t('quickActions.title')}
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setShowPaymentModal(true)}
                      disabled={!activeLoan}
                      className="p-4 rounded-2xl bg-muted hover:bg-muted/80 transition-colors text-center disabled:opacity-50 flex flex-col items-center justify-center gap-2"
                    >
                      <Wallet className="text-muted-foreground" size={24} />
                      <span className="text-xs font-medium text-foreground">
                        {t('quickActions.makePayment')}
                      </span>
                    </button>
                    <button
                      onClick={() => navigate('/kyc')}
                      className="p-4 rounded-2xl bg-muted hover:bg-muted/80 transition-colors text-center flex flex-col items-center justify-center gap-2"
                    >
                      <FileText className="text-muted-foreground" size={24} />
                      <span className="text-xs font-medium text-foreground">
                        {t('quickActions.documents')}
                      </span>
                    </button>
                  </div>
                </ThemedCard>
              </div>
            </div>
          </div>
        );

      case 'loans':
        return (
          <div className="space-y-6">
            <h2 className={cn('text-2xl font-bold', styles.textClass)}>{t('loans.title')}</h2>
            {loans.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {loans.map((loan) => {
                  const isSettled = loan.status === 'settled';
                  const isActive = ['active', 'disbursed', 'funded'].includes(loan.status);
                  const progressPercent =
                    loan.total_paid && loan.total_repayment
                      ? Math.round((loan.total_paid / loan.total_repayment) * 100)
                      : 0;

                  return (
                    <ThemedCard
                      key={loan.id}
                      className={cn(
                        isSettled
                          ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                          : ''
                      )}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className={cn('text-xl font-bold', styles.textClass)}>
                            {formatNAD(loan.amount)}
                          </h3>
                          <p className="text-sm text-muted-foreground">{loan.purpose}</p>
                        </div>
                        <ThemedBadge
                          className={isSettled ? 'bg-green-600 dark:bg-green-500 text-white' : ''}
                        >
                          {isSettled ? `✓ ${t('loans.settled')}` : loan.status}
                        </ThemedBadge>
                      </div>

                      <div className="space-y-4">
                        {/* Progress Bar for Active Loans */}
                        {(isActive || isSettled) && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">
                                {t('loans.paymentProgress')}
                              </span>
                              <span className="font-medium text-foreground">
                                {progressPercent}%
                              </span>
                            </div>
                            <Progress
                              value={progressPercent}
                              className={`h-2 ${isSettled ? '[&>div]:bg-green-600 dark:[&>div]:bg-green-500' : ''}`}
                            />
                            {!isSettled && loan.outstanding_balance > 0 && (
                              <p className="text-xs text-muted-foreground">
                                {t('loans.outstanding')}{' '}
                                <span className="font-semibold text-foreground">
                                  {formatNAD(loan.outstanding_balance)}
                                </span>
                              </p>
                            )}
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                          <div>
                            <p className="text-muted-foreground text-xs">{t('loans.term')}</p>
                            <p className="font-medium text-foreground">
                              {t('loans.termValue', { months: loan.term_months })}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">{t('loans.rate')}</p>
                            <p className="font-medium text-foreground">
                              {t('loans.rateValue', { rate: loan.interest_rate })}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">{t('loans.monthly')}</p>
                            <p className="font-medium text-foreground">
                              {formatNAD(loan.monthly_payment)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">
                              {isSettled ? t('loans.totalPaid') : t('loans.totalDue')}
                            </p>
                            <p className="font-medium text-foreground">
                              {formatNAD(isSettled ? loan.total_paid : loan.total_repayment)}
                            </p>
                          </div>
                        </div>

                        {/* Action Button for Active Loans */}
                        {isActive && (
                          <ThemedButton
                            className="w-full mt-2"
                            variant="secondary"
                            onClick={() => setShowPaymentModal(true)}
                          >
                            <DollarSign className="h-4 w-4 mr-2" />
                            {t('loans.makePayment')}
                          </ThemedButton>
                        )}

                        {isSettled && loan.settled_at && (
                          <p className="text-xs text-green-600 dark:text-green-400 text-center">
                            {t('loans.settledOn', {
                              date: new Date(loan.settled_at).toLocaleDateString('en-ZA', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              }),
                            })}
                          </p>
                        )}
                      </div>
                    </ThemedCard>
                  );
                })}
              </div>
            ) : (
              <ThemedCard className="text-center py-12">
                <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className={cn('text-lg font-semibold', styles.textClass)}>
                  {t('loans.noLoansTitle')}
                </h3>
                <p className="text-muted-foreground mb-4">{t('loans.noLoansDescription')}</p>
                <ThemedButton onClick={() => navigate('/loan-application')}>
                  {t('loans.applyForLoan')}
                </ThemedButton>
              </ThemedCard>
            )}
          </div>
        );

      case 'applications':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className={cn('text-2xl font-bold', styles.textClass)}>
                {t('applications.title')}
              </h2>
              <ThemedButton
                onClick={() => navigate('/loan-application')}
                variant="secondary"
                className="rounded-full"
              >
                <Plus size={16} className="mr-2" /> {t('applications.newApplication')}
              </ThemedButton>
            </div>

            <div className="space-y-4">
              {loanApplications.map((application) => (
                <ThemedCard key={application.id}>
                  <div className="flex flex-col md:flex-row justify-between md:items-start gap-4 mb-6">
                    <div>
                      <h3 className={cn('text-lg font-bold', styles.textClass)}>
                        {formatNAD(application.amount)}
                      </h3>
                      <p className="text-sm text-muted-foreground">{application.purpose}</p>
                    </div>
                    <ThemedBadge className="w-fit">{application.status}</ThemedBadge>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border">
                    <LoanStatusTimeline
                      steps={generateLoanTimeline(
                        application.status,
                        application.submittedAt,
                        application.status === 'under_review'
                          ? new Date().toISOString()
                          : undefined,
                        application.status === 'approved' ? new Date().toISOString() : undefined
                      )}
                      orientation="horizontal"
                    />
                  </div>
                </ThemedCard>
              ))}

              {loanApplications.length === 0 && (
                <ThemedCard className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className={cn('text-lg font-semibold', styles.textClass)}>
                    {t('applications.noPendingTitle')}
                  </h3>
                  <ThemedButton
                    onClick={() => navigate('/loan-application')}
                    className="mt-4 rounded-full"
                  >
                    {t('applications.startApplication')}
                  </ThemedButton>
                </ThemedCard>
              )}
            </div>
          </div>
        );

      case 'payments':
        return (
          <div className="space-y-6">
            <h2 className={cn('text-2xl font-bold', styles.textClass)}>{t('payments.title')}</h2>
            <ThemedCard className="overflow-hidden p-0">
              {payments.length > 0 ? (
                <div className="divide-y divide-border">
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="p-4 flex justify-between items-center hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center text-green-600 dark:text-green-400">
                          <DollarSign size={20} />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">
                            {formatNAD(payment.amount)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(payment.paid_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <ThemedBadge className="border-border text-muted-foreground bg-transparent">
                        {payment.status}
                      </ThemedBadge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center text-muted-foreground">
                  {t('payments.noPayments')}
                </div>
              )}
            </ThemedCard>
          </div>
        );

      case 'banking':
        return <BankingSection />;

      case 'self-service':
        return <SelfServicePortal />;

      case 'profile':
        return <ClientProfileDashboard />;

      default:
        return null;
    }
  };

  return (
    <DashboardLayout
      activeTab={activeTab}
      onTabChange={handleTabChange}
      variant="client"
      userName={
        profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}` : undefined
      }
    >
      {!isMobile && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="hidden xl:block absolute top-20 right-10 2xl:right-20 opacity-50 2xl:opacity-60 scale-75 2xl:scale-100 z-0 animate-float">
            <HeroCard />
          </div>
        </div>
      )}

      <div className="relative z-10">{renderContent()}</div>

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        userId={user?.id || ''}
        onPaymentSuccess={fetchDashboardData}
      />
    </DashboardLayout>
  );
}
