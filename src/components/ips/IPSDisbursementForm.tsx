/**
 * IPS Disbursement Form Component
 * 
 * Admin form for initiating loan disbursements via IPS
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Loader2,
  Send,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Wallet,
  User,
  CreditCard,
} from 'lucide-react';
import { VPAInput } from './VPAInput';
import { IPSTransactionStatus } from './IPSTransactionStatus';
import { useIPSDisbursement } from '@/hooks/useIPSPayment';
import type { IPSAdapterValidateVPAResponse, InitiateIPSDisbursementResult } from '@/types/ips';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface IPSDisbursementFormProps {
  disbursementId: string;
  loanId: string;
  amount: number;
  customerName: string;
  customerVpa?: string;
  onSuccess?: (result: InitiateIPSDisbursementResult) => void;
  onError?: (error: string) => void;
  className?: string;
}

type DisbursementStep = 'input' | 'confirm' | 'processing' | 'result';

export function IPSDisbursementForm({
  disbursementId,
  loanId,
  amount,
  customerName,
  customerVpa: initialVpa = '',
  onSuccess,
  onError,
  className,
}: IPSDisbursementFormProps) {
  const [step, setStep] = useState<DisbursementStep>('input');
  const [payeeVpa, setPayeeVpa] = useState(initialVpa);
  const [vpaValidation, setVpaValidation] = useState<IPSAdapterValidateVPAResponse | null>(null);
  const [result, setResult] = useState<InitiateIPSDisbursementResult | null>(null);
  
  const disbursementMutation = useIPSDisbursement();

  const canProceed = payeeVpa && (vpaValidation?.isValid || initialVpa === payeeVpa);

  const handleConfirm = () => {
    if (canProceed) {
      setStep('confirm');
    }
  };

  const handleBack = () => {
    setStep('input');
  };

  const handleSubmit = async () => {
    setStep('processing');
    
    try {
      const disbursementResult = await disbursementMutation.mutateAsync({
        disbursementId,
        payeeVpa,
        note: `Loan disbursement for ${customerName}`,
      });
      
      setResult(disbursementResult);
      setStep('result');
      
      if (disbursementResult.success) {
        onSuccess?.(disbursementResult);
      } else {
        onError?.(disbursementResult.message || 'Disbursement failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Disbursement failed';
      setResult({
        success: false,
        error: 'DISBURSEMENT_ERROR',
        message: errorMessage,
      });
      setStep('result');
      onError?.(errorMessage);
    }
  };

  const handleReset = () => {
    setStep('input');
    setResult(null);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          IPS Disbursement
        </CardTitle>
        <CardDescription>
          Disburse loan funds via Instant Payment Solution
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Step: Input VPA */}
        {step === 'input' && (
          <div className="space-y-4">
            {/* Disbursement Summary */}
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Customer</span>
                <span className="font-medium ml-auto">{customerName}</span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Amount</span>
                <span className="font-semibold text-lg ml-auto">{formatCurrency(amount)}</span>
              </div>
            </div>

            {/* VPA Input */}
            <VPAInput
              value={payeeVpa}
              onChange={setPayeeVpa}
              onValidationResult={setVpaValidation}
              label="Customer's Payment Address (VPA)"
              placeholder="customer@bank"
              showValidateButton={true}
              required
            />

            {/* Action Button */}
            <Button
              onClick={handleConfirm}
              disabled={!canProceed}
              className="w-full"
            >
              Continue to Confirm
            </Button>
          </div>
        )}

        {/* Step: Confirm */}
        {step === 'confirm' && (
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Please verify the disbursement details before proceeding.
                This action cannot be undone.
              </AlertDescription>
            </Alert>

            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold text-lg">{formatCurrency(amount)}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">From</span>
                <span className="font-medium">disbursements@namlend</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">To</span>
                <span className="font-medium">{payeeVpa}</span>
              </div>
              {vpaValidation?.accountHolderName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account Holder</span>
                  <span className="text-sm">{vpaValidation.accountHolderName}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Customer</span>
                <span>{customerName}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Loan ID</span>
                <span className="font-mono">{loanId.slice(0, 8)}...</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                Back
              </Button>
              <Button onClick={handleSubmit} className="flex-1 gap-2">
                <Send className="h-4 w-4" />
                Disburse Now
              </Button>
            </div>
          </div>
        )}

        {/* Step: Processing */}
        {step === 'processing' && (
          <div className="py-8 text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <div>
              <p className="font-medium">Processing Disbursement</p>
              <p className="text-sm text-muted-foreground">
                Sending {formatCurrency(amount)} to {payeeVpa}...
              </p>
            </div>
          </div>
        )}

        {/* Step: Result */}
        {step === 'result' && result && (
          <div className="space-y-4">
            <div className="py-4 text-center">
              {result.success ? (
                <>
                  <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
                  <p className="text-xl font-semibold text-green-600 mt-2">
                    Disbursement Successful!
                  </p>
                  <p className="text-muted-foreground mt-1">
                    {formatCurrency(amount)} has been sent to {payeeVpa}
                  </p>
                </>
              ) : (
                <>
                  <XCircle className="h-16 w-16 text-red-500 mx-auto" />
                  <p className="text-xl font-semibold text-red-600 mt-2">
                    Disbursement Failed
                  </p>
                  <p className="text-muted-foreground mt-1">
                    {result.message || 'The disbursement could not be processed.'}
                  </p>
                </>
              )}
            </div>

            {result.ips_transaction_id && (
              <IPSTransactionStatus
                transactionId={result.ips_transaction_id}
                showDetails={true}
              />
            )}

            <div className="flex gap-2">
              {!result.success && (
                <Button variant="outline" onClick={handleReset} className="flex-1">
                  Try Again
                </Button>
              )}
              <Button
                variant={result.success ? 'default' : 'outline'}
                onClick={() => window.location.reload()}
                className="flex-1"
              >
                {result.success ? 'Done' : 'Close'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default IPSDisbursementForm;
