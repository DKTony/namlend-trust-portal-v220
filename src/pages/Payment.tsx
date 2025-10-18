import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  CreditCard, 
  Smartphone, 
  Building2, 
  MapPin,
  Shield,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import Header from '@/components/Header';
import { formatNAD } from '@/utils/currency';

interface Loan {
  id: string;
  amount: number;
  monthly_payment: number;
  status: string;
  created_at: string;
}

export default function Payment() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeLoans, setActiveLoans] = useState<Loan[]>([]);
  const [selectedLoan, setSelectedLoan] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [processingFee] = useState(25); // NAD 25 processing fee

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
  const totalAmount = parseFloat(paymentAmount) + processingFee;

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
      // Create payment record
      const { error } = await supabase
        .from('payments')
        .insert([{
          loan_id: selectedLoan,
          amount: parseFloat(paymentAmount),
          payment_method: paymentMethod,
          status: 'pending',
          reference_number: `PAY${Date.now()}`
        }]);

      if (error) throw error;

      toast({
        title: "Payment Initiated",
        description: "Your payment has been initiated. You will receive a confirmation shortly."
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
      <div className="min-h-screen bg-gradient-to-br from-background via-primary-light/5 to-background">
        <Header />
        
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Active Loans</h3>
              <p className="text-muted-foreground text-center mb-4">
                You don't have any active loans that require payment at this time.
              </p>
              <Button onClick={() => navigate('/dashboard')}>
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary-light/5 to-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Make a Payment
          </h1>
          <p className="text-muted-foreground">
            Pay your loan installment securely with multiple payment options
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Payment Details</CardTitle>
                <CardDescription>
                  Select your loan and payment method
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="loan">Select Loan</Label>
                  <Select value={selectedLoan} onValueChange={setSelectedLoan}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a loan" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeLoans.map((loan) => (
                        <SelectItem key={loan.id} value={loan.id}>
                          {formatNAD(loan.amount)} Loan - Monthly: {formatNAD(loan.monthly_payment)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Payment Amount (NAD)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Enter amount"
                    min="1"
                    step="0.01"
                  />
                  {selectedLoanDetails && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPaymentAmount(selectedLoanDetails.monthly_payment.toString())}
                      >
                        Monthly Payment: {formatNAD(selectedLoanDetails.monthly_payment)}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <Label>Payment Method</Label>
                  <Tabs value={paymentMethod} onValueChange={setPaymentMethod} className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="bank">Bank EFT</TabsTrigger>
                      <TabsTrigger value="mobile">Mobile Money</TabsTrigger>
                      <TabsTrigger value="card">Debit Card</TabsTrigger>
                      <TabsTrigger value="agent">Agent Location</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="bank" className="space-y-4">
                      <div className="flex items-center gap-3 p-4 border rounded-lg">
                        <Building2 className="h-8 w-8 text-primary" />
                        <div>
                          <h3 className="font-medium">Bank EFT Transfer</h3>
                          <p className="text-sm text-muted-foreground">
                            Direct transfer from your bank account via NamClear
                          </p>
                        </div>
                        <Badge variant="default">Instant</Badge>
                      </div>
                      <div className="space-y-2">
                        <Label>Bank</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your bank" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fnb">FNB Namibia</SelectItem>
                            <SelectItem value="bw">Bank Windhoek</SelectItem>
                            <SelectItem value="standard">Standard Bank</SelectItem>
                            <SelectItem value="nedbank">Nedbank</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="mobile" className="space-y-4">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 p-4 border rounded-lg">
                          <Smartphone className="h-8 w-8 text-primary" />
                          <div>
                            <h3 className="font-medium">Mobile Money</h3>
                            <p className="text-sm text-muted-foreground">
                              Pay using MTC Maris or bank mobile wallets
                            </p>
                          </div>
                          <Badge variant="default">Instant</Badge>
                        </div>
                        <div className="space-y-2">
                          <Label>Mobile Wallet</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select mobile wallet" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="mtc">MTC Maris</SelectItem>
                              <SelectItem value="fnb-mobile">FNB ewallet</SelectItem>
                              <SelectItem value="bw-mobile">Bank Windhoek Mobile</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Mobile Number</Label>
                          <Input placeholder="+264 81 123 4567" />
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="card" className="space-y-4">
                      <div className="flex items-center gap-3 p-4 border rounded-lg">
                        <CreditCard className="h-8 w-8 text-primary" />
                        <div>
                          <h3 className="font-medium">Debit Card</h3>
                          <p className="text-sm text-muted-foreground">
                            Pay using your Visa or Mastercard debit card
                          </p>
                        </div>
                        <Badge variant="default">Instant</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Card Number</Label>
                          <Input placeholder="1234 5678 9012 3456" />
                        </div>
                        <div className="space-y-2">
                          <Label>Expiry Date</Label>
                          <Input placeholder="MM/YY" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>CVV</Label>
                        <Input placeholder="123" className="w-24" />
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="agent" className="space-y-4">
                      <div className="flex items-center gap-3 p-4 border rounded-lg">
                        <MapPin className="h-8 w-8 text-primary" />
                        <div>
                          <h3 className="font-medium">Agent Location</h3>
                          <p className="text-sm text-muted-foreground">
                            Pay cash at any of our authorized agent locations
                          </p>
                        </div>
                        <Badge variant="secondary">1-2 hours</Badge>
                      </div>
                      <div className="space-y-2">
                        <Label>Select Nearest Location</Label>
                        <Select>
                          <SelectTrigger>
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

                <div className="flex items-center gap-2 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <Shield className="h-5 w-5 text-blue-600" />
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
              </CardContent>
            </Card>
          </div>

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