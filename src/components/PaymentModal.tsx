import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { 
  CreditCard, 
  Smartphone, 
  Building2, 
  MapPin,
  Shield,
  CheckCircle2,
  AlertCircle,
  Loader2,
  PartyPopper
} from 'lucide-react';
import { formatNAD } from '@/utils/currency';
import { 
  processLoanPayment, 
  getLoanPaymentDetails,
  type LoanPaymentDetails,
  type ProcessPaymentResult
} from '@/services/paymentService';

interface Loan {
  id: string;
  amount: number;
  monthly_payment: number;
  status: string;
  total_repayment?: number;
}

interface LoanWithDetails extends Loan {
  outstanding_balance: number;
  total_paid: number;
  next_due_date?: string;
  next_payment_amount: number;
  progress_percent: number;
  is_settled: boolean;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onPaymentSuccess: () => void;
}

export default function PaymentModal({ isOpen, onClose, userId, onPaymentSuccess }: PaymentModalProps) {
  const [activeLoans, setActiveLoans] = useState<LoanWithDetails[]>([]);
  const [selectedLoan, setSelectedLoan] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [processingFee] = useState(25);
  const [paymentResult, setPaymentResult] = useState<ProcessPaymentResult | null>(null);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);

  // Form fields for different payment methods
  const [bankDetails, setBankDetails] = useState({ bank: '', accountNumber: '' });
  const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvv: '' });
  const [mobileDetails, setMobileDetails] = useState({ wallet: '', phoneNumber: '' });
  const [agentLocation, setAgentLocation] = useState('');

  const fetchLoanDetails = useCallback(async (loanId: string): Promise<LoanWithDetails | null> => {
    const details = await getLoanPaymentDetails(loanId);
    if (details.success && details.loan && details.summary) {
      return {
        id: details.loan.id,
        amount: details.loan.amount,
        monthly_payment: details.loan.monthly_payment,
        status: details.loan.status,
        total_repayment: details.loan.total_repayment,
        outstanding_balance: details.summary.outstanding_balance,
        total_paid: details.summary.total_paid,
        next_due_date: details.summary.next_due_date,
        next_payment_amount: details.summary.outstanding_balance > 0 
          ? Math.min(details.loan.monthly_payment, details.summary.outstanding_balance)
          : 0,
        progress_percent: details.summary.total_scheduled > 0 
          ? Math.round((details.summary.total_paid / details.summary.total_scheduled) * 100)
          : 0,
        is_settled: details.summary.is_settled
      };
    }
    return null;
  }, []);

  useEffect(() => {
    if (isOpen && userId) {
      fetchActiveLoans();
      setShowSuccessScreen(false);
      setPaymentResult(null);
    }
  }, [isOpen, userId]);

  const fetchActiveLoans = async () => {
    setFetchingDetails(true);
    try {
      const { data } = await supabase
        .from('loans')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['active', 'disbursed', 'funded'])
        .order('created_at', { ascending: false });
      
      if (data && data.length > 0) {
        // Fetch detailed balance info for each loan
        const loansWithDetails: LoanWithDetails[] = [];
        for (const loan of data) {
          const details = await fetchLoanDetails(loan.id);
          if (details && !details.is_settled) {
            loansWithDetails.push(details);
          }
        }
        
        setActiveLoans(loansWithDetails);
        if (loansWithDetails.length > 0) {
          setSelectedLoan(loansWithDetails[0].id);
          setPaymentAmount(loansWithDetails[0].next_payment_amount.toString());
        }
      } else {
        setActiveLoans([]);
      }
    } catch (error) {
      console.error('Error fetching loans:', error);
    } finally {
      setFetchingDetails(false);
    }
  };

  const selectedLoanDetails = activeLoans.find(loan => loan.id === selectedLoan);
  const totalAmount = parseFloat(paymentAmount || '0') + processingFee;

  const handlePayment = async () => {
    if (!selectedLoan || !paymentMethod || !paymentAmount) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    // Validate payment method specific fields
    if (paymentMethod === 'bank' && (!bankDetails.bank || !bankDetails.accountNumber)) {
      toast({
        title: "Missing Bank Details",
        description: "Please provide bank and account number.",
        variant: "destructive"
      });
      return;
    }

    if (paymentMethod === 'card' && (!cardDetails.number || !cardDetails.expiry || !cardDetails.cvv)) {
      toast({
        title: "Missing Card Details",
        description: "Please provide complete card information.",
        variant: "destructive"
      });
      return;
    }

    if (paymentMethod === 'mobile' && (!mobileDetails.wallet || !mobileDetails.phoneNumber)) {
      toast({
        title: "Missing Mobile Details",
        description: "Please provide wallet and phone number.",
        variant: "destructive"
      });
      return;
    }

    if (paymentMethod === 'agent' && !agentLocation) {
      toast({
        title: "Missing Location",
        description: "Please select an agent location.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    // Normalize method to UI-supported enums
    const normalizeMethod = (m: string) => {
      if (m === 'bank') return 'bank_transfer';
      if (m === 'mobile') return 'mobile_money';
      if (m === 'card') return 'debit_order';
      if (m === 'agent') return 'cash';
      return 'bank_transfer';
    };

    try {
      const result = await processLoanPayment({
        loanId: selectedLoan,
        amount: parseFloat(paymentAmount),
        payment_method: normalizeMethod(paymentMethod),
        notes: `Payment via ${paymentMethod}`
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to process payment');
      }

      setPaymentResult(result);
      
      // Check if loan was settled
      if (result.loan_settled) {
        setShowSuccessScreen(true);
        toast({
          title: "🎉 Loan Fully Paid!",
          description: "Congratulations! Your loan has been completely settled.",
        });
      } else {
        setShowSuccessScreen(true);
        toast({
          title: "Payment Successful",
          description: `Payment of ${formatNAD(result.amount_applied || 0)} applied. Remaining balance: ${formatNAD(result.new_outstanding || 0)}`,
        });
      }

      onPaymentSuccess();

    } catch (error) {
      // Better error logging for debugging
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'object' && error !== null
          ? JSON.stringify(error)
          : String(error);
      console.error('Error processing payment:', errorMessage, error);
      toast({
        title: "Payment Failed",
        description: errorMessage || "Failed to process your payment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getPaymentMethodDetails = () => {
    switch (paymentMethod) {
      case 'bank': return bankDetails.bank;
      case 'card': return `****${cardDetails.number.slice(-4)}`;
      case 'mobile': return mobileDetails.wallet;
      case 'agent': return agentLocation;
      default: return '';
    }
  };

  const resetForm = () => {
    setSelectedLoan('');
    setPaymentMethod('');
    setPaymentAmount('');
    setBankDetails({ bank: '', accountNumber: '' });
    setCardDetails({ number: '', expiry: '', cvv: '' });
    setMobileDetails({ wallet: '', phoneNumber: '' });
    setAgentLocation('');
    setPaymentResult(null);
    setShowSuccessScreen(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Success Screen Component
  const SuccessScreen = () => (
    <div className="text-center py-8 space-y-6">
      {paymentResult?.loan_settled ? (
        <>
          <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
            <PartyPopper className="h-10 w-10 text-green-600" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-green-700 mb-2">Loan Fully Settled! 🎉</h3>
            <p className="text-muted-foreground">
              Congratulations! You have successfully paid off your entire loan.
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-green-700 mb-2">Payment Successful!</h3>
            <p className="text-muted-foreground">
              Your payment has been processed successfully.
            </p>
          </div>
        </>
      )}
      
      <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Amount Paid</span>
          <span className="font-semibold">{formatNAD(paymentResult?.amount_paid || 0)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Amount Applied</span>
          <span className="font-semibold">{formatNAD(paymentResult?.amount_applied || 0)}</span>
        </div>
        {(paymentResult?.overpayment || 0) > 0 && (
          <div className="flex justify-between text-orange-600">
            <span>Overpayment (Credit)</span>
            <span className="font-semibold">{formatNAD(paymentResult?.overpayment || 0)}</span>
          </div>
        )}
        <div className="border-t pt-3 flex justify-between">
          <span className="text-muted-foreground">Reference</span>
          <span className="font-mono text-xs">{paymentResult?.reference_number}</span>
        </div>
        {!paymentResult?.loan_settled && (
          <div className="flex justify-between text-lg font-bold">
            <span>Remaining Balance</span>
            <span className="text-primary">{formatNAD(paymentResult?.new_outstanding || 0)}</span>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={handleClose}>
          Close
        </Button>
        {!paymentResult?.loan_settled && (
          <Button className="flex-1" onClick={() => {
            setShowSuccessScreen(false);
            setPaymentResult(null);
            fetchActiveLoans();
          }}>
            Make Another Payment
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Make a Payment</DialogTitle>
          <DialogDescription>
            Pay your loan installment securely with multiple payment options
          </DialogDescription>
        </DialogHeader>

        {showSuccessScreen ? (
          <SuccessScreen />
        ) : fetchingDetails ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading loan details...</p>
          </div>
        ) : activeLoans.length === 0 ? (
          <div className="text-center py-8">
            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Active Loans</h3>
            <p className="text-muted-foreground">
              You don't have any active loans that require payment at this time.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="loan">Select Loan</Label>
                <Select value={selectedLoan} onValueChange={(value) => {
                  setSelectedLoan(value);
                  const loan = activeLoans.find(l => l.id === value);
                  if (loan) {
                    setPaymentAmount(loan.next_payment_amount.toString());
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a loan" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeLoans.map((loan) => (
                      <SelectItem key={loan.id} value={loan.id}>
                        <div className="flex flex-col">
                          <span>{formatNAD(loan.amount)} Loan</span>
                          <span className="text-xs text-muted-foreground">
                            Balance: {formatNAD(loan.outstanding_balance)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Loan Balance Card */}
              {selectedLoanDetails && (
                <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 text-white p-4 rounded-xl">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-xs text-zinc-400 uppercase tracking-wider">Outstanding Balance</p>
                      <p className="text-2xl font-bold">{formatNAD(selectedLoanDetails.outstanding_balance)}</p>
                    </div>
                    <Badge variant={selectedLoanDetails.outstanding_balance > 0 ? "secondary" : "default"} className="bg-white/10">
                      {selectedLoanDetails.progress_percent}% Paid
                    </Badge>
                  </div>
                  <Progress value={selectedLoanDetails.progress_percent} className="h-2 mb-3" />
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-zinc-400">Total Paid</p>
                      <p className="font-semibold">{formatNAD(selectedLoanDetails.total_paid)}</p>
                    </div>
                    <div>
                      <p className="text-zinc-400">Next Due</p>
                      <p className="font-semibold">
                        {selectedLoanDetails.next_due_date 
                          ? new Date(selectedLoanDetails.next_due_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
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
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPaymentAmount(selectedLoanDetails.monthly_payment.toString())}
                    >
                      Monthly: {formatNAD(selectedLoanDetails.monthly_payment)}
                    </Button>
                    {selectedLoanDetails.outstanding_balance > selectedLoanDetails.monthly_payment && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-green-500 text-green-600 hover:bg-green-50"
                        onClick={() => setPaymentAmount(selectedLoanDetails.outstanding_balance.toString())}
                      >
                        Pay Full Balance: {formatNAD(selectedLoanDetails.outstanding_balance)}
                      </Button>
                    )}
                  </div>
                )}
                {selectedLoanDetails && parseFloat(paymentAmount) >= selectedLoanDetails.outstanding_balance && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>This payment will fully settle your loan!</span>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <Label>Payment Method</Label>
                <Tabs value={paymentMethod} onValueChange={setPaymentMethod} className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="bank">Bank EFT</TabsTrigger>
                    <TabsTrigger value="mobile">Mobile Money</TabsTrigger>
                    <TabsTrigger value="card">Debit Order (Card)</TabsTrigger>
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
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Bank</Label>
                        <Select value={bankDetails.bank} onValueChange={(value) => setBankDetails({...bankDetails, bank: value})}>
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
                      <div className="space-y-2">
                        <Label>Account Number</Label>
                        <Input 
                          placeholder="Enter account number" 
                          value={bankDetails.accountNumber}
                          onChange={(e) => setBankDetails({...bankDetails, accountNumber: e.target.value})}
                        />
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="mobile" className="space-y-4">
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
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Mobile Wallet</Label>
                        <Select value={mobileDetails.wallet} onValueChange={(value) => setMobileDetails({...mobileDetails, wallet: value})}>
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
                        <Input 
                          placeholder="+264 81 123 4567" 
                          value={mobileDetails.phoneNumber}
                          onChange={(e) => setMobileDetails({...mobileDetails, phoneNumber: e.target.value})}
                        />
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="card" className="space-y-4">
                    <div className="flex items-center gap-3 p-4 border rounded-lg">
                      <CreditCard className="h-8 w-8 text-primary" />
                      <div>
                        <h3 className="font-medium">Debit Order (Card)</h3>
                        <p className="text-sm text-muted-foreground">
                          Pay using your Visa or Mastercard; recorded as a debit order for our system consistency
                        </p>
                      </div>
                      <Badge variant="default">Instant</Badge>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Card Number</Label>
                        <Input 
                          placeholder="1234 5678 9012 3456" 
                          value={cardDetails.number}
                          onChange={(e) => setCardDetails({...cardDetails, number: e.target.value})}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Expiry Date</Label>
                          <Input 
                            placeholder="MM/YY" 
                            value={cardDetails.expiry}
                            onChange={(e) => setCardDetails({...cardDetails, expiry: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>CVV</Label>
                          <Input 
                            placeholder="123" 
                            value={cardDetails.cvv}
                            onChange={(e) => setCardDetails({...cardDetails, cvv: e.target.value})}
                          />
                        </div>
                      </div>
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
                      <Select value={agentLocation} onValueChange={setAgentLocation}>
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
            </div>

            <div className="space-y-4">
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-3">Payment Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment Amount</span>
                    <span className="font-medium">
                      {paymentAmount ? formatNAD(parseFloat(paymentAmount)) : formatNAD(0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Processing Fee</span>
                    <span className="font-medium">{formatNAD(processingFee)}</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between">
                      <span className="font-medium">Total Amount</span>
                      <span className="font-bold">{formatNAD(totalAmount)}</span>
                    </div>
                  </div>
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
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}