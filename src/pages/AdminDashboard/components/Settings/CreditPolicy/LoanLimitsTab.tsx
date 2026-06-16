import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { formatNAD } from '@/utils/currency';
import { DollarSign } from 'lucide-react';

interface CreditPolicy {
  minLoanAmount: number;
  maxLoanAmount: number;
  minTermMonths: number;
  maxTermMonths: number;
}

interface LoanLimitsTabProps {
  policy: CreditPolicy;
  onUpdate: (key: string, value: number | boolean) => void;
}

export function LoanLimitsTab({ policy, onUpdate }: LoanLimitsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Loan Amount & Term Limits
        </CardTitle>
        <CardDescription>Configure minimum and maximum loan amounts and terms</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Label>Minimum Loan Amount (NAD)</Label>
            <Input
              type="number"
              value={policy.minLoanAmount}
              onChange={(e) => onUpdate('minLoanAmount', Number(e.target.value))}
              min={100}
            />
            <p className="text-xs text-muted-foreground">
              Current: {formatNAD(policy.minLoanAmount)}
            </p>
          </div>
          <div className="space-y-4">
            <Label>Maximum Loan Amount (NAD)</Label>
            <Input
              type="number"
              value={policy.maxLoanAmount}
              onChange={(e) => onUpdate('maxLoanAmount', Number(e.target.value))}
              min={policy.minLoanAmount}
            />
            <p className="text-xs text-muted-foreground">
              Current: {formatNAD(policy.maxLoanAmount)}
            </p>
          </div>
          <div className="space-y-4">
            <Label>Minimum Term (Months)</Label>
            <Input
              type="number"
              value={policy.minTermMonths}
              onChange={(e) => onUpdate('minTermMonths', Number(e.target.value))}
              min={1}
              max={policy.maxTermMonths}
            />
          </div>
          <div className="space-y-4">
            <Label>Maximum Term (Months)</Label>
            <Input
              type="number"
              value={policy.maxTermMonths}
              onChange={(e) => onUpdate('maxTermMonths', Number(e.target.value))}
              min={policy.minTermMonths}
              max={60}
            />
          </div>
        </div>
        <Separator />
        <div className="p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">Loan Range Preview</h4>
          <div className="text-sm text-muted-foreground">
            Clients can apply for loans between {formatNAD(policy.minLoanAmount)} and{' '}
            {formatNAD(policy.maxLoanAmount)}, with terms from {policy.minTermMonths} to{' '}
            {policy.maxTermMonths} months.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
