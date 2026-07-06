import DashboardLayout from '@/components/Layout/DashboardLayout';
import { ThemedButton } from '@/components/ui/ThemedButton';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { APR_LIMIT, isValidAPR } from '@/constants/regulatory';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useKYCEligibility } from '@/hooks/useKYCEligibility';
import { useLoanForm } from '@/hooks/useLoanForm';
import type { Id } from '@/integrations/convex/api';
import { api } from '@/integrations/convex/api';
import { cn } from '@/lib/utils';
import { useMutation as useConvexMutation } from 'convex/react';
import { Calculator, DollarSign, FileText, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate } from 'react-router-dom';
import KYCEligibilityGate from './components/KYCEligibilityGate';
import LoanApplicationHeader from './components/LoanApplicationHeader';
import LoanSummaryPanel from './components/LoanSummaryPanel';
import FinancialInfoStep from './steps/FinancialInfoStep';
import LoanDetailsStep from './steps/LoanDetailsStep';
import ReviewSubmitStep from './steps/ReviewSubmitStep';
import { isLoanAmountValid } from './loanLimits';

export default function LoanApplication() {
  const { t } = useTranslation('loanApplication');
  const { user } = useAuth();
  const { styles } = useTheme();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [activeTab] = useState('applications');

  const handleTabChange = (tab: string) => {
    if (tab === 'applications') return;
    if (tab === 'budget') {
      navigate('/budget');
      return;
    }
    if (tab === 'documents') {
      navigate('/kyc');
      return;
    }
    navigate('/dashboard', { state: { tab } });
  };
  const [loading, setLoading] = useState(false);
  const createLoanMutation = useConvexMutation(api.loans.createLoan);
  const submitLoanMutation = useConvexMutation(api.loans.submitLoan);

  // KYC eligibility check - gates loan application
  const {
    eligibility,
    loading: eligibilityLoading,
    isEligible,
    verificationProgress,
  } = useKYCEligibility();

  // Loan form state and logic
  const { formData, loanDetails, userProfile, hasProfileIncome, handleFormChange } = useLoanForm(
    user?.id
  );

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Show loading state while checking eligibility
  if (eligibilityLoading) {
    return (
      <DashboardLayout activeTab={activeTab} onTabChange={handleTabChange} title={t('title')}>
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className={cn('h-8 w-8 animate-spin mb-4', styles.textClass)} />
          <p className="text-muted-foreground">{t('checkingEligibility')}</p>
        </div>
      </DashboardLayout>
    );
  }

  const handleSubmit = async () => {
    // Enhanced authentication validation
    if (!user) {
      toast({
        title: t('toast.authRequiredTitle'),
        description: t('toast.authRequiredDescription'),
        variant: 'destructive',
      });
      return;
    }

    if (!user.id) {
      toast({
        title: t('toast.authErrorTitle'),
        description: t('toast.authErrorDescription'),
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Validate APR before submission
      if (!isValidAPR(loanDetails.interestRate)) {
        toast({
          title: t('toast.invalidRateTitle'),
          description: t('toast.invalidRateDescription', { limit: APR_LIMIT }),
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const monthlyIncome = parseFloat(formData.monthly_income) || 0;
      const existingDebt = parseFloat(formData.existing_debt || '0');
      const monthlyExpenses = parseFloat(formData.monthly_expenses || '0');

      // Step 1: Create the canonical loan record in the loans table
      const loanId = (await createLoanMutation({
        principal: loanDetails.amount,
        interestRate: loanDetails.interestRate,
        termMonths: loanDetails.term,
        purpose: formData.purpose,
        monthlyPayment: loanDetails.monthlyPayment,
        monthlyIncome,
        monthlyExpenses,
        existingDebt,
      })) as Id<'loans'>;

      // Step 2: Transition loan from draft → submitted
      // This triggers processLoanApplication server-side which creates the approval request
      // with credit scoring data. No client-side submitForApproval needed.
      await submitLoanMutation({ loanId });

      toast({
        title: t('toast.submittedTitle'),
        description: t('toast.submittedDescription'),
      });

      navigate('/dashboard');
    } catch (error) {
      // Enhanced error handling with specific error types
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorName = error instanceof Error ? error.name : 'Error';

      console.error('Error submitting loan application:', {
        name: errorName,
        message: errorMessage,
        userId: user?.id,
        timestamp: new Date().toISOString(),
        context: 'loan_application_submit',
      });

      // Provide specific error messages based on error type
      let userMessage = t('toast.failedDescription');
      let title = t('toast.failedTitle');

      if (errorMessage.includes('row-level security')) {
        title = t('toast.sessionExpiredTitle');
        userMessage = t('toast.sessionExpiredDescription');
      } else if (errorMessage.includes('schema cache') || errorMessage.includes('column')) {
        title = t('toast.systemErrorTitle');
        userMessage = t('toast.systemErrorDescription');
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        title = t('toast.connectionErrorTitle');
        userMessage = t('toast.connectionErrorDescription');
      }

      toast({
        title,
        description: userMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const progress = (step / 3) * 100;

  // Gate the Next button on validity, not just presence, so invalid data
  // can't ride through to a server-side rejection with a cryptic message.
  const isStepValid = (currentStep: number): boolean => {
    if (currentStep === 1) {
      return (
        isLoanAmountValid(Number(formData.amount)) &&
        Boolean(formData.term) &&
        Boolean(formData.purpose)
      );
    }
    if (currentStep === 2) {
      if (!formData.employment_status) return false;
      if (hasProfileIncome) return true;
      const income = Number(formData.monthly_income);
      return Number.isFinite(income) && income > 0;
    }
    return true;
  };

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={handleTabChange} title={t('title')}>
      <div className="max-w-4xl">
        <LoanApplicationHeader
          step={step}
          progress={progress}
          styles={styles}
          onBack={() => navigate('/dashboard')}
        />

        {/* KYC Eligibility Gate - Hard Block */}
        {!isEligible && (
          <KYCEligibilityGate
            eligibility={eligibility}
            verificationProgress={verificationProgress}
            styles={styles}
          />
        )}

        {/* Loan Application Form - Only shown when eligible */}
        {isEligible && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <ThemedCard>
                <div className="mb-6">
                  <h2 className={cn('text-xl font-bold flex items-center gap-2', styles.textClass)}>
                    {step === 1 && <Calculator className="h-5 w-5" />}
                    {step === 2 && <FileText className="h-5 w-5" />}
                    {step === 3 && <DollarSign className="h-5 w-5" />}

                    {step === 1 && t('steps.loanDetails')}
                    {step === 2 && t('steps.financialInfo')}
                    {step === 3 && t('steps.reviewSubmit')}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {step === 1 && t('steps.loanDetailsSubtitle')}
                    {step === 2 && t('steps.financialInfoSubtitle')}
                    {step === 3 && t('steps.reviewSubmitSubtitle')}
                  </p>
                </div>

                <div className="space-y-6">
                  {step === 1 && (
                    <LoanDetailsStep
                      formData={formData}
                      onFormChange={handleFormChange}
                      styles={styles}
                    />
                  )}

                  {step === 2 && (
                    <FinancialInfoStep
                      formData={formData}
                      onFormChange={handleFormChange}
                      hasProfileIncome={hasProfileIncome}
                      userProfile={userProfile}
                      styles={styles}
                    />
                  )}

                  {step === 3 && (
                    <ReviewSubmitStep
                      formData={formData}
                      loanDetails={loanDetails}
                      styles={styles}
                    />
                  )}

                  <div className="flex justify-between">
                    <ThemedButton
                      variant="secondary"
                      onClick={() => setStep(step - 1)}
                      disabled={step === 1}
                      data-testid="loan-prev-button"
                    >
                      {t('navigation.previous')}
                    </ThemedButton>

                    {step < 3 ? (
                      <ThemedButton
                        onClick={() => setStep(step + 1)}
                        disabled={!isStepValid(step)}
                        data-testid="loan-next-button"
                      >
                        {t('navigation.next')}
                      </ThemedButton>
                    ) : (
                      <ThemedButton
                        onClick={handleSubmit}
                        disabled={loading}
                        data-testid="loan-submit-button"
                      >
                        {loading ? t('navigation.submitting') : t('navigation.submit')}
                      </ThemedButton>
                    )}
                  </div>
                </div>
              </ThemedCard>
            </div>

            <LoanSummaryPanel loanDetails={loanDetails} styles={styles} />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
