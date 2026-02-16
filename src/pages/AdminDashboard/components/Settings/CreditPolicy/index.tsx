/**
 * Credit Policy Configuration Component
 * Allows admins to configure loan parameters, interest rates, and approval criteria.
 * Refactored into tab sub-components for maintainability.
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
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
import { Settings, Save, RotateCcw, Loader2, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { APR_LIMIT as MAX_APR } from '@/constants/regulatory';
import { LoanLimitsTab } from './LoanLimitsTab';
import { InterestRatesTab } from './InterestRatesTab';
import { EligibilityTab } from './EligibilityTab';
import { RiskSettingsTab } from './RiskSettingsTab';
import { FeesTab } from './FeesTab';

interface CreditPolicy {
  minLoanAmount: number;
  maxLoanAmount: number;
  minTermMonths: number;
  maxTermMonths: number;
  baseInterestRate: number;
  maxInterestRate: number;
  riskPremiumLow: number;
  riskPremiumMedium: number;
  riskPremiumHigh: number;
  minMonthlyIncome: number;
  maxDebtToIncome: number;
  minEmploymentMonths: number;
  requireVerification: boolean;
  requireDocuments: boolean;
  autoApproveThreshold: number;
  autoRejectThreshold: number;
  manualReviewRequired: boolean;
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
  gracePeriodDays: 5,
};

export function CreditPolicyConfig() {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [policy, setPolicy] = useState<CreditPolicy>(DEFAULT_POLICY);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const savedPolicy = localStorage.getItem('namlend_credit_policy');
    if (savedPolicy) {
      setPolicy(JSON.parse(savedPolicy));
    }
  }, []);

  const updatePolicy = (key: string, value: number | boolean) => {
    setPolicy((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    if (policy.maxInterestRate > MAX_APR) {
      toast({
        title: 'Invalid Configuration',
        description: `Maximum interest rate cannot exceed ${MAX_APR}% APR (regulatory limit)`,
        variant: 'destructive',
      });
      setSaving(false);
      return;
    }
    if (policy.maxDebtToIncome > 50) {
      toast({
        title: 'Warning',
        description: 'High debt-to-income ratio may increase default risk',
        variant: 'destructive',
      });
    }
    try {
      localStorage.setItem('namlend_credit_policy', JSON.stringify(policy));
      toast({
        title: 'Policy Saved',
        description: 'Credit policy configuration has been updated successfully.',
      });
      setHasChanges(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save credit policy',
        variant: 'destructive',
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
            <Badge
              variant="outline"
              className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800"
            >
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
                  This will reset all credit policy settings to their default values. This action
                  cannot be undone.
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
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-500 dark:text-blue-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-300">
                Regulatory Compliance
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-400">
                Namibian regulations limit APR to {MAX_APR}%. Interest rates exceeding this limit
                will be automatically rejected. Ensure all configurations comply with local lending
                laws.
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

        <TabsContent value="loan-limits">
          <LoanLimitsTab policy={policy} onUpdate={updatePolicy} />
        </TabsContent>
        <TabsContent value="interest-rates">
          <InterestRatesTab policy={policy} onUpdate={updatePolicy} />
        </TabsContent>
        <TabsContent value="eligibility">
          <EligibilityTab policy={policy} onUpdate={updatePolicy} />
        </TabsContent>
        <TabsContent value="risk">
          <RiskSettingsTab policy={policy} onUpdate={updatePolicy} />
        </TabsContent>
        <TabsContent value="fees">
          <FeesTab policy={policy} onUpdate={updatePolicy} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default CreditPolicyConfig;
