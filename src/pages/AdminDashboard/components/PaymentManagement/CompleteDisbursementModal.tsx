import React, { useState } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { completeDisbursement } from '@/services/disbursementService';
import { Loader2, CheckCircle, AlertCircle, CreditCard, Smartphone, Banknote, Building2 } from 'lucide-react';
import { formatNAD } from '@/utils/currency';

type PaymentMethod = 'bank_transfer' | 'mobile_money' | 'cash' | 'debit_order';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  disbursement: {
    id: string;
    amount: number;
    clientName: string;
    loanId: string;
  } | null;
}

export const CompleteDisbursementModal: React.FC<Props> = ({
  open,
  onClose,
  onSuccess,
  disbursement
}) => {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer');
  const [paymentReference, setPaymentReference] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleClose = () => {
    if (!loading) {
      setPaymentMethod('bank_transfer');
      setPaymentReference('');
      setNotes('');
      onClose();
    }
  };

  const handleSubmit = async () => {
    if (!disbursement) {
      toast({
        title: 'Error',
        description: 'No disbursement selected',
        variant: 'destructive'
      });
      return;
    }

    // Validation
    if (!paymentReference.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Payment reference is required',
        variant: 'destructive'
      });
      return;
    }

    if (paymentReference.trim().length < 5) {
      toast({
        title: 'Validation Error',
        description: 'Payment reference must be at least 5 characters',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const result = await completeDisbursement(
        disbursement.id,
        paymentMethod,
        paymentReference.trim(),
        notes.trim() || undefined
      );

      if (result.success) {
        toast({
          title: 'Success',
          description: (
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Disbursement completed successfully. Payment schedule generated.</span>
            </div>
          )
        });
        setPaymentReference('');
        setNotes('');
        onSuccess();
        onClose();
      } else {
        toast({
          title: 'Error',
          description: (
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4" />
              <span>{result.error || 'Failed to complete disbursement'}</span>
            </div>
          ),
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Complete disbursement error:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!disbursement) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span>Complete Disbursement</span>
          </DialogTitle>
          <DialogDescription>
            Enter the payment reference from your banking system to complete this disbursement.
          </DialogDescription>
        </DialogHeader>

        {/* Disbursement Details */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2 border border-gray-200">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Client:</span>
            <span className="font-medium text-gray-900">{disbursement.clientName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Amount:</span>
            <span className="font-semibold text-green-600 text-lg">
              {formatNAD(disbursement.amount)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Loan ID:</span>
            <span className="font-mono text-sm text-gray-700">
              {disbursement.loanId.slice(-8)}
            </span>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-4 py-4">
          {/* Payment Method Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Payment Method <span className="text-red-500">*</span>
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('bank_transfer')}
                disabled={loading}
                className={`flex items-center space-x-2 p-3 rounded-lg border-2 transition-all ${
                  paymentMethod === 'bank_transfer'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <Building2 className="h-5 w-5" />
                <span className="text-sm font-medium">Bank Transfer</span>
              </button>
              
              <button
                type="button"
                onClick={() => setPaymentMethod('mobile_money')}
                disabled={loading}
                className={`flex items-center space-x-2 p-3 rounded-lg border-2 transition-all ${
                  paymentMethod === 'mobile_money'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <Smartphone className="h-5 w-5" />
                <span className="text-sm font-medium">Mobile Money</span>
              </button>
              
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                disabled={loading}
                className={`flex items-center space-x-2 p-3 rounded-lg border-2 transition-all ${
                  paymentMethod === 'cash'
                    ? 'border-gray-500 bg-gray-50 text-gray-700'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <Banknote className="h-5 w-5" />
                <span className="text-sm font-medium">Cash</span>
              </button>
              
              <button
                type="button"
                onClick={() => setPaymentMethod('debit_order')}
                disabled={loading}
                className={`flex items-center space-x-2 p-3 rounded-lg border-2 transition-all ${
                  paymentMethod === 'debit_order'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <CreditCard className="h-5 w-5" />
                <span className="text-sm font-medium">Debit Order</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-ref" className="text-sm font-medium">
              Payment Reference <span className="text-red-500">*</span>
            </Label>
            <Input
              id="payment-ref"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="e.g., BANK-REF-12345, TXN-2025-001"
              required
              disabled={loading}
              className="font-mono"
              maxLength={100}
            />
            <p className="text-xs text-gray-500">
              Enter the transaction reference from your bank or payment system
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Processing Notes <span className="text-gray-400">(Optional)</span>
            </Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full min-h-[100px] p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Add any notes about the payment processing (optional)"
              disabled={loading}
              maxLength={500}
            />
            <p className="text-xs text-gray-500 text-right">
              {notes.length}/500 characters
            </p>
          </div>
        </div>

        {/* Warning Notice */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start space-x-2">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium">Important:</p>
            <p className="mt-1">
              This action will mark the disbursement as completed and automatically generate 
              the payment schedule for the client. Ensure the payment has been successfully 
              processed in your banking system.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={handleClose} 
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !paymentReference.trim()}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete Disbursement
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CompleteDisbursementModal;
