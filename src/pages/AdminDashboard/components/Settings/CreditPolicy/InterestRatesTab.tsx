import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { APR_LIMIT as MAX_APR } from '@/constants/regulatory';
import { AlertTriangle, Percent } from 'lucide-react';

interface InterestRatesTabProps {
  policy: {
    baseInterestRate: number;
    maxInterestRate: number;
    riskPremiumLow: number;
    riskPremiumMedium: number;
    riskPremiumHigh: number;
  };
  onUpdate: (key: string, value: number | boolean) => void;
}

export function InterestRatesTab({ policy, onUpdate }: InterestRatesTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Percent className="h-5 w-5" />
          Interest Rate Configuration
        </CardTitle>
        <CardDescription>
          Set base rates and risk-based premiums (max {MAX_APR}% APR)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Label>Base Interest Rate (%)</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[policy.baseInterestRate]}
                onValueChange={([value]) => onUpdate('baseInterestRate', value)}
                min={5}
                max={MAX_APR}
                step={0.5}
                className="flex-1"
              />
              <span className="w-16 text-right font-medium">{policy.baseInterestRate}%</span>
            </div>
          </div>
          <div className="space-y-4">
            <Label>Maximum Interest Rate (%)</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[policy.maxInterestRate]}
                onValueChange={([value]) => onUpdate('maxInterestRate', value)}
                min={policy.baseInterestRate}
                max={MAX_APR}
                step={0.5}
                className="flex-1"
              />
              <span className="w-16 text-right font-medium">{policy.maxInterestRate}%</span>
            </div>
            {policy.maxInterestRate >= MAX_APR && (
              <p className="text-xs text-yellow-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                At regulatory maximum
              </p>
            )}
          </div>
        </div>
        <Separator />
        <div>
          <h4 className="font-medium mb-4">Risk-Based Premiums</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg bg-green-50">
              <Label className="text-green-700">Low Risk Premium</Label>
              <div className="flex items-center gap-2 mt-2">
                <Input
                  type="number"
                  value={policy.riskPremiumLow}
                  onChange={(e) => onUpdate('riskPremiumLow', Number(e.target.value))}
                  min={0}
                  max={10}
                  className="w-20"
                />
                <span>%</span>
              </div>
              <p className="text-xs text-green-600 mt-2">
                Final Rate: {policy.baseInterestRate + policy.riskPremiumLow}%
              </p>
            </div>
            <div className="p-4 border rounded-lg bg-yellow-50">
              <Label className="text-yellow-700">Medium Risk Premium</Label>
              <div className="flex items-center gap-2 mt-2">
                <Input
                  type="number"
                  value={policy.riskPremiumMedium}
                  onChange={(e) => onUpdate('riskPremiumMedium', Number(e.target.value))}
                  min={0}
                  max={15}
                  className="w-20"
                />
                <span>%</span>
              </div>
              <p className="text-xs text-yellow-600 mt-2">
                Final Rate: {policy.baseInterestRate + policy.riskPremiumMedium}%
              </p>
            </div>
            <div className="p-4 border rounded-lg bg-red-50">
              <Label className="text-red-700">High Risk Premium</Label>
              <div className="flex items-center gap-2 mt-2">
                <Input
                  type="number"
                  value={policy.riskPremiumHigh}
                  onChange={(e) => onUpdate('riskPremiumHigh', Number(e.target.value))}
                  min={0}
                  max={20}
                  className="w-20"
                />
                <span>%</span>
              </div>
              <p className="text-xs text-red-600 mt-2">
                Final Rate: {Math.min(policy.baseInterestRate + policy.riskPremiumHigh, MAX_APR)}%
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
