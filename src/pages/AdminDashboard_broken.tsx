import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Download, AlertTriangle, CheckCircle, Clock, Users, DollarSign, TrendingUp, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Navigate } from 'react-router-dom';

interface FinancialSummary {
  total_clients: number;
  total_loans: number;
  total_disbursed: number;
  pending_amount: number;
  rejected_amount: number;
  total_repayments: number;
  overdue_payments: number;
}

interface ClientPortfolio {
  user_id: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  verified: boolean;
  credit_score: number;
  risk_category: string;
  monthly_income: number;
  total_loans: number;
  total_borrowed: number;
  total_repaid: number;
  outstanding_balance: number;
  last_loan_date: string;
  overdue_payments: number;
}

interface Loan {
  id: string;
  user_id: string;
  amount: number;
  term_months: number;
  interest_rate: number;
  monthly_payment: number;
  status: string;
  purpose: string;
  created_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
    phone_number: string;
  } | null;
}

interface Payment {
  id: string;
  loan_id: string;
  amount: number;
  payment_method: string;
  status: string;
  paid_at: string;
  is_overdue: boolean;
  days_overdue: number;
  loans?: {
    profiles?: {
      first_name: string;
      last_name: string;
    } | null;
  } | null;
}

const AdminDashboard = () => {
  // All hooks must be called unconditionally at the top level
  const { user, isAdmin, isLoanOfficer, userRole, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  // State declarations (all hooks must be called unconditionally)
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [clients, setClients] = useState<ClientPortfolio[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log('AdminDashboard - Auth state:', { 
      user: !!user, 
      userRole, 
      isAdmin, 
      isLoanOfficer, 
      authLoading 
    });
  }, [user, userRole, isAdmin, isLoanOfficer, authLoading]);

  // Handle redirect and data fetching in useEffect
  useEffect(() => {
    // Only proceed if auth is done loading and user is logged in
    if (authLoading || !user) return;

    // Check authorization
    if (!isAdmin && !isLoanOfficer) {
      console.log('Not authorized for admin dashboard, will redirect...');
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to access the admin dashboard.',
        variant: 'destructive',
      });
      setShouldRedirect(true);
      return;
    }

    // Only fetch data if authorized
    const loadData = async () => {
      try {
        await fetchDashboardData();
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load dashboard data. Please try again later.',
          variant: 'destructive',
        });
      }
    };

    loadData();
  }, [isAdmin, isLoanOfficer, authLoading, user?.id]); // Add user?.id to dependencies

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Debug: Log current user and role
      console.log('Current user ID:', user?.id);
      console.log('User role:', userRole);
      
      // Fetch financial summary with error handling
      const { data: summaryData, error: summaryError } = await supabase
        .from('financial_summary')
        .select('*')
        .single();
      
      if (summaryError) {
        console.error('Error fetching financial summary:', summaryError);
        toast({
          title: 'Error',
          description: 'Failed to load financial data. Please try again later.',
          variant: 'destructive',
        });
      } else if (summaryData) {
        setFinancialSummary(summaryData);
      }

      // Fetch client portfolio with error handling
      const { data: clientsData, error: clientsError } = await supabase
        .from('client_portfolio')
        .select('*')
        .order('total_borrowed', { ascending: false });
      
      if (clientsError) {
        console.error('Error fetching client portfolio:', clientsError);
        toast({
          title: 'Error',
          description: 'Failed to load client data. Please try again later.',
          variant: 'destructive',
        });
      } else if (clientsData) {
        setClients(clientsData);
      }

      // Fetch loans with profiles and error handling
      const { data: loansData, error: loansError } = await supabase
        .from('loans')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (loansError) {
        console.error('Error fetching loans:', loansError);
        toast({
          title: 'Error',
          description: 'Failed to load loan data. Please try again later.',
          variant: 'destructive',
        });
      } else if (loansData) {
        // Fetch profiles separately to avoid join issues
        try {
          const loansWithProfiles = await Promise.all(
            loansData.map(async (loan) => {
              const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('first_name, last_name, phone_number')
                .eq('user_id', loan.user_id)
                .single();
              
              if (profileError) {
                console.error(`Error fetching profile for user ${loan.user_id}:`, profileError);
                return { ...loan, profiles: null };
              }
              
              return { ...loan, profiles: profile };
            })
          );
          setLoans(loansWithProfiles);
        } catch (error) {
          console.error('Error processing loan profiles:', error);
          toast({
            title: 'Error',
            description: 'Error processing loan data. Some information may be incomplete.',
            variant: 'destructive',
          });
        }
      }

      // Fetch payments with client info and error handling
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (paymentsError) {
        console.error('Error fetching payments:', paymentsError);
        toast({
          title: 'Error',
          description: 'Failed to load payment data. Please try again later.',
          variant: 'destructive',
        });
      } else if (paymentsData) {
        // Fetch loan and profile info separately with error handling
        try {
          const paymentsWithInfo = await Promise.all(
            paymentsData.map(async (payment) => {
              const { data: loan, error: loanError } = await supabase
                .from('loans')
                .select('user_id')
                .eq('id', payment.loan_id)
                .single();
              
              if (loanError) {
                console.error(`Error fetching loan ${payment.loan_id}:`, loanError);
                return { ...payment, loans: null };
              }
              
              if (loan) {
                const { data: profile, error: profileError } = await supabase
                  .from('profiles')
                  .select('first_name, last_name')
                  .eq('user_id', loan.user_id)
                  .single();
                
                if (profileError) {
                  console.error(`Error fetching profile for user ${loan.user_id}:`, profileError);
                  return { ...payment, loans: null };
                }
                
                return { 
                  ...payment, 
                  loans: { profiles: profile } 
                };
              }
              return { ...payment, loans: null };
            })
          );
          setPayments(paymentsWithInfo);
        } catch (error) {
          console.error('Error processing payment data:', error);
          toast({
            title: 'Error',
            description: 'Error processing payment data. Some information may be incomplete.',
            variant: 'destructive',
          });
        }
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLoanReview = async (loanId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('loans')
        .update({ status: newStatus })
        .eq('id', loanId);

      if (error) throw error;

      // Log the review
      await supabase
        .from('loan_reviews')
        .insert({
          loan_id: loanId,
          reviewer_id: user?.id,
          previous_status: selectedLoan?.status,
          new_status: newStatus,
          review_notes: reviewNotes,
          auto_approved: false
        });

      // Create notification for the client
      const loan = loans.find(l => l.id === loanId);
      if (loan) {
        await supabase
          .from('notifications')
          .insert({
            user_id: loan.user_id,
            type: `loan_${newStatus}`,
            title: `Loan ${newStatus === 'approved' ? 'Approved' : 'Update'}`,
            message: `Your loan application for N$${loan.amount.toLocaleString()} has been ${newStatus}.`
          });
      }

      setSelectedLoan(null);
      setReviewNotes('');
      fetchDashboardData();
      
      toast({
        title: "Success",
        description: `Loan ${newStatus} successfully`,
      });
    } catch (error) {
      console.error('Error updating loan:', error);
      toast({
        title: "Error",
        description: "Failed to update loan status",
        variant: "destructive",
      });
    }
  };

  const filteredLoans = loans.filter(loan => {
    const matchesSearch = loan.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         loan.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         loan.purpose?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || loan.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredClients = clients.filter(client => {
    return searchTerm === '' || 
      `${client.first_name} ${client.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone_number?.includes(searchTerm);
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'under_review': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Loan management and client oversight</p>
          </div>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{financialSummary?.total_clients || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Disbursed</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                N${(financialSummary?.total_disbursed || 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Repayments</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                N${(financialSummary?.total_repayments || 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue Payments</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {financialSummary?.overdue_payments || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="loans" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="loans">Loan Applications</TabsTrigger>
            <TabsTrigger value="clients">Client Management</TabsTrigger>
            <TabsTrigger value="payments">Payment Tracking</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Loan Applications Tab */}
          <TabsContent value="loans" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Loan Applications</CardTitle>
                <CardDescription>Review and manage loan applications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or loan ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="under_review">Under Review</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Term</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLoans.map((loan) => (
                      <TableRow key={loan.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {loan.profiles?.first_name} {loan.profiles?.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {loan.profiles?.phone_number}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>N${loan.amount.toLocaleString()}</TableCell>
                        <TableCell>{loan.term_months} months</TableCell>
                        <TableCell>{loan.purpose || 'Not specified'}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(loan.status)}>
                            {loan.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(loan.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {loan.status === 'pending' || loan.status === 'under_review' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedLoan(loan)}
                            >
                              Review
                            </Button>
                          ) : (
                            <span className="text-muted-foreground">Completed</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Client Management Tab */}
          <TabsContent value="clients" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Client Portfolio</CardTitle>
                <CardDescription>Comprehensive client information and credit profiles</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search clients..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="grid gap-4">
                  {filteredClients.map((client) => (
                    <Card key={client.user_id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">
                              {client.first_name} {client.last_name}
                            </h3>
                            {client.verified && (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {client.phone_number}
                          </p>
                          <div className="flex gap-2">
                            <Badge className={getRiskColor(client.risk_category)}>
                              {client.risk_category} risk
                            </Badge>
                            <Badge variant="outline">
                              Credit Score: {client.credit_score}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <p className="text-sm font-medium">
                            Total Borrowed: N${client.total_borrowed.toLocaleString()}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Repaid: N${client.total_repaid.toLocaleString()}
                          </p>
                          <p className="text-sm font-medium text-orange-600">
                            Outstanding: N${client.outstanding_balance.toLocaleString()}
                          </p>
                          {client.overdue_payments > 0 && (
                            <p className="text-sm text-red-600">
                              {client.overdue_payments} overdue payments
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment Tracking Tab */}
          <TabsContent value="payments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>Track and reconcile all loan payments</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Overdue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {payment.loans?.profiles?.first_name} {payment.loans?.profiles?.last_name}
                        </TableCell>
                        <TableCell>N${payment.amount.toLocaleString()}</TableCell>
                        <TableCell>{payment.payment_method}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(payment.status)}>
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {payment.paid_at ? new Date(payment.paid_at).toLocaleDateString() : 'Pending'}
                        </TableCell>
                        <TableCell>
                          {payment.is_overdue && (
                            <Badge variant="destructive">
                              {payment.days_overdue} days
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Loan Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Pending Applications</span>
                      <span className="font-medium">
                        N${(financialSummary?.pending_amount || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Approved This Month</span>
                      <span className="font-medium">
                        N${(financialSummary?.total_disbursed || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Rejection Rate</span>
                      <span className="font-medium text-red-600">
                        {financialSummary?.total_loans 
                          ? ((financialSummary.rejected_amount / (financialSummary.total_disbursed + financialSummary.rejected_amount)) * 100).toFixed(1)
                          : 0
                        }%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Risk Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>High Risk Clients</span>
                      <span className="font-medium text-red-600">
                        {clients.filter(c => c.risk_category === 'high').length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average Credit Score</span>
                      <span className="font-medium">
                        {clients.length > 0 
                          ? Math.round(clients.reduce((sum, c) => sum + c.credit_score, 0) / clients.length)
                          : 0
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Collection Rate</span>
                      <span className="font-medium text-green-600">
                        {financialSummary?.total_disbursed 
                          ? ((financialSummary.total_repayments / financialSummary.total_disbursed) * 100).toFixed(1)
                          : 0
                        }%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Loan Review Modal */}
        {selectedLoan && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-2xl">
              <CardHeader>
                <CardTitle>Review Loan Application</CardTitle>
                <CardDescription>
                  {selectedLoan.profiles?.first_name} {selectedLoan.profiles?.last_name} - 
                  N${selectedLoan.amount.toLocaleString()} for {selectedLoan.term_months} months
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Monthly Payment</label>
                    <p>N${selectedLoan.monthly_payment.toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Interest Rate</label>
                    <p>{selectedLoan.interest_rate}% APR</p>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Purpose</label>
                  <p>{selectedLoan.purpose || 'Not specified'}</p>
                </div>

                <Textarea
                  placeholder="Add review notes..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                />

                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedLoan(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleLoanReview(selectedLoan.id, 'rejected')}
                  >
                    Reject
                  </Button>
                  <Button
                    onClick={() => handleLoanReview(selectedLoan.id, 'approved')}
                  >
                    Approve
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;