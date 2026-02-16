/**
 * IPP Action Dialog Component
 * Renders the action dialog for each IPP onboarding step, including
 * all form content (device binding, SOV selection, account selection,
 * OTP verification, PIN setup, VPA creation, finalization).
 */

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, CreditCard, CheckCircle, Loader2, Info } from 'lucide-react';
import type { OnboardingData, SovProvider } from '@/hooks/useIPPOnboarding';
import type { ONBOARDING_STEPS } from '@/hooks/useIPPOnboarding';

interface IPPActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAction: string | null;
  currentStep: (typeof ONBOARDING_STEPS)[number];
  actionLoading: boolean;
  onSubmit: () => void;

  // Form state
  mobileNumber: string;
  onMobileNumberChange: (value: string) => void;
  selectedProvider: string;
  onSelectedProviderChange: (value: string) => void;
  sovProviders: SovProvider[];
  onboardingData: OnboardingData | null;
  otpCode: string;
  onOtpCodeChange: (value: string) => void;
  ipsPin: string;
  onIpsPinChange: (value: string) => void;
  ipsPinConfirm: string;
  onIpsPinConfirmChange: (value: string) => void;
  vpaUsername: string;
  onVpaUsernameChange: (value: string) => void;
}

function ActionDialogContent({
  currentAction,
  mobileNumber,
  onMobileNumberChange,
  selectedProvider,
  onSelectedProviderChange,
  sovProviders,
  onboardingData,
  otpCode,
  onOtpCodeChange,
  ipsPin,
  onIpsPinChange,
  ipsPinConfirm,
  onIpsPinConfirmChange,
  vpaUsername,
  onVpaUsernameChange,
}: Pick<
  IPPActionDialogProps,
  | 'currentAction'
  | 'mobileNumber'
  | 'onMobileNumberChange'
  | 'selectedProvider'
  | 'onSelectedProviderChange'
  | 'sovProviders'
  | 'onboardingData'
  | 'otpCode'
  | 'onOtpCodeChange'
  | 'ipsPin'
  | 'onIpsPinChange'
  | 'ipsPinConfirm'
  | 'onIpsPinConfirmChange'
  | 'vpaUsername'
  | 'onVpaUsernameChange'
>) {
  switch (currentAction) {
    case 'bind_device':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mobile">Mobile Number</Label>
            <div className="flex gap-2">
              <Input
                id="mobile"
                value={mobileNumber}
                onChange={(e) => onMobileNumberChange(e.target.value)}
                placeholder="+264 81 123 4567"
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              This number will be used for OTP verification and as your payment alias.
            </p>
          </div>
        </div>
      );

    case 'select_sov':
      return (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Select your bank to link your account with IPP for instant payments.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Select Your Bank or Provider</Label>
            <Select value={selectedProvider} onValueChange={onSelectedProviderChange}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a provider" />
              </SelectTrigger>
              <SelectContent>
                {sovProviders.map((provider) => (
                  <SelectItem key={provider.provider_code} value={provider.provider_code}>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {provider.provider_name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      );

    case 'select_account':
      return (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                  Connecting to {onboardingData?.sov_provider_name || 'your bank'}...
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  In production, you would select from your available accounts. For now, we'll
                  create a mock account link.
                </p>
              </div>
            </div>
          </div>
          <div className="p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Savings Account</p>
                <p className="text-sm text-muted-foreground">****1234 (Mock)</p>
              </div>
              <CheckCircle className="h-5 w-5 text-green-600 ml-auto" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Click Continue to link this account
          </p>
        </div>
      );

    case 'verify_otp':
      return (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              An OTP has been sent to your registered mobile number. Please enter it below.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="otp">One-Time Password</Label>
            <Input
              id="otp"
              value={otpCode}
              onChange={(e) => onOtpCodeChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className="text-center text-2xl tracking-widest font-mono"
            />
          </div>
        </div>
      );

    case 'set_pin':
      return (
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Important:</strong> Your IPS PIN is used to authorize payments. Keep it secure
              and never share it.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pin">Create 6-Digit IPS PIN</Label>
            <Input
              id="pin"
              type="password"
              value={ipsPin}
              onChange={(e) => onIpsPinChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••••"
              maxLength={6}
              className="text-center text-2xl tracking-widest"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pinConfirm">Confirm PIN</Label>
            <Input
              id="pinConfirm"
              type="password"
              value={ipsPinConfirm}
              onChange={(e) => onIpsPinConfirmChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••••"
              maxLength={6}
              className="text-center text-2xl tracking-widest"
            />
          </div>
        </div>
      );

    case 'create_alias': {
      const handle =
        sovProviders.find((p) => p.provider_code === onboardingData?.sov_provider_code)
          ?.provider_handle || 'namlend';
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vpa">Create Your VPA (Virtual Payment Address)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="vpa"
                value={vpaUsername}
                onChange={(e) =>
                  onVpaUsernameChange(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))
                }
                placeholder="yourname"
                className="flex-1"
              />
              <span className="text-muted-foreground font-mono">@{handle}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              This is your unique payment address. Others can send money to you using this VPA.
            </p>
          </div>
          {vpaUsername && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-800 dark:text-green-200">
                Your VPA will be:{' '}
                <strong>
                  {vpaUsername}@{handle}
                </strong>
              </p>
            </div>
          )}
        </div>
      );
    }

    case 'finalize':
      return (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
              <div>
                <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                  Almost done!
                </p>
                <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                  Click Continue to finalize your IPP enrollment and start making instant payments.
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Device bound</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Bank account linked</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Account verified</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">IPS PIN set</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">VPA: {onboardingData?.long_alias}</span>
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
}

export function IPPActionDialog({
  open,
  onOpenChange,
  currentAction,
  currentStep,
  actionLoading,
  onSubmit,
  mobileNumber,
  onMobileNumberChange,
  selectedProvider,
  onSelectedProviderChange,
  sovProviders,
  onboardingData,
  otpCode,
  onOtpCodeChange,
  ipsPin,
  onIpsPinChange,
  ipsPinConfirm,
  onIpsPinConfirmChange,
  vpaUsername,
  onVpaUsernameChange,
}: IPPActionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{currentStep.label}</DialogTitle>
          <DialogDescription>{currentStep.inputLabel}</DialogDescription>
        </DialogHeader>

        <ActionDialogContent
          currentAction={currentAction}
          mobileNumber={mobileNumber}
          onMobileNumberChange={onMobileNumberChange}
          selectedProvider={selectedProvider}
          onSelectedProviderChange={onSelectedProviderChange}
          sovProviders={sovProviders}
          onboardingData={onboardingData}
          otpCode={otpCode}
          onOtpCodeChange={onOtpCodeChange}
          ipsPin={ipsPin}
          onIpsPinChange={onIpsPinChange}
          ipsPinConfirm={ipsPinConfirm}
          onIpsPinConfirmChange={onIpsPinConfirmChange}
          vpaUsername={vpaUsername}
          onVpaUsernameChange={onVpaUsernameChange}
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={actionLoading}>
            {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default IPPActionDialog;
