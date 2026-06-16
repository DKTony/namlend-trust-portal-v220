import type { LoanDetails, LoanFormData } from '@/hooks/useLoanForm';
import { cn } from '@/lib/utils';
import type { ThemeConfig } from '@/types/theme';
import { formatNAD } from '@/utils/currency';
import { useTranslation } from 'react-i18next';

interface ReviewSubmitStepProps {
  formData: LoanFormData;
  loanDetails: LoanDetails;
  styles: ThemeConfig;
}

export default function ReviewSubmitStep({ formData, loanDetails, styles }: ReviewSubmitStepProps) {
  const { t } = useTranslation('loanApplication');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-medium mb-2">{t('reviewStep.loanDetails')}</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('reviewStep.amount')}</span>
              <span className={styles.textClass}>{formatNAD(loanDetails.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('reviewStep.term')}</span>
              <span className={styles.textClass}>
                {t('reviewStep.termValue', { months: loanDetails.term })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('reviewStep.interestRate')}</span>
              <span className={styles.textClass}>
                {t('reviewStep.interestRateValue', { rate: loanDetails.interestRate })}
              </span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-medium mb-2">{t('reviewStep.financialSummary')}</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('reviewStep.monthlyIncome')}</span>
              <span className={styles.textClass}>
                {formatNAD(parseFloat(formData.monthly_income))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('reviewStep.monthlyExpenses')}</span>
              <span className={styles.textClass}>
                {formatNAD(parseFloat(formData.monthly_expenses))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('reviewStep.employment')}</span>
              <span className={cn('capitalize', styles.textClass)}>
                {formData.employment_status}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <p className="text-sm text-muted-foreground mb-4">{t('reviewStep.termsNotice')}</p>
      </div>
    </div>
  );
}
