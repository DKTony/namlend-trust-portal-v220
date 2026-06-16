/**
 * Credit Policy Configuration Component
 * Allows admins to configure loan parameters, interest rates, and approval criteria.
 * Refactored into tab sub-components for maintainability.
 */

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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { APR_LIMIT as MAX_APR } from '@/constants/regulatory';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/integrations/convex/api';
import { useMutation, useQuery } from 'convex/react';
import { Info, Loader2, RotateCcw, Save, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { EligibilityTab } from './EligibilityTab';
import { FeesTab } from './FeesTab';
import { InterestRatesTab } from './InterestRatesTab';
import { LoanLimitsTab } from './LoanLimitsTab';
import { RiskSettingsTab } from './RiskSettingsTab';

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
  const remotePolicy = useQuery(api.tenantConfig.getMyCreditPolicy, {});
  const saveCreditPolicy = useMutation(api.tenantConfig.setMyCreditPolicy);
  const [saving, setSaving] = useState(false);
  const [policy, setPolicy] = useState<CreditPolicy>(DEFAULT_POLICY);
  const [originalPolicy, setOriginalPolicy] = useState<CreditPolicy>(DEFAULT_POLICY);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (!remotePolicy) return;
    setPolicy(remotePolicy.policy);
    setOriginalPolicy(remotePolicy.policy);
    setHasChanges(false);
  }, [remotePolicy]);

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
      await saveCreditPolicy({ policy });
      toast({
        title: 'Policy Saved',
        description: 'Credit policy configuration has been updated successfully.',
      });
      setOriginalPolicy(policy);
      setHasChanges(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save credit policy',
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

  const handleDiscard = () => {
    setPolicy(originalPolicy);
    setHasChanges(false);
  };

  if (remotePolicy === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
          {hasChanges && (
            <Button variant="ghost" size="sm" onClick={handleDiscard}>
              Discard
            </Button>
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
