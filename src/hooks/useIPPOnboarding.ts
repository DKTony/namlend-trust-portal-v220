/**
 * useIPPOnboarding Hook
 *
 * Drives the IPP onboarding UI from the live Convex onboarding state machine.
 * Providers, linked accounts, verification options, and alias registration all
 * come from persisted backend state instead of frontend mocks.
 */

import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useEntitlements } from '@/hooks/useEntitlements';
import { api } from '@/integrations/convex/api';
import {
  IPPOnboardingState,
  IPP_ONBOARDING_STATE_COLORS,
  IPP_ONBOARDING_STATE_LABELS,
  getIPPOnboardingProgress,
  type IPPOnboardingAccount,
  type IPPOnboardingProvider,
  type IPPVerificationMethod,
} from '@/types/ips';
import { useMutation, useQuery } from 'convex/react';
import { useEffect, useMemo, useState } from 'react';

export const ONBOARDING_STEPS = [
  {
    state: 'NOT_STARTED' as IPPOnboardingState,
    label: 'Not Started',
    description: 'Your IPP enrollment has not been initiated yet.',
    action: null,
    requiresInput: false,
  },
  {
    state: 'DEVICE_BINDING_REQUIRED' as IPPOnboardingState,
    label: 'Device Binding',
    description: 'Bind your mobile device to enable secure IPP transactions.',
    action: 'bind_device',
    requiresInput: true,
    inputLabel: 'Verify your mobile number to bind this device',
  },
  {
    state: 'DEVICE_BOUND' as IPPOnboardingState,
    label: 'Select Your Bank',
    description: 'Fetching your available bank and wallet providers.',
    action: 'select_sov',
    requiresInput: true,
    inputLabel: 'Select your bank or wallet provider',
  },
  {
    state: 'SOV_SELECTION_PENDING' as IPPOnboardingState,
    label: 'Select Bank',
    description: 'Choose your bank or mobile money provider.',
    action: 'select_sov',
    requiresInput: true,
    inputLabel: 'Select your bank or wallet provider',
  },
  {
    state: 'SOV_SELECTED' as IPPOnboardingState,
    label: 'Select Account',
    description: 'Choose the account or wallet to link for IPP payments.',
    action: 'select_account',
    requiresInput: true,
    inputLabel: 'Select the account to link',
  },
  {
    state: 'ACCOUNTS_LISTED' as IPPOnboardingState,
    label: 'Choose Verification',
    description: 'Pick the verification method allowed for your selected account.',
    action: 'start_verification',
    requiresInput: true,
    inputLabel: 'Select your verification method',
  },
  {
    state: 'VERIFICATION_PENDING' as IPPOnboardingState,
    label: 'Enter OTP',
    description: 'Enter the OTP sent to your registered mobile number.',
    action: 'verify_otp',
    requiresInput: true,
    inputLabel: 'Enter the OTP',
  },
  {
    state: 'VERIFIED' as IPPOnboardingState,
    label: 'Set Your IPS PIN',
    description: 'Create the 6-digit PIN that will authorize your IPP payments.',
    action: 'set_pin',
    requiresInput: true,
    inputLabel: 'Create your 6-digit IPS PIN',
  },
  {
    state: 'IPS_PIN_SETTING' as IPPOnboardingState,
    label: 'Set IPS PIN',
    description: 'Your new IPS PIN is being provisioned.',
    action: 'set_pin',
    requiresInput: true,
    inputLabel: 'Create your 6-digit IPS PIN',
  },
  {
    state: 'IPS_PIN_SET' as IPPOnboardingState,
    label: 'Create Your VPA',
    description: 'Choose the alias customers and payment flows will use.',
    action: 'create_alias',
    requiresInput: true,
    inputLabel: 'Choose your VPA username',
  },
  {
    state: 'ALIAS_REGISTRATION_PENDING' as IPPOnboardingState,
    label: 'Registering VPA',
    description: 'Your alias is being registered with the IPS directory.',
    action: 'register_alias',
    requiresInput: false,
  },
  {
    state: 'ALIAS_REGISTERED' as IPPOnboardingState,
    label: 'Complete Enrollment',
    description: 'Your alias is confirmed. Finalize IPP enrollment.',
    action: 'finalize',
    requiresInput: false,
  },
  {
    state: 'READY_FOR_IPP_PAYMENTS' as IPPOnboardingState,
    label: 'Ready',
    description: 'You can now make instant payments using IPP.',
    action: null,
    requiresInput: false,
  },
];

export type SovProvider = IPPOnboardingProvider;

export interface OnboardingData {
  id: string;
  user_id: string;
  state: IPPOnboardingState;
  sov_provider_code: string | null;
  sov_provider_name: string | null;
  selected_account_ref: string | null;
  selected_account_masked: string | null;
  selected_account_type: string | null;
  selected_account_ifsc: string | null;
  selected_account_holder_name: string | null;
  available_sov_providers: SovProvider[];
  available_accounts: IPPOnboardingAccount[];
  available_verification_methods: IPPVerificationMethod[];
  verification_method: IPPVerificationMethod | null;
  long_alias: string | null;
  short_alias_mobile: string | null;
  alias_registration_request_msg_id: string | null;
  alias_registration_requested_at: string | null;
  alias_registration_confirmed_at: string | null;
  ips_pin_set: boolean;
  last_step_completed: string | null;
  last_error_code: string | null;
  last_error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

async function generateDeviceBindingPayload() {
  const deviceId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? `WEB-${crypto.randomUUID()}`
      : `WEB-${Date.now()}`;

  if (typeof crypto === 'undefined' || !crypto.subtle) {
    return { deviceId, publicKey: deviceId };
  }

  const keyPair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
    'verify',
  ]);
  const exported = await crypto.subtle.exportKey('spki', keyPair.publicKey);
  return {
    deviceId,
    publicKey: arrayBufferToBase64(exported),
  };
}

function deriveVerificationMethods(
  account?: IPPOnboardingAccount,
  fallback?: {
    aeba?: string | null;
    mbeba?: string | null;
    credsAllowed?: Array<{ subType?: string | null }> | null;
  }
): IPPVerificationMethod[] {
  const methods = new Set<IPPVerificationMethod>(account?.verificationMethods ?? []);

  const aeba = account?.aeba ?? fallback?.aeba;
  const mbeba = account?.mbeba ?? fallback?.mbeba;
  const credsAllowed = account?.credsAllowed ?? fallback?.credsAllowed ?? [];

  if (mbeba === 'Y') {
    methods.add('mno');
  }
  if (
    aeba === 'Y' ||
    credsAllowed.some((cred) =>
      ['ATMPIN', 'CARDDETAILS'].includes((cred?.subType ?? '').toUpperCase())
    )
  ) {
    methods.add('debit_card');
  }

  if (!methods.size) {
    methods.add('mno');
  }

  return Array.from(methods);
}

export function useIPPOnboarding() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { hasFeature } = useEntitlements();

  const [showActionDialogRaw, setShowActionDialogRaw] = useState(false);
  const [currentAction, setCurrentAction] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('ipp');

  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedAccountRef, setSelectedAccountRef] = useState('');
  const [verificationMethod, setVerificationMethod] = useState<IPPVerificationMethod>('mno');
  const [mobileNumber, setMobileNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [ipsPin, setIpsPin] = useState('');
  const [ipsPinConfirm, setIpsPinConfirm] = useState('');
  const [vpaUsername, setVpaUsername] = useState('');

  const rawOnboarding = useQuery(
    api.ips.ipsOnboarding.getMyOnboarding,
    hasFeature('clientBanking') ? {} : 'skip'
  );

  const startOnboardingMutation = useMutation(api.ips.ipsOnboarding.startOnboarding);
  const completeDeviceBindingMutation = useMutation(api.ips.ipsOnboarding.completeDeviceBinding);
  const requestSovProvidersMutation = useMutation(api.ips.ipsOnboarding.requestSovProviders);
  const selectSovProviderMutation = useMutation(api.ips.ipsOnboarding.selectSovProvider);
  const selectAccountMutation = useMutation(api.ips.ipsOnboarding.selectAccount);
  const startVerificationMutation = useMutation(api.ips.ipsOnboarding.startVerification);
  const submitOtpMutation = useMutation(api.ips.ipsOnboarding.submitOtp);
  const setupIpsPinMutation = useMutation(api.ips.ipsOnboarding.setupIpsPin);
  const createHandleMutation = useMutation(api.ips.ipsOnboarding.createHandle);
  const registerAliasMutation = useMutation(api.ips.ipsOnboarding.registerAlias);
  const confirmOnboardingMutation = useMutation(api.ips.ipsOnboarding.confirmOnboarding);
  const advanceStepMutation = useMutation(api.ips.ipsOnboarding.advanceOnboardingStep);

  const loading = hasFeature('clientBanking') && rawOnboarding === undefined;

  const onboardingData = useMemo<OnboardingData | null>(() => {
    if (!rawOnboarding) return null;

    const availableAccounts = (rawOnboarding.availableAccounts ?? []) as IPPOnboardingAccount[];
    const availableVerificationMethods = deriveVerificationMethods(
      availableAccounts.find((account) => account.accountRef === rawOnboarding.selectedAccountRef),
      {
        aeba: rawOnboarding.selectedAccountAeba ?? null,
        mbeba: rawOnboarding.selectedAccountMbeba ?? null,
        credsAllowed: (rawOnboarding.selectedAccountCredsAllowed ?? []) as Array<{
          subType?: string | null;
        }>,
      }
    );

    return {
      id: rawOnboarding._id,
      user_id: rawOnboarding.userId,
      state: mapToIPPState(rawOnboarding.status),
      sov_provider_code: rawOnboarding.sovProviderCode ?? null,
      sov_provider_name: rawOnboarding.sovProviderName ?? null,
      selected_account_ref: rawOnboarding.selectedAccountRef ?? null,
      selected_account_masked: rawOnboarding.selectedAccountMasked ?? null,
      selected_account_type: rawOnboarding.selectedAccountType ?? null,
      selected_account_ifsc: rawOnboarding.selectedAccountIfsc ?? null,
      selected_account_holder_name: rawOnboarding.selectedAccountHolderName ?? null,
      available_sov_providers: (rawOnboarding.availableSovProviders ?? []) as SovProvider[],
      available_accounts: availableAccounts,
      available_verification_methods: availableVerificationMethods,
      verification_method:
        (rawOnboarding.verificationMethod as IPPVerificationMethod | undefined) ?? null,
      long_alias: rawOnboarding.aliasAddr ?? rawOnboarding.selectedVpa ?? null,
      short_alias_mobile: rawOnboarding.mobileNumberNormalized ?? null,
      alias_registration_request_msg_id: rawOnboarding.aliasRegistrationRequestMsgId ?? null,
      alias_registration_requested_at: rawOnboarding.aliasRegistrationRequestedAt
        ? new Date(rawOnboarding.aliasRegistrationRequestedAt).toISOString()
        : null,
      alias_registration_confirmed_at: rawOnboarding.aliasRegistrationConfirmedAt
        ? new Date(rawOnboarding.aliasRegistrationConfirmedAt).toISOString()
        : null,
      ips_pin_set: rawOnboarding.ipsPinSet ?? false,
      last_step_completed: rawOnboarding.status,
      last_error_code: rawOnboarding.lastErrorCode ?? null,
      last_error_message: rawOnboarding.lastErrorMessage ?? null,
      started_at: rawOnboarding.createdAt ? new Date(rawOnboarding.createdAt).toISOString() : null,
      completed_at: rawOnboarding.approvedAt
        ? new Date(rawOnboarding.approvedAt).toISOString()
        : null,
    };
  }, [rawOnboarding]);

  const sovProviders = useMemo(
    () => onboardingData?.available_sov_providers ?? [],
    [onboardingData?.available_sov_providers]
  );
  const availableAccounts = useMemo(
    () => onboardingData?.available_accounts ?? [],
    [onboardingData?.available_accounts]
  );

  useEffect(() => {
    if (!mobileNumber && onboardingData?.short_alias_mobile) {
      setMobileNumber(onboardingData.short_alias_mobile);
    }
  }, [mobileNumber, onboardingData?.short_alias_mobile]);

  useEffect(() => {
    if (!selectedProvider && onboardingData?.sov_provider_code) {
      setSelectedProvider(onboardingData.sov_provider_code);
    }
  }, [selectedProvider, onboardingData?.sov_provider_code]);

  useEffect(() => {
    if (!selectedProvider && sovProviders.length === 1) {
      setSelectedProvider(sovProviders[0].providerCode);
    }
  }, [selectedProvider, sovProviders]);

  useEffect(() => {
    if (!selectedAccountRef && onboardingData?.selected_account_ref) {
      setSelectedAccountRef(onboardingData.selected_account_ref);
    }
  }, [selectedAccountRef, onboardingData?.selected_account_ref]);

  useEffect(() => {
    if (!selectedAccountRef && availableAccounts.length === 1) {
      setSelectedAccountRef(availableAccounts[0].accountRef);
    }
  }, [availableAccounts, selectedAccountRef]);

  useEffect(() => {
    if (
      onboardingData?.verification_method &&
      verificationMethod !== onboardingData.verification_method
    ) {
      setVerificationMethod(onboardingData.verification_method);
    } else if (
      !onboardingData?.verification_method &&
      onboardingData?.available_verification_methods.length &&
      !onboardingData.available_verification_methods.includes(verificationMethod)
    ) {
      setVerificationMethod(onboardingData.available_verification_methods[0]);
    }
  }, [onboardingData, verificationMethod]);

  const selectedAccount = useMemo(
    () =>
      availableAccounts.find(
        (account) =>
          account.accountRef === (selectedAccountRef || onboardingData?.selected_account_ref)
      ) ?? null,
    [availableAccounts, onboardingData?.selected_account_ref, selectedAccountRef]
  );

  const availableVerificationMethods = selectedAccount
    ? deriveVerificationMethods(selectedAccount)
    : (onboardingData?.available_verification_methods ?? []);

  const getCurrentStep = () => {
    if (!onboardingData) return ONBOARDING_STEPS[0];
    return (
      ONBOARDING_STEPS.find((step) => step.state === onboardingData.state) ?? ONBOARDING_STEPS[0]
    );
  };

  const resetFormFields = () => {
    setOtpCode('');
    setIpsPin('');
    setIpsPinConfirm('');
    setVpaUsername('');
  };

  const setShowActionDialog = (open: boolean) => {
    setShowActionDialogRaw(open);
    if (!open) resetFormFields();
  };

  const handleStartAction = (action: string) => {
    setCurrentAction(action);
    setShowActionDialog(true);

    if (
      action === 'select_sov' &&
      rawOnboarding &&
      mapToIPPState(rawOnboarding.status) === 'DEVICE_BOUND' &&
      !(rawOnboarding.availableSovProviders?.length ?? 0)
    ) {
      void requestSovProvidersMutation({ applicationId: rawOnboarding._id }).catch((error: any) => {
        toast({
          title: 'Unable to Fetch Providers',
          description: error?.data?.message ?? error?.message ?? 'Please try again.',
          variant: 'destructive',
        });
      });
    }
  };

  const handleSubmitAction = async () => {
    if (!currentAction || !user) return;

    setActionLoading(true);

    try {
      if (!rawOnboarding) {
        await startOnboardingMutation({});
        toast({ title: 'Onboarding Started', description: 'Your IPP enrollment has begun.' });
        setShowActionDialog(false);
        return;
      }

      const appId = rawOnboarding._id;

      if (isLegacyState(rawOnboarding.status)) {
        await advanceStepMutation({
          applicationId: appId,
          stepData: {},
          selectedVpa: currentAction === 'create_alias' ? `${vpaUsername}@namlend` : undefined,
        });
        toast({ title: 'Step Completed' });
        setShowActionDialog(false);
        resetFormFields();
        return;
      }

      switch (currentAction) {
        case 'bind_device': {
          if (!mobileNumber) {
            toast({ title: 'Mobile number required', variant: 'destructive' });
            return;
          }

          const devicePayload = await generateDeviceBindingPayload();
          await completeDeviceBindingMutation({
            applicationId: appId,
            mobileNumber,
            deviceId: devicePayload.deviceId,
            publicKey: devicePayload.publicKey,
            deviceName: 'Web Browser',
          });
          toast({ title: 'Device Bound', description: 'Your device has been linked for IPP.' });
          break;
        }

        case 'select_sov': {
          if (!selectedProvider) {
            toast({ title: 'Please select a provider', variant: 'destructive' });
            return;
          }

          const provider = sovProviders.find((item) => item.providerCode === selectedProvider);
          await selectSovProviderMutation({
            applicationId: appId,
            providerCode: selectedProvider,
            providerName: provider?.providerName ?? selectedProvider,
          });
          toast({
            title: 'Provider Selected',
            description: provider?.providerName ?? selectedProvider,
          });
          break;
        }

        case 'select_account': {
          if (!selectedAccountRef) {
            toast({ title: 'Please select an account', variant: 'destructive' });
            return;
          }

          const account =
            availableAccounts.find((item) => item.accountRef === selectedAccountRef) ?? null;

          await selectAccountMutation({
            applicationId: appId,
            accountRef: selectedAccountRef,
            accountMasked: account?.maskedAccountNumber,
            accountIfsc: account?.ifsc,
          });
          toast({
            title: 'Account Selected',
            description: account?.maskedAccountNumber ?? selectedAccountRef,
          });
          break;
        }

        case 'start_verification': {
          if (!availableVerificationMethods.includes(verificationMethod)) {
            toast({
              title: 'Verification method unavailable',
              description: 'Select a supported verification method for this account.',
              variant: 'destructive',
            });
            return;
          }

          await startVerificationMutation({
            applicationId: appId,
            verificationMethod,
          });
          toast({
            title: 'Verification Started',
            description:
              verificationMethod === 'debit_card'
                ? 'Debit card verification has started. Enter the OTP when it arrives.'
                : 'OTP has been sent to your registered mobile number.',
          });
          break;
        }

        case 'verify_otp': {
          if (!otpCode || otpCode.length !== 6) {
            toast({ title: 'Please enter a valid 6-digit OTP', variant: 'destructive' });
            return;
          }

          await submitOtpMutation({
            applicationId: appId,
            otpCode,
          });
          toast({ title: 'OTP Submitted', description: 'Verifying your account...' });
          break;
        }

        case 'set_pin': {
          if (!/^\d{6}$/.test(ipsPin)) {
            toast({ title: 'Please enter a valid 6-digit PIN', variant: 'destructive' });
            return;
          }
          if (ipsPin !== ipsPinConfirm) {
            toast({ title: 'PINs do not match', variant: 'destructive' });
            return;
          }

          await setupIpsPinMutation({
            applicationId: appId,
            pin: ipsPin,
          });
          toast({ title: 'PIN Submitted', description: 'Your IPS PIN is being provisioned.' });
          break;
        }

        case 'create_alias': {
          if (!vpaUsername || vpaUsername.length < 3) {
            toast({ title: 'VPA username must be at least 3 characters', variant: 'destructive' });
            return;
          }

          await createHandleMutation({
            applicationId: appId,
            vpaUsername,
          });
          toast({
            title: 'VPA Reserved',
            description: 'Your alias has been created locally and is ready for IPS registration.',
          });
          break;
        }

        case 'register_alias': {
          await registerAliasMutation({
            applicationId: appId,
          });
          toast({
            title: 'Alias Registration Sent',
            description: 'Waiting for IPS to confirm your payment alias.',
          });
          break;
        }

        case 'finalize': {
          await confirmOnboardingMutation({
            applicationId: appId,
          });
          toast({ title: 'Enrollment Complete', description: 'You can now make IPP payments.' });
          break;
        }

        default:
          return;
      }

      setShowActionDialog(false);
      resetFormFields();
    } catch (err: any) {
      const errorMessage = err?.data?.message ?? err?.message ?? 'An unexpected error occurred';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const getStateColor = (state: IPPOnboardingState) => {
    return IPP_ONBOARDING_STATE_COLORS[state] || 'gray';
  };

  const fetchOnboardingStatus = async () => {
    if (
      rawOnboarding &&
      mapToIPPState(rawOnboarding.status) === 'DEVICE_BOUND' &&
      !(rawOnboarding.availableSovProviders?.length ?? 0)
    ) {
      await requestSovProvidersMutation({ applicationId: rawOnboarding._id });
    }
  };

  const currentStep = getCurrentStep();
  const progress = onboardingData ? getIPPOnboardingProgress(onboardingData.state) : 0;
  const isReady = onboardingData?.state === 'READY_FOR_IPP_PAYMENTS';

  return {
    loading,
    setLoading: () => {},
    onboardingData,
    sovProviders,
    availableAccounts,
    selectedAccount,
    availableVerificationMethods,
    activeTab,
    setActiveTab,

    showActionDialog: showActionDialogRaw,
    setShowActionDialog,
    currentAction,
    actionLoading,

    selectedProvider,
    setSelectedProvider,
    selectedAccountRef,
    setSelectedAccountRef,
    verificationMethod,
    setVerificationMethod,
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

    currentStep,
    progress,
    isReady,

    fetchOnboardingStatus,
    getCurrentStep,
    handleStartAction,
    handleSubmitAction,
    getStateColor,
  };
}

function mapToIPPState(status: string): IPPOnboardingState {
  const legacyMap: Record<string, IPPOnboardingState> = {
    step_1_identity: 'DEVICE_BINDING_REQUIRED',
    step_2_bank_details: 'SOV_SELECTION_PENDING',
    step_3_documents: 'ACCOUNTS_LISTED',
    step_4_vpa_selection: 'ALIAS_REGISTRATION_PENDING',
    step_5_review: 'ALIAS_REGISTERED',
    step_6_submitted: 'ALIAS_REGISTERED',
    step_7_approved: 'READY_FOR_IPP_PAYMENTS',
  };

  return legacyMap[status] ?? (status as IPPOnboardingState);
}

function isLegacyState(status: string): boolean {
  return status.startsWith('step_') || status === 'rejected';
}

export { IPP_ONBOARDING_STATE_LABELS };
