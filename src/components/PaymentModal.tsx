import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ThemedButton } from '@/components/ui/ThemedButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
  CreditCard, 
  Smartphone, 
  Building2, 
  MapPin,
  Shield,
  CheckCircle2,
  AlertCircle,
  Loader2,
  PartyPopper,
  Wallet,
  ArrowRight,
  Receipt,
  Banknote,
  ChevronRight,
  Zap
} from 'lucide-react';
import { formatNAD } from '@/utils/currency';
import { 
  processLoanPayment, 
  type ProcessPaymentResult
} from '@/services/paymentService';
import { useFetchActiveLoans, type LoanWithDetails } from '@/hooks/useFetchActiveLoans';

// Payment method validation rules - replaces sequential if-statements
const PAYMENT_VALIDATION_RULES: Record<string, (details: Record<string, string>) => boolean> = {
  ips: () => true, // No additional fields required
  bank: (d) => Boolean(d.bank && d.accountNumber),
  card: (d) => Boolean(d.number && d.expiry && d.cvv),
  mobile: (d) => Boolean(d.wallet && d.phoneNumber),
  agent: (d) => Boolean(d.location),
};

const PAYMENT_VALIDATION_MESSAGES: Record<string, string> = {
  bank: 'Select bank and enter account number.',
  card: 'Enter valid card information.',
  mobile: 'Enter wallet and phone number.',
  agent: 'Select an agent location.',
};

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onPaymentSuccess: () => void;
}

export default function PaymentModal({ isOpen, onClose, userId, onPaymentSuccess }: PaymentModalProps) {
  // Use custom hook for loan fetching - replaces ~90 lines of duplicated logic
  const { 
    loans: activeLoans, 
    isLoading: fetchingDetails, 
    selectedLoan: selectedLoanDetails,
    setSelectedLoanId,
    refetch: fetchActiveLoans 
  } = useFetchActiveLoans({ userId, enabled: isOpen });

  const [paymentMethod, setPaymentMethod] = useState('bank');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [processingFee] = useState(25);
  const [paymentResult, setPaymentResult] = useState<ProcessPaymentResult | null>(null);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);

  // Form fields for different payment methods
  const [bankDetails, setBankDetails] = useState({ bank: '', accountNumber: '' });
  const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvv: '' });
  const [mobileDetails, setMobileDetails] = useState({ wallet: '', phoneNumber: '' });
  const [agentLocation, setAgentLocation] = useState('');

  // Sync payment amount when selected loan changes
  useEffect(() => {
    if (selectedLoanDetails) {
      setPaymentAmount(selectedLoanDetails.next_payment_amount.toString());
    }
  }, [selectedLoanDetails]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setShowSuccessScreen(false);
      setPaymentResult(null);
    }
  }, [isOpen]);

  const selectedLoan = selectedLoanDetails?.id || '';
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

    // Validate payment method specific fields using validation map
    const validationDetails: Record<string, string> = {
      bank: bankDetails.bank,
      accountNumber: bankDetails.accountNumber,
      number: cardDetails.number,
      expiry: cardDetails.expiry,
      cvv: cardDetails.cvv,
      wallet: mobileDetails.wallet,
      phoneNumber: mobileDetails.phoneNumber,
      location: agentLocation,
    };
    
    const validator = PAYMENT_VALIDATION_RULES[paymentMethod];
    if (validator && !validator(validationDetails)) {
      const message = PAYMENT_VALIDATION_MESSAGES[paymentMethod] || 'Please complete all required fields.';
      toast({ title: "Incomplete Details", description: message, variant: "destructive" });
      return;
    }

    setLoading(true);

    // Normalize method to UI-supported enums
    const normalizeMethod = (m: string) => {
      if (m === 'ips') return 'ips';
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
          description: `Processed ${formatNAD(result.amount_applied || 0)}`,
        });
      }

      onPaymentSuccess();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({
        title: "Payment Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedLoanId('');
    setPaymentMethod('bank');
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
    <div className="flex flex-col items-center justify-center py-10 space-y-8 animate-in fade-in zoom-in duration-300">
      <div className="relative">
        <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full" />
        <div className="h-24 w-24 rounded-full bg-zinc-900 border-2 border-green-500/30 flex items-center justify-center relative z-10 shadow-lg shadow-green-500/10">
          {paymentResult?.loan_settled ? (
            <PartyPopper className="h-10 w-10 text-green-500" />
          ) : (
            <CheckCircle2 className="h-10 w-10 text-green-500" />
          )}
        </div>
      </div>
      
      <div className="text-center space-y-2">
        <h3 className="text-2xl font-bold text-foreground tracking-tight">
          {paymentResult?.loan_settled ? 'Loan Settled!' : 'Payment Successful'}
        </h3>
        <p className="text-muted-foreground max-w-xs mx-auto text-sm">
          {paymentResult?.loan_settled 
            ? 'You have successfully paid off this loan. A settlement letter has been emailed to you.'
            : `Transaction ID: ${paymentResult?.reference_number}`
          }
        </p>
      </div>
      
      <div className="w-full max-w-sm bg-muted/50 rounded-2xl border border-border p-6 space-y-4">
        <div className="flex justify-between items-center pb-4 border-b border-border">
          <span className="text-sm text-muted-foreground">Amount Paid</span>
          <span className="text-lg font-bold text-foreground">{formatNAD(paymentResult?.amount_paid || 0)}</span>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Applied to Principal</span>
            <span className="text-foreground">{formatNAD(paymentResult?.amount_applied || 0)}</span>
          </div>
          {(paymentResult?.overpayment || 0) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-orange-500">Overpayment Credit</span>
              <span className="text-orange-400 font-medium">{formatNAD(paymentResult?.overpayment || 0)}</span>
            </div>
          )}
          {!paymentResult?.loan_settled && (
             <div className="flex justify-between text-sm pt-2">
               <span className="text-muted-foreground">Remaining Balance</span>
               <span className="text-blue-400 font-medium">{formatNAD(paymentResult?.new_outstanding || 0)}</span>
             </div>
          )}
        </div>
      </div>

      <div className="flex gap-3 w-full max-w-sm">
        <ThemedButton variant="outline" className="flex-1 bg-transparent border-border text-muted-foreground hover:bg-muted hover:text-foreground" onClick={handleClose}>
          Done
        </ThemedButton>
        {!paymentResult?.loan_settled && (
          <ThemedButton className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => {
            setShowSuccessScreen(false);
            setPaymentResult(null);
            fetchActiveLoans();
          }}>
            Pay More
          </ThemedButton>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden p-0 gap-0 bg-background border-border flex flex-col">
        {/* Header */}
        <DialogHeader className="p-6 border-b border-border bg-background/95 backdrop-blur-xl shrink-0 z-10">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                    <Wallet className="h-5 w-5 text-blue-500" />
                 </div>
                 <div>
                    <DialogTitle className="text-xl font-bold tracking-tight text-foreground">Make Payment</DialogTitle>
                    <DialogDescription className="text-muted-foreground text-xs mt-0.5">Secure, encrypted transaction</DialogDescription>
                 </div>
              </div>
           </div>
        </DialogHeader>

        {showSuccessScreen ? (
          <div className="flex-1 overflow-y-auto">
             <SuccessScreen />
          </div>
        ) : fetchingDetails ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
            <p className="text-sm">Loading loan details...</p>
          </div>
        ) : activeLoans.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-muted-foreground border-2 border-dashed border-border m-6 rounded-2xl">
            <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-bold text-foreground mb-1">All Caught Up!</h3>
            <p className="text-sm max-w-xs text-center">You don't have any active loans requiring payment at this time.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto grid md:grid-cols-2">
            {/* Left Panel: Loan & Amount */}
            <div className="p-6 space-y-6 border-b md:border-b-0 md:border-r border-border">
              {/* Loan Selector */}
              <div className="space-y-3">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Select Loan</Label>
                <Select value={selectedLoan} onValueChange={(value) => {
                  setSelectedLoanId(value);
                }}>
                  <SelectTrigger className="bg-secondary border-transparent h-12 text-foreground">
                    <SelectValue placeholder="Choose a loan" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {activeLoans.map((loan) => (
                      <SelectItem key={loan.id} value={loan.id} className="text-foreground focus:bg-accent focus:text-accent-foreground">
                        <span className="font-medium">{formatNAD(loan.amount)} Loan</span>
                        <span className="ml-2 text-muted-foreground text-xs">Due: {formatNAD(loan.next_payment_amount)}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Balance Card */}
              {selectedLoanDetails && (
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 p-5 group shadow-lg shadow-black/40 text-white">
                   <div className="absolute top-0 right-0 p-3 opacity-10">
                      <Receipt className="h-24 w-24 text-white transform rotate-12" />
                   </div>
                   <div className="relative z-10">
                      <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Outstanding Balance</p>
                      <div className="flex items-baseline gap-2 mb-4">
                         <span className="text-2xl font-bold tracking-tight">{formatNAD(selectedLoanDetails.outstanding_balance ?? 0)}</span>
                         <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border-0 text-[10px]">
                            {selectedLoanDetails.progress_percent ?? 0}% Paid
                         </Badge>
                      </div>
                      <Progress value={selectedLoanDetails.progress_percent ?? 0} className="h-1.5 bg-zinc-800 mb-4" indicatorClassName="bg-blue-500" />
                      <div className="flex justify-between text-xs text-zinc-400">
                         <span>Next Due: <span className="text-zinc-200">{(() => {
                           try {
                             if (!selectedLoanDetails.next_due_date) return 'N/A';
                             const date = new Date(selectedLoanDetails.next_due_date);
                             if (isNaN(date.getTime())) return 'N/A';
                             return date.toLocaleDateString('en-ZA', {day:'numeric', month:'short'});
                           } catch { return 'N/A'; }
                         })()}</span></span>
                         <span>Amt: <span className="text-blue-400">{formatNAD(selectedLoanDetails.next_payment_amount ?? 0)}</span></span>
                      </div>
                   </div>
                </div>
              )}

              {/* Amount Input */}
              <div className="space-y-3">
                 <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Payment Amount</Label>
                 <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
                    <Input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="pl-8 bg-secondary border-transparent text-foreground text-lg h-12 focus:ring-blue-500/20 focus:border-blue-500"
                      placeholder="0.00"
                    />
                 </div>
                 {selectedLoanDetails && (
                    <div className="flex gap-2">
                       <ThemedButton 
                         variant="outline" 
                         size="sm" 
                         className="flex-1 bg-secondary border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/80 text-xs h-8"
                         onClick={() => setPaymentAmount(selectedLoanDetails.monthly_payment.toString())}
                       >
                         Monthly
                       </ThemedButton>
                       {selectedLoanDetails.outstanding_balance > selectedLoanDetails.monthly_payment && (
                         <ThemedButton 
                           variant="outline" 
                           size="sm" 
                           className="flex-1 bg-secondary border-transparent text-blue-500 hover:text-blue-600 hover:bg-blue-500/10 text-xs h-8"
                           onClick={() => setPaymentAmount(selectedLoanDetails.outstanding_balance.toString())}
                         >
                           Pay Full
                         </ThemedButton>
                       )}
                    </div>
                 )}
              </div>
            </div>

            {/* Right Panel: Method & Action */}
            <div className="p-6 bg-muted/30 space-y-6 flex flex-col h-full">
              <div className="space-y-3 flex-1">
                 <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Payment Method</Label>
                 <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'ips', icon: Zap, label: 'IPP Instant', highlight: true },
                      { id: 'bank', icon: Building2, label: 'Bank EFT' },
                      { id: 'mobile', icon: Smartphone, label: 'Mobile' },
                      { id: 'card', icon: CreditCard, label: 'Card' },
                      { id: 'agent', icon: MapPin, label: 'Agent' }
                    ].map((method) => (
                      <button
                        key={method.id}
                        onClick={() => setPaymentMethod(method.id)}
                        className={cn(
                          "flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all duration-200 relative",
                          paymentMethod === method.id 
                            ? "bg-blue-500/10 border-blue-500/50 text-blue-600 dark:text-blue-400" 
                            : (method as any).highlight
                              ? "bg-green-500/5 border-green-500/30 text-green-600 dark:text-green-400 hover:bg-green-500/10"
                              : "bg-card border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                        )}
                      >
                         <method.icon className="h-5 w-5" />
                         <span className="text-xs font-medium">{method.label}</span>
                      </button>
                    ))}
                 </div>

                 <div className="mt-4 pt-4 border-t border-border">
                    {paymentMethod === 'ips' && (
                       <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                             <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium mb-1">
                                <Zap className="h-4 w-4" />
                                <span>Instant Payment</span>
                             </div>
                             <p className="text-xs text-muted-foreground">
                                Pay instantly using your VPA. Funds are transferred in real-time.
                             </p>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                             <CheckCircle2 className="h-3 w-3 text-green-500" />
                             <span>No additional fees</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                             <CheckCircle2 className="h-3 w-3 text-green-500" />
                             <span>Secure bank-to-bank transfer</span>
                          </div>
                       </div>
                    )}
                    {paymentMethod === 'bank' && (
                       <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                          <Select value={bankDetails.bank} onValueChange={(v) => setBankDetails({...bankDetails, bank: v})}>
                             <SelectTrigger className="bg-card border-border text-foreground"><SelectValue placeholder="Select Bank" /></SelectTrigger>
                             <SelectContent className="bg-popover border-border">
                                <SelectItem value="fnb">FNB Namibia</SelectItem>
                                <SelectItem value="bw">Bank Windhoek</SelectItem>
                                <SelectItem value="standard">Standard Bank</SelectItem>
                             </SelectContent>
                          </Select>
                          <Input 
                            placeholder="Account Number" 
                            value={bankDetails.accountNumber} 
                            onChange={(e) => setBankDetails({...bankDetails, accountNumber: e.target.value})}
                            className="bg-card border-border text-foreground"
                          />
                       </div>
                    )}
                    {paymentMethod === 'mobile' && (
                       <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                          <Select value={mobileDetails.wallet} onValueChange={(v) => setMobileDetails({...mobileDetails, wallet: v})}>
                             <SelectTrigger className="bg-card border-border text-foreground"><SelectValue placeholder="Select Wallet" /></SelectTrigger>
                             <SelectContent className="bg-popover border-border">
                                <SelectItem value="mtc">MTC Maris</SelectItem>
                                <SelectItem value="ewallet">FNB eWallet</SelectItem>
                             </SelectContent>
                          </Select>
                          <Input 
                            placeholder="Mobile Number" 
                            value={mobileDetails.phoneNumber} 
                            onChange={(e) => setMobileDetails({...mobileDetails, phoneNumber: e.target.value})}
                            className="bg-card border-border text-foreground"
                          />
                       </div>
                    )}
                    {paymentMethod === 'card' && (
                       <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                          <Input 
                            placeholder="Card Number" 
                            value={cardDetails.number} 
                            onChange={(e) => setCardDetails({...cardDetails, number: e.target.value})}
                            className="bg-card border-border text-foreground"
                          />
                          <div className="grid grid-cols-2 gap-2">
                             <Input placeholder="MM/YY" value={cardDetails.expiry} onChange={(e) => setCardDetails({...cardDetails, expiry: e.target.value})} className="bg-card border-border text-foreground"/>
                             <Input placeholder="CVV" value={cardDetails.cvv} onChange={(e) => setCardDetails({...cardDetails, cvv: e.target.value})} className="bg-card border-border text-foreground"/>
                          </div>
                       </div>
                    )}
                     {paymentMethod === 'agent' && (
                       <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                          <Select value={agentLocation} onValueChange={setAgentLocation}>
                             <SelectTrigger className="bg-card border-border text-foreground"><SelectValue placeholder="Select Location" /></SelectTrigger>
                             <SelectContent className="bg-popover border-border">
                                <SelectItem value="windhoek-cbd">Windhoek CBD</SelectItem>
                                <SelectItem value="katutura">Katutura</SelectItem>
                             </SelectContent>
                          </Select>
                       </div>
                    )}
                 </div>
              </div>

              {/* Summary & Pay Button */}
              <div className="space-y-4 pt-4 border-t border-border mt-auto">
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="text-foreground">{formatNAD(parseFloat(paymentAmount || '0'))}</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Fee</span>
                    <span className="text-foreground">{formatNAD(processingFee)}</span>
                 </div>
                 <div className="flex justify-between items-center text-lg font-bold">
                    <span className="text-foreground">Total</span>
                    <span className="text-foreground">{formatNAD(totalAmount)}</span>
                 </div>

                 <ThemedButton 
                   onClick={handlePayment}
                   disabled={loading || !paymentAmount || !selectedLoan}
                   className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-lg font-medium shadow-lg shadow-blue-900/20"
                 >
                   {loading ? (
                     <Loader2 className="h-5 w-5 animate-spin" />
                   ) : (
                     <span className="flex items-center gap-2">
                       Confirm Payment <ArrowRight className="h-4 w-4" />
                     </span>
                   )}
                 </ThemedButton>
                 
                 <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Shield className="h-3 w-3" />
                    <span>256-bit SSL Encrypted</span>
                 </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}