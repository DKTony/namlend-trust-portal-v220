/**
 * Payment Methods Tab Component
 * Lists available payment methods including IPP, Bank EFT, Mobile Money, and Debit Card.
 */

import { Badge } from '@/components/ui/badge';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemedCard } from '@/components/ui/ThemedCard';
import type { OnboardingData } from '@/hooks/useIPPOnboarding';
import { Building2, CreditCard, Smartphone, Zap } from 'lucide-react';

interface PaymentMethodsTabProps {
  isReady: boolean;
  onboardingData: OnboardingData | null;
}

export function PaymentMethodsTab({ isReady, onboardingData }: PaymentMethodsTabProps) {
  return (
    <ThemedCard>
      <CardHeader>
        <CardTitle>Payment Methods</CardTitle>
        <CardDescription>Available payment options for loan repayments</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* IPP */}
        <div
          className={`p-4 border rounded-lg flex items-center gap-4 ${isReady ? 'border-green-500 bg-green-50/50 ' : ''}`}
        >
          <div className={`p-3 rounded-xl ${isReady ? 'bg-green-100 ' : 'bg-muted'}`}>
            <Zap className={`h-6 w-6 ${isReady ? 'text-green-600 ' : 'text-muted-foreground'}`} />
          </div>
          <div className="flex-1">
            <p className="font-medium">IPP Instant Payment</p>
            <p className="text-sm text-muted-foreground">
              {isReady ? onboardingData?.long_alias : 'Instant bank-to-bank transfers'}
            </p>
          </div>
          <Badge
            variant={isReady ? 'default' : 'secondary'}
            className={isReady ? 'bg-green-600' : ''}
          >
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
    </ThemedCard>
  );
}

export default PaymentMethodsTab;
