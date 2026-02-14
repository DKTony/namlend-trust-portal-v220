/**
 * Loan 360° View Component
 * Unified view of all loan information in one place
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Calendar,
  DollarSign,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  History,
  MessageSquare,
  Upload,
  Loader2,
  ChevronRight,
  Building,
  Briefcase,
  Shield,
  Eye
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatNAD } from '@/utils/currency';
import { useToast } from '@/hooks/use-toast';
import { LoanStatusTimeline, generateLoanTimeline } from '@/components/LoanStatusTimeline';
import { cn } from '@/lib/utils';
import { TigerBeetleBalance } from '@/components/TigerBeetleBalance';

interface Loan360Props {
  loanId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface LoanDetails {
  id: string;
  amount: number;
  term_months: number;
  interest_rate: number;
  monthly_payment: number;
  total_repayment: number;
  purpose: string;
  status: string;
  created_at: string;
  approved_at?: string;
  disbursed_at?: string;
  user_id: string;
}

interface ClientProfile {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  id_number: string;
  address?: string;
  employment_status: string;
  employer_name?: string;
  monthly_income: number;
  verified: boolean;
}

interface Payment {
  id: string;
  amount: number;
  payment_method: string;
  status: string;
  paid_at: string;
  reference_number: string;
}

interface Document {
  id: string;
  file_name: string;
  document_type: string;
  status: string;
  created_at: string;
}

interface Interaction {
  id: string;
  interaction_type: string;
  outcome?: string;
  notes?: string;
  created_at: string;
  created_by: string;
}

interface PromiseToPay {
  id: string;
  promised_amount: number;
  promised_date: string;
  status: string;
  notes?: string;
}

export function Loan360View({ loanId, isOpen, onClose }: Loan360Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Data states
  const [loan, setLoan] = useState<LoanDetails | null>(null);
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [promises, setPromises] = useState<PromiseToPay[]>([]);

  useEffect(() => {
    if (isOpen && loanId) {
      fetchAllData();
    }
  }, [isOpen, loanId]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Fetch loan details
      const { data: loanData, error: loanError } = await supabase
        .from('loans')
        .select('*')
        .eq('id', loanId)
        .single();

      if (loanError) throw loanError;
      setLoan(loanData);

      // Fetch client profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', loanData.user_id)
        .single();
      
      setClient(profileData);

      // Fetch payments
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('*')
        .eq('loan_id', loanId)
        .order('paid_at', { ascending: false });
      
      setPayments(paymentsData || []);

      // Fetch documents
      const { data: docsData } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', loanData.user_id)
        .order('created_at', { ascending: false });
      
      setDocuments(docsData || []);

      // Fetch collections interactions
      const { data: interactionsData } = await supabase
        .from('collections_interactions')
        .select('*')
        .eq('loan_id', loanId)
        .order('created_at', { ascending: false });
      
      setInteractions(interactionsData || []);

      // Fetch promises to pay
      const { data: promisesData } = await supabase
        .from('promise_to_pay')
        .select('*')
        .eq('loan_id', loanId)
        .order('promised_date', { ascending: false });
      
      setPromises(promisesData || []);

    } catch (error) {
      console.error('Error fetching loan 360 data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load loan details',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate loan metrics
  const totalPaid = payments.reduce((sum, p) => p.status === 'completed' ? sum + p.amount : sum, 0);
  const remainingBalance = loan ? loan.total_repayment - totalPaid : 0;
  const progressPercent = loan ? (totalPaid / loan.total_repayment) * 100 : 0;
  const paymentsMade = payments.filter(p => p.status === 'completed').length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'disbursed':
      case 'completed':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800';
      case 'pending':
      case 'under_review':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
      case 'rejected':
      case 'defaulted':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700';
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Loan 360° View
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : loan && client ? (
          <div className="flex flex-col h-[calc(90vh-120px)]">
            {/* Header Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <Card className="col-span-2">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate" title={`${client.first_name} ${client.last_name}`}>
                        {client.first_name} {client.last_name}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1 min-w-0">
                          <Phone className="h-3 w-3 shrink-0" />
                          <span className="truncate">{client.phone_number}</span>
                        </span>
                        <span className="flex items-center gap-1 min-w-0">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="truncate" title={client.email}>{client.email}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge variant={client.verified ? 'default' : 'secondary'} className="shrink-0">
                          {client.verified ? <CheckCircle className="h-3 w-3 mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
                          {client.verified ? 'Verified' : 'Unverified'}
                        </Badge>
                        <Badge variant="outline" className="shrink-0 truncate max-w-[150px]" title={client.employment_status}>{client.employment_status}</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-muted-foreground mb-1 truncate">Loan Amount</div>
                  <div className="text-2xl font-bold truncate tabular-nums" title={formatNAD(loan.amount)}>{formatNAD(loan.amount)}</div>
                  <Badge className={cn('mt-2 shrink-0', getStatusColor(loan.status))}>
                    {loan.status.replace('_', ' ')}
                  </Badge>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-sm text-muted-foreground truncate">Remaining Balance</div>
                    <TigerBeetleBalance loanId={loan.id} compact showDetails={false} />
                  </div>
                  <div className="text-2xl font-bold truncate tabular-nums" title={formatNAD(remainingBalance)}>{formatNAD(remainingBalance)}</div>
                  <Progress value={progressPercent} className="mt-2 h-2" />
                  <div className="text-xs text-muted-foreground mt-1 truncate tabular-nums">
                    {progressPercent.toFixed(1)}% paid
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid grid-cols-6 w-full">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="payments">Payments ({payments.length})</TabsTrigger>
                <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
                <TabsTrigger value="collections">Collections ({interactions.length})</TabsTrigger>
                <TabsTrigger value="promises">PTP ({promises.length})</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 mt-4">
                {/* Overview Tab */}
                <TabsContent value="overview" className="mt-0 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Loan Details */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          Loan Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Purpose</span>
                          <span className="font-medium">{loan.purpose}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Term</span>
                          <span className="font-medium">{loan.term_months} months</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Interest Rate</span>
                          <span className="font-medium">{loan.interest_rate}% APR</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Monthly Payment</span>
                          <span className="font-medium">{formatNAD(loan.monthly_payment)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Repayment</span>
                          <span className="font-medium">{formatNAD(loan.total_repayment)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Created</span>
                          <span className="font-medium">{new Date(loan.created_at).toLocaleDateString()}</span>
                        </div>
                        {loan.disbursed_at && (
                          <>
                            <Separator />
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Disbursed</span>
                              <span className="font-medium">{new Date(loan.disbursed_at).toLocaleDateString()}</span>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>

                    {/* Client Details */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Client Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">ID Number</span>
                          <span className="font-medium">{client.id_number}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Employment</span>
                          <span className="font-medium">{client.employment_status}</span>
                        </div>
                        {client.employer_name && (
                          <>
                            <Separator />
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Employer</span>
                              <span className="font-medium">{client.employer_name}</span>
                            </div>
                          </>
                        )}
                        <Separator />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Monthly Income</span>
                          <span className="font-medium">{formatNAD(client.monthly_income)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Debt-to-Income</span>
                          <span className="font-medium">
                            {client.monthly_income > 0 
                              ? ((loan.monthly_payment / client.monthly_income) * 100).toFixed(1) 
                              : 0}%
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Payment Summary */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Payment Summary
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Payments Made</span>
                          <span className="font-medium">{paymentsMade}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Paid</span>
                          <span className="font-medium text-green-600 dark:text-green-400">{formatNAD(totalPaid)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Remaining</span>
                          <span className="font-medium text-orange-600 dark:text-orange-400">{formatNAD(remainingBalance)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{progressPercent.toFixed(1)}%</span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Quick Actions */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                          <ChevronRight className="h-4 w-4" />
                          Quick Actions
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <Button variant="outline" size="sm" className="w-full justify-start">
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Send Reminder
                        </Button>
                        <Button variant="outline" size="sm" className="w-full justify-start">
                          <Phone className="h-4 w-4 mr-2" />
                          Log Contact
                        </Button>
                        <Button variant="outline" size="sm" className="w-full justify-start">
                          <FileText className="h-4 w-4 mr-2" />
                          Generate Statement
                        </Button>
                        <Button variant="outline" size="sm" className="w-full justify-start">
                          <History className="h-4 w-4 mr-2" />
                          View Full History
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Payments Tab */}
                <TabsContent value="payments" className="mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>Payment History</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {payments.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          No payments recorded yet
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {payments.map((payment) => (
                            <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <div className="font-medium">{formatNAD(payment.amount)}</div>
                                <div className="text-sm text-muted-foreground">
                                  {payment.payment_method.replace('_', ' ')} • Ref: {payment.reference_number}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(payment.paid_at).toLocaleString()}
                                </div>
                              </div>
                              <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'}>
                                {payment.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Documents Tab */}
                <TabsContent value="documents" className="mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>Documents</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {documents.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          No documents uploaded
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {documents.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center gap-3">
                                <FileText className="h-8 w-8 text-muted-foreground" />
                                <div>
                                  <div className="font-medium">{doc.file_name}</div>
                                  <div className="text-sm text-muted-foreground">{doc.document_type}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={doc.status === 'verified' ? 'default' : 'secondary'}>
                                  {doc.status}
                                </Badge>
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Collections Tab */}
                <TabsContent value="collections" className="mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>Collections Interactions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {interactions.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          No collections activity
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {interactions.map((interaction) => (
                            <div key={interaction.id} className="p-3 border rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <Badge variant="outline">{interaction.interaction_type}</Badge>
                                {interaction.outcome && (
                                  <Badge variant="secondary">{interaction.outcome}</Badge>
                                )}
                              </div>
                              {interaction.notes && (
                                <p className="text-sm mb-2">{interaction.notes}</p>
                              )}
                              <div className="text-xs text-muted-foreground">
                                {new Date(interaction.created_at).toLocaleString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Promises Tab */}
                <TabsContent value="promises" className="mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>Promises to Pay</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {promises.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          No promises recorded
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {promises.map((ptp) => (
                            <div key={ptp.id} className="p-3 border rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <div className="font-medium">{formatNAD(ptp.promised_amount)}</div>
                                <Badge variant={
                                  ptp.status === 'kept' ? 'default' :
                                  ptp.status === 'broken' ? 'destructive' :
                                  'secondary'
                                }>
                                  {ptp.status}
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Promised for: {new Date(ptp.promised_date).toLocaleDateString()}
                              </div>
                              {ptp.notes && (
                                <p className="text-sm mt-2">{ptp.notes}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Timeline Tab */}
                <TabsContent value="timeline" className="mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>Application Timeline</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <LoanStatusTimeline 
                        steps={generateLoanTimeline(
                          loan.status,
                          loan.created_at,
                          loan.status !== 'pending' ? loan.created_at : undefined,
                          loan.status === 'approved' || loan.status === 'active' || loan.status === 'disbursed' ? loan.created_at : undefined,
                          loan.disbursed_at
                        )}
                        orientation="vertical"
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Loan not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default Loan360View;
