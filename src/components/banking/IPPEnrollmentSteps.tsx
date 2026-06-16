/**
 * IPP Enrollment Steps Component
 * Visual step tracker with completion badges for IPP onboarding.
 */

import { Badge } from '@/components/ui/badge';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemedCard } from '@/components/ui/ThemedCard';
import type { OnboardingData } from '@/hooks/useIPPOnboarding';
import {
  Building2,
  CheckCircle,
  ChevronRight,
  CreditCard,
  Key,
  Phone,
  Shield,
  UserCheck,
} from 'lucide-react';

interface IPPEnrollmentStepsProps {
  onboardingData: OnboardingData | null;
  onStartAction: (action: string) => void;
}

export function IPPEnrollmentSteps({ onboardingData, onStartAction }: IPPEnrollmentStepsProps) {
  return (
    <ThemedCard>
      <CardHeader>
        <CardTitle className="text-lg">Enrollment Steps</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[
            {
              icon: Phone,
              label: 'Device Binding',
              states: ['DEVICE_BINDING_REQUIRED', 'DEVICE_BOUND'],
              action: 'bind_device',
              completedStates: ['DEVICE_BOUND'],
            },
            {
              icon: Building2,
              label: 'Bank Selection',
              states: ['DEVICE_BOUND', 'SOV_SELECTION_PENDING', 'SOV_SELECTED'],
              action: 'select_sov',
              completedStates: [
                'SOV_SELECTED',
                'ACCOUNTS_LISTED',
                'VERIFICATION_PENDING',
                'VERIFIED',
                'IPS_PIN_SETTING',
                'IPS_PIN_SET',
                'ALIAS_REGISTRATION_PENDING',
                'ALIAS_REGISTERED',
                'READY_FOR_IPP_PAYMENTS',
              ],
            },
            {
              icon: CreditCard,
              label: 'Link Account',
              states: ['SOV_SELECTED'],
              action: 'select_account',
              completedStates: [
                'ACCOUNTS_LISTED',
                'VERIFICATION_PENDING',
                'VERIFIED',
                'IPS_PIN_SETTING',
                'IPS_PIN_SET',
                'ALIAS_REGISTRATION_PENDING',
                'ALIAS_REGISTERED',
                'READY_FOR_IPP_PAYMENTS',
              ],
            },
            {
              icon: Shield,
              label: 'Verify Account',
              states: ['ACCOUNTS_LISTED', 'VERIFICATION_PENDING'],
              action:
                onboardingData?.state === 'VERIFICATION_PENDING'
                  ? 'verify_otp'
                  : 'start_verification',
              completedStates: [
                'VERIFIED',
                'IPS_PIN_SETTING',
                'IPS_PIN_SET',
                'ALIAS_REGISTRATION_PENDING',
                'ALIAS_REGISTERED',
                'READY_FOR_IPP_PAYMENTS',
              ],
            },
            {
              icon: Key,
              label: 'Set IPS PIN',
              states: ['VERIFIED', 'IPS_PIN_SETTING'],
              action: 'set_pin',
              completedStates: [
                'IPS_PIN_SET',
                'ALIAS_REGISTRATION_PENDING',
                'ALIAS_REGISTERED',
                'READY_FOR_IPP_PAYMENTS',
              ],
            },
            {
              icon: UserCheck,
              label: 'Create VPA',
              states: ['IPS_PIN_SET'],
              action: 'create_alias',
              completedStates: [
                'ALIAS_REGISTRATION_PENDING',
                'ALIAS_REGISTERED',
                'READY_FOR_IPP_PAYMENTS',
              ],
            },
            {
              icon: UserCheck,
              label: 'Register Alias',
              states: ['ALIAS_REGISTRATION_PENDING'],
              action: 'register_alias',
              completedStates: ['ALIAS_REGISTERED', 'READY_FOR_IPP_PAYMENTS'],
            },
          ].map((step, index) => {
            const Icon = step.icon;
            const currentState = onboardingData?.state || 'NOT_STARTED';
            const isCompleted = step.completedStates.includes(currentState);
            const isCurrent = step.states.includes(currentState) && !isCompleted;
            const canAction = isCurrent && step.action;

            return (
              <div
                key={index}
                onClick={() => canAction && onStartAction(step.action)}
                className={`flex items-center gap-4 p-3 rounded-lg transition-all ${
                  isCurrent
                    ? 'bg-primary/10 border-2 border-primary/30 cursor-pointer hover:bg-primary/20'
                    : isCompleted
                      ? 'bg-green-50 dark:bg-green-900/10'
                      : 'bg-muted/50 opacity-60'
                }`}
              >
                <div
                  className={`p-2 rounded-full ${
                    isCompleted
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                      : isCurrent
                        ? 'bg-primary/20 text-primary'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isCompleted ? <CheckCircle className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </div>
                <div className="flex-1">
                  <p
                    className={`font-medium ${
                      isCompleted
                        ? 'text-green-700 dark:text-green-300'
                        : isCurrent
                          ? 'text-foreground'
                          : 'text-muted-foreground'
                    }`}
                  >
                    {step.label}
                  </p>
                  {isCurrent && (
                    <p className="text-xs text-primary mt-0.5">Click to complete this step</p>
                  )}
                </div>
                {isCompleted && (
                  <Badge
                    variant="outline"
                    className="border-green-500 text-green-600 dark:text-green-400"
                  >
                    ✓ Done
                  </Badge>
                )}
                {isCurrent && <ChevronRight className="h-5 w-5 text-primary" />}
              </div>
            );
          })}
        </div>
      </CardContent>
    </ThemedCard>
  );
}

export default IPPEnrollmentSteps;
