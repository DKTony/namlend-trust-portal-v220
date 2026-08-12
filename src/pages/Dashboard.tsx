import { BankingSection } from '@/components/BankingSection';
import ClientProfileDashboard from '@/components/ClientProfileDashboard';
import { SelfServicePortal } from '@/components/dashboards/SelfServicePortal';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import PaymentModal from '@/components/modals/PaymentModal';
import StatCard from '@/components/shared/StatCard';
import { HeroCard } from '@/components/ui/HeroCard';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ThemedBadge } from '@/components/ui/ThemedBadge';
import { ThemedButton } from '@/components/ui/ThemedButton';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { LoanStatusTimeline, generateLoanTimeline } from '@/components/workflow/LoanStatusTimeline';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/useAuth';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useKYCEligibility } from '@/hooks/useKYCEligibility';
import { api } from '@/integrations/convex/api';
import { cn } from '@/lib/utils';
import { formatNAD } from '@/utils/currency';
import { useQuery } from 'convex/react';
import {
  ArrowUpRight,
  Calendar,
  CheckCircle,
  CreditCard,
  DollarSign,
  FileText,
  Loader2,
  Plus,
  Shield,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

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
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { trackAction } = useErrorHandler();
  const isMobile = useIsMobile();
  const { t } = useTranslation('dashboard');

  // Convex reactive queries — no as any (N2)
  const profile = useQuery(api.users.getMyProfile);
  const rawLoans = useQuery(api.loans.getMyLoans, {});
  const portfolioSummary = useQuery(api.loans.getMyPortfolioSummary, {});
  const rawApprovals = useQuery(api.approvalWorkflow.getMyApprovalRequests, { status: 'pending' });
  const rawPayments = useQuery(api.payments.getMyPayments, { limit: 50 });

  const loans = rawLoans ?? [];
  const payments = useMemo(() => rawPayments ?? [], [rawPayments]);

  const activeLoan = loans.find((loan) => ['active', 'disbursed', 'funded'].includes(loan.status));

  // Map approval requests to LoanApplication shape — using Convex schema field names
  const loanApplications: LoanApplication[] = (rawApprovals ?? [])
    .filter((req) => req.requestType === 'loan_application')
    .map((req) => {
      const data = (req.metadata as Record<string, unknown>) ?? {};
      return {
        id: String(req._id),
        amount: Number(data.amount ?? 0),
        purpose: String(data.purpose ?? 'Not specified'),
        status: req.status,
        submittedAt: new Date(req.createdAt).toISOString(),
        termMonths: Number(data.term_months ?? data.term ?? 0),
        interestRate: Number(data.interest_rate ?? 0),
        monthlyPayment: Number(data.monthly_payment ?? 0),
        priority: req.priority ?? 'normal',
        created_at: new Date(req.createdAt).toISOString(),
        request_data: req.metadata,
      };
    });

  // UI State
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() => {
    const incoming = location.state?.tab;
    if (!incoming) return 'overview';
    return incoming === 'dashboard' ? 'overview' : incoming;
  });

  // Accept tab from cross-page navigation (e.g., from BudgetTracker)
  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab === 'dashboard' ? 'overview' : location.state.tab);
      // Clean up state to prevent re-triggering on refresh
      window.history.replaceState({}, '');
    }
  }, [location.state?.tab]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Data is loading if any query hasn't returned yet
  const loading = profile === undefined || rawLoans === undefined || portfolioSummary === undefined;

  // KYC eligibility for status indicator
  const {
    eligibility,
    isEligible,
    verificationProgress,
    loading: eligibilityLoading,
  } = useKYCEligibility();

  // Chart period, driven by the header Select (6 months vs this year)
  const [chartPeriod, setChartPeriod] = useState<'6months' | 'year'>('6months');

  // Monthly payment activity aggregated from real payment history
  const chartData = useMemo(() => {
    const now = new Date();
    const monthCount = chartPeriod === 'year' ? now.getMonth() + 1 : 7;
    const buckets = Array.from({ length: monthCount }, (_, i) => {
      const d =
        chartPeriod === 'year'
          ? new Date(now.getFullYear(), i, 1)
          : new Date(now.getFullYear(), now.getMonth() - (monthCount - 1 - i), 1);
      return {
        year: d.getFullYear(),
        month: d.getMonth(),
        name: d.toLocaleDateString('en-US', { month: 'short' }),
        amount: 0,
      };
    });
    for (const p of payments) {
      if (['failed', 'reversed', 'refunded'].includes(p.status)) continue;
      const ts = p.paymentDate ?? p.paidAt ?? p.createdAt;
      if (!ts) continue;
      const d = new Date(ts);
      const bucket = buckets.find((b) => b.year === d.getFullYear() && b.month === d.getMonth());
      if (bucket) bucket.amount += p.amount ?? 0;
    }
    return buckets;
  }, [payments, chartPeriod]);
  const maxChartAmount = Math.max(...chartData.map((b) => b.amount), 1);
  const hasChartData = chartData.some((b) => b.amount > 0);

  const nextPaymentDate = portfolioSummary?.nextInstallment
    ? new Date(portfolioSummary.nextInstallment.dueDate)
    : null;

  useEffect(() => {
    if (user) {
      trackAction('dashboard_load', { userId: user.id });
    }
  }, [user, trackAction]);

  // Convex useQuery stays undefined while the connection hangs — surface an
  // escape hatch instead of an indefinite spinner.
  const [loadTimedOut, setLoadTimedOut] = useState(false);
  useEffect(() => {
    if (!loading) {
      setLoadTimedOut(false);
      return;
    }
    const timer = setTimeout(() => setLoadTimedOut(true), 12000);
    return () => clearTimeout(timer);
  }, [loading]);

  if (authLoading || loading) {
    return (
      <div className={cn('min-h-screen flex items-center justify-center px-4', 'bg-[#F7FAF6]')}>
        {loadTimedOut ? (
          <div className="text-center space-y-4 max-w-sm">
            <p className={cn('font-medium', 'font-sans text-[#274F35]')}>
              This is taking longer than expected.
            </p>
            <p className="text-sm text-muted-foreground">
              Check your internet connection and try again.
            </p>
            <ThemedButton variant="primary" onClick={() => window.location.reload()}>
              Retry
            </ThemedButton>
          </div>
        ) : (
          <Loader2 className={cn('h-8 w-8 animate-spin', 'font-sans text-[#274F35]')} />
        )}
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

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
                    'font-sans text-[#274F35]'
                  )}
                >
                  {t('greeting', { name: profile?.fullName?.split(' ')[0] || 'Client' })}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              <StatCard
                label={t('stats.totalBalance')}
                value={formatNAD(portfolioSummary?.outstandingPrincipal ?? 0)}
                icon={Wallet}
                color="black"
              />
              <StatCard
                label={t('stats.creditScore')}
                value={(() => {
                  return portfolioSummary?.latestCreditScore ?? 'N/A';
                })()}
                subValue={(() => {
                  const score = portfolioSummary?.latestCreditScore;
                  if (!score) return '';
                  if (score >= 750) return 'Excellent';
                  if (score >= 670) return 'Good';
                  if (score >= 580) return 'Fair';
                  return 'Poor';
                })()}
                icon={TrendingUp}
                color="green"
              />
              <StatCard
                label={t('stats.nextPayment')}
                value={
                  nextPaymentDate
                    ? nextPaymentDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })
                    : '--'
                }
                subValue={
                  portfolioSummary?.nextInstallment
                    ? formatNAD(portfolioSummary.nextInstallment.amountDue)
                    : ''
                }
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
                      <h3 className={cn('font-bold', 'font-sans text-[#274F35]')}>
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
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <h3 className={cn('font-medium', 'font-sans text-[#274F35]')}>
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
                    <h3 className={cn('text-xl font-bold', 'font-sans text-[#274F35]')}>
                      {t('chart.title')}
                    </h3>
                    <Select
                      value={chartPeriod}
                      onValueChange={(v) => setChartPeriod(v as '6months' | 'year')}
                    >
                      <SelectTrigger className="w-auto h-8 text-sm font-medium bg-muted border-none text-muted-foreground hover:text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="6months">{t('chart.last6Months')}</SelectItem>
                        <SelectItem value="year">{t('chart.thisYear')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="h-48 sm:h-64 md:h-72 flex items-end justify-between gap-2 px-4 pb-4 pt-8 bg-gradient-to-b from-transparent to-primary/5 rounded-xl border-b border-l border-border/50">
                    {hasChartData ? (
                      chartData.map((item, index) => (
                        <div
                          key={index}
                          className="flex flex-col items-center gap-2 w-full group cursor-pointer"
                        >
                          <div className="relative w-full flex items-end justify-center h-32 sm:h-48">
                            <div
                              className="w-full max-w-[40px] bg-primary/20 rounded-t-lg transition-all duration-300 group-hover:bg-primary/40 relative overflow-hidden"
                              style={{ height: `${(item.amount / maxChartAmount) * 100}%` }}
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
                      ))
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-center">
                        <TrendingUp className="h-8 w-8 text-muted-foreground/40" />
                        <p className="text-sm font-medium text-muted-foreground">
                          No payment activity yet
                        </p>
                        <p className="text-xs text-muted-foreground/70">
                          Your monthly payments will appear here once you start repaying.
                        </p>
                      </div>
                    )}
                  </div>
                </ThemedCard>
              </div>

              {/* Side Action Panel */}
              <div className="space-y-6">
                <div
                  className={cn(
                    'p-8 relative overflow-hidden',
                    'rounded-2xl border border-[#DCE8D8] bg-white shadow-[0_12px_32px_rgba(39,79,53,0.06)]',
                    'rounded-2xl',
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
                      <ThemedButton
                        variant="secondary"
                        onClick={() => navigate('/loan-application')}
                        className="w-full bg-background text-primary hover:bg-muted font-bold"
                      >
                        {t('needFunds.applyNow')} <ArrowUpRight size={16} />
                      </ThemedButton>
                    )}
                  </div>
                </div>

                <ThemedCard>
                  <h3 className={cn('text-lg font-bold mb-4', 'font-sans text-[#274F35]')}>
                    {t('quickActions.title')}
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <ThemedButton
                      variant="ghost"
                      onClick={() => setShowPaymentModal(true)}
                      disabled={!activeLoan}
                      className="h-auto p-4 flex flex-col items-center justify-center gap-2 bg-muted hover:bg-muted/80"
                    >
                      <Wallet className="text-muted-foreground" size={24} />
                      <span className="text-xs font-medium text-foreground">
                        {t('quickActions.makePayment')}
                      </span>
                    </ThemedButton>
                    <ThemedButton
                      variant="ghost"
                      onClick={() => navigate('/kyc')}
                      className="h-auto p-4 flex flex-col items-center justify-center gap-2 bg-muted hover:bg-muted/80"
                    >
                      <FileText className="text-muted-foreground" size={24} />
                      <span className="text-xs font-medium text-foreground">
                        {t('quickActions.documents')}
                      </span>
                    </ThemedButton>
                  </div>
                </ThemedCard>
              </div>
            </div>
          </div>
        );

      case 'loans':
        return (
          <div className="space-y-6">
            <h2 className={cn('text-2xl font-bold', 'font-sans text-[#274F35]')}>
              {t('loans.title')}
            </h2>
            {loans.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {loans.map((loan) => {
                  const loanKey = loan.id ?? loan._id;
                  const isSettled = loan.status === 'paid_off';
                  const isActive = ['active', 'disbursed', 'funded'].includes(loan.status);
                  const progressPercent =
                    (loan.totalPaid ?? 0) > 0 && loan.principal > 0
                      ? Math.round(((loan.totalPaid ?? 0) / loan.principal) * 100)
                      : 0;

                  return (
                    <ThemedCard
                      key={loanKey}
                      className={cn(isSettled ? 'bg-green-50/50  border-green-200 ' : '')}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className={cn('text-xl font-bold', 'font-sans text-[#274F35]')}>
                            {formatNAD(loan.principal)}
                          </h3>
                          <p className="text-sm text-muted-foreground">{loan.purpose}</p>
                        </div>
                        <ThemedBadge className={isSettled ? 'bg-green-600  text-white' : ''}>
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
                              className={`h-2 ${isSettled ? '[&>div]:bg-green-600 ' : ''}`}
                            />
                            {!isSettled && (loan.outstandingBalance ?? 0) > 0 && (
                              <p className="text-xs text-muted-foreground">
                                {t('loans.outstanding')}{' '}
                                <span className="font-semibold text-foreground">
                                  {formatNAD(loan.outstandingBalance ?? 0)}
                                </span>
                              </p>
                            )}
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                          <div>
                            <p className="text-muted-foreground text-xs">{t('loans.term')}</p>
                            <p className="font-medium text-foreground">
                              {t('loans.termValue', { months: loan.termMonths })}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">{t('loans.rate')}</p>
                            <p className="font-medium text-foreground">
                              {t('loans.rateValue', { rate: loan.interestRate })}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">{t('loans.monthly')}</p>
                            <p className="font-medium text-foreground">
                              {formatNAD(loan.monthlyPayment ?? 0)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">
                              {isSettled ? t('loans.totalPaid') : t('loans.totalDue')}
                            </p>
                            <p className="font-medium text-foreground">
                              {formatNAD(
                                isSettled
                                  ? (loan.totalPaid ?? 0)
                                  : (loan.totalRepayment ?? loan.principal)
                              )}
                            </p>
                          </div>
                        </div>

                        <div className={cn('grid gap-2', isActive && 'sm:grid-cols-2')}>
                          <ThemedButton
                            className="w-full"
                            variant="secondary"
                            onClick={() => navigate(`/loans/${loanKey}`)}
                            data-testid={`view-loan-${loanKey}`}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            View details
                          </ThemedButton>
                          {isActive && (
                            <ThemedButton
                              className="w-full"
                              variant="secondary"
                              onClick={() => setShowPaymentModal(true)}
                            >
                              <DollarSign className="h-4 w-4 mr-2" />
                              {t('loans.makePayment')}
                            </ThemedButton>
                          )}
                        </div>

                        {isSettled && loan.completedAt && (
                          <p className="text-xs text-green-600  text-center">
                            {t('loans.settledOn', {
                              date: new Date(loan.completedAt).toLocaleDateString('en-ZA', {
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
                <h3 className={cn('text-lg font-semibold', 'font-sans text-[#274F35]')}>
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className={cn('text-2xl font-bold', 'font-sans text-[#274F35]')}>
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
                      <h3 className={cn('text-lg font-bold', 'font-sans text-[#274F35]')}>
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
                  <h3 className={cn('text-lg font-semibold', 'font-sans text-[#274F35]')}>
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
            <h2 className={cn('text-2xl font-bold', 'font-sans text-[#274F35]')}>
              {t('payments.title')}
            </h2>
            <ThemedCard className="overflow-hidden p-0">
              {payments.length > 0 ? (
                <div className="divide-y divide-border">
                  {payments.map((payment) => (
                    <div
                      key={payment._id}
                      className="flex flex-col gap-3 p-4 hover:bg-muted/50 transition-colors sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-green-100  flex items-center justify-center text-green-600 ">
                          <DollarSign size={20} />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">
                            {formatNAD(payment.amount)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(
                              payment.paymentDate ?? payment.createdAt
                            ).toLocaleDateString()}
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
        // Unknown tab — reset to overview to prevent blank content
        if (activeTab !== 'overview') {
          setActiveTab('overview');
        }
        return null;
    }
  };

  return (
    <DashboardLayout
      activeTab={activeTab}
      onTabChange={handleTabChange}
      variant="client"
      userName={profile?.fullName ?? (profile?.email ? profile.email.split('@')[0] : undefined)}
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
        onPaymentSuccess={() => setShowPaymentModal(false)}
      />
    </DashboardLayout>
  );
}
