import { ThemedButton } from '@/components/ui/ThemedButton';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { Progress } from '@/components/ui/progress';
import type { KYCEligibility } from '@/hooks/useKYCEligibility';
import { cn } from '@/lib/utils';
import { AlertTriangle, ArrowRight, ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface KYCEligibilityGateProps {
  eligibility: KYCEligibility | null;
  verificationProgress: number;
}

export default function KYCEligibilityGate({
  eligibility,
  verificationProgress,
}: KYCEligibilityGateProps) {
  const { t } = useTranslation('loanApplication');
  const navigate = useNavigate();

  return (
    <ThemedCard className="mb-8 border-yellow-500/30 bg-yellow-500/5">
      <div className="flex flex-col md:flex-row items-start gap-4">
        <div className="h-12 w-12 rounded-xl bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
          <ShieldAlert className="h-6 w-6 text-yellow-500" />
        </div>
        <div className="flex-1">
          <h3 className={cn('text-lg font-bold mb-1', 'font-sans text-[#274F35]')}>
            {t('kyc.title')}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">{t('kyc.description')}</p>

          {eligibility && (
            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('kyc.verificationProgress')}</span>
                <span className="text-yellow-500 font-medium">
                  {t('kyc.docsVerified', {
                    verified: eligibility.verified_docs,
                    required: eligibility.required_docs,
                  })}
                </span>
              </div>
              <Progress value={verificationProgress} className="h-2 bg-muted" />

              {eligibility.missing_required_docs &&
                eligibility.missing_required_docs.length > 0 && (
                  <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      {t('kyc.missingDocuments')}
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {eligibility.missing_required_docs.map((doc, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <AlertTriangle className="h-3 w-3 text-yellow-500" />
                          {doc.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          )}

          <ThemedButton onClick={() => navigate('/kyc')} className="w-full md:w-auto">
            {t('kyc.completeVerification')}
            <ArrowRight className="h-4 w-4 ml-2" />
          </ThemedButton>
        </div>
      </div>
    </ThemedCard>
  );
}
