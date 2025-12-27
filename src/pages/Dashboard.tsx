import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getUserApprovalRequests } from '@/services/approvalWorkflow';
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
  X
} from 'lucide-react';
import DashboardSidebar from '@/components/DashboardSidebar';
import StatCard from '@/components/StatCard';
import { formatNAD } from '@/utils/currency';
import PaymentModal from '@/components/PaymentModal';
import { LoanStatusTimeline, generateLoanTimeline } from '@/components/LoanStatusTimeline';
import { SelfServicePortal } from '@/components/SelfServicePortal';
import ClientProfileDashboard from '@/components/ClientProfileDashboard';
import { BankingSection } from '@/components/BankingSection';
import { NotificationCenter } from '@/components/NotificationCenter';
import { ModeToggle } from '@/components/ModeToggle';

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
  const navigate = useNavigate();
  const { handleAsyncOperation, trackAction } = useErrorHandler();
  
  // Data State
  const [profile, setProfile] = useState<any>(null);
  const [loans, setLoans] = useState<any[]>([]);
  const [loanApplications, setLoanApplications] = useState<LoanApplication[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

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
          supabase
            .from('profiles')
            .select('*')
            .eq('user_id', user?.id)
            .single(),
          
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
            .limit(50)
        ]);

        // Process profile
        if (profileResult.error) throw new Error(`Profile fetch failed: ${profileResult.error.message}`);
        setProfile(profileResult.data);

        // Process loans
        if (loansResult.error) throw new Error(`Loans fetch failed: ${loansResult.error.message}`);
        setLoans(loansResult.data || []);

        // Process applications
        if (applicationsResult.requests) {
          const loanApps = applicationsResult.requests
            .filter(req => req.request_type === 'loan_application')
            .map(req => ({
              id: req.id,
              amount: req.request_data?.amount || 0,
              purpose: req.request_data?.purpose || 'Not specified',
              status: req.status || 'pending',
              submittedAt: req.created_at || new Date().toISOString(),
              termMonths: req.request_data?.term_months || req.request_data?.term || 0,
              interestRate: req.request_data?.interest_rate || 0,
              monthlyPayment: req.request_data?.monthly_payment || 0,
              priority: req.priority || 'normal',
              created_at: req.created_at,
              request_data: req.request_data
            }));
          setLoanApplications(loanApps);
        }

        // Process payments
        if (paymentsResult.error) throw new Error(`Payments fetch failed: ${paymentsResult.error.message}`);
        setPayments(paymentsResult.data || []);
      },
      'fetch_dashboard_data',
      { showErrorToast: true, retries: 2 }
    ).finally(() => setLoading(false));
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const activeLoan = loans.find(loan => loan.status === 'active' || loan.status === 'disbursed');
  const pendingLoan = loanApplications.find(app => app.status === 'pending');

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSidebarOpen(false);
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
                <h2 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
                  Hello, {profile?.first_name || 'Client'}
                </h2>
                <p className="text-muted-foreground mt-2 text-base md:text-lg">
                  Your financial health is looking good today.
                </p>
              </div>
              <button 
                 onClick={() => navigate('/loan-application')}
                 className="w-full md:w-auto bg-primary text-primary-foreground px-6 py-3 rounded-full font-semibold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
              >
                 <Plus size={20} /> <span className="md:inline">New Application</span>
              </button>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard 
                label="Total Balance" 
                value={activeLoan ? formatNAD(activeLoan.amount) : 'N$0.00'} 
                icon={Wallet} 
                color="black"
              />
              <StatCard 
                label="Credit Score" 
                value={720} // Mocked for now as per snippet
                subValue="Excellent"
                icon={TrendingUp} 
                color="green"
              />
              <StatCard 
                label="Next Payment" 
                value={activeLoan ? new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : "--"} 
                subValue={activeLoan ? formatNAD(activeLoan.monthly_payment) : ""}
                icon={Calendar} 
                color="blue"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Chart Section */}
              <div className="lg:col-span-2 bg-card p-6 md:p-8 rounded-3xl shadow-soft border border-border">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-2">
                  <h3 className="text-xl font-bold text-foreground">Spending Overview</h3>
                  <select className="bg-muted border-none text-sm font-medium text-muted-foreground rounded-lg px-3 py-1 cursor-pointer hover:text-foreground">
                    <option>Last 6 months</option>
                    <option>This Year</option>
                  </select>
                </div>
                <div className="h-64 md:h-72 flex items-end justify-between gap-2 px-4 pb-4 pt-8 bg-gradient-to-b from-transparent to-primary/5 rounded-xl border-b border-l border-border/50">
                  {/* CSS-only Mock Chart */}
                  {chartData.map((item, index) => (
                    <div key={index} className="flex flex-col items-center gap-2 w-full group cursor-pointer">
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
                      <span className="text-xs text-muted-foreground font-medium">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Side Action Panel */}
              <div className="space-y-6">
                <div className="bg-primary text-primary-foreground p-8 rounded-3xl shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 blur-[80px] rounded-full opacity-40"></div>
                  <div className="relative z-10">
                    <h3 className="text-lg font-bold mb-2">Need Funds?</h3>
                    <p className="text-primary-foreground/80 text-sm mb-6 leading-relaxed">Get approved in minutes with our AI-powered risk assessment.</p>
                    
                    {pendingLoan ? (
                      <div className="bg-primary-foreground/10 p-4 rounded-2xl border border-primary-foreground/10">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold uppercase text-primary-foreground/70 tracking-wider">Processing</span>
                          <span className="text-primary-foreground font-bold truncate tabular-nums max-w-[120px] text-right" title={formatNAD(pendingLoan.amount)}>
                            {formatNAD(pendingLoan.amount)}
                          </span>
                        </div>
                        <div className="w-full bg-primary-foreground/20 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-primary-foreground h-full w-2/3 animate-pulse"></div>
                        </div>
                      </div>
                    ) : (
                      <button 
                        onClick={() => navigate('/loan-application')}
                        className="w-full bg-background text-primary py-3 rounded-xl font-bold text-sm hover:bg-muted transition-colors flex justify-center items-center gap-2"
                      >
                        Apply Now <ArrowUpRight size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-card p-6 rounded-3xl shadow-soft border border-border">
                  <h3 className="text-lg font-bold text-foreground">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setShowPaymentModal(true)}
                      disabled={!activeLoan}
                      className="p-4 rounded-2xl bg-muted hover:bg-muted/80 transition-colors text-center disabled:opacity-50"
                    >
                      <Wallet className="mx-auto mb-2 text-muted-foreground" size={24} />
                      <span className="text-xs font-medium text-foreground">Make Payment</span>
                    </button>
                    <button 
                      onClick={() => navigate('/kyc')}
                      className="p-4 rounded-2xl bg-muted hover:bg-muted/80 transition-colors text-center"
                    >
                      <FileText className="mx-auto mb-2 text-muted-foreground" size={24} />
                      <span className="text-xs font-medium text-foreground">Documents</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'loans':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-foreground">Your Loans</h2>
            {loans.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {loans.map((loan) => {
                  const isSettled = loan.status === 'settled';
                  const isActive = ['active', 'disbursed', 'funded'].includes(loan.status);
                  const progressPercent = loan.total_paid && loan.total_repayment 
                    ? Math.round((loan.total_paid / loan.total_repayment) * 100) 
                    : 0;
                  
                  return (
                    <Card key={loan.id} className={`rounded-3xl shadow-soft border-border ${isSettled ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800' : 'bg-card'}`}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-xl font-bold">{formatNAD(loan.amount)}</CardTitle>
                            <CardDescription>{loan.purpose}</CardDescription>
                          </div>
                          <Badge 
                            variant={isSettled ? 'default' : isActive ? 'secondary' : 'outline'}
                            className={isSettled ? 'bg-green-600 dark:bg-green-500 text-white' : ''}
                          >
                            {isSettled ? '✓ Settled' : loan.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Progress Bar for Active Loans */}
                        {(isActive || isSettled) && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Payment Progress</span>
                              <span className="font-medium text-foreground">{progressPercent}%</span>
                            </div>
                            <Progress value={progressPercent} className={`h-2 ${isSettled ? '[&>div]:bg-green-600 dark:[&>div]:bg-green-500' : ''}`} />
                            {!isSettled && loan.outstanding_balance > 0 && (
                              <p className="text-xs text-muted-foreground">
                                Outstanding: <span className="font-semibold text-foreground">{formatNAD(loan.outstanding_balance)}</span>
                              </p>
                            )}
                          </div>
                        )}
                        
                        <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                          <div>
                            <p className="text-muted-foreground text-xs">Term</p>
                            <p className="font-medium text-foreground">{loan.term_months} months</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Rate</p>
                            <p className="font-medium text-foreground">{loan.interest_rate}%</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Monthly</p>
                            <p className="font-medium text-foreground">{formatNAD(loan.monthly_payment)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">{isSettled ? 'Total Paid' : 'Total Due'}</p>
                            <p className="font-medium text-foreground">{formatNAD(isSettled ? loan.total_paid : loan.total_repayment)}</p>
                          </div>
                        </div>

                        {/* Action Button for Active Loans */}
                        {isActive && (
                          <Button 
                            className="w-full mt-2" 
                            variant="outline"
                            onClick={() => setShowPaymentModal(true)}
                          >
                            <DollarSign className="h-4 w-4 mr-2" />
                            Make Payment
                          </Button>
                        )}
                        
                        {isSettled && loan.settled_at && (
                          <p className="text-xs text-green-600 dark:text-green-400 text-center">
                            Settled on {new Date(loan.settled_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 bg-card rounded-3xl shadow-soft border border-border">
                <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground">No loans yet</h3>
                <p className="text-muted-foreground mb-4">You don't have any loans at the moment.</p>
                <Button onClick={() => navigate('/loan-application')}>
                  Apply for a Loan
                </Button>
              </div>
            )}
          </div>
        );

    case 'applications':
      return (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-foreground">Applications</h2>
            <Button onClick={() => navigate('/loan-application')} variant="outline" className="rounded-full">
              <Plus size={16} className="mr-2" /> New Application
            </Button>
          </div>
          
          <div className="space-y-4">
            {loanApplications.map((application) => (
              <div key={application.id} className="bg-card p-6 rounded-3xl shadow-soft border border-border">
                <div className="flex flex-col md:flex-row justify-between md:items-start gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{formatNAD(application.amount)}</h3>
                    <p className="text-sm text-muted-foreground">{application.purpose}</p>
                  </div>
                  <Badge variant={application.status === 'pending' ? 'secondary' : 'default'} className="w-fit">
                    {application.status}
                  </Badge>
                </div>
                
                <div className="mt-4 pt-4 border-t border-border">
                  <LoanStatusTimeline 
                    steps={generateLoanTimeline(
                      application.status,
                      application.submittedAt,
                      application.status === 'under_review' ? new Date().toISOString() : undefined,
                      application.status === 'approved' ? new Date().toISOString() : undefined
                    )}
                    orientation="horizontal"
                  />
                </div>
              </div>
            ))}
            
            {loanApplications.length === 0 && (
              <div className="text-center py-12 bg-card rounded-3xl shadow-soft border border-border">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground">No pending applications</h3>
                <Button onClick={() => navigate('/loan-application')} className="mt-4 rounded-full">
                  Start Application
                </Button>
              </div>
            )}
          </div>
        </div>
      );

      case 'payments':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-foreground">Payment History</h2>
            <div className="bg-card rounded-3xl shadow-soft border border-border overflow-hidden">
              {payments.length > 0 ? (
                <div className="divide-y divide-border">
                  {payments.map((payment) => (
                    <div key={payment.id} className="p-4 flex justify-between items-center hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center text-green-600 dark:text-green-400">
                          <DollarSign size={20} />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{formatNAD(payment.amount)}</p>
                          <p className="text-xs text-muted-foreground">{new Date(payment.paid_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="border-border text-muted-foreground">
                        {payment.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center text-muted-foreground">
                  No payments found.
                </div>
              )}
            </div>
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
    <div className="flex h-screen bg-background">
      <DashboardSidebar 
        activeTab={activeTab} 
        onTabChange={handleTabChange}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userEmail={user?.email}
        userRole={userRole}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Mobile Header */}
        <header className="lg:hidden bg-card border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center font-bold text-primary-foreground text-sm">N</div>
             <span className="font-bold text-foreground">NamLend</span>
          </div>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <NotificationCenter />
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
              <Menu size={20} />
            </Button>
          </div>
        </header>

        {/* Desktop Header with Notifications */}
        <header className="hidden lg:flex bg-card border-b border-border p-4 items-center justify-end gap-2">
          <ModeToggle />
          <NotificationCenter />
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        userId={user?.id || ''}
        onPaymentSuccess={fetchDashboardData}
      />
    </div>
  );
}
