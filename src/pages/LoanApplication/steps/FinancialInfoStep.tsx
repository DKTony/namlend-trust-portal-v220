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
import type { ThemeConfig } from '@/types/theme';
import { formatNAD } from '@/utils/currency';
import { useTranslation } from 'react-i18next';

interface UserProfile {
  monthly_income: number | null;
  employment_status: string | null;
  credit_score: number | null;
}

interface FinancialInfoStepProps {
  formData: LoanFormData;
  onFormChange: (field: string, value: string) => void;
  hasProfileIncome: boolean;
  userProfile: UserProfile | null;
  styles: ThemeConfig;
}

export default function FinancialInfoStep({
  formData,
  onFormChange,
  hasProfileIncome,
  userProfile,
  styles,
}: FinancialInfoStepProps) {
  const { t } = useTranslation('loanApplication');

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="employment">{t('financialStep.employmentStatus')}</Label>
        <Select
          value={formData.employment_status}
          onValueChange={(value) => onFormChange('employment_status', value)}
        >
          <SelectTrigger
            data-testid="employment-select"
            className={cn(styles.inputClass, styles.textClass)}
          >
            <SelectValue placeholder={t('financialStep.employmentPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="employed">
              {t('financialStep.employmentOptions.employed')}
            </SelectItem>
            <SelectItem value="self-employed">
              {t('financialStep.employmentOptions.selfEmployed')}
            </SelectItem>
            <SelectItem value="part-time">
              {t('financialStep.employmentOptions.partTime')}
            </SelectItem>
            <SelectItem value="contract">
              {t('financialStep.employmentOptions.contract')}
            </SelectItem>
            <SelectItem value="student">{t('financialStep.employmentOptions.student')}</SelectItem>
            <SelectItem value="unemployed">
              {t('financialStep.employmentOptions.unemployed')}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {!hasProfileIncome ? (
          <div className="space-y-2">
            <Label htmlFor="income">{t('financialStep.monthlyIncome')}</Label>
            <ThemedInput
              id="income"
              type="number"
              placeholder={t('financialStep.incomePlaceholder')}
              value={formData.monthly_income}
              onChange={(e) => onFormChange('monthly_income', e.target.value)}
              data-testid="income-input"
            />
          </div>
        ) : (
          <div className="space-y-2">
            <Label>{t('financialStep.monthlyIncome')}</Label>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md border border-input">
              <span className="font-medium text-foreground">
                {formatNAD(userProfile!.monthly_income!)}
              </span>
              <span className="text-xs text-muted-foreground">
                {t('financialStep.fromProfile')}
              </span>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="expenses">{t('financialStep.monthlyExpenses')}</Label>
          <ThemedInput
            id="expenses"
            type="number"
            placeholder={t('financialStep.expensesPlaceholder')}
            value={formData.monthly_expenses}
            onChange={(e) => onFormChange('monthly_expenses', e.target.value)}
            data-testid="expenses-input"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="debt">{t('financialStep.existingDebt')}</Label>
        <ThemedInput
          id="debt"
          type="number"
          placeholder={t('financialStep.debtPlaceholder')}
          value={formData.existing_debt}
          onChange={(e) => onFormChange('existing_debt', e.target.value)}
          data-testid="debt-input"
        />
        <p className="text-xs text-muted-foreground">{t('financialStep.debtHelp')}</p>
      </div>
    </>
  );
}
