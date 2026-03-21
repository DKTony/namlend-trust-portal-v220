/**
 * useIPPOnboarding Hook
 * Manages all IPP onboarding state, data fetching, and action handling.
 */

import { useState, useEffect } from 'react';
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

// Onboarding step configuration
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
    label: 'Select Account',
    description: 'Choose the account to link with IPP.',
    action: 'select_account',
    requiresInput: true,
    inputLabel: 'Select your account',
  },
  {
    state: 'VERIFICATION_PENDING' as IPPOnboardingState,
    label: 'Verify Account',
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
    label: 'Create VPA',
    description: 'Create your Virtual Payment Address (e.g., yourname@namlend).',
    action: 'create_alias',
    requiresInput: true,
    inputLabel: 'Choose your VPA username',
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

export function useIPPOnboarding() {
  const { user } = useAuth();
  const { toast } = useToast();

  // State
  const [loading, setLoading] = useState(true);
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [sovProviders, setSovProviders] = useState<SovProvider[]>([]);
  const [activeTab, setActiveTab] = useState('ipp');

  // Action dialog state
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [currentAction, setCurrentAction] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form inputs
  const [selectedProvider, setSelectedProvider] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [ipsPin, setIpsPin] = useState('');
  const [ipsPinConfirm, setIpsPinConfirm] = useState('');
  const [vpaUsername, setVpaUsername] = useState('');

  // Convex reactive queries
  const rawOnboarding = useQuery(api.ips.ipsOnboarding.getMyOnboarding);
  const startOnboardingMutation = useMutation(api.ips.ipsOnboarding.startOnboarding);
  const advanceStepMutation = useMutation(api.ips.ipsOnboarding.advanceOnboardingStep);

  // Map Convex onboarding to legacy OnboardingData shape
  useEffect(() => {
    if (rawOnboarding !== undefined) {
      setLoading(false);
      if (rawOnboarding) {
        // Map Convex step-based status to legacy IPP state machine
        const stepToState: Record<string, IPPOnboardingState> = {
          step_1_identity: 'DEVICE_BINDING_REQUIRED',
          step_2_bank_details: 'SOV_SELECTION_PENDING',
          step_3_documents: 'ACCOUNTS_LISTED',
          step_4_vpa_selection: 'ALIAS_REGISTRATION_PENDING',
          step_5_review: 'ALIAS_REGISTERED',
          step_6_submitted: 'ALIAS_REGISTERED',
          step_7_approved: 'READY_FOR_IPP_PAYMENTS',
          rejected: 'NOT_STARTED',
        };
        setOnboardingData({
          id: rawOnboarding._id,
          user_id: rawOnboarding.userId,
          state: stepToState[rawOnboarding.status] ?? 'NOT_STARTED',
          sov_provider_code: rawOnboarding.bankDetails?.sov_provider_code ?? null,
          sov_provider_name: rawOnboarding.bankDetails?.sov_provider_name ?? null,
          selected_account_masked: rawOnboarding.bankDetails?.selected_account_masked ?? null,
          long_alias: rawOnboarding.selectedVpa ?? null,
          short_alias_mobile: null,
          ips_pin_set: false,
          last_step_completed: rawOnboarding.status,
          last_error_code: null,
          last_error_message: null,
          started_at: rawOnboarding.createdAt
            ? new Date(rawOnboarding.createdAt).toISOString()
            : null,
          completed_at: rawOnboarding.approvedAt
            ? new Date(rawOnboarding.approvedAt).toISOString()
            : null,
        });
      }
    }
  }, [rawOnboarding]);

  // SOV providers — hardcoded mock data (IPS is in mock mode, no Convex table yet)
  useEffect(() => {
    setSovProviders([
      {
        id: '1',
        provider_code: 'FNB',
        provider_name: 'First National Bank',
        provider_handle: 'fnb',
        is_active: true,
      },
      {
        id: '2',
        provider_code: 'SBN',
        provider_name: 'Standard Bank Namibia',
        provider_handle: 'standardbank',
        is_active: true,
      },
      {
        id: '3',
        provider_code: 'NDB',
        provider_name: 'Nedbank Namibia',
        provider_handle: 'nedbank',
        is_active: true,
      },
      {
        id: '4',
        provider_code: 'BOW',
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
    ]);
  }, []);

  const fetchOnboardingStatus = async () => {
    // No-op: Convex data is reactive via useQuery
  };

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
      let stepData: Record<string, any> = {};
      let stepName = '';

      switch (currentAction) {
        case 'bind_device':
          if (!mobileNumber) {
            toast({ title: 'Mobile number required', variant: 'destructive' });
            return;
          }
          stepName = 'device_binding';
          stepData = { short_alias_mobile: mobileNumber };
          break;

        case 'select_sov':
          if (!selectedProvider) {
            toast({ title: 'Please select a provider', variant: 'destructive' });
            return;
          }
          const provider = sovProviders.find((p) => p.provider_code === selectedProvider);
          stepName = 'sov_selection';
          stepData = {
            sov_provider_code: selectedProvider,
            sov_provider_name: provider?.provider_name || selectedProvider,
            sov_provider_handle: provider?.provider_handle || 'namlend',
          };
          break;

        case 'select_account':
          // In mock mode, we simulate account selection
          stepName = 'account_selection';
          stepData = {
            selected_account_ref: 'MOCK_ACC_' + Date.now(),
            selected_account_masked: '****' + Math.floor(1000 + Math.random() * 9000),
            selected_account_type: 'SAVINGS',
          };
          break;

        case 'verify_otp':
          if (!otpCode || otpCode.length !== 6) {
            toast({ title: 'Please enter a valid 6-digit OTP', variant: 'destructive' });
            return;
          }
          stepName = 'verification';
          stepData = { otp_verified: true };
          break;

        case 'set_pin':
          if (!ipsPin || ipsPin.length !== 6) {
            toast({ title: 'Please enter a valid 6-digit PIN', variant: 'destructive' });
            return;
          }
          if (ipsPin !== ipsPinConfirm) {
            toast({ title: 'PINs do not match', variant: 'destructive' });
            return;
          }
          stepName = 'set_ips_pin';
          stepData = {}; // PIN is not stored in database, only flag
          break;

        case 'create_alias':
          if (!vpaUsername || vpaUsername.length < 3) {
            toast({ title: 'VPA username must be at least 3 characters', variant: 'destructive' });
            return;
          }
          const vpaHandle =
            sovProviders.find((p) => p.provider_code === onboardingData?.sov_provider_code)
              ?.provider_handle || 'namlend';
          stepName = 'register_alias';
          stepData = {
            long_alias: `${vpaUsername}@${vpaHandle}`,
            mobile_id_status: 'ACTIVE',
          };
          break;

        case 'finalize':
          // Finalize enrollment - transition to READY state
          stepName = 'finalize_enrollment';
          stepData = {};
          break;

        default:
          return;
      }

      // Start onboarding if not yet started
      if (!rawOnboarding) {
        await startOnboardingMutation();
      }

      // Advance onboarding step via Convex mutation
      if (rawOnboarding?._id) {
        await advanceStepMutation({
          applicationId: rawOnboarding._id,
          stepData,
          selectedVpa: currentAction === 'create_alias' ? stepData.long_alias : undefined,
        });
      }

      toast({
        title: 'Step Completed',
        description: `Successfully completed ${stepName.replace('_', ' ')}`,
      });

      // Convex data updates reactively, close dialog
      setShowActionDialog(false);

      // Reset form fields
      setOtpCode('');
      setIpsPin('');
      setIpsPinConfirm('');
      setVpaUsername('');
    } catch (err) {
      console.error('Submit action error:', err);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const getStateColor = (state: IPPOnboardingState) => {
    return IPP_ONBOARDING_STATE_COLORS[state] || 'gray';
  };

  const currentStep = getCurrentStep();
  const progress = onboardingData ? getIPPOnboardingProgress(onboardingData.state) : 0;
  const isReady = onboardingData?.state === 'READY_FOR_IPP_PAYMENTS';

  return {
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
    getCurrentStep,
    handleStartAction,
    handleSubmitAction,
    getStateColor,
  };
}
