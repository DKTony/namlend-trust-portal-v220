/**
 * Banking Section Component
 * Consolidated view of user's accounts, payment methods, and IPP onboarding.
 * Orchestrates sub-components and the useIPPOnboarding hook.
 */

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, CreditCard, Loader2, Zap, RefreshCw } from 'lucide-react';
import { useIPPOnboarding } from '@/hooks/useIPPOnboarding';
import { IPPOnboardingCard } from '@/components/banking/IPPOnboardingCard';
import { IPPEnrollmentSteps } from '@/components/banking/IPPEnrollmentSteps';
import { IPPActionDialog } from '@/components/banking/IPPActionDialog';
import { LinkedAccountsTab } from '@/components/banking/LinkedAccountsTab';
import { PaymentMethodsTab } from '@/components/banking/PaymentMethodsTab';

export function BankingSection() {
  const {
    // State
    loading,
    setLoading,
    onboardingData,
    sovProviders,
    activeTab,
    setActiveTab,

    // Action dialog state
    showActionDialog,
    setShowActionDialog,
    currentAction,
    actionLoading,

    // Form inputs
    selectedProvider,
    setSelectedProvider,
    mobileNumber,
    setMobileNumber,
    otpCode,
    setOtpCode,
    ipsPin,
    setIpsPin,
    ipsPinConfirm,
    setIpsPinConfirm,
    vpaUsername,
    setVpaUsername,

    // Computed
    currentStep,
    progress,
    isReady,

    // Actions
    fetchOnboardingStatus,
    handleStartAction,
    handleSubmitAction,
  } = useIPPOnboarding();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Banking & Payments</h2>
          <p className="text-muted-foreground">Manage your accounts and payment methods</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setLoading(true);
            fetchOnboardingStatus();
          }}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ipp" className="gap-2">
            <Zap className="h-4 w-4" />
            IPP Instant Pay
          </TabsTrigger>
          <TabsTrigger value="accounts" className="gap-2">
            <Building2 className="h-4 w-4" />
            Accounts
          </TabsTrigger>
          <TabsTrigger value="methods" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Payment Methods
          </TabsTrigger>
        </TabsList>

        {/* IPP Instant Payment Tab */}
        <TabsContent value="ipp" className="space-y-6">
          <IPPOnboardingCard
            onboardingData={onboardingData}
            currentStep={currentStep}
            progress={progress}
            isReady={isReady}
            onStartAction={handleStartAction}
          />
          <IPPEnrollmentSteps onboardingData={onboardingData} onStartAction={handleStartAction} />
        </TabsContent>

        {/* Accounts Tab */}
        <TabsContent value="accounts" className="space-y-6">
          <LinkedAccountsTab onboardingData={onboardingData} />
        </TabsContent>

        {/* Payment Methods Tab */}
        <TabsContent value="methods" className="space-y-6">
          <PaymentMethodsTab isReady={isReady} onboardingData={onboardingData} />
        </TabsContent>
      </Tabs>

      {/* Action Dialog */}
      <IPPActionDialog
        open={showActionDialog}
        onOpenChange={setShowActionDialog}
        currentAction={currentAction}
        currentStep={currentStep}
        actionLoading={actionLoading}
        onSubmit={handleSubmitAction}
        mobileNumber={mobileNumber}
        onMobileNumberChange={setMobileNumber}
        selectedProvider={selectedProvider}
        onSelectedProviderChange={setSelectedProvider}
        sovProviders={sovProviders}
        onboardingData={onboardingData}
        otpCode={otpCode}
        onOtpCodeChange={setOtpCode}
        ipsPin={ipsPin}
        onIpsPinChange={setIpsPin}
        ipsPinConfirm={ipsPinConfirm}
        onIpsPinConfirmChange={setIpsPinConfirm}
        vpaUsername={vpaUsername}
        onVpaUsernameChange={setVpaUsername}
      />
    </div>
  );
}

export default BankingSection;
