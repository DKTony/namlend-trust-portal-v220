import { ThemedInput } from '@/components/ui/ThemedInput';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { LoanFormData } from '@/hooks/useLoanForm';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { isLoanAmountValid, LOAN_AMOUNT_MAX, LOAN_AMOUNT_MIN } from '../loanLimits';

interface LoanDetailsStepProps {
  formData: LoanFormData;
  onFormChange: (field: string, value: string) => void;
}

export default function LoanDetailsStep({ formData, onFormChange }: LoanDetailsStepProps) {
  const { t } = useTranslation('loanApplication');
  const amountEntered = formData.amount !== '';
  const amountValid = !amountEntered || isLoanAmountValid(Number(formData.amount));

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="amount">{t('loanDetailsStep.amount')}</Label>
          <ThemedInput
            id="amount"
            type="number"
            placeholder={t('loanDetailsStep.amountPlaceholder')}
            min={String(LOAN_AMOUNT_MIN)}
            max={String(LOAN_AMOUNT_MAX)}
            step="500"
            value={formData.amount}
            onChange={(e) => onFormChange('amount', e.target.value)}
            data-testid="loan-amount-input"
            aria-invalid={!amountValid}
          />
          <p
            className={cn('text-xs', amountValid ? 'text-muted-foreground' : 'text-destructive')}
            role={amountValid ? undefined : 'alert'}
          >
            {t('loanDetailsStep.amountRange')}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="term">{t('loanDetailsStep.term')}</Label>
          <Select value={formData.term} onValueChange={(value) => onFormChange('term', value)}>
            <SelectTrigger
              data-testid="loan-term-select"
              className={cn(
                'rounded-xl border border-[#B9CCB3] bg-white text-[#274F35] placeholder:text-slate-400 focus:border-[#3F713E] focus:ring-[#3F713E]/20',
                'font-sans text-[#274F35]'
              )}
            >
              <SelectValue placeholder={t('loanDetailsStep.termPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">{t('loanDetailsStep.termMonths', { count: 1 })}</SelectItem>
              <SelectItem value="3">{t('loanDetailsStep.termMonths', { count: 3 })}</SelectItem>
              <SelectItem value="5">{t('loanDetailsStep.termMonths', { count: 5 })}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="purpose">{t('loanDetailsStep.purpose')}</Label>
        <Select value={formData.purpose} onValueChange={(value) => onFormChange('purpose', value)}>
          <SelectTrigger
            data-testid="loan-purpose-select"
            className={cn(
              'rounded-xl border border-[#B9CCB3] bg-white text-[#274F35] placeholder:text-slate-400 focus:border-[#3F713E] focus:ring-[#3F713E]/20',
              'font-sans text-[#274F35]'
            )}
          >
            <SelectValue placeholder={t('loanDetailsStep.purposePlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="personal">{t('loanDetailsStep.purposes.personal')}</SelectItem>
            <SelectItem value="business">{t('loanDetailsStep.purposes.business')}</SelectItem>
            <SelectItem value="education">{t('loanDetailsStep.purposes.education')}</SelectItem>
            <SelectItem value="medical">{t('loanDetailsStep.purposes.medical')}</SelectItem>
            <SelectItem value="home">{t('loanDetailsStep.purposes.home')}</SelectItem>
            <SelectItem value="other">{t('loanDetailsStep.purposes.other')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
