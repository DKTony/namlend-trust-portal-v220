import type { LoanDetails, LoanFormData } from '@/hooks/useLoanForm';
import { cn } from '@/lib/utils';
import { formatNAD } from '@/utils/currency';
import { useTranslation } from 'react-i18next';

interface ReviewSubmitStepProps {
  formData: LoanFormData;
  loanDetails: LoanDetails;
}

export default function ReviewSubmitStep({ formData, loanDetails }: ReviewSubmitStepProps) {
  const { t } = useTranslation('loanApplication');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-medium mb-2">{t('reviewStep.loanDetails')}</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('reviewStep.amount')}</span>
              <span className={'font-sans text-[#274F35]'}>{formatNAD(loanDetails.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('reviewStep.term')}</span>
              <span className={'font-sans text-[#274F35]'}>
                {t('reviewStep.termValue', { months: loanDetails.term })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('reviewStep.interestRate')}</span>
              <span className={'font-sans text-[#274F35]'}>
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
              <span className={'font-sans text-[#274F35]'}>
                {formatNAD(parseFloat(formData.monthly_income))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('reviewStep.monthlyExpenses')}</span>
              <span className={'font-sans text-[#274F35]'}>
                {formatNAD(parseFloat(formData.monthly_expenses))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('reviewStep.employment')}</span>
              <span className={cn('capitalize', 'font-sans text-[#274F35]')}>
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
