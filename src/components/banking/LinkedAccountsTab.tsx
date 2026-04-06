/**
 * Linked Accounts Tab Component
 * Displays linked bank accounts associated with the user's IPP onboarding.
 */

import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { Badge } from '@/components/ui/badge';
import { Building2 } from 'lucide-react';
import type { OnboardingData } from '@/hooks/useIPPOnboarding';

interface LinkedAccountsTabProps {
  onboardingData: OnboardingData | null;
}

export function LinkedAccountsTab({ onboardingData }: LinkedAccountsTabProps) {
  return (
    <ThemedCard>
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
              {onboardingData.selected_account_holder_name && (
                <p className="text-xs text-muted-foreground">
                  {onboardingData.selected_account_holder_name}
                  {onboardingData.selected_account_type
                    ? ` • ${onboardingData.selected_account_type}`
                    : ''}
                </p>
              )}
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
    </ThemedCard>
  );
}

export default LinkedAccountsTab;
