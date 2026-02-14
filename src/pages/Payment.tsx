import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { ThemedButton } from '@/components/ui/ThemedButton';
import { ThemedInput } from '@/components/ui/ThemedInput';
import { ThemedBadge } from '@/components/ui/ThemedBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  CreditCard, 
  Smartphone, 
  Building2, 
  MapPin,
  Shield,
  CheckCircle,
  AlertCircle,
  Zap,
  Wallet
} from 'lucide-react';
import Header from '@/components/Header';
import { formatNAD } from '@/utils/currency';
import { IPSPaymentModal } from '@/components/ips';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

interface Loan {
  id: string;
  amount: number;
  monthly_payment: number;
  status: string;
  created_at: string;
}

export default function Payment() {
  const { user } = useAuth();
  const { styles } = useTheme();
  const navigate = useNavigate();
  const [activeLoans, setActiveLoans] = useState<Loan[]>([]);
  const [selectedLoan, setSelectedLoan] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [showIPSModal, setShowIPSModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [loading, setLoading] = useState(false);

  // Processing fee varies by payment method - IPS has no fee
  const getProcessingFee = (method: string): number => {
    switch (method) {
      case 'ips':
        return 0; // IPS has no additional fees
      case 'bank':
      case 'mobile':
      case 'card':
      case 'agent':
      default:
        return 25; // NAD 25 processing fee for other methods
    }
  };
  const processingFee = getProcessingFee(paymentMethod);

  useEffect(() => {
    if (user) {
      fetchActiveLoans();
    }
  }, [user]);

  const fetchActiveLoans = async () => {
    try {
      const { data } = await supabase
        .from('loans')
        .select('*')
        .eq('user_id', user?.id)
        .in('status', ['active', 'disbursed'])
        .order('created_at', { ascending: false });
      
      if (data) {
        setActiveLoans(data);
        if (data.length > 0) {
          setSelectedLoan(data[0].id);
          setPaymentAmount(data[0].monthly_payment.toString());
        }
      }
    } catch (error) {
      console.error('Error fetching loans:', error);
    }
  };

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const selectedLoanDetails = activeLoans.find(loan => loan.id === selectedLoan);
  const currentProcessingFee = getProcessingFee(paymentMethod);
  const totalAmount = parseFloat(paymentAmount || '0') + currentProcessingFee;

  // Map UI-friendly payment method names to RPC canonical enum values
  const paymentMethodToRpc: Record<string, string> = {
    'ips': 'ips',
    'bank': 'bank_transfer',
    'mobile': 'mobile_money',
    'card': 'debit_order',
    'agent': 'cash'
  };

  const handlePayment = async () => {
    if (!selectedLoan || !paymentMethod || !paymentAmount) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      // Generate deterministic idempotency key based on loan, amount, method, and date
      // This ensures user retries/reloads with same inputs will dedupe properly
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const amountCents = Math.round(parseFloat(paymentAmount) * 100); // Normalize to cents
      const rpcPaymentMethod = paymentMethodToRpc[paymentMethod] || paymentMethod;
      const idempotencyKey = `pay-${selectedLoan}-${amountCents}-${rpcPaymentMethod}-${today}`;
      
      // Use create_payment RPC for proper audit trail, ledger event, and fee recording
      const { data, error } = await supabase.rpc('create_payment', {
        p_loan_id: selectedLoan,
        p_amount: parseFloat(paymentAmount),
        p_payment_method: rpcPaymentMethod,
        p_processing_fee: processingFee,
        p_idempotency_key: idempotencyKey,
        p_payment_notes: null
      });

      if (error) throw error;

      const result = data as { 
        success: boolean; 
        payment_id: string; 
        reference_number: string;
        total_amount: number;
        message: string;
      };

      if (!result.success) {
        throw new Error(result.message || 'Payment creation failed');
      }

      toast({
        title: "Payment Initiated",
        description: `Payment ${result.reference_number} initiated. Total: N$${result.total_amount.toFixed(2)}`
      });

      // In a real app, this would redirect to the payment processor
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
      
    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        title: "Payment Failed",
        description: "Failed to process your payment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (activeLoans.length === 0) {
    return (
      <div className={cn("min-h-screen transition-colors duration-500", styles.background)}>
        <Header />
        
        <main className="container mx-auto px-4 py-8 max-w-2xl relative z-10">
          <ThemedButton
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-4 pl-0 hover:bg-transparent hover:text-primary justify-start"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </ThemedButton>
          
          <ThemedCard className="flex flex-col items-center justify-center py-12">
            <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className={cn("text-lg font-medium mb-2", styles.textClass)}>No Active Loans</h3>
            <p className="text-muted-foreground text-center mb-4">
              You don't have any active loans that require payment at this time.
            </p>
            <ThemedButton onClick={() => navigate('/dashboard')}>
              Return to Dashboard
            </ThemedButton>
          </ThemedCard>
        </main>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen transition-colors duration-500", styles.background)}>
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl relative z-10">
        <div className="mb-8">
          <ThemedButton
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-4 pl-0 hover:bg-transparent hover:text-primary justify-start"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </ThemedButton>
          
          <h1 className={cn("text-3xl font-bold mb-2", styles.textClass)}>
            Make a Payment
          </h1>
          <p className="text-muted-foreground">
            Pay your loan installment securely with multiple payment options
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <ThemedCard>
              <div className="mb-6">
                <h2 className={cn("text-xl font-bold", styles.textClass)}>Payment Details</h2>
                <p className="text-sm text-muted-foreground">Select your loan and payment method</p>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="loan">Select Loan</Label>
                  <Select value={selectedLoan} onValueChange={(value) => {
                    setSelectedLoan(value);
                    const loan = activeLoans.find(l => l.id === value);
                    if (loan) setPaymentAmount(loan.monthly_payment.toString());
                  }}>
                    <SelectTrigger 
                      id="loan" 
                      className={cn(styles.inputClass, styles.textClass)}
                    >
                      <SelectValue placeholder="Choose a loan to pay" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeLoans.map((loan) => (
                        <SelectItem key={loan.id} value={loan.id}>
                          {formatNAD(loan.amount)} Loan - Due: {formatNAD(loan.monthly_payment)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Payment Amount (NAD)</Label>
                  <ThemedInput
                    id="amount"
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Enter amount"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Tabs defaultValue="ips" className="w-full" onValueChange={setPaymentMethod}>
                    <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1 h-auto gap-1">
                      <TabsTrigger value="ips" className="data-[state=active]:bg-background py-2">
                        <Zap className="h-4 w-4 mr-2" /> IPS
                      </TabsTrigger>
                      <TabsTrigger value="card" className="data-[state=active]:bg-background py-2">
                        <CreditCard className="h-4 w-4 mr-2" /> Card
                      </TabsTrigger>
                      <TabsTrigger value="mobile" className="data-[state=active]:bg-background py-2">
                        <Smartphone className="h-4 w-4 mr-2" /> Mobile
                      </TabsTrigger>
                    </TabsList>
                    
                    <div className="mt-4">
                      <TabsContent value="ips">
                        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                          <div className="flex items-start gap-3">
                            <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                            <div>
                              <h4 className="font-medium text-blue-900 dark:text-blue-300">Instant Payment Solution</h4>
                              <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                                Secure bank-to-bank transfer. Instant clearing and zero fees.
                              </p>
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="card">
                        <div className="p-4 rounded-lg bg-muted/50 border border-border">
                          <div className="flex items-start gap-3">
                            <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div>
                              <h4 className="font-medium text-foreground">Debit/Credit Card</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                Pay securely with your Visa or Mastercard. Small processing fee applies.
                              </p>
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="mobile">
                        <div className="p-4 rounded-lg bg-muted/50 border border-border">
                          <div className="flex items-start gap-3">
                            <Smartphone className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div>
                              <h4 className="font-medium text-foreground">Mobile Money</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                Pay using eWallet or BlueWallet. Standard network fees apply.
                              </p>
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                    </div>
                    <TabsContent value="card" className="space-y-4">
                      <div className="flex items-center gap-3 p-4 border rounded-lg border-border bg-card">
                        <CreditCard className="h-8 w-8 text-primary" />
                        <div>
                          <h3 className="font-medium text-foreground">Debit Card</h3>
                          <p className="text-sm text-muted-foreground">
                            Pay using your Visa or Mastercard debit card
                          </p>
                        </div>
                        <Badge variant="default">Instant</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Card Number</Label>
                          <Input placeholder="1234 5678 9012 3456" className="bg-background border-input text-foreground" />
                        </div>
                        <div className="space-y-2">
                          <Label>Expiry Date</Label>
                          <Input placeholder="MM/YY" className="bg-background border-input text-foreground" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>CVV</Label>
                        <Input placeholder="123" className="w-24 bg-background border-input text-foreground" />
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="agent" className="space-y-4">
                      <div className="flex items-center gap-3 p-4 border rounded-lg border-border bg-card">
                        <MapPin className="h-8 w-8 text-primary" />
                        <div>
                          <h3 className="font-medium text-foreground">Agent Location</h3>
                          <p className="text-sm text-muted-foreground">
                            Pay cash at any of our authorized agent locations
                          </p>
                        </div>
                        <Badge variant="secondary">1-2 hours</Badge>
                      </div>
                      <div className="space-y-2">
                        <Label>Select Nearest Location</Label>
                        <Select>
                          <SelectTrigger className="bg-background border-input text-foreground">
                            <SelectValue placeholder="Choose location" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="windhoek-cbd">Windhoek CBD - Independence Ave</SelectItem>
                            <SelectItem value="katutura">Katutura - Main Center</SelectItem>
                            <SelectItem value="swakopmund">Swakopmund - Sam Nujoma Ave</SelectItem>
                            <SelectItem value="oshakati">Oshakati - Main Street</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>

                <div className="flex items-center gap-2 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-800 dark:text-blue-200">Secure Payment</p>
                    <p className="text-blue-600 dark:text-blue-300">
                      All payments are encrypted and processed securely
                    </p>
                  </div>
                </div>

                <Button 
                  onClick={handlePayment}
                  disabled={loading || !paymentMethod || !paymentAmount || !selectedLoan}
                  className="w-full"
                  size="lg"
                >
                  {loading ? "Processing..." : `Pay ${formatNAD(totalAmount)}`}
                </Button>
              </div>
            </ThemedCard>
          </div>

          {/* IPS Payment Modal */}
          {selectedLoanDetails && (
            <IPSPaymentModal
              isOpen={showIPSModal}
              onClose={() => setShowIPSModal(false)}
              loanId={selectedLoan}
              outstandingBalance={selectedLoanDetails.amount}
              monthlyPayment={selectedLoanDetails.monthly_payment}
              onSuccess={() => {
                setShowIPSModal(false);
                toast({
                  title: "Payment Successful",
                  description: "Your IPS payment has been processed successfully."
                });
                setTimeout(() => navigate('/dashboard'), 2000);
              }}
              onError={(error) => {
                toast({
                  title: "Payment Failed",
                  description: error,
                  variant: "destructive"
                });
              }}
            />
          )}

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Payment Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Payment Amount</span>
                    <span className="font-medium">
                      {paymentAmount ? formatNAD(parseFloat(paymentAmount)) : formatNAD(0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Processing Fee</span>
                    <span className="font-medium">{formatNAD(processingFee)}</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between">
                      <span className="font-medium">Total Amount</span>
                      <span className="font-bold text-lg">{formatNAD(totalAmount)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Benefits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Instant payment confirmation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Automatic loan balance update</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>SMS and email receipts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Early payment discounts available</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  Important
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>• Payments made after 6 PM may be processed the next business day</p>
                <p>• Keep your payment reference number for future correspondence</p>
                <p>• Contact support if payment fails or you need assistance</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}