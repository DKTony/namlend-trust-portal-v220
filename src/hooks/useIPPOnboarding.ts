/**
 * useIPPOnboarding Hook
 * Manages IPP onboarding state using step-specific Convex mutations.
 *
 * Each onboarding action calls its dedicated mutation (completeDeviceBinding,
 * selectSovProvider, selectAccount, etc.) rather than the generic advanceOnboardingStep.
 * Data flows reactively via useQuery — no polling or manual refresh needed.
 */

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/integrations/convex/api';
import {
  IPPOnboardingState,
  IPP_ONBOARDING_STATE_LABELS,
  IPP_ONBOARDING_STATE_COLORS,
  getIPPOnboardingProgress,
} from '@/types/ips';

// Onboarding step configuration — drives the UI card progression
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
    description:
      'Device bound successfully! Now select your bank or mobile money provider to continue.',
    action: 'select_sov',
    requiresInput: true,
    inputLabel: 'Select your bank or payment provider',
    nextStep: 'Bank Selection',
  },
  {
    state: 'SOV_SELECTION_PENDING' as IPPOnboardingState,
    label: 'Select Bank',
    description: 'Choose your bank or mobile money provider.',
    action: 'select_sov',
    requiresInput: true,
    inputLabel: 'Select your bank or payment provider',
  },
  {
    state: 'SOV_SELECTED' as IPPOnboardingState,
    label: 'Select Account',
    description: 'Bank selected! Now choose which account to link with IPP.',
    action: 'select_account',
    requiresInput: true,
    inputLabel: 'Select the account to link',
    nextStep: 'Account Selection',
  },
  {
    state: 'ACCOUNTS_LISTED' as IPPOnboardingState,
    label: 'Verify Account',
    description: 'Choose verification method and enter OTP.',
    action: 'start_verification',
    requiresInput: true,
    inputLabel: 'Select verification method',
  },
  {
    state: 'VERIFICATION_PENDING' as IPPOnboardingState,
    label: 'Enter OTP',
    description: 'Enter the OTP sent to your registered mobile number.',
    action: 'verify_otp',
    requiresInput: true,
    inputLabel: 'Enter OTP',
  },
  {
    state: 'VERIFIED' as IPPOnboardingState,
    label: 'Set Your IPS PIN',
    description: 'Account verified! Create a 6-digit PIN to secure your payments.',
    action: 'set_pin',
    requiresInput: true,
    inputLabel: 'Create your 6-digit IPS PIN',
    nextStep: 'PIN Setup',
  },
  {
    state: 'IPS_PIN_SETTING' as IPPOnboardingState,
    label: 'Set IPS PIN',
    description: 'Create a 6-digit IPS PIN for secure transactions.',
    action: 'set_pin',
    requiresInput: true,
    inputLabel: 'Create your 6-digit IPS PIN',
  },
  {
    state: 'IPS_PIN_SET' as IPPOnboardingState,
    label: 'Create Your VPA',
    description: 'PIN set! Create your Virtual Payment Address to complete enrollment.',
    action: 'create_alias',
    requiresInput: true,
    inputLabel: 'Choose your VPA username',
    nextStep: 'VPA Registration',
  },
  {
    state: 'ALIAS_REGISTRATION_PENDING' as IPPOnboardingState,
    label: 'Registering VPA',
    description: 'Your VPA is being registered with IPN...',
    action: 'register_alias',
    requiresInput: false,
  },
  {
    state: 'ALIAS_REGISTERED' as IPPOnboardingState,
    label: 'Complete Enrollment',
    description: 'VPA created! Finalizing your IPP enrollment...',
    action: 'finalize',
    requiresInput: false,
    nextStep: 'Finalization',
  },
  {
    state: 'READY_FOR_IPP_PAYMENTS' as IPPOnboardingState,
    label: 'Ready',
    description: 'You can now make instant payments using IPP!',
    action: null,
    requiresInput: false,
  },
];

export interface SovProvider {
  id: string;
  provider_code: string;
  provider_name: string;
  provider_handle: string;
  is_active: boolean;
}

export interface OnboardingData {
  id: string;
  user_id: string;
  state: IPPOnboardingState;
  sov_provider_code: string | null;
  sov_provider_name: string | null;
  selected_account_masked: string | null;
  long_alias: string | null;
  short_alias_mobile: string | null;
  ips_pin_set: boolean;
  last_step_completed: string | null;
  last_error_code: string | null;
  last_error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
}

// Hardcoded SoV providers — will be replaced by ReqListAccPvd API call
const MOCK_SOV_PROVIDERS: SovProvider[] = [
  {
    id: '1',
    provider_code: 'FIRNNANX',
    provider_name: 'First National Bank Namibia',
    provider_handle: 'fnb',
    is_active: true,
  },
  {
    id: '2',
    provider_code: 'SBIANANX',
    provider_name: 'Standard Bank Namibia',
    provider_handle: 'standardbank',
    is_active: true,
  },
  {
    id: '3',
    provider_code: 'NEDBNANX',
    provider_name: 'Nedbank Namibia',
    provider_handle: 'nedbank',
    is_active: true,
  },
  {
    id: '4',
    provider_code: 'BWNANX',
    provider_name: 'Bank Windhoek',
    provider_handle: 'bankwindhoek',
    is_active: true,
  },
  {
    id: '5',
    provider_code: 'MTC',
    provider_name: 'MTC MoMo',
    provider_handle: 'mtc',
    is_active: true,
  },
];

export function useIPPOnboarding() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Action dialog state — wrap setter to clear sensitive fields on close
  const [showActionDialogRaw, setShowActionDialogRaw] = useState(false);
  const [currentAction, setCurrentAction] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('ipp');

  // Form inputs
  const [selectedProvider, setSelectedProvider] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [ipsPin, setIpsPin] = useState('');
  const [ipsPinConfirm, setIpsPinConfirm] = useState('');
  const [vpaUsername, setVpaUsername] = useState('');

  // Convex reactive query — auto-updates when backend state changes
  const rawOnboarding = useQuery(api.ips.ipsOnboarding.getMyOnboarding);

  // Step-specific mutations
  const startOnboardingMutation = useMutation(api.ips.ipsOnboarding.startOnboarding);
  const completeDeviceBindingMutation = useMutation(api.ips.ipsOnboarding.completeDeviceBinding);
  const selectSovProviderMutation = useMutation(api.ips.ipsOnboarding.selectSovProvider);
  const selectAccountMutation = useMutation(api.ips.ipsOnboarding.selectAccount);
  const startVerificationMutation = useMutation(api.ips.ipsOnboarding.startVerification);
  const submitOtpMutation = useMutation(api.ips.ipsOnboarding.submitOtp);
  const setupIpsPinMutation = useMutation(api.ips.ipsOnboarding.setupIpsPin);
  const createHandleMutation = useMutation(api.ips.ipsOnboarding.createHandle);
  const registerAliasMutation = useMutation(api.ips.ipsOnboarding.registerAlias);
  const confirmOnboardingMutation = useMutation(api.ips.ipsOnboarding.confirmOnboarding);

  // Legacy generic mutation (kept for backward-compatible legacy states)
  const advanceStepMutation = useMutation(api.ips.ipsOnboarding.advanceOnboardingStep);

  // Derive loading from query state
  const loading = rawOnboarding === undefined;

  // Map Convex onboarding record to OnboardingData shape
  const onboardingData: OnboardingData | null = rawOnboarding
    ? {
        id: rawOnboarding._id,
        user_id: rawOnboarding.userId,
        // Use the status directly — schema now stores IPS-mandated states natively.
        // Legacy states (step_1_identity, etc.) are mapped for existing records.
        state: mapToIPPState(rawOnboarding.status),
        sov_provider_code: rawOnboarding.sovProviderCode ?? null,
        sov_provider_name: rawOnboarding.sovProviderName ?? null,
        selected_account_masked: rawOnboarding.selectedAccountMasked ?? null,
        long_alias: rawOnboarding.aliasAddr ?? rawOnboarding.selectedVpa ?? null,
        short_alias_mobile: rawOnboarding.mobileNumberNormalized ?? null,
        ips_pin_set: rawOnboarding.ipsPinSet ?? false,
        last_step_completed: rawOnboarding.status,
        last_error_code: rawOnboarding.lastErrorCode ?? null,
        last_error_message: rawOnboarding.lastErrorMessage ?? null,
        started_at: rawOnboarding.createdAt
          ? new Date(rawOnboarding.createdAt).toISOString()
          : null,
        completed_at: rawOnboarding.approvedAt
          ? new Date(rawOnboarding.approvedAt).toISOString()
          : null,
      }
    : null;

  const sovProviders = MOCK_SOV_PROVIDERS;

  const getCurrentStep = () => {
    if (!onboardingData) return ONBOARDING_STEPS[0];
    return ONBOARDING_STEPS.find((s) => s.state === onboardingData.state) || ONBOARDING_STEPS[0];
  };

  const handleStartAction = (action: string) => {
    setCurrentAction(action);
    setShowActionDialog(true);
  };

  const handleSubmitAction = async () => {
    if (!currentAction || !user) return;

    setActionLoading(true);

    try {
      // Start onboarding if not yet started
      if (!rawOnboarding) {
        await startOnboardingMutation();
        toast({ title: 'Onboarding Started', description: 'Your IPP enrollment has begun.' });
        setShowActionDialog(false);
        return;
      }

      const appId = rawOnboarding._id;

      // Check if this is a legacy state — use the generic advance mutation
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

      // Step-specific mutations
      switch (currentAction) {
        case 'bind_device': {
          if (!mobileNumber) {
            toast({ title: 'Mobile number required', variant: 'destructive' });
            return;
          }
          await completeDeviceBindingMutation({
            applicationId: appId,
            mobileNumber,
            deviceId: `WEB-${Date.now()}`,
            publicKey: 'web-client-key', // Web client doesn't have device binding — placeholder
          });
          toast({ title: 'Device Bound', description: 'Your mobile number has been verified.' });
          break;
        }

        case 'select_sov': {
          if (!selectedProvider) {
            toast({ title: 'Please select a provider', variant: 'destructive' });
            return;
          }
          const provider = sovProviders.find((p) => p.provider_code === selectedProvider);
          await selectSovProviderMutation({
            applicationId: appId,
            providerCode: selectedProvider,
            providerName: provider?.provider_name ?? selectedProvider,
          });
          toast({
            title: 'Provider Selected',
            description: provider?.provider_name ?? selectedProvider,
          });
          break;
        }

        case 'select_account': {
          // In mock mode, simulate account selection
          await selectAccountMutation({
            applicationId: appId,
            accountRef: 'MOCK_ACC_' + Date.now(),
            accountMasked: '****' + Math.floor(1000 + Math.random() * 9000),
          });
          toast({ title: 'Account Selected' });
          break;
        }

        case 'start_verification': {
          await startVerificationMutation({
            applicationId: appId,
            verificationMethod: 'mno', // Default to MNO — UI can offer debit_card choice
          });
          toast({
            title: 'Verification Started',
            description: 'OTP has been sent to your mobile.',
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
          toast({ title: 'OTP Submitted', description: 'Verifying...' });
          break;
        }

        case 'set_pin': {
          if (!ipsPin || ipsPin.length !== 6) {
            toast({ title: 'Please enter a valid 6-digit PIN', variant: 'destructive' });
            return;
          }
          if (ipsPin !== ipsPinConfirm) {
            toast({ title: 'PINs do not match', variant: 'destructive' });
            return;
          }
          await setupIpsPinMutation({
            applicationId: appId,
            pinLength: 6,
          });
          toast({ title: 'PIN Set', description: 'Your IPS PIN has been configured.' });
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
          toast({ title: 'VPA Created', description: `Your payment address has been created.` });
          break;
        }

        case 'register_alias': {
          await registerAliasMutation({
            applicationId: appId,
          });
          toast({ title: 'Alias Registration', description: 'Registering with IPN...' });
          break;
        }

        case 'finalize': {
          await confirmOnboardingMutation({
            applicationId: appId,
          });
          toast({ title: 'Enrollment Complete!', description: 'You can now make IPP payments.' });
          break;
        }

        default:
          return;
      }

      setShowActionDialog(false);
      resetFormFields();
    } catch (err: any) {
      console.error('Onboarding action error:', err);
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

  const resetFormFields = () => {
    setOtpCode('');
    setIpsPin('');
    setIpsPinConfirm('');
    setVpaUsername('');
  };

  // Wrap dialog setter to clear sensitive fields when dialog closes
  const setShowActionDialog = (open: boolean) => {
    setShowActionDialogRaw(open);
    if (!open) resetFormFields();
  };
  const showActionDialog = showActionDialogRaw;

  const getStateColor = (state: IPPOnboardingState) => {
    return IPP_ONBOARDING_STATE_COLORS[state] || 'gray';
  };

  // No-op: Convex data is reactive via useQuery
  const fetchOnboardingStatus = async () => {};

  const currentStep = getCurrentStep();
  const progress = onboardingData ? getIPPOnboardingProgress(onboardingData.state) : 0;
  const isReady = onboardingData?.state === 'READY_FOR_IPP_PAYMENTS';

  return {
    // State
    loading,
    setLoading: () => {}, // No-op for compatibility — loading is derived
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
    getCurrentStep,
    handleStartAction,
    handleSubmitAction,
    getStateColor,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map Convex status to IPPOnboardingState — handles both new and legacy states */
function mapToIPPState(status: string): IPPOnboardingState {
  // Legacy state mapping for existing records
  const legacyMap: Record<string, IPPOnboardingState> = {
    step_1_identity: 'DEVICE_BINDING_REQUIRED',
    step_2_bank_details: 'SOV_SELECTION_PENDING',
    step_3_documents: 'ACCOUNTS_LISTED',
    step_4_vpa_selection: 'ALIAS_REGISTRATION_PENDING',
    step_5_review: 'ALIAS_REGISTERED',
    step_6_submitted: 'ALIAS_REGISTERED',
    step_7_approved: 'READY_FOR_IPP_PAYMENTS',
    rejected: 'NOT_STARTED',
  };

  return (legacyMap[status] ?? status) as IPPOnboardingState;
}

function isLegacyState(status: string): boolean {
  return status.startsWith('step_') || status === 'rejected';
}
