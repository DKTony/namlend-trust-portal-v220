/**
 * Credit Policy Configuration Component
 * Allows admins to configure loan parameters, interest rates, and approval criteria
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Settings,
  DollarSign,
  Percent,
  Clock,
  Shield,
  AlertTriangle,
  Save,
  RotateCcw,
  CheckCircle,
  Info,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatNAD } from '@/utils/currency';
import { APR_LIMIT as MAX_APR } from '@/constants/regulatory';

interface CreditPolicy {
  // Loan Limits
  minLoanAmount: number;
  maxLoanAmount: number;
  minTermMonths: number;
  maxTermMonths: number;
  
  // Interest Rates
  baseInterestRate: number;
  maxInterestRate: number;
  riskPremiumLow: number;
  riskPremiumMedium: number;
  riskPremiumHigh: number;
  
  // Eligibility Criteria
  minMonthlyIncome: number;
  maxDebtToIncome: number;
  minEmploymentMonths: number;
  requireVerification: boolean;
  requireDocuments: boolean;
  
  // Risk Settings
  autoApproveThreshold: number;
  autoRejectThreshold: number;
  manualReviewRequired: boolean;
  
  // Fees
  originationFeePercent: number;
  latePaymentFeePercent: number;
  gracePeriodDays: number;
}

const DEFAULT_POLICY: CreditPolicy = {
  minLoanAmount: 500,
  maxLoanAmount: 50000,
  minTermMonths: 3,
  maxTermMonths: 24,
  baseInterestRate: 18,
  maxInterestRate: 32,
  riskPremiumLow: 0,
  riskPremiumMedium: 5,
  riskPremiumHigh: 10,
  minMonthlyIncome: 3000,
  maxDebtToIncome: 40,
  minEmploymentMonths: 3,
  requireVerification: true,
  requireDocuments: true,
  autoApproveThreshold: 80,
  autoRejectThreshold: 30,
  manualReviewRequired: true,
  originationFeePercent: 2,
  latePaymentFeePercent: 5,
  gracePeriodDays: 5
};

export function CreditPolicyConfig() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [policy, setPolicy] = useState<CreditPolicy>(DEFAULT_POLICY);
  const [hasChanges, setHasChanges] = useState(false);

  // Load policy from localStorage (in production, this would be from database)
  useEffect(() => {
    const savedPolicy = localStorage.getItem('namlend_credit_policy');
    if (savedPolicy) {
      setPolicy(JSON.parse(savedPolicy));
    }
  }, []);

  const updatePolicy = (key: keyof CreditPolicy, value: number | boolean) => {
    setPolicy(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    
    // Validate policy
    if (policy.maxInterestRate > MAX_APR) {
      toast({
        title: 'Invalid Configuration',
        description: `Maximum interest rate cannot exceed ${MAX_APR}% APR (regulatory limit)`,
        variant: 'destructive'
      });
      setSaving(false);
      return;
    }

    if (policy.maxDebtToIncome > 50) {
      toast({
        title: 'Warning',
        description: 'High debt-to-income ratio may increase default risk',
        variant: 'destructive'
      });
    }

    try {
      // In production, save to database
      localStorage.setItem('namlend_credit_policy', JSON.stringify(policy));
      
      toast({
        title: 'Policy Saved',
        description: 'Credit policy configuration has been updated successfully.'
      });
      setHasChanges(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save credit policy',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPolicy(DEFAULT_POLICY);
    setHasChanges(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Credit Policy Configuration
          </h2>
          <p className="text-muted-foreground">
            Configure loan parameters, eligibility criteria, and risk settings
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
              Unsaved Changes
            </Badge>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset to Default
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset Credit Policy?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will reset all credit policy settings to their default values. 
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleReset}>Reset</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Regulatory Notice */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Regulatory Compliance</h4>
              <p className="text-sm text-blue-700">
                Namibian regulations limit APR to {MAX_APR}%. Interest rates exceeding this limit 
                will be automatically rejected. Ensure all configurations comply with local lending laws.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="loan-limits" className="space-y-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full">
          <TabsTrigger value="loan-limits">Loan Limits</TabsTrigger>
          <TabsTrigger value="interest-rates">Interest Rates</TabsTrigger>
          <TabsTrigger value="eligibility">Eligibility</TabsTrigger>
          <TabsTrigger value="risk">Risk Settings</TabsTrigger>
          <TabsTrigger value="fees">Fees</TabsTrigger>
        </TabsList>

        {/* Loan Limits Tab */}
        <TabsContent value="loan-limits">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Loan Amount & Term Limits
              </CardTitle>
              <CardDescription>
                Configure minimum and maximum loan amounts and terms
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Label>Minimum Loan Amount (NAD)</Label>
                  <Input
                    type="number"
                    value={policy.minLoanAmount}
                    onChange={(e) => updatePolicy('minLoanAmount', Number(e.target.value))}
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
                    onChange={(e) => updatePolicy('maxLoanAmount', Number(e.target.value))}
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
                    onChange={(e) => updatePolicy('minTermMonths', Number(e.target.value))}
                    min={1}
                    max={policy.maxTermMonths}
                  />
                </div>

                <div className="space-y-4">
                  <Label>Maximum Term (Months)</Label>
                  <Input
                    type="number"
                    value={policy.maxTermMonths}
                    onChange={(e) => updatePolicy('maxTermMonths', Number(e.target.value))}
                    min={policy.minTermMonths}
                    max={60}
                  />
                </div>
              </div>

              <Separator />

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Loan Range Preview</h4>
                <div className="text-sm text-muted-foreground">
                  Clients can apply for loans between {formatNAD(policy.minLoanAmount)} and {formatNAD(policy.maxLoanAmount)}, 
                  with terms from {policy.minTermMonths} to {policy.maxTermMonths} months.
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Interest Rates Tab */}
        <TabsContent value="interest-rates">
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
                      onValueChange={([value]) => updatePolicy('baseInterestRate', value)}
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
                      onValueChange={([value]) => updatePolicy('maxInterestRate', value)}
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
                        onChange={(e) => updatePolicy('riskPremiumLow', Number(e.target.value))}
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
                        onChange={(e) => updatePolicy('riskPremiumMedium', Number(e.target.value))}
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
                        onChange={(e) => updatePolicy('riskPremiumHigh', Number(e.target.value))}
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
        </TabsContent>

        {/* Eligibility Tab */}
        <TabsContent value="eligibility">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Eligibility Criteria
              </CardTitle>
              <CardDescription>
                Set minimum requirements for loan approval
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Label>Minimum Monthly Income (NAD)</Label>
                  <Input
                    type="number"
                    value={policy.minMonthlyIncome}
                    onChange={(e) => updatePolicy('minMonthlyIncome', Number(e.target.value))}
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
                      onValueChange={([value]) => updatePolicy('maxDebtToIncome', value)}
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
                    onChange={(e) => updatePolicy('minEmploymentMonths', Number(e.target.value))}
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
                      onCheckedChange={(checked) => updatePolicy('requireVerification', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label>Require Documents</Label>
                      <p className="text-xs text-muted-foreground">
                        Supporting documents required
                      </p>
                    </div>
                    <Switch
                      checked={policy.requireDocuments}
                      onCheckedChange={(checked) => updatePolicy('requireDocuments', checked)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risk Settings Tab */}
        <TabsContent value="risk">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Risk & Automation Settings
              </CardTitle>
              <CardDescription>
                Configure automated approval thresholds and risk parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Label>Auto-Approve Score Threshold</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[policy.autoApproveThreshold]}
                      onValueChange={([value]) => updatePolicy('autoApproveThreshold', value)}
                      min={50}
                      max={100}
                      step={1}
                      className="flex-1"
                    />
                    <span className="w-16 text-right font-medium">{policy.autoApproveThreshold}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Applications scoring above {policy.autoApproveThreshold} may be auto-approved
                  </p>
                </div>

                <div className="space-y-4">
                  <Label>Auto-Reject Score Threshold</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[policy.autoRejectThreshold]}
                      onValueChange={([value]) => updatePolicy('autoRejectThreshold', value)}
                      min={0}
                      max={50}
                      step={1}
                      className="flex-1"
                    />
                    <span className="w-16 text-right font-medium">{policy.autoRejectThreshold}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Applications scoring below {policy.autoRejectThreshold} will be auto-rejected
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label>Require Manual Review</Label>
                  <p className="text-xs text-muted-foreground">
                    All applications require human review before final decision
                  </p>
                </div>
                <Switch
                  checked={policy.manualReviewRequired}
                  onCheckedChange={(checked) => updatePolicy('manualReviewRequired', checked)}
                />
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Scoring Range Breakdown</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center p-2 bg-red-100 rounded">
                    <div className="font-medium text-red-700">0 - {policy.autoRejectThreshold}</div>
                    <div className="text-red-600 text-xs">Auto-Reject</div>
                  </div>
                  <div className="text-center p-2 bg-yellow-100 rounded">
                    <div className="font-medium text-yellow-700">{policy.autoRejectThreshold} - {policy.autoApproveThreshold}</div>
                    <div className="text-yellow-600 text-xs">Manual Review</div>
                  </div>
                  <div className="text-center p-2 bg-green-100 rounded">
                    <div className="font-medium text-green-700">{policy.autoApproveThreshold} - 100</div>
                    <div className="text-green-600 text-xs">Auto-Approve</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fees Tab */}
        <TabsContent value="fees">
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
                      onValueChange={([value]) => updatePolicy('originationFeePercent', value)}
                      min={0}
                      max={5}
                      step={0.5}
                      className="flex-1"
                    />
                    <span className="w-16 text-right font-medium">{policy.originationFeePercent}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Fee charged at loan disbursement
                  </p>
                </div>

                <div className="space-y-4">
                  <Label>Late Payment Fee (%)</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[policy.latePaymentFeePercent]}
                      onValueChange={([value]) => updatePolicy('latePaymentFeePercent', value)}
                      min={0}
                      max={10}
                      step={0.5}
                      className="flex-1"
                    />
                    <span className="w-16 text-right font-medium">{policy.latePaymentFeePercent}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Fee on overdue payments
                  </p>
                </div>

                <div className="space-y-4">
                  <Label>Grace Period (Days)</Label>
                  <Input
                    type="number"
                    value={policy.gracePeriodDays}
                    onChange={(e) => updatePolicy('gracePeriodDays', Number(e.target.value))}
                    min={0}
                    max={14}
                  />
                  <p className="text-xs text-muted-foreground">
                    Days before late fees apply
                  </p>
                </div>
              </div>

              <Separator />

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Fee Example</h4>
                <p className="text-sm text-muted-foreground">
                  For a {formatNAD(10000)} loan:
                </p>
                <ul className="text-sm mt-2 space-y-1">
                  <li>• Origination Fee: {formatNAD(10000 * (policy.originationFeePercent / 100))}</li>
                  <li>• Late Fee (if applicable): {formatNAD(10000 * (policy.latePaymentFeePercent / 100))} per missed payment</li>
                  <li>• Grace Period: {policy.gracePeriodDays} days after due date</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default CreditPolicyConfig;
