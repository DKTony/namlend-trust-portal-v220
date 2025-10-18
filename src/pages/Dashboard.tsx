import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getUserApprovalRequests } from '@/services/approvalWorkflow';
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  FileText,
  CreditCard,
  Calendar,
  User,
  Phone,
  Mail,
  MapPin,
  Star,
  Download,
  Eye,
  Plus,
  Loader2,
  Shield,
  ChevronRight
} from 'lucide-react';
import Header from '@/components/Header';
import { formatNAD } from '@/utils/currency';
import PaymentModal from '@/components/PaymentModal';

import ClientProfileDashboard from '@/components/ClientProfileDashboard';

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
  disbursed_at: string;
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
  request_data?: {
    amount?: number;
    purpose?: string;
    term_months?: number;
    term?: number;
    interest_rate?: number;
    monthly_payment?: number;
    [key: string]: any;
  };
}

interface Payment {
  id: string;
  loan_id: string;
  amount: number;
  payment_method: string;
  status: string;
  paid_at: string;
  reference_number: string;
  created_at: string;
  loans?: {
    user_id: string;
  };
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { handleAsyncOperation, trackAction } = useErrorHandler();
  const [profile, setProfile] = useState<any>(null);
  const [loans, setLoans] = useState<any[]>([]);
  const [loanApplications, setLoanApplications] = useState<LoanApplication[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showPaymentModal, setShowPaymentModal] = useState(false);

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
        
        // Fetch user profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user?.id)
          .single();

        if (profileError) {
          throw new Error(`Profile fetch failed: ${profileError.message}`);
        }
        setProfile(profileData);

        // Fetch user's loans
        const { data: loansData, error: loansError } = await supabase
          .from('loans')
          .select('*')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false });

        if (loansError) {
          throw new Error(`Loans fetch failed: ${loansError.message}`);
        }
        setLoans(loansData || []);

        // Fetch user's loan applications from approval workflow
        const applicationsResult = await getUserApprovalRequests('pending');
        if (!applicationsResult.success) {
          throw new Error(`Loan applications fetch failed: ${applicationsResult.error}`);
        }
        
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
              request_data: req.request_data // Preserve original data for debugging
            }));
          setLoanApplications(loanApps);
        }

        // Fetch user's payments (through loan relationship)
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('payments')
          .select(`
            *,
            loans!inner(user_id)
          `)
          .eq('loans.user_id', user?.id)
          .order('created_at', { ascending: false });

        if (paymentsError) {
          throw new Error(`Payments fetch failed: ${paymentsError.message}`);
        }
        setPayments(paymentsData || []);
      },
      'fetch_dashboard_data',
      {
        showErrorToast: true,
        retries: 2
      }
    ).finally(() => {
      setLoading(false);
    });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const activeLoan = loans.find(loan => loan.status === 'active' || loan.status === 'disbursed');
  const pendingLoan = loans.find(loan => loan.status === 'pending');

  const handleTabChange = (value: string) => {
    trackAction('dashboard_tab_change', { tab: value });
    setActiveTab(value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'disbursed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'rejected':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary-light/5 to-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, {profile?.first_name}!
          </h1>
          <p className="text-muted-foreground">
            Manage your loans and financial profile
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="loans">Loans</TabsTrigger>
            <TabsTrigger value="applications">Applications</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Loan</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {activeLoan ? formatNAD(activeLoan.amount) : 'None'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {activeLoan ? `${activeLoan.term_months} months` : 'No active loans'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Monthly Payment</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {activeLoan ? formatNAD(activeLoan.monthly_payment) : 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Next payment due
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Loans</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{loans.length + loanApplications.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Total applications ({loans.length} approved, {loanApplications.length} pending)
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Verification</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    {profile?.verified ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                    )}
                    <span className="text-sm font-medium">
                      {profile?.verified ? 'Verified' : 'Pending'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Account status
                  </p>
                </CardContent>
              </Card>
            </div>

            {activeLoan && (
              <Card>
                <CardHeader>
                  <CardTitle>Current Loan Progress</CardTitle>
                  <CardDescription>
                    Track your loan repayment progress
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span>Loan Amount: {formatNAD(activeLoan.amount)}</span>
                      <span>Remaining: {formatNAD(activeLoan.amount * 0.7)}</span>
                    </div>
                    <Progress value={30} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>30% paid</span>
                      <span>70% remaining</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    className="w-full justify-between" 
                    variant="outline"
                    onClick={() => navigate('/loan-application')}
                  >
                    Apply for New Loan
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button 
                    className="w-full justify-between" 
                    variant="outline"
                    onClick={() => setShowPaymentModal(true)}
                    disabled={!activeLoan}
                  >
                    Make Payment
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button 
                    className="w-full justify-between" 
                    variant="outline"
                    onClick={() => navigate('/kyc')}
                  >
                    Upload Documents
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                        {payments.slice(0, 3).map((payment) => (
                          <div key={payment.id} className="flex justify-between items-center">
                            <div>
                              <p className="text-sm font-medium">Payment</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(payment.paid_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">{formatNAD(payment.amount)}</p>
                              <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'}>
                                {payment.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                    {payments.length === 0 && (
                      <p className="text-sm text-muted-foreground">No recent activity</p>
                    )}
                  </div>
                </CardContent>
              </Card>
              {/* content end */}
            </div>
          </TabsContent>

          <TabsContent value="loans" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Approved Loans</CardTitle>
                <CardDescription>
                  Your active and completed loan accounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loans.length > 0 ? (
                  <div className="space-y-4">
                    {loans.map((loan) => (
                      <div key={loan.id} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold">{formatNAD(loan.amount)}</h3>
                            <p className="text-sm text-muted-foreground">{loan.purpose}</p>
                          </div>
                          <Badge variant={loan.status === 'approved' ? 'default' : 'secondary'}>
                            {loan.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Term:</span> {loan.term_months} months
                          </div>
                          <div>
                            <span className="text-muted-foreground">Rate:</span> {loan.interest_rate}%
                          </div>
                          <div>
                            <span className="text-muted-foreground">Monthly:</span> {formatNAD(loan.monthly_payment)}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Total:</span> {formatNAD(loan.total_repayment)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No approved loans</h3>
                    <p className="text-muted-foreground mb-4">
                      Your approved loans will appear here
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="applications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Loan Applications</CardTitle>
                <CardDescription>
                  Track the status of your loan applications
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loanApplications.length > 0 ? (
                  <div className="space-y-4">
                    {loanApplications.filter(app => app && app.id).map((application) => (
                      <div key={application.id} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold">{formatNAD(application.amount)}</h3>
                            <p className="text-sm text-muted-foreground">{application.purpose}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant={
                              application.status === 'pending' ? 'secondary' :
                              application.status === 'under_review' ? 'default' :
                              application.status === 'approved' ? 'default' :
                              'destructive'
                            }>
                              {application.status.replace('_', ' ')}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {application.priority}
                            </Badge>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Term:</span> {application.termMonths} months
                          </div>
                          <div>
                            <span className="text-muted-foreground">Rate:</span> {application.interestRate}%
                          </div>
                          <div>
                            <span className="text-muted-foreground">Monthly:</span> {formatNAD(application.monthlyPayment)}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Submitted:</span> {new Date(application.submittedAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="mt-3 p-2 bg-muted rounded text-xs">
                          <strong>Status:</strong> {application.status === 'pending' ? 'Your application is being reviewed by our team' :
                          application.status === 'under_review' ? 'Application is currently under detailed review' :
                          application.status === 'approved' ? 'Application approved! Loan will be processed shortly' :
                          application.status === 'rejected' ? 'Application was not approved' :
                          'Additional information required'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No pending applications</h3>
                    <p className="text-muted-foreground mb-4">
                      Apply for a loan to get started
                    </p>
                    <Button onClick={() => navigate('/loan-application')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Apply for Loan
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="space-y-6">
            <h2 className="text-2xl font-bold">Payment History</h2>
            
            <div className="grid gap-4">
              {payments.map((payment) => (
                <Card key={payment.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{formatNAD(payment.amount)}</p>
                        <p className="text-sm text-muted-foreground">
                          {payment.payment_method} • {payment.reference_number}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(payment.paid_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'}>
                        {payment.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {payments.length === 0 && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No payments yet</h3>
                    <p className="text-muted-foreground text-center">
                      Your payment history will appear here once you make payments
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <ClientProfileDashboard />
          </TabsContent>
        </Tabs>
      </main>

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        userId={user?.id || ''}
        onPaymentSuccess={fetchDashboardData}
      />
    </div>
  );
}
