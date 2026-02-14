import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ThemedButton } from '@/components/ui/ThemedButton';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { ThemedInput } from '@/components/ui/ThemedInput';
import { ThemedTextarea } from '@/components/ui/ThemedTextarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { APR_LIMIT, isValidAPR } from '@/constants/regulatory';
import { submitApprovalRequest } from '@/services/approvalWorkflow';
import { useKYCEligibility } from '@/hooks/useKYCEligibility';
import { ArrowLeft, Calculator, FileText, DollarSign, Clock, ShieldAlert, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import { formatNAD } from '@/utils/currency';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

interface UserProfile {
  monthly_income: number | null;
  employment_status: string | null;
  credit_score: number | null;
}

export default function LoanApplication() {
  const { user } = useAuth();
  const { styles } = useTheme();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // KYC eligibility check - gates loan application
  const { eligibility, loading: eligibilityLoading, isEligible, verificationProgress } = useKYCEligibility();

  const [formData, setFormData] = useState({
    amount: '',
    term: '',
    purpose: '',
    employment_status: '',
    monthly_income: '',
    monthly_expenses: '',
    existing_debt: ''
  });

  const [loanDetails, setLoanDetails] = useState({
    amount: 0,
    term: 0,
    interestRate: 32, // 32% APR as per Namibian regulations
    monthlyPayment: 0,
    totalRepayment: 0
  });

  // Fetch user profile to pre-populate financial data
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return;
      
      try {
        setProfileLoading(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('monthly_income, employment_status, credit_score')
          .eq('user_id', user.id)
          .single();
        
        if (error) {
          console.error('Error fetching profile:', error);
          return;
        }
        
        if (data) {
          // Cast to our expected type
          const profileData = data as unknown as UserProfile;
          setUserProfile(profileData);
          
          // Pre-populate form with existing profile data
          if (profileData.monthly_income && profileData.monthly_income > 0) {
            setFormData(prev => ({ 
              ...prev, 
              monthly_income: profileData.monthly_income!.toString() 
            }));
          }
          if (profileData.employment_status) {
            setFormData(prev => ({ 
              ...prev, 
              employment_status: profileData.employment_status! 
            }));
          }
        }
      } catch (err) {
        console.error('Failed to fetch user profile:', err);
      } finally {
        setProfileLoading(false);
      }
    };
    
    fetchUserProfile();
  }, [user?.id]);

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Show loading state while checking eligibility
  if (eligibilityLoading) {
    return (
      <div className={cn("min-h-screen transition-colors duration-500", styles.background)}>
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-4xl relative z-10">
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className={cn("h-8 w-8 animate-spin mb-4", styles.textClass)} />
            <p className="text-muted-foreground">Checking eligibility...</p>
          </div>
        </main>
      </div>
    );
  }

  // Helper to check if profile has valid monthly income
  const hasProfileIncome = userProfile?.monthly_income && userProfile.monthly_income > 0;

  const calculateLoanDetails = (amount: number, term: number) => {
    const principal = amount;
    // Use APR_LIMIT from regulatory constants instead of hardcoded value
    const annualRate = APR_LIMIT / 100; // Convert percentage to decimal
    const monthlyRate = annualRate / 12;

    // Handle edge case where term is 0 or rate is 0
    if (term <= 0 || monthlyRate <= 0) {
      setLoanDetails({
        amount: principal,
        term: 0,
        interestRate: APR_LIMIT,
        monthlyPayment: 0,
        totalRepayment: 0
      });
      return;
    }

    const monthlyPayment = (principal * monthlyRate * Math.pow(1 + monthlyRate, term)) /
                          (Math.pow(1 + monthlyRate, term) - 1);
    const totalRepayment = monthlyPayment * term;

    setLoanDetails({
      amount: principal,
      term,
      interestRate: APR_LIMIT,
      monthlyPayment: isNaN(monthlyPayment) ? 0 : monthlyPayment,
      totalRepayment: isNaN(totalRepayment) ? 0 : totalRepayment
    });
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (field === 'amount' || field === 'term') {
      // Parse values with NaN protection - use 0 as fallback for empty/invalid inputs
      const amount = field === 'amount' 
        ? (parseFloat(value) || 0) 
        : (parseFloat(formData.amount) || 0);
      const term = field === 'term' 
        ? (parseInt(value, 10) || 0) 
        : (parseInt(formData.term, 10) || 0);
      
      if (amount > 0 && term > 0) {
        calculateLoanDetails(amount, term);
      } else {
        // Clear loan details when inputs are invalid/empty to prevent stale calculations
        setLoanDetails({
          amount: 0,
          term: 0,
          interestRate: 32,
          monthlyPayment: 0,
          totalRepayment: 0,
        });
      }
    }
  };

  const handleSubmit = async () => {
    // Enhanced authentication validation
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to submit a loan application.",
        variant: "destructive",
      });
      return;
    }

    if (!user.id) {
      toast({
        title: "Authentication Error",
        description: "User session is invalid. Please sign out and sign in again.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // Validate APR before submission
      if (!isValidAPR(loanDetails.interestRate)) {
        toast({
          title: "Invalid Interest Rate",
          description: `Interest rate must be between 0% and ${APR_LIMIT}% APR as per Namibian regulations.`,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Prepare loan application data for approval workflow
      const loanApplicationData = {
        amount: loanDetails.amount,
        term_months: loanDetails.term,
        interest_rate: loanDetails.interestRate,
        monthly_payment: loanDetails.monthlyPayment,
        total_repayment: loanDetails.totalRepayment,
        purpose: formData.purpose,
        employment_status: formData.employment_status,
        monthly_income: parseFloat(formData.monthly_income),
        monthly_expenses: parseFloat(formData.monthly_expenses),
        existing_debt: parseFloat(formData.existing_debt || '0'),
        user_verified: false, // Will be determined by system
        credit_score: 650, // Default score - would come from credit check in production
        submitted_at: new Date().toISOString()
      };

      // Submit to approval workflow instead of directly creating loan
      const result = await submitApprovalRequest({
        user_id: user.id,
        request_type: 'loan_application',
        request_data: loanApplicationData,
        priority: 'normal'
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to submit approval request');
      }

      toast({
        title: "Application Submitted!",
        description: "Your loan application has been submitted for review. You'll be notified once it's processed."
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
        context: 'loan_application_submit'
      });
      
      // Provide specific error messages based on error type
      let userMessage = "Failed to submit your loan application. Please try again.";
      let title = "Application Failed";
      
      if (errorMessage.includes('row-level security')) {
        title = "Authentication Required";
        userMessage = "Your session has expired. Please sign out and sign in again to submit your application.";
      } else if (errorMessage.includes('schema cache') || errorMessage.includes('column')) {
        title = "System Error";
        userMessage = "There's a temporary system issue. Please try again in a few moments or contact support.";
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        title = "Connection Error";
        userMessage = "Please check your internet connection and try again.";
      }
      
      toast({
        title,
        description: userMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const progress = (step / 3) * 100;

  return (
    <div className={cn("min-h-screen transition-colors duration-500", styles.background)}>
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl relative z-10">
        <div className="mb-8">
          <ThemedButton
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-4 pl-0 hover:bg-transparent hover:text-primary justify-start"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </ThemedButton>
          
          <h1 className={cn("text-3xl font-bold mb-2", styles.textClass)}>
            Apply for a Loan
          </h1>
          <p className="text-muted-foreground">
            Get quick access to the funds you need with transparent terms
          </p>
          
          <div className="mt-6">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-sm text-muted-foreground mt-2">
              <span>Step {step} of 3</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
          </div>
        </div>

        {/* KYC Eligibility Gate - Hard Block */}
        {!isEligible && (
          <ThemedCard className="mb-8 border-yellow-500/30 bg-yellow-500/5">
            <div className="flex flex-col md:flex-row items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                <ShieldAlert className="h-6 w-6 text-yellow-500" />
              </div>
              <div className="flex-1">
                <h3 className={cn("text-lg font-bold mb-1", styles.textClass)}>
                  Document Verification Required
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  To protect you and ensure compliance with Namibian regulations,
                  we require document verification before loan applications can be submitted.
                </p>

                {eligibility && (
                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Verification Progress</span>
                      <span className="text-yellow-500 font-medium">
                        {eligibility.verified_docs}/{eligibility.required_docs} documents verified
                      </span>
                    </div>
                    <Progress
                      value={verificationProgress}
                      className="h-2 bg-muted"
                    />

                    {eligibility.missing_required_docs && eligibility.missing_required_docs.length > 0 && (
                      <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Missing Documents:</p>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {eligibility.missing_required_docs.map((doc, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <AlertTriangle className="h-3 w-3 text-yellow-500" />
                              {doc.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <ThemedButton
                  onClick={() => navigate('/kyc')}
                  className="w-full md:w-auto"
                >
                  Complete Verification
                  <ArrowRight className="h-4 w-4 ml-2" />
                </ThemedButton>
              </div>
            </div>
          </ThemedCard>
        )}

        {/* Loan Application Form - Only shown when eligible */}
        {isEligible && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <ThemedCard>
              <div className="mb-6">
                <h2 className={cn("text-xl font-bold flex items-center gap-2", styles.textClass)}>
                  {step === 1 && <Calculator className="h-5 w-5" />}
                  {step === 2 && <FileText className="h-5 w-5" />}
                  {step === 3 && <DollarSign className="h-5 w-5" />}
                  
                  {step === 1 && "Loan Details"}
                  {step === 2 && "Financial Information"}
                  {step === 3 && "Review & Submit"}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {step === 1 && "Choose your loan amount and repayment term"}
                  {step === 2 && "Tell us about your financial situation"}
                  {step === 3 && "Review your application details"}
                </p>
              </div>
              
              <div className="space-y-6">
                {step === 1 && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="amount">Loan Amount (NAD)</Label>
                        <ThemedInput
                          id="amount"
                          type="number"
                          placeholder="5000"
                          min="1000"
                          max="50000"
                          step="500"
                          value={formData.amount}
                          onChange={(e) => handleFormChange('amount', e.target.value)}
                          data-testid="loan-amount-input"
                        />
                        <p className="text-xs text-muted-foreground">
                          Minimum: NAD 1,000 • Maximum: NAD 50,000
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="term">Repayment Term</Label>
                        <Select value={formData.term} onValueChange={(value) => handleFormChange('term', value)}>
                          <SelectTrigger 
                            data-testid="loan-term-select" 
                            className={cn(styles.inputClass, styles.textClass)}
                          >
                            <SelectValue placeholder="Select term" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 month</SelectItem>
                            <SelectItem value="3">3 months</SelectItem>
                            <SelectItem value="5">5 months</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="purpose">Purpose of Loan</Label>
                        <Select value={formData.purpose} onValueChange={(value) => handleFormChange('purpose', value)}>
                          <SelectTrigger 
                            data-testid="loan-purpose-select" 
                            className={cn(styles.inputClass, styles.textClass)}
                          >
                            <SelectValue placeholder="Select purpose" />
                          </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="personal">Personal Expenses</SelectItem>
                          <SelectItem value="business">Business Investment</SelectItem>
                          <SelectItem value="education">Education</SelectItem>
                          <SelectItem value="medical">Medical Expenses</SelectItem>
                          <SelectItem value="home">Home Improvement</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="employment">Employment Status</Label>
                      <Select value={formData.employment_status} onValueChange={(value) => handleFormChange('employment_status', value)}>
                        <SelectTrigger 
                          data-testid="employment-select" 
                          className={cn(styles.inputClass, styles.textClass)}
                        >
                          <SelectValue placeholder="Select employment status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="employed">Employed (Full-time)</SelectItem>
                          <SelectItem value="self-employed">Self-employed</SelectItem>
                          <SelectItem value="part-time">Part-time</SelectItem>
                          <SelectItem value="contract">Contract Worker</SelectItem>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="unemployed">Unemployed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {!hasProfileIncome ? (
                        <div className="space-y-2">
                          <Label htmlFor="income">Monthly Income (NAD)</Label>
                          <ThemedInput
                            id="income"
                            type="number"
                            placeholder="5000"
                            value={formData.monthly_income}
                            onChange={(e) => handleFormChange('monthly_income', e.target.value)}
                            data-testid="income-input"
                          />
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Label>Monthly Income (NAD)</Label>
                          <div className="flex items-center gap-2 p-3 bg-muted rounded-md border border-input">
                            <span className="font-medium text-foreground">
                              {formatNAD(userProfile.monthly_income!)}
                            </span>
                            <span className="text-xs text-muted-foreground">(from profile)</span>
                          </div>
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        <Label htmlFor="expenses">Monthly Expenses (NAD)</Label>
                        <ThemedInput
                          id="expenses"
                          type="number"
                          placeholder="3000"
                          value={formData.monthly_expenses}
                          onChange={(e) => handleFormChange('monthly_expenses', e.target.value)}
                          data-testid="expenses-input"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="debt">Existing Debt (NAD)</Label>
                      <ThemedInput
                        id="debt"
                        type="number"
                        placeholder="0"
                        value={formData.existing_debt}
                        onChange={(e) => handleFormChange('existing_debt', e.target.value)}
                        data-testid="debt-input"
                      />
                      <p className="text-xs text-muted-foreground">
                        Include all existing loans, credit cards, and monthly debt payments
                      </p>
                    </div>
                  </>
                )}

                {step === 3 && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-medium mb-2">Loan Details</h3>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Amount:</span>
                            <span className={styles.textClass}>{formatNAD(loanDetails.amount)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Term:</span>
                            <span className={styles.textClass}>{loanDetails.term} months</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Interest Rate:</span>
                            <span className={styles.textClass}>{loanDetails.interestRate}% APR</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="font-medium mb-2">Financial Summary</h3>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Monthly Income:</span>
                            <span className={styles.textClass}>{formatNAD(parseFloat(formData.monthly_income))}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Monthly Expenses:</span>
                            <span className={styles.textClass}>{formatNAD(parseFloat(formData.monthly_expenses))}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Employment:</span>
                            <span className={cn("capitalize", styles.textClass)}>{formData.employment_status}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border-t border-border pt-4">
                      <p className="text-sm text-muted-foreground mb-4">
                        By submitting this application, you agree to our Terms of Service and 
                        authorize us to verify the information provided.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex justify-between">
                  <ThemedButton
                    variant="secondary"
                    onClick={() => setStep(step - 1)}
                    disabled={step === 1}
                    data-testid="loan-prev-button"
                  >
                    Previous
                  </ThemedButton>
                  
                  {step < 3 ? (
                    <ThemedButton
                      onClick={() => setStep(step + 1)}
                      disabled={
                        (step === 1 && (!formData.amount || !formData.term || !formData.purpose)) ||
                        (step === 2 && (!formData.employment_status || (!formData.monthly_income && !hasProfileIncome)))
                      }
                      data-testid="loan-next-button"
                    >
                      Next
                    </ThemedButton>
                  ) : (
                    <ThemedButton
                      onClick={handleSubmit}
                      disabled={loading}
                      data-testid="loan-submit-button"
                    >
                      {loading ? "Submitting..." : "Submit Application"}
                    </ThemedButton>
                  )}
                </div>
              </div>
            </ThemedCard>
          </div>

          <div className="space-y-6">
            <ThemedCard>
              <div className="mb-4">
                <h2 className={cn("text-lg font-bold flex items-center gap-2", styles.textClass)}>
                  <Calculator className="h-5 w-5" />
                  Loan Summary
                </h2>
              </div>
              <div>
                {loanDetails.amount > 0 ? (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Loan Amount</span>
                      <span className="font-medium">{formatNAD(loanDetails.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Monthly Payment</span>
                      <span className="font-medium">{formatNAD(loanDetails.monthlyPayment)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Repayment</span>
                      <span className="font-medium">{formatNAD(loanDetails.totalRepayment)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Interest Rate</span>
                      <span className="font-medium">{loanDetails.interestRate}% APR</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Enter loan amount and term to see calculation
                  </p>
                )}
              </div>
            </ThemedCard>
            
            <ThemedCard>
              <div className="mb-4">
                <h2 className={cn("text-lg font-bold flex items-center gap-2", styles.textClass)}>
                  <Clock className="h-5 w-5" />
                  Processing Time
                </h2>
              </div>
              <div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-muted-foreground">Instant pre-approval check</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-muted-foreground">Final decision within 24 hours</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-muted-foreground">Funds disbursed next business day</span>
                  </div>
                </div>
              </div>
            </ThemedCard>
          </div>
        </div>
        )}
      </main>
    </div>
  );
}
