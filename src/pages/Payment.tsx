import DashboardLayout from '@/components/Layout/DashboardLayout';
import { IPSPaymentModal } from '@/components/ips';
import { ThemedButton } from '@/components/ui/ThemedButton';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { ThemedInput } from '@/components/ui/ThemedInput';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useEntitlements } from '@/hooks/useEntitlements';
import { api } from '@/integrations/convex/api';
import { cn } from '@/lib/utils';
import type { Id } from '@/types/convex';
import { formatNAD } from '@/utils/currency';
import { validatePaymentAmount } from '@/utils/paymentValidation';
import { useMutation, useQuery } from 'convex/react';
import {
  AlertCircle,
  CheckCircle,
  CreditCard,
  Loader2,
  MapPin,
  Shield,
  Smartphone,
  Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate } from 'react-router-dom';

interface Loan {
  id: string;
  amount: number;
  outstanding_balance: number;
  monthly_payment: number;
  status: string;
  created_at: string;
}

export default function Payment() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { t } = useTranslation('payment');
  const { hasFeature } = useEntitlements();
  const bankingEnabled = hasFeature('clientBanking');
  const applicationsEnabled = hasFeature('clientApplications');
  // Convex reactive queries
  const rawLoans = useQuery(api.loans.getMyLoans, {});
  const recordPaymentMutation = useMutation(api.payments.recordPayment);

  // Filter to loans that can be repaid via the server-side IPP repayment state machine.
  const activeLoans: Loan[] = (rawLoans ?? [])
    .filter((l) => ['active', 'disbursed', 'funded'].includes(l.status))
    .map((l) => {
      const principal = l.principal ?? l.amount ?? 0;
      const outstandingBalance = l.outstandingBalance ?? principal;
      const scheduledPayment =
        l.monthlyPayment && l.monthlyPayment > 0 ? l.monthlyPayment : outstandingBalance;
      return {
        id: l._id,
        amount: principal,
        outstanding_balance: outstandingBalance,
        monthly_payment: scheduledPayment,
        status: l.status,
        created_at: l.createdAt ? new Date(l.createdAt).toISOString() : '',
      };
    });

  const [selectedLoan, setSelectedLoan] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState(bankingEnabled ? 'ips' : 'card');
  const [showIPSModal, setShowIPSModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab] = useState('payments');

  const handleTabChange = (tab: string) => {
    if (tab === 'payments') return;
    if (tab === 'budget') {
      navigate('/budget');
      return;
    }
    if (tab === 'documents') {
      navigate('/kyc');
      return;
    }
    navigate('/dashboard', { state: { tab } });
  };

  // Settlement ceiling for the selected loan: outstanding principal plus
  // interest already due (payoff quote). Falls back to outstanding balance
  // while loading.
  const payoffQuote = useQuery(
    api.payments.getPayoffQuote,
    selectedLoan ? { loanId: selectedLoan as Id<'loans'> } : 'skip'
  );

  // Auto-select only when there is exactly one loan — with multiple loans the
  // user must choose explicitly so a payment can't silently target the wrong one.
  useEffect(() => {
    if (activeLoans.length === 1 && !selectedLoan) {
      setSelectedLoan(activeLoans[0].id);
      setPaymentAmount(activeLoans[0].monthly_payment.toString());
    }
  }, [activeLoans, selectedLoan]);

  useEffect(() => {
    if (!bankingEnabled && paymentMethod === 'ips') setPaymentMethod('card');
  }, [bankingEnabled, paymentMethod]);

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

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const selectedLoanDetails = activeLoans.find((loan) => loan.id === selectedLoan);
  const currentProcessingFee = getProcessingFee(paymentMethod);
  const totalAmount = parseFloat(paymentAmount || '0') + currentProcessingFee;
  const paymentCeiling = selectedLoanDetails
    ? Math.max(selectedLoanDetails.outstanding_balance, payoffQuote?.payoffQuote ?? 0)
    : NaN;

  // Inline validation feedback while the user types (only once an amount is entered)
  const amountValidation =
    paymentAmount && selectedLoanDetails
      ? validatePaymentAmount(parseFloat(paymentAmount), paymentCeiling)
      : { valid: true as const };

  // Map UI-friendly payment method names to RPC canonical enum values
  const paymentMethodToRpc: Record<string, string> = {
    ips: 'ips',
    bank: 'bank_transfer',
    mobile: 'mobile_money',
    card: 'debit_order',
    agent: 'cash',
  };

  const handlePayment = async () => {
    if (!selectedLoan || !paymentMethod || !paymentAmount) {
      toast({
        title: t('toast.missingInfoTitle'),
        description: t('toast.missingInfoDescription'),
        variant: 'destructive',
      });
      return;
    }

    const validation = validatePaymentAmount(parseFloat(paymentAmount), paymentCeiling);
    if (!validation.valid) {
      toast({
        title: t('toast.missingInfoTitle'),
        description: validation.message,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const rpcPaymentMethod = paymentMethodToRpc[paymentMethod] || paymentMethod;

      // Use Convex mutation for payment recording with audit trail + TigerBeetle outbox.
      // The split must sum to `amount` (server-validated): the entered amount goes to
      // principal, the processing fee is carried explicitly on top.
      const principalAmount = parseFloat(paymentAmount);
      const paymentId = await recordPaymentMutation({
        loanId: selectedLoan as Id<'loans'>,
        amount: principalAmount + processingFee,
        principalPaid: principalAmount,
        feesPaid: processingFee,
        method: rpcPaymentMethod,
      });

      toast({
        title: t('toast.initiatedTitle'),
        description: t('toast.initiatedDescription', {
          reference: paymentId,
          total: (parseFloat(paymentAmount) + processingFee).toFixed(2),
        }),
      });

      // In a real app, this would redirect to the payment processor
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        title: t('toast.failedTitle'),
        description: t('toast.failedDescription'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePayClick = () => {
    if (paymentAmount && selectedLoanDetails) {
      const validation = validatePaymentAmount(parseFloat(paymentAmount), paymentCeiling);
      if (!validation.valid) {
        toast({
          title: t('toast.missingInfoTitle'),
          description: validation.message,
          variant: 'destructive',
        });
        return;
      }
    }
    if (paymentMethod === 'ips' && bankingEnabled) {
      setShowIPSModal(true);
    } else {
      handlePayment();
    }
  };

  // Distinguish "still loading" from "genuinely no loans" — otherwise the
  // empty state flashes while the query is in flight.
  if (rawLoans === undefined) {
    return (
      <DashboardLayout activeTab={activeTab} onTabChange={handleTabChange} title={t('title')}>
        <div className="flex items-center justify-center py-16">
          <Loader2 className={cn('h-8 w-8 animate-spin', 'font-sans text-[#274F35]')} />
        </div>
      </DashboardLayout>
    );
  }

  if (activeLoans.length === 0) {
    return (
      <DashboardLayout activeTab={activeTab} onTabChange={handleTabChange} title={t('title')}>
        <div className="max-w-2xl">
          <ThemedCard className="flex flex-col items-center justify-center py-12">
            <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className={cn('text-lg font-medium mb-2', 'font-sans text-[#274F35]')}>
              {t('noActiveLoans.title')}
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              {t('noActiveLoans.description')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              {applicationsEnabled && (
                <ThemedButton onClick={() => navigate('/loan-application')}>
                  {t('noActiveLoans.applyButton', 'Apply for a Loan')}
                </ThemedButton>
              )}
              <ThemedButton variant="outline" onClick={() => navigate('/dashboard')}>
                {t('noActiveLoans.returnButton')}
              </ThemedButton>
            </div>
          </ThemedCard>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={handleTabChange} title={t('title')}>
      <div className="max-w-4xl">
        <div className="mb-8">
          <h1 className={cn('text-3xl font-bold mb-2', 'font-sans text-[#274F35]')}>
            {t('title')}
          </h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <ThemedCard>
              <div className="mb-6">
                <h2 className={cn('text-xl font-bold', 'font-sans text-[#274F35]')}>
                  {t('form.paymentDetails')}
                </h2>
                <p className="text-sm text-muted-foreground">{t('form.paymentDetailsSubtitle')}</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="loan">{t('form.selectLoan')}</Label>
                  <Select
                    value={selectedLoan}
                    onValueChange={(value) => {
                      setSelectedLoan(value);
                      const loan = activeLoans.find((l) => l.id === value);
                      if (loan) setPaymentAmount(loan.monthly_payment.toString());
                    }}
                  >
                    <SelectTrigger
                      id="loan"
                      className={cn(
                        'rounded-xl border border-[#B9CCB3] bg-white text-[#274F35] placeholder:text-slate-400 focus:border-[#3F713E] focus:ring-[#3F713E]/20',
                        'font-sans text-[#274F35]'
                      )}
                    >
                      <SelectValue placeholder={t('form.selectLoanPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {activeLoans.map((loan) => (
                        <SelectItem key={loan.id} value={loan.id}>
                          {t('form.loanOption', {
                            amount: formatNAD(loan.amount),
                            monthly: formatNAD(loan.monthly_payment),
                          })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">{t('form.paymentAmount')}</Label>
                  <ThemedInput
                    id="amount"
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder={t('form.enterAmount')}
                    aria-invalid={!amountValidation.valid}
                  />
                  {!amountValidation.valid ? (
                    <p className="text-sm text-destructive" role="alert">
                      {amountValidation.message}
                    </p>
                  ) : (
                    selectedLoanDetails && (
                      <p className="text-xs text-muted-foreground">
                        Outstanding balance: {formatNAD(selectedLoanDetails.outstanding_balance)}
                      </p>
                    )
                  )}
                </div>

                <div className="space-y-2">
                  <Label>{t('form.paymentMethod')}</Label>
                  <Tabs value={paymentMethod} className="w-full" onValueChange={setPaymentMethod}>
                    <TabsList
                      className={cn(
                        'grid w-full bg-muted/50 p-1 h-auto gap-1',
                        isMobile ? 'grid-cols-1' : bankingEnabled ? 'grid-cols-3' : 'grid-cols-2'
                      )}
                    >
                      {bankingEnabled && (
                        <TabsTrigger value="ips" className="data-[state=active]:bg-background py-3">
                          <Zap className="h-4 w-4 mr-2" /> {t('methods.ips.label')}
                        </TabsTrigger>
                      )}
                      <TabsTrigger value="card" className="data-[state=active]:bg-background py-3">
                        <CreditCard className="h-4 w-4 mr-2" /> {t('methods.card.label')}
                      </TabsTrigger>
                      <TabsTrigger
                        value="mobile"
                        className="data-[state=active]:bg-background py-3"
                      >
                        <Smartphone className="h-4 w-4 mr-2" /> {t('methods.mobile.label')}
                      </TabsTrigger>
                    </TabsList>

                    <div className="mt-4">
                      {bankingEnabled && (
                        <TabsContent value="ips">
                          <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
                            <div className="flex items-start gap-3">
                              <Zap className="h-5 w-5 text-blue-600 mt-0.5" />
                              <div>
                                <h4 className="font-medium text-blue-900">
                                  {t('methods.ips.title')}
                                </h4>
                                <p className="text-sm text-blue-700 mt-1">
                                  {t('methods.ips.description')}
                                </p>
                              </div>
                            </div>
                          </div>
                        </TabsContent>
                      )}

                      <TabsContent value="card">
                        <div className="p-4 rounded-lg bg-muted/50 border border-border">
                          <div className="flex items-start gap-3">
                            <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div>
                              <h4 className="font-medium text-foreground">
                                {t('methods.card.title')}
                              </h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {t('methods.card.description')}
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
                              <h4 className="font-medium text-foreground">
                                {t('methods.mobile.title')}
                              </h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {t('methods.mobile.description')}
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
                          <h3 className="font-medium text-foreground">
                            {t('methods.card.debitCard')}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {t('methods.card.debitCardDescription')}
                          </p>
                        </div>
                        <Badge variant="default">{t('methods.card.instant')}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>{t('methods.card.cardNumber')}</Label>
                          <Input
                            placeholder={t('methods.card.cardNumberPlaceholder')}
                            className="bg-background border-input text-foreground"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('methods.card.expiryDate')}</Label>
                          <Input
                            placeholder={t('methods.card.expiryPlaceholder')}
                            className="bg-background border-input text-foreground"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>{t('methods.card.cvv')}</Label>
                        <Input
                          placeholder={t('methods.card.cvvPlaceholder')}
                          className="w-24 bg-background border-input text-foreground"
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="agent" className="space-y-4">
                      <div className="flex items-center gap-3 p-4 border rounded-lg border-border bg-card">
                        <MapPin className="h-8 w-8 text-primary" />
                        <div>
                          <h3 className="font-medium text-foreground">
                            {t('methods.agent.title')}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {t('methods.agent.description')}
                          </p>
                        </div>
                        <Badge variant="secondary">{t('methods.agent.processingTime')}</Badge>
                      </div>
                      <div className="space-y-2">
                        <Label>{t('methods.agent.selectLocation')}</Label>
                        <Select>
                          <SelectTrigger className="bg-background border-input text-foreground">
                            <SelectValue placeholder={t('methods.agent.locationPlaceholder')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="windhoek-cbd">
                              {t('methods.agent.locations.windhoekCbd')}
                            </SelectItem>
                            <SelectItem value="katutura">
                              {t('methods.agent.locations.katutura')}
                            </SelectItem>
                            <SelectItem value="swakopmund">
                              {t('methods.agent.locations.swakopmund')}
                            </SelectItem>
                            <SelectItem value="oshakati">
                              {t('methods.agent.locations.oshakati')}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>

                <div className="flex items-center gap-2 p-4 bg-blue-50  rounded-lg">
                  <Shield className="h-5 w-5 text-blue-600 " />
                  <div className="text-sm">
                    <p className="font-medium text-blue-800 ">{t('security.title')}</p>
                    <p className="text-blue-600 ">{t('security.description')}</p>
                  </div>
                </div>

                <Button
                  onClick={handlePayClick}
                  disabled={loading || !paymentMethod || !paymentAmount || !selectedLoan}
                  className="w-full"
                  size="lg"
                  data-testid="payment-submit-button"
                >
                  {loading ? t('processing') : t('payButton', { amount: formatNAD(totalAmount) })}
                </Button>
              </div>
            </ThemedCard>
          </div>

          {/* IPS Payment Modal */}
          {bankingEnabled && selectedLoanDetails && (
            <IPSPaymentModal
              isOpen={showIPSModal}
              onClose={() => setShowIPSModal(false)}
              loanId={selectedLoan}
              outstandingBalance={selectedLoanDetails.outstanding_balance}
              monthlyPayment={selectedLoanDetails.monthly_payment}
              onSuccess={() => {
                setShowIPSModal(false);
                toast({
                  title: t('toast.successTitle'),
                  description: t('toast.successDescription'),
                });
                setTimeout(() => navigate('/dashboard'), 2000);
              }}
              onError={(error) => {
                toast({
                  title: t('toast.failedTitle'),
                  description: error,
                  variant: 'destructive',
                });
              }}
            />
          )}

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('summary.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      {t('summary.paymentAmount')}
                    </span>
                    <span className="font-medium">
                      {paymentAmount ? formatNAD(parseFloat(paymentAmount)) : formatNAD(0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      {t('summary.processingFee')}
                    </span>
                    <span className="font-medium">{formatNAD(processingFee)}</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between">
                      <span className="font-medium">{t('summary.totalAmount')}</span>
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
                  {t('benefits.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>{t('benefits.instantConfirmation')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>{t('benefits.autoBalanceUpdate')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>{t('benefits.receipts')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>{t('benefits.earlyDiscount')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  {t('important.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>• {t('important.afterHours')}</p>
                <p>• {t('important.keepReference')}</p>
                <p>• {t('important.contactSupport')}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
