import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { 
  CreditCard, 
  Smartphone, 
  Building2, 
  MapPin,
  Shield
} from 'lucide-react';
import { formatNAD } from '@/utils/currency';
import { recordPayment } from '@/services/paymentService';

interface Loan {
  id: string;
  amount: number;
  monthly_payment: number;
  status: string;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onPaymentSuccess: () => void;
}

export default function PaymentModal({ isOpen, onClose, userId, onPaymentSuccess }: PaymentModalProps) {
  const [activeLoans, setActiveLoans] = useState<Loan[]>([]);
  const [selectedLoan, setSelectedLoan] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [processingFee] = useState(25);

  // Form fields for different payment methods
  const [bankDetails, setBankDetails] = useState({ bank: '', accountNumber: '' });
  const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvv: '' });
  const [mobileDetails, setMobileDetails] = useState({ wallet: '', phoneNumber: '' });
  const [agentLocation, setAgentLocation] = useState('');

  useEffect(() => {
    if (isOpen && userId) {
      fetchActiveLoans();
    }
  }, [isOpen, userId]);

  const fetchActiveLoans = async () => {
    try {
      const { data } = await supabase
        .from('loans')
        .select('*')
        .eq('user_id', userId)
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
      const res = await recordPayment({
        loanId: selectedLoan,
        amount: parseFloat(paymentAmount),
        payment_method: normalizeMethod(paymentMethod),
        reference_number: `PAY${Date.now()}`
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to record payment');
      }

      toast({
        title: "Payment Initiated",
        description: "Your payment has been initiated successfully."
      });

      onPaymentSuccess();
      onClose();
      resetForm();

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
  };

  

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Make a Payment</DialogTitle>
          <DialogDescription>
            Pay your loan installment securely with multiple payment options
          </DialogDescription>
        </DialogHeader>

        {activeLoans.length === 0 ? (
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPaymentAmount(selectedLoanDetails.monthly_payment.toString())}
                  >
                    Monthly Payment: {formatNAD(selectedLoanDetails.monthly_payment)}
                  </Button>
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