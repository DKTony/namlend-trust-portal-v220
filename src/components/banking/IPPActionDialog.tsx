/**
 * IPP Action Dialog Component
 *
 * Renders onboarding step inputs from live provider/account discovery data.
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ONBOARDING_STEPS, OnboardingData, SovProvider } from '@/hooks/useIPPOnboarding';
import type { IPPOnboardingAccount, IPPVerificationMethod } from '@/types/ips';
import {
  Building2,
  CheckCircle,
  CreditCard,
  Info,
  Loader2,
  Shield,
  Smartphone,
} from 'lucide-react';

interface IPPActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAction: string | null;
  currentStep: (typeof ONBOARDING_STEPS)[number];
  actionLoading: boolean;
  onSubmit: () => void;

  mobileNumber: string;
  onMobileNumberChange: (value: string) => void;
  selectedProvider: string;
  onSelectedProviderChange: (value: string) => void;
  sovProviders: SovProvider[];
  selectedAccountRef: string;
  onSelectedAccountRefChange: (value: string) => void;
  availableAccounts: IPPOnboardingAccount[];
  selectedAccount: IPPOnboardingAccount | null;
  verificationMethod: IPPVerificationMethod;
  onVerificationMethodChange: (value: IPPVerificationMethod) => void;
  availableVerificationMethods: IPPVerificationMethod[];
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
  selectedAccountRef,
  onSelectedAccountRefChange,
  availableAccounts,
  selectedAccount,
  verificationMethod,
  onVerificationMethodChange,
  availableVerificationMethods,
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
  | 'selectedAccountRef'
  | 'onSelectedAccountRefChange'
  | 'availableAccounts'
  | 'selectedAccount'
  | 'verificationMethod'
  | 'onVerificationMethodChange'
  | 'availableVerificationMethods'
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
            <Input
              id="mobile"
              value={mobileNumber}
              onChange={(e) => onMobileNumberChange(e.target.value)}
              placeholder="+264 81 123 4567"
            />
            <p className="text-xs text-muted-foreground">
              This number is used for OTP verification and mobile-based alias registration.
            </p>
          </div>
        </div>
      );

    case 'select_sov':
      return (
        <div className="space-y-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4  ">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-5 w-5 text-blue-600 " />
              <p className="text-sm text-blue-800 ">
                Choose the bank or wallet provider that owns the account you want to link.
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
                  <SelectItem key={provider.providerCode} value={provider.providerCode}>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {provider.providerName}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!sovProviders.length && (
              <p className="text-xs text-muted-foreground">
                Provider discovery is still running for this mobile number.
              </p>
            )}
          </div>
        </div>
      );

    case 'select_account':
      return (
        <div className="space-y-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4  ">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-5 w-5 text-blue-600 " />
              <div>
                <p className="text-sm font-medium text-blue-800 ">
                  Accounts from {onboardingData?.sov_provider_name || 'your provider'}
                </p>
                <p className="mt-1 text-xs text-blue-700 ">
                  Select the account that should be mapped to your IPP alias.
                </p>
              </div>
            </div>
          </div>

          {availableAccounts.length ? (
            <RadioGroup value={selectedAccountRef} onValueChange={onSelectedAccountRefChange}>
              <div className="space-y-3">
                {availableAccounts.map((account) => (
                  <label
                    key={account.accountRef}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50"
                  >
                    <RadioGroupItem value={account.accountRef} id={account.accountRef} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-primary" />
                        <span className="font-medium">
                          {account.maskedAccountNumber ?? account.accountRef}
                        </span>
                        {account.accountType && (
                          <Badge variant="secondary" className="text-xs">
                            {account.accountType}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {account.accountHolderName ?? 'Account holder not provided'}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {account.verificationMethods?.includes('mno') && <span>MNO OTP</span>}
                        {account.verificationMethods?.includes('debit_card') && (
                          <span>Debit card verification</span>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </RadioGroup>
          ) : (
            <p className="text-sm text-muted-foreground">
              Account discovery is still running for this provider.
            </p>
          )}
        </div>
      );

    case 'start_verification':
      return (
        <div className="space-y-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4  ">
            <div className="flex items-start gap-3">
              <Shield className="mt-0.5 h-5 w-5 text-blue-600 " />
              <div>
                <p className="text-sm font-medium text-blue-800 ">
                  Verify {selectedAccount?.maskedAccountNumber ?? 'your selected account'}
                </p>
                <p className="mt-1 text-xs text-blue-700 ">
                  Only the methods returned by IPS for this account are shown here.
                </p>
              </div>
            </div>
          </div>

          <RadioGroup
            value={verificationMethod}
            onValueChange={(value) => onVerificationMethodChange(value as IPPVerificationMethod)}
            className="space-y-3"
          >
            {availableVerificationMethods.map((method) => (
              <label
                key={method}
                className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50"
              >
                <RadioGroupItem value={method} id={`verification-${method}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {method === 'mno' ? (
                      <Smartphone className="h-4 w-4 text-primary" />
                    ) : (
                      <CreditCard className="h-4 w-4 text-primary" />
                    )}
                    <span className="font-medium">
                      {method === 'mno' ? 'Mobile OTP verification' : 'Debit card verification'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {method === 'mno'
                      ? 'Send an OTP to the mobile number registered on the account.'
                      : 'Use the issuing bank card-verification flow for this account.'}
                  </p>
                </div>
              </label>
            ))}
          </RadioGroup>
        </div>
      );

    case 'verify_otp':
      return (
        <div className="space-y-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4  ">
            <p className="text-sm text-blue-800 ">
              Enter the OTP sent to your registered mobile number.
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
              className="text-center font-mono text-2xl tracking-widest"
            />
          </div>
        </div>
      );

    case 'set_pin':
      return (
        <div className="space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4  ">
            <p className="text-sm text-amber-800 ">
              <strong>Important:</strong> Your IPS PIN authorizes payments. Keep it private.
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
        sovProviders.find((provider) => provider.providerCode === onboardingData?.sov_provider_code)
          ?.providerHandle ?? 'namlend';

      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vpa">Create Your VPA</Label>
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
              <span className="font-mono text-muted-foreground">@{handle}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              This is the alias customers and repayment flows will use.
            </p>
          </div>
          {vpaUsername && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3  ">
              <p className="text-sm text-green-800 ">
                Your VPA will be{' '}
                <strong>
                  {vpaUsername}@{handle}
                </strong>
              </p>
            </div>
          )}
        </div>
      );
    }

    case 'register_alias':
      return (
        <div className="space-y-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4  ">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-5 w-5 text-blue-600 " />
              <div>
                <p className="text-sm font-medium text-blue-800 ">
                  Register {onboardingData?.long_alias ?? 'your alias'} with IPS
                </p>
                <p className="mt-1 text-xs text-blue-700 ">
                  This submits the alias to the IPS directory. Enrollment stays pending until the
                  callback confirms the alias is active and synced.
                </p>
              </div>
            </div>
          </div>
        </div>
      );

    case 'finalize':
      return (
        <div className="space-y-4">
          <div className="rounded-lg border border-green-200 bg-green-50 p-4  ">
            <div className="flex items-start gap-3">
              <CheckCircle className="mt-0.5 h-5 w-5 text-green-600 " />
              <div>
                <p className="text-sm font-medium text-green-800 ">Alias confirmed by IPS</p>
                <p className="mt-1 text-xs text-green-700 ">
                  Finalize the enrollment now that your account, PIN, and alias are all confirmed.
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Device bound</span>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">
                Linked account: {onboardingData?.selected_account_masked ?? 'Selected'}
              </span>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Verification completed</span>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">IPS PIN set</span>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
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
  selectedAccountRef,
  onSelectedAccountRefChange,
  availableAccounts,
  selectedAccount,
  verificationMethod,
  onVerificationMethodChange,
  availableVerificationMethods,
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
          selectedAccountRef={selectedAccountRef}
          onSelectedAccountRefChange={onSelectedAccountRefChange}
          availableAccounts={availableAccounts}
          selectedAccount={selectedAccount}
          verificationMethod={verificationMethod}
          onVerificationMethodChange={onVerificationMethodChange}
          availableVerificationMethods={availableVerificationMethods}
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
            {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default IPPActionDialog;
