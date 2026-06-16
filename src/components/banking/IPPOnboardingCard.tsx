/**
 * IPP Onboarding Card Component
 * Displays IPP enrollment status with progress bar, next step indicator,
 * error display, and VPA display.
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ThemedCard } from '@/components/ui/ThemedCard';
import type { ONBOARDING_STEPS, OnboardingData } from '@/hooks/useIPPOnboarding';
import { IPP_ONBOARDING_STATE_LABELS } from '@/types/ips';
import { AlertCircle, CheckCircle, ChevronRight, Wallet, Zap } from 'lucide-react';

interface IPPOnboardingCardProps {
  onboardingData: OnboardingData | null;
  currentStep: (typeof ONBOARDING_STEPS)[number];
  progress: number;
  isReady: boolean;
  onStartAction: (action: string) => void;
}

export function IPPOnboardingCard({
  onboardingData,
  currentStep,
  progress,
  isReady,
  onStartAction,
}: IPPOnboardingCardProps) {
  return (
    <ThemedCard
      className={`border-2 ${isReady ? 'border-green-500 dark:border-green-400' : 'border-primary/20'}`}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`p-3 rounded-xl ${isReady ? 'bg-green-100 dark:bg-green-900/30' : 'bg-primary/10'}`}
            >
              {isReady ? (
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              ) : (
                <Zap className="h-6 w-6 text-primary" />
              )}
            </div>
            <div>
              <CardTitle className="text-lg">{isReady ? 'IPP Ready' : 'IPP Enrollment'}</CardTitle>
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

        {/* Current Step Info - Action Required */}
        {!isReady && (
          <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border-2 border-primary/30 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/20 rounded-lg animate-pulse">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <span>Next Step:</span>
                  <Badge variant="default" className="bg-primary">
                    {currentStep.label}
                  </Badge>
                </h4>
                <p className="text-sm text-muted-foreground mt-1">{currentStep.description}</p>
              </div>
            </div>

            {currentStep.action && (
              <Button
                size="lg"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg"
                onClick={() => onStartAction(currentStep.action!)}
              >
                <span className="mr-2">👉</span>
                {currentStep.action === 'select_sov'
                  ? 'Select Your Bank'
                  : currentStep.action === 'select_account'
                    ? 'Link Account'
                    : currentStep.action === 'start_verification'
                      ? 'Choose Verification Method'
                      : currentStep.action === 'verify_otp'
                        ? 'Verify with OTP'
                        : currentStep.action === 'set_pin'
                          ? 'Set IPS PIN'
                          : currentStep.action === 'create_alias'
                            ? 'Create VPA Address'
                            : currentStep.action === 'finalize'
                              ? 'Complete Enrollment'
                              : currentStep.label}
                <ChevronRight className="h-5 w-5 ml-2" />
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

        {onboardingData?.state === 'ALIAS_REGISTRATION_PENDING' &&
          onboardingData.alias_registration_requested_at && (
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    Alias registration is pending IPS confirmation
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Requested at{' '}
                    {new Date(onboardingData.alias_registration_requested_at).toLocaleString()}. You
                    cannot finish enrollment until the directory callback confirms the alias.
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
    </ThemedCard>
  );
}

export default IPPOnboardingCard;
