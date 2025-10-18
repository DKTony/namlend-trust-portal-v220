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
import { 
  recordCollectionActivity, 
  ActivityType, 
  ContactMethod,
  RecordActivityInput 
} from '@/services/collectionsService';
import { Loader2, CheckCircle, Phone, Mail, MessageSquare } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  loanId: string;
  clientName: string;
}

const activityTypes: { value: ActivityType; label: string }[] = [
  { value: 'call_attempt', label: 'Call Attempt' },
  { value: 'sms_sent', label: 'SMS Sent' },
  { value: 'email_sent', label: 'Email Sent' },
  { value: 'whatsapp_sent', label: 'WhatsApp Sent' },
  { value: 'promise_to_pay', label: 'Promise to Pay' },
  { value: 'payment_received', label: 'Payment Received' },
  { value: 'field_visit', label: 'Field Visit' },
  { value: 'letter_sent', label: 'Letter Sent' },
  { value: 'escalation', label: 'Escalation' },
  { value: 'legal_notice', label: 'Legal Notice' },
  { value: 'note', label: 'General Note' }
];

const contactMethods: { value: ContactMethod; label: string }[] = [
  { value: 'phone', label: 'Phone Call' },
  { value: 'sms', label: 'SMS' },
  { value: 'email', label: 'Email' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'in_person', label: 'In Person' },
  { value: 'letter', label: 'Letter' }
];

export const RecordActivityModal: React.FC<Props> = ({
  open,
  onClose,
  onSuccess,
  loanId,
  clientName
}) => {
  const [activityType, setActivityType] = useState<ActivityType>('call_attempt');
  const [contactMethod, setContactMethod] = useState<ContactMethod>('phone');
  const [outcome, setOutcome] = useState('');
  const [notes, setNotes] = useState('');
  const [promiseDate, setPromiseDate] = useState('');
  const [promiseAmount, setPromiseAmount] = useState('');
  const [nextActionDate, setNextActionDate] = useState('');
  const [nextActionType, setNextActionType] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  const resetForm = () => {
    setActivityType('call_attempt');
    setContactMethod('phone');
    setOutcome('');
    setNotes('');
    setPromiseDate('');
    setPromiseAmount('');
    setNextActionDate('');
    setNextActionType('');
  };

  const handleSubmit = async () => {
    // Validation
    if (!outcome.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Outcome is required',
        variant: 'destructive'
      });
      return;
    }

    if (activityType === 'promise_to_pay' && (!promiseDate || !promiseAmount)) {
      toast({
        title: 'Validation Error',
        description: 'Promise date and amount are required for payment promises',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const input: RecordActivityInput = {
        loan_id: loanId,
        activity_type: activityType,
        contact_method: contactMethod,
        outcome: outcome.trim(),
        notes: notes.trim() || undefined,
        promise_date: promiseDate || undefined,
        promise_amount: promiseAmount ? parseFloat(promiseAmount) : undefined,
        next_action_date: nextActionDate || undefined,
        next_action_type: nextActionType.trim() || undefined
      };

      const result = await recordCollectionActivity(input);

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Collection activity recorded successfully'
        });
        resetForm();
        onSuccess();
        onClose();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to record activity',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Record activity error:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const showPromiseFields = activityType === 'promise_to_pay';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            <span>Record Collection Activity</span>
          </DialogTitle>
          <DialogDescription>
            Record contact attempt or activity for {clientName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Activity Type */}
          <div className="space-y-2">
            <Label htmlFor="activity-type" className="text-sm font-medium">
              Activity Type <span className="text-red-500">*</span>
            </Label>
            <select
              id="activity-type"
              value={activityType}
              onChange={(e) => setActivityType(e.target.value as ActivityType)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            >
              {activityTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Contact Method */}
          <div className="space-y-2">
            <Label htmlFor="contact-method" className="text-sm font-medium">
              Contact Method <span className="text-red-500">*</span>
            </Label>
            <select
              id="contact-method"
              value={contactMethod}
              onChange={(e) => setContactMethod(e.target.value as ContactMethod)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            >
              {contactMethods.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>

          {/* Outcome */}
          <div className="space-y-2">
            <Label htmlFor="outcome" className="text-sm font-medium">
              Outcome <span className="text-red-500">*</span>
            </Label>
            <textarea
              id="outcome"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              className="w-full min-h-[80px] p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="e.g., No answer, Left voicemail, Client agreed to pay, etc."
              disabled={loading}
              maxLength={500}
              required
            />
            <p className="text-xs text-gray-500 text-right">
              {outcome.length}/500 characters
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Additional Notes <span className="text-gray-400">(Optional)</span>
            </Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full min-h-[80px] p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Any additional details or observations"
              disabled={loading}
              maxLength={1000}
            />
            <p className="text-xs text-gray-500 text-right">
              {notes.length}/1000 characters
            </p>
          </div>

          {/* Promise Fields (conditional) */}
          {showPromiseFields && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
              <h4 className="font-medium text-blue-900">Payment Promise Details</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="promise-date" className="text-sm font-medium">
                    Promise Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="promise-date"
                    type="date"
                    value={promiseDate}
                    onChange={(e) => setPromiseDate(e.target.value)}
                    disabled={loading}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="promise-amount" className="text-sm font-medium">
                    Promise Amount (NAD) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="promise-amount"
                    type="number"
                    value={promiseAmount}
                    onChange={(e) => setPromiseAmount(e.target.value)}
                    placeholder="0.00"
                    disabled={loading}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Next Action */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
            <h4 className="font-medium text-gray-900">Schedule Next Action</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="next-action-date" className="text-sm font-medium">
                  Next Action Date
                </Label>
                <Input
                  id="next-action-date"
                  type="date"
                  value={nextActionDate}
                  onChange={(e) => setNextActionDate(e.target.value)}
                  disabled={loading}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="next-action-type" className="text-sm font-medium">
                  Action Type
                </Label>
                <Input
                  id="next-action-type"
                  value={nextActionType}
                  onChange={(e) => setNextActionType(e.target.value)}
                  placeholder="e.g., Follow-up call"
                  disabled={loading}
                  maxLength={100}
                />
              </div>
            </div>
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
            disabled={loading || !outcome.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Recording...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Record Activity
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RecordActivityModal;
