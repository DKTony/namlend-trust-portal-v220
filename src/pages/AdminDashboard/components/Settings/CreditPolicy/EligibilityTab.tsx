import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { formatNAD } from '@/utils/currency';
import { AlertTriangle, Shield } from 'lucide-react';

interface EligibilityTabProps {
  policy: {
    minMonthlyIncome: number;
    maxDebtToIncome: number;
    minEmploymentMonths: number;
    requireVerification: boolean;
    requireDocuments: boolean;
  };
  onUpdate: (key: string, value: number | boolean) => void;
}

export function EligibilityTab({ policy, onUpdate }: EligibilityTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Eligibility Criteria
        </CardTitle>
        <CardDescription>Set minimum requirements for loan approval</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Label>Minimum Monthly Income (NAD)</Label>
            <Input
              type="number"
              value={policy.minMonthlyIncome}
              onChange={(e) => onUpdate('minMonthlyIncome', Number(e.target.value))}
              min={0}
            />
            <p className="text-xs text-muted-foreground">
              Applicants must earn at least {formatNAD(policy.minMonthlyIncome)}/month
            </p>
          </div>
          <div className="space-y-4">
            <Label>Maximum Debt-to-Income Ratio (%)</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[policy.maxDebtToIncome]}
                onValueChange={([value]) => onUpdate('maxDebtToIncome', value)}
                min={10}
                max={60}
                step={1}
                className="flex-1"
              />
              <span className="w-16 text-right font-medium">{policy.maxDebtToIncome}%</span>
            </div>
            {policy.maxDebtToIncome > 40 && (
              <p className="text-xs text-yellow-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                High DTI increases default risk
              </p>
            )}
          </div>
          <div className="space-y-4">
            <Label>Minimum Employment Duration (Months)</Label>
            <Input
              type="number"
              value={policy.minEmploymentMonths}
              onChange={(e) => onUpdate('minEmploymentMonths', Number(e.target.value))}
              min={0}
              max={24}
            />
          </div>
        </div>
        <Separator />
        <div className="space-y-4">
          <h4 className="font-medium">Verification Requirements</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label>Require KYC Verification</Label>
                <p className="text-xs text-muted-foreground">
                  Identity must be verified before approval
                </p>
              </div>
              <Switch
                checked={policy.requireVerification}
                onCheckedChange={(checked) => onUpdate('requireVerification', checked)}
              />
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label>Require Documents</Label>
                <p className="text-xs text-muted-foreground">Supporting documents required</p>
              </div>
              <Switch
                checked={policy.requireDocuments}
                onCheckedChange={(checked) => onUpdate('requireDocuments', checked)}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
