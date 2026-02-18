/**
 * IPS Payment Modal
 *
 * Modal for initiating IPS loan repayments
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard, CheckCircle2, XCircle, AlertTriangle, Wallet } from 'lucide-react';
import { VPAInput } from './VPAInput';
import { IPSTransactionStatus } from './IPSTransactionStatus';
import { useUserVPAs, getDefaultVPA } from '@/hooks/useUserVPAs';
import { useIPSRepayment } from '@/hooks/useIPSPayment';
import type { InitiateIPSRepaymentResult, IPSAdapterValidateVPAResponse } from '@/types/ips';
import { formatNAD } from '@/constants/regulatory';

interface IPSPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  loanId: string;
  outstandingBalance: number;
  monthlyPayment?: number;
  onSuccess?: (result: InitiateIPSRepaymentResult) => void;
  onError?: (error: string) => void;
}

type PaymentStep = 'amount' | 'vpa' | 'confirm' | 'processing' | 'result';

export function IPSPaymentModal({
  isOpen,
  onClose,
  loanId,
  outstandingBalance,
  monthlyPayment,
  onSuccess,
  onError,
}: IPSPaymentModalProps) {
  const [step, setStep] = useState<PaymentStep>('amount');
  const [amount, setAmount] = useState<string>('');
  const [selectedVpaId, setSelectedVpaId] = useState<string>('new');
  const [newVpa, setNewVpa] = useState<string>('');
  const [vpaValidation, setVpaValidation] = useState<IPSAdapterValidateVPAResponse | null>(null);
  const [result, setResult] = useState<InitiateIPSRepaymentResult | null>(null);

  const { data: vpasData, isLoading: vpasLoading } = useUserVPAs();
  const repaymentMutation = useIPSRepayment();

  const savedVpas = vpasData?.vpas || [];
  const defaultVpa = getDefaultVPA(savedVpas);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('amount');
      setAmount(monthlyPayment?.toString() || '');
      setSelectedVpaId(defaultVpa?.id || 'new');
      setNewVpa('');
      setVpaValidation(null);
      setResult(null);
    }
  }, [isOpen, monthlyPayment, defaultVpa]);

  const parsedAmount = parseFloat(amount) || 0;
  const isValidAmount = parsedAmount > 0 && parsedAmount <= outstandingBalance;

  const selectedVpa =
    selectedVpaId === 'new'
      ? newVpa
      : savedVpas.find((v) => v.id === selectedVpaId)?.vpa_address || '';

  const canProceedToVpa = isValidAmount;
  const canProceedToConfirm = selectedVpa && (selectedVpaId !== 'new' || vpaValidation?.isValid);

  const handleAmountSelect = (value: number) => {
    setAmount(value.toString());
  };

  const handleNext = () => {
    if (step === 'amount' && canProceedToVpa) {
      setStep('vpa');
    } else if (step === 'vpa' && canProceedToConfirm) {
      setStep('confirm');
    }
  };

  const handleBack = () => {
    if (step === 'vpa') setStep('amount');
    else if (step === 'confirm') setStep('vpa');
  };

  const handleSubmit = async () => {
    if (!selectedVpa || !isValidAmount) return;

    setStep('processing');

    try {
      const paymentResult = await repaymentMutation.mutateAsync({
        loanId,
        amount: parsedAmount,
        payerVpa: selectedVpa,
      });

      setResult(paymentResult);
      setStep('result');

      if (paymentResult.success) {
        onSuccess?.(paymentResult);
      } else {
        onError?.(paymentResult.message || 'Payment failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Payment failed';
      setResult({
        success: false,
        error: 'PAYMENT_ERROR',
        message: errorMessage,
      });
      setStep('result');
      onError?.(errorMessage);
    }
  };

  const handleClose = () => {
    if (step !== 'processing') {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]" data-testid="ips-payment-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Pay with IPS
          </DialogTitle>
          <DialogDescription>Make an instant payment using your bank account</DialogDescription>
        </DialogHeader>

        {/* Step: Amount Selection */}
        {step === 'amount' && (
          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-muted p-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Outstanding Balance</span>
                <span className="font-semibold">{formatNAD(outstandingBalance)}</span>
              </div>
              {monthlyPayment && (
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Monthly Payment</span>
                  <span>{formatNAD(monthlyPayment)}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Payment Amount</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                min={0}
                max={outstandingBalance}
                step={0.01}
                data-testid="ips-amount-input"
              />

              {/* Quick amount buttons */}
              <div className="flex gap-2 flex-wrap">
                {monthlyPayment && monthlyPayment <= outstandingBalance && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAmountSelect(monthlyPayment)}
                    data-testid="ips-monthly-amount-btn"
                  >
                    Monthly ({formatNAD(monthlyPayment)})
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAmountSelect(outstandingBalance)}
                  data-testid="ips-full-balance-btn"
                >
                  Full Balance ({formatNAD(outstandingBalance)})
                </Button>
              </div>

              {parsedAmount > outstandingBalance && (
                <p className="text-sm text-red-500">Amount cannot exceed outstanding balance</p>
              )}
            </div>
          </div>
        )}

        {/* Step: VPA Selection */}
        {step === 'vpa' && (
          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-muted p-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Amount to Pay</span>
                <span className="font-semibold">{formatNAD(parsedAmount)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Select Payment Address</Label>

              {vpasLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : (
                <RadioGroup
                  value={selectedVpaId}
                  onValueChange={setSelectedVpaId}
                  className="space-y-2"
                >
                  {savedVpas.map((vpa) => (
                    <div
                      key={vpa.id}
                      className="flex items-center space-x-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedVpaId(vpa.id)}
                    >
                      <RadioGroupItem value={vpa.id} id={vpa.id} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{vpa.vpa_address}</span>
                          {vpa.is_default && (
                            <Badge variant="secondary" className="text-xs">
                              Default
                            </Badge>
                          )}
                        </div>
                        {vpa.account_holder_name && (
                          <span className="text-sm text-muted-foreground">
                            {vpa.account_holder_name}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}

                  <div
                    className="flex items-center space-x-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedVpaId('new')}
                  >
                    <RadioGroupItem value="new" id="new-vpa" />
                    <span className="font-medium">Use a different address</span>
                  </div>
                </RadioGroup>
              )}

              {selectedVpaId === 'new' && (
                <div className="mt-3 pl-6">
                  <VPAInput
                    value={newVpa}
                    onChange={setNewVpa}
                    onValidationResult={setVpaValidation}
                    showValidateButton={true}
                    required
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step: Confirmation */}
        {step === 'confirm' && (
          <div className="space-y-4 py-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Please review the payment details before confirming.
              </AlertDescription>
            </Alert>

            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold text-lg">{formatNAD(parsedAmount)}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">From</span>
                <span className="font-medium">{selectedVpa}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">To</span>
                <span className="font-medium">collections@namlend</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Balance After Payment</span>
                <span>{formatNAD(outstandingBalance - parsedAmount)}</span>
              </div>
            </div>

            <p className="text-sm text-muted-foreground text-center">
              By clicking "Pay Now", you authorize this payment from your bank account.
            </p>
          </div>
        )}

        {/* Step: Processing */}
        {step === 'processing' && (
          <div className="py-8 text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <div>
              <p className="font-medium">Processing Payment</p>
              <p className="text-sm text-muted-foreground">
                Please wait while we process your payment...
              </p>
            </div>
          </div>
        )}

        {/* Step: Result */}
        {step === 'result' && result && (
          <div className="py-6 text-center space-y-4">
            {result.success ? (
              <>
                <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
                <div>
                  <p className="text-xl font-semibold text-green-600">Payment Successful!</p>
                  <p className="text-muted-foreground mt-1">
                    Your payment of {formatNAD(parsedAmount)} has been processed.
                  </p>
                </div>
                {result.ips_transaction_id && (
                  <IPSTransactionStatus transactionId={result.ips_transaction_id} compact />
                )}
              </>
            ) : (
              <>
                <XCircle className="h-16 w-16 text-red-500 mx-auto" />
                <div>
                  <p className="text-xl font-semibold text-red-600">Payment Failed</p>
                  <p className="text-muted-foreground mt-1">
                    {result.message || 'Your payment could not be processed.'}
                  </p>
                </div>
                {result.ips_transaction_id && (
                  <IPSTransactionStatus transactionId={result.ips_transaction_id} compact />
                )}
              </>
            )}
          </div>
        )}

        <DialogFooter>
          {step === 'amount' && (
            <>
              <Button variant="outline" onClick={handleClose} data-testid="ips-cancel-btn">
                Cancel
              </Button>
              <Button
                onClick={handleNext}
                disabled={!canProceedToVpa}
                data-testid="ips-continue-btn"
              >
                Continue
              </Button>
            </>
          )}

          {step === 'vpa' && (
            <>
              <Button variant="outline" onClick={handleBack} data-testid="ips-back-btn">
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={!canProceedToConfirm}
                data-testid="ips-continue-btn"
              >
                Continue
              </Button>
            </>
          )}

          {step === 'confirm' && (
            <>
              <Button variant="outline" onClick={handleBack} data-testid="ips-back-btn">
                Back
              </Button>
              <Button onClick={handleSubmit} className="gap-2" data-testid="ips-pay-now-btn">
                <CreditCard className="h-4 w-4" />
                Pay Now
              </Button>
            </>
          )}

          {step === 'result' && (
            <Button onClick={handleClose} className="w-full" data-testid="ips-done-btn">
              {result?.success ? 'Done' : 'Close'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default IPSPaymentModal;
