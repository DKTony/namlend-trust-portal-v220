/**
 * Banking Section Component
 * Consolidated view of user's accounts, payment methods, and IPP onboarding
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  Building2,
  Smartphone,
  CreditCard,
  Wallet,
  Shield,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2,
  ChevronRight,
  Zap,
  Key,
  UserCheck,
  Phone,
  RefreshCw,
  Info
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  IPPOnboardingState,
  IPP_ONBOARDING_STATE_LABELS,
  IPP_ONBOARDING_STATE_COLORS,
  getIPPOnboardingProgress,
} from '@/types/ips';

// Onboarding step configuration
const ONBOARDING_STEPS = [
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
    label: 'Device Bound',
    description: 'Your device has been successfully bound.',
    action: null,
    requiresInput: false,
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
    label: 'Bank Selected',
    description: 'Your bank has been selected. Fetching your accounts...',
    action: null,
    requiresInput: false,
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
    label: 'Account Verified',
    description: 'Your account has been verified successfully.',
    action: null,
    requiresInput: false,
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
    label: 'PIN Set',
    description: 'Your IPS PIN has been set successfully.',
    action: null,
    requiresInput: false,
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
    label: 'VPA Created',
    description: 'Your VPA has been registered successfully.',
    action: null,
    requiresInput: false,
  },
  {
    state: 'READY_FOR_IPP_PAYMENTS' as IPPOnboardingState,
    label: 'Ready',
    description: 'You can now make instant payments using IPP!',
    action: null,
    requiresInput: false,
  },
];

interface SovProvider {
  id: string;
  provider_code: string;
  provider_name: string;
  provider_handle: string;
  is_active: boolean;
}

interface OnboardingData {
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

export function BankingSection() {
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

  useEffect(() => {
    if (user) {
      fetchOnboardingStatus();
      fetchSovProviders();
    }
  }, [user]);

  const fetchOnboardingStatus = async () => {
    try {
      const { data, error } = await supabase.rpc('get_or_create_ips_onboarding');
      
      if (error) {
        console.error('Error fetching onboarding status:', error);
        return;
      }
      
      if (data?.success && data.onboarding) {
        setOnboardingData(data.onboarding);
        
        // Pre-fill mobile number from profile if available
        if (data.profile?.phone) {
          setMobileNumber(data.profile.phone);
        }
      }
    } catch (err) {
      console.error('Fetch onboarding error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSovProviders = async () => {
    try {
      const { data, error } = await supabase
        .from('ips_sov_providers')
        .select('*')
        .eq('is_active', true)
        .order('provider_name');
      
      if (data) {
        setSovProviders(data);
      }
    } catch (err) {
      console.error('Fetch SOV providers error:', err);
    }
  };

  const getCurrentStep = () => {
    if (!onboardingData) return ONBOARDING_STEPS[0];
    return ONBOARDING_STEPS.find(s => s.state === onboardingData.state) || ONBOARDING_STEPS[0];
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
          const provider = sovProviders.find(p => p.provider_code === selectedProvider);
          stepName = 'sov_selection';
          stepData = {
            sov_provider_code: selectedProvider,
            sov_provider_name: provider?.provider_name || selectedProvider,
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
          const vpaHandle = sovProviders.find(p => p.provider_code === onboardingData?.sov_provider_code)?.provider_handle || 'namlend';
          stepName = 'register_alias';
          stepData = {
            long_alias: `${vpaUsername}@${vpaHandle}`,
            mobile_id_status: 'ACTIVE',
          };
          break;
          
        default:
          return;
      }
      
      // Call the advance step RPC
      const { data, error } = await supabase.rpc('advance_ips_onboarding_step', {
        p_user_id: user.id,
        p_step_name: stepName,
        p_step_data: stepData,
        p_success: true,
      });
      
      if (error) {
        console.error('Advance step error:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to complete step',
          variant: 'destructive',
        });
        return;
      }
      
      if (data?.success) {
        toast({
          title: 'Step Completed',
          description: `Successfully completed ${stepName.replace('_', ' ')}`,
        });
        
        // Refresh onboarding status
        await fetchOnboardingStatus();
        setShowActionDialog(false);
        
        // Reset form fields
        setOtpCode('');
        setIpsPin('');
        setIpsPinConfirm('');
        setVpaUsername('');
      }
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

  const renderActionDialogContent = () => {
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
                  onChange={(e) => setMobileNumber(e.target.value)}
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
            <div className="space-y-2">
              <Label>Select Your Bank or Provider</Label>
              <Select value={selectedProvider} onValueChange={setSelectedProvider}>
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
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
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
                <strong>Important:</strong> Your IPS PIN is used to authorize payments. Keep it secure and never share it.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pin">Create 6-Digit IPS PIN</Label>
              <Input
                id="pin"
                type="password"
                value={ipsPin}
                onChange={(e) => setIpsPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
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
                onChange={(e) => setIpsPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••"
                maxLength={6}
                className="text-center text-2xl tracking-widest"
              />
            </div>
          </div>
        );
        
      case 'create_alias':
        const handle = sovProviders.find(p => p.provider_code === onboardingData?.sov_provider_code)?.provider_handle || 'namlend';
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vpa">Create Your VPA (Virtual Payment Address)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="vpa"
                  value={vpaUsername}
                  onChange={(e) => setVpaUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
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
                  Your VPA will be: <strong>{vpaUsername}@{handle}</strong>
                </p>
              </div>
            )}
          </div>
        );
        
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentStep = getCurrentStep();
  const progress = onboardingData ? getIPPOnboardingProgress(onboardingData.state) : 0;
  const isReady = onboardingData?.state === 'READY_FOR_IPP_PAYMENTS';

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
          {/* Status Card */}
          <Card className={`border-2 ${isReady ? 'border-green-500 dark:border-green-400' : 'border-primary/20'}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${isReady ? 'bg-green-100 dark:bg-green-900/30' : 'bg-primary/10'}`}>
                    {isReady ? (
                      <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                    ) : (
                      <Zap className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      {isReady ? 'IPP Ready' : 'IPP Enrollment'}
                    </CardTitle>
                    <CardDescription>
                      {isReady 
                        ? 'You can make instant payments using IPP' 
                        : 'Complete the steps below to enable instant payments'}
                    </CardDescription>
                  </div>
                </div>
                <Badge 
                  variant={isReady ? 'default' : 'secondary'}
                  className={isReady ? 'bg-green-600' : ''}
                >
                  {IPP_ONBOARDING_STATE_LABELS[onboardingData?.state || 'NOT_STARTED']}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Enrollment Progress</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              {/* Current Step Info */}
              {!isReady && (
                <div className="p-4 bg-muted rounded-lg space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      {currentStep.requiresInput ? (
                        <AlertCircle className="h-5 w-5 text-primary" />
                      ) : (
                        <Clock className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">
                        {currentStep.requiresInput ? 'Action Required' : 'Processing'}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {currentStep.description}
                      </p>
                    </div>
                  </div>
                  
                  {currentStep.action && (
                    <Button 
                      className="w-full"
                      onClick={() => handleStartAction(currentStep.action!)}
                    >
                      {currentStep.label}
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </div>
              )}

              {/* Error Display */}
              {onboardingData?.last_error_code && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-800 dark:text-red-200">
                        Error: {onboardingData.last_error_code}
                      </p>
                      <p className="text-sm text-red-700 dark:text-red-300">
                        {onboardingData.last_error_message || 'An error occurred during enrollment'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* VPA Display when ready */}
              {isReady && onboardingData?.long_alias && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-700 dark:text-green-300">Your VPA</p>
                      <p className="text-lg font-mono font-bold text-green-800 dark:text-green-200">
                        {onboardingData.long_alias}
                      </p>
                    </div>
                    <Wallet className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Enrollment Steps */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Enrollment Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { icon: Phone, label: 'Device Binding', states: ['DEVICE_BINDING_REQUIRED', 'DEVICE_BOUND'] },
                  { icon: Building2, label: 'Bank Selection', states: ['SOV_SELECTION_PENDING', 'SOV_SELECTED', 'ACCOUNTS_LISTED'] },
                  { icon: Shield, label: 'Verification', states: ['VERIFICATION_PENDING', 'VERIFIED'] },
                  { icon: Key, label: 'IPS PIN Setup', states: ['IPS_PIN_SETTING', 'IPS_PIN_SET'] },
                  { icon: UserCheck, label: 'VPA Registration', states: ['ALIAS_REGISTRATION_PENDING', 'ALIAS_REGISTERED', 'READY_FOR_IPP_PAYMENTS'] },
                ].map((step, index) => {
                  const Icon = step.icon;
                  const stateIndex = ONBOARDING_STEPS.findIndex(s => s.state === onboardingData?.state);
                  const stepStates = step.states;
                  const isCompleted = stepStates.some(s => {
                    const sIndex = ONBOARDING_STEPS.findIndex(os => os.state === s);
                    return stateIndex > sIndex || (stateIndex === sIndex && s.includes('REGISTERED') || s.includes('SET') || s.includes('BOUND') || s.includes('VERIFIED') || s.includes('READY'));
                  });
                  const isCurrent = stepStates.includes(onboardingData?.state || 'NOT_STARTED');
                  
                  return (
                    <div 
                      key={index}
                      className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
                        isCurrent 
                          ? 'bg-primary/10 border border-primary/20' 
                          : isCompleted 
                            ? 'bg-green-50 dark:bg-green-900/10' 
                            : 'bg-muted/50'
                      }`}
                    >
                      <div className={`p-2 rounded-full ${
                        isCompleted 
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
                          : isCurrent 
                            ? 'bg-primary/20 text-primary' 
                            : 'bg-muted text-muted-foreground'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : (
                          <Icon className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${
                          isCompleted 
                            ? 'text-green-700 dark:text-green-300' 
                            : isCurrent 
                              ? 'text-foreground' 
                              : 'text-muted-foreground'
                        }`}>
                          {step.label}
                        </p>
                      </div>
                      {isCompleted && (
                        <Badge variant="outline" className="border-green-500 text-green-600 dark:text-green-400">
                          Complete
                        </Badge>
                      )}
                      {isCurrent && !isCompleted && (
                        <Badge variant="default">Current</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Accounts Tab */}
        <TabsContent value="accounts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Linked Accounts</CardTitle>
              <CardDescription>Bank accounts connected to your profile</CardDescription>
            </CardHeader>
            <CardContent>
              {onboardingData?.selected_account_masked ? (
                <div className="p-4 border rounded-lg flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-xl">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{onboardingData.sov_provider_name}</p>
                    <p className="text-sm text-muted-foreground font-mono">
                      {onboardingData.selected_account_masked}
                    </p>
                  </div>
                  <Badge variant="outline" className="border-green-500 text-green-600">
                    Active
                  </Badge>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No bank accounts linked yet</p>
                  <p className="text-sm">Complete IPP enrollment to link your bank account</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Methods Tab */}
        <TabsContent value="methods" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
              <CardDescription>Available payment options for loan repayments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* IPP */}
              <div className={`p-4 border rounded-lg flex items-center gap-4 ${isReady ? 'border-green-500 bg-green-50/50 dark:bg-green-900/10' : ''}`}>
                <div className={`p-3 rounded-xl ${isReady ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'}`}>
                  <Zap className={`h-6 w-6 ${isReady ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1">
                  <p className="font-medium">IPP Instant Payment</p>
                  <p className="text-sm text-muted-foreground">
                    {isReady ? onboardingData?.long_alias : 'Instant bank-to-bank transfers'}
                  </p>
                </div>
                <Badge variant={isReady ? 'default' : 'secondary'} className={isReady ? 'bg-green-600' : ''}>
                  {isReady ? 'Active' : 'Setup Required'}
                </Badge>
              </div>

              {/* Bank EFT */}
              <div className="p-4 border rounded-lg flex items-center gap-4">
                <div className="p-3 bg-muted rounded-xl">
                  <Building2 className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Bank EFT</p>
                  <p className="text-sm text-muted-foreground">Standard bank transfer</p>
                </div>
                <Badge variant="outline">Available</Badge>
              </div>

              {/* Mobile Money */}
              <div className="p-4 border rounded-lg flex items-center gap-4">
                <div className="p-3 bg-muted rounded-xl">
                  <Smartphone className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Mobile Money</p>
                  <p className="text-sm text-muted-foreground">MTC MoMo, TN Mobile Money</p>
                </div>
                <Badge variant="outline">Available</Badge>
              </div>

              {/* Debit Card */}
              <div className="p-4 border rounded-lg flex items-center gap-4">
                <div className="p-3 bg-muted rounded-xl">
                  <CreditCard className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Debit Card</p>
                  <p className="text-sm text-muted-foreground">Visa, Mastercard</p>
                </div>
                <Badge variant="outline">Available</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{currentStep.label}</DialogTitle>
            <DialogDescription>{currentStep.inputLabel}</DialogDescription>
          </DialogHeader>
          
          {renderActionDialogContent()}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitAction} disabled={actionLoading}>
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default BankingSection;
