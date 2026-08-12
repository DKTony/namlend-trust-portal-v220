import { ThemedButton } from '@/components/ui/ThemedButton';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface LoanApplicationHeaderProps {
  step: number;
  progress: number;
  onBack: () => void;
}

export default function LoanApplicationHeader({
  step,
  progress,
  onBack,
}: LoanApplicationHeaderProps) {
  const { t } = useTranslation('loanApplication');

  return (
    <div className="mb-8">
      <ThemedButton
        variant="ghost"
        onClick={onBack}
        className="mb-4 pl-0 hover:bg-transparent hover:text-primary justify-start"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        {t('backToDashboard')}
      </ThemedButton>

      <h1 className={cn('text-3xl font-bold mb-2', 'font-sans text-[#274F35]')}>{t('title')}</h1>
      <p className="text-muted-foreground">{t('subtitle')}</p>

      <div className="mt-6">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between text-sm text-muted-foreground mt-2">
          <span>{t('steps.label', { step })}</span>
          <span>{t('steps.complete', { progress: Math.round(progress) })}</span>
        </div>
      </div>
    </div>
  );
}
