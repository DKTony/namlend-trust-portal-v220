import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { DollarSign } from 'lucide-react';
import { formatNAD } from '@/utils/currency';

interface FeesTabProps {
  policy: {
    originationFeePercent: number;
    latePaymentFeePercent: number;
    gracePeriodDays: number;
  };
  onUpdate: (key: string, value: number | boolean) => void;
}

export function FeesTab({ policy, onUpdate }: FeesTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Fee Configuration
        </CardTitle>
        <CardDescription>
          Configure origination fees, late payment penalties, and grace periods
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-4">
            <Label>Origination Fee (%)</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[policy.originationFeePercent]}
                onValueChange={([value]) => onUpdate('originationFeePercent', value)}
                min={0}
                max={5}
                step={0.5}
                className="flex-1"
              />
              <span className="w-16 text-right font-medium tabular-nums">
                {policy.originationFeePercent}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Fee charged at loan disbursement</p>
          </div>
          <div className="space-y-4">
            <Label>Late Payment Fee (%)</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[policy.latePaymentFeePercent]}
                onValueChange={([value]) => onUpdate('latePaymentFeePercent', value)}
                min={0}
                max={10}
                step={0.5}
                className="flex-1"
              />
              <span className="w-16 text-right font-medium tabular-nums">
                {policy.latePaymentFeePercent}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Fee on overdue payments</p>
          </div>
          <div className="space-y-4">
            <Label>Grace Period (Days)</Label>
            <Input
              type="number"
              value={policy.gracePeriodDays}
              onChange={(e) => onUpdate('gracePeriodDays', Number(e.target.value))}
              min={0}
              max={14}
            />
            <p className="text-xs text-muted-foreground">Days before late fees apply</p>
          </div>
        </div>
        <Separator />
        <div className="p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">Fee Example</h4>
          <p className="text-sm text-muted-foreground">For a {formatNAD(10000)} loan:</p>
          <ul className="text-sm mt-2 space-y-1">
            <li>• Origination Fee: {formatNAD(10000 * (policy.originationFeePercent / 100))}</li>
            <li>
              • Late Fee (if applicable): {formatNAD(10000 * (policy.latePaymentFeePercent / 100))}{' '}
              per missed payment
            </li>
            <li>• Grace Period: {policy.gracePeriodDays} days after due date</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
