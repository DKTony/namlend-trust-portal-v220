import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ThemedButton } from '@/components/ui/ThemedButton';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { useToast } from '@/hooks/use-toast';
import { APR_LIMIT, isValidAPR } from '@/constants/regulatory';
import { useMutation as useConvexMutation } from 'convex/react';
import { api } from '@/integrations/convex/api';
import type { Id } from '@/integrations/convex/api';
import {
  calculateCreditScore,
  getLoanRecommendation,
  type CreditFactors,
} from '@/utils/creditScoring';
import { useKYCEligibility } from '@/hooks/useKYCEligibility';
import { Calculator, FileText, DollarSign, Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { useLoanForm } from '@/hooks/useLoanForm';
import LoanApplicationHeader from './components/LoanApplicationHeader';
import KYCEligibilityGate from './components/KYCEligibilityGate';
import LoanSummaryPanel from './components/LoanSummaryPanel';
import LoanDetailsStep from './steps/LoanDetailsStep';
import FinancialInfoStep from './steps/FinancialInfoStep';
import ReviewSubmitStep from './steps/ReviewSubmitStep';

export default function LoanApplication() {
  const { t } = useTranslation('loanApplication');
  const { user } = useAuth();
  const { styles } = useTheme();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
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
      <div className={cn('min-h-screen transition-colors duration-500', styles.background)}>
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-4xl relative z-10">
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className={cn('h-8 w-8 animate-spin mb-4', styles.textClass)} />
            <p className="text-muted-foreground">{t('checkingEligibility')}</p>
          </div>
        </main>
      </div>
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

      // Build credit factors from form data and profile
      const monthlyIncome = parseFloat(formData.monthly_income) || 0;
      const existingDebt = parseFloat(formData.existing_debt || '0');
      const monthlyExpenses = parseFloat(formData.monthly_expenses || '0');

      const creditFactors: CreditFactors = {
        monthlyIncome,
        employmentStatus: formData.employment_status || 'unknown',
        employmentDuration: 12, // Default; profile-based in future
        existingDebt,
        monthlyDebtPayments: monthlyExpenses,
        requestedAmount: loanDetails.amount,
        requestedTerm: loanDetails.term,
        hasVerifiedId: !!userProfile,
        hasVerifiedAddress: false,
        hasVerifiedEmployment: !!formData.employment_status,
        previousLoans: 0,
        paidOnTime: 0,
        defaults: 0,
        latePayments: 0,
      };

      // Calculate credit score using the scoring engine
      const creditScore = calculateCreditScore(creditFactors);
      const recommendation = getLoanRecommendation(creditFactors, creditScore);

      // Prepare loan application data for approval workflow
      const loanApplicationData = {
        amount: loanDetails.amount,
        term_months: loanDetails.term,
        interest_rate: loanDetails.interestRate,
        monthly_payment: loanDetails.monthlyPayment,
        total_repayment: loanDetails.totalRepayment,
        purpose: formData.purpose,
        employment_status: formData.employment_status,
        monthly_income: monthlyIncome,
        monthly_expenses: monthlyExpenses,
        existing_debt: existingDebt,
        user_verified: false,
        credit_score: creditScore.score,
        credit_score_range: creditScore.scoreRange,
        risk_level: creditScore.riskLevel,
        debt_to_income_ratio: creditScore.debtToIncomeRatio,
        affordability_score: creditScore.affordabilityScore,
        max_approved_amount: creditScore.maxApprovedAmount,
        suggested_interest_rate: creditScore.suggestedInterestRate,
        scoring_factors: creditScore.factors,
        scoring_recommendations: creditScore.recommendations,
        loan_recommendation: {
          approved: recommendation.approved,
          approved_amount: recommendation.approvedAmount,
          suggested_term: recommendation.suggestedTerm,
          reasons: recommendation.reasons,
          conditions: recommendation.conditions,
        },
        submitted_at: new Date().toISOString(),
      };

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

  return (
    <div className={cn('min-h-screen transition-colors duration-500', styles.background)}>
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-4xl relative z-10">
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
                        disabled={
                          (step === 1 &&
                            (!formData.amount || !formData.term || !formData.purpose)) ||
                          (step === 2 &&
                            (!formData.employment_status ||
                              (!formData.monthly_income && !hasProfileIncome)))
                        }
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
      </main>
    </div>
  );
}
