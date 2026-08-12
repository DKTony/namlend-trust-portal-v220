import { ThemedCard } from '@/components/ui/ThemedCard';
import type { LoanDetails } from '@/hooks/useLoanForm';
import { cn } from '@/lib/utils';
import { formatNAD } from '@/utils/currency';
import { Calculator, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface LoanSummaryPanelProps {
  loanDetails: LoanDetails;
}

export default function LoanSummaryPanel({ loanDetails }: LoanSummaryPanelProps) {
  const { t } = useTranslation('loanApplication');

  return (
    <div className="space-y-6">
      <ThemedCard>
        <div className="mb-4">
          <h2
            className={cn('text-lg font-bold flex items-center gap-2', 'font-sans text-[#274F35]')}
          >
            <Calculator className="h-5 w-5" />
            {t('summary.title')}
          </h2>
        </div>
        <div>
          {loanDetails.amount > 0 ? (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">{t('summary.loanAmount')}</span>
                <span className="font-medium">{formatNAD(loanDetails.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">{t('summary.monthlyPayment')}</span>
                <span className="font-medium">{formatNAD(loanDetails.monthlyPayment)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">{t('summary.totalRepayment')}</span>
                <span className="font-medium">{formatNAD(loanDetails.totalRepayment)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">{t('summary.interestRate')}</span>
                <span className="font-medium">
                  {t('summary.interestRateValue', { rate: loanDetails.interestRate })}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('summary.emptyState')}</p>
          )}
        </div>
      </ThemedCard>

      <ThemedCard>
        <div className="mb-4">
          <h2
            className={cn('text-lg font-bold flex items-center gap-2', 'font-sans text-[#274F35]')}
          >
            <Clock className="h-5 w-5" />
            {t('processingTime.title')}
          </h2>
        </div>
        <div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-muted-foreground">{t('processingTime.preApproval')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-muted-foreground">{t('processingTime.finalDecision')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-muted-foreground">{t('processingTime.disbursement')}</span>
            </div>
          </div>
        </div>
      </ThemedCard>
    </div>
  );
}
