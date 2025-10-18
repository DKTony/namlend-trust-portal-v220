import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import LoanCalculator from '@/components/LoanCalculator';
import { APR_LIMIT, isValidAPR } from '@/constants/regulatory';
import { submitApprovalRequest } from '@/services/approvalWorkflow';
import { ArrowLeft, Calculator, FileText, DollarSign, Clock } from 'lucide-react';
import Header from '@/components/Header';
import { formatNAD } from '@/utils/currency';

export default function LoanApplication() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

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

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const calculateLoanDetails = (amount: number, term: number) => {
    const principal = amount;
    const monthlyRate = 0.32 / 12; // 32% APR converted to monthly
    const monthlyPayment = (principal * monthlyRate * Math.pow(1 + monthlyRate, term)) / 
                          (Math.pow(1 + monthlyRate, term) - 1);
    const totalRepayment = monthlyPayment * term;

    setLoanDetails({
      amount: principal,
      term,
      interestRate: 32,
      monthlyPayment,
      totalRepayment
    });
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (field === 'amount' || field === 'term') {
      const amount = field === 'amount' ? parseFloat(value) : parseFloat(formData.amount);
      const term = field === 'term' ? parseInt(value) : parseInt(formData.term);
      
      if (amount > 0 && term > 0) {
        calculateLoanDetails(amount, term);
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
    <div className="min-h-screen bg-gradient-to-br from-background via-primary-light/5 to-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <h1 className="text-3xl font-bold text-foreground mb-2">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {step === 1 && <Calculator className="h-5 w-5" />}
                  {step === 2 && <FileText className="h-5 w-5" />}
                  {step === 3 && <DollarSign className="h-5 w-5" />}
                  
                  {step === 1 && "Loan Details"}
                  {step === 2 && "Financial Information"}
                  {step === 3 && "Review & Submit"}
                </CardTitle>
                <CardDescription>
                  {step === 1 && "Choose your loan amount and repayment term"}
                  {step === 2 && "Tell us about your financial situation"}
                  {step === 3 && "Review your application details"}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {step === 1 && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="amount">Loan Amount (NAD)</Label>
                        <Input
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
                          <SelectTrigger data-testid="loan-term-select">
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
                        <Select value={formData.purpose} onValueChange={(value) => handleFormChange('purpose', value)} data-testid="loan-purpose-select">
                          <SelectTrigger>
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
                        <SelectTrigger data-testid="employment-select">
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
                      <div className="space-y-2">
                        <Label htmlFor="income">Monthly Income (NAD)</Label>
                        <Input
                          id="income"
                          type="number"
                          placeholder="5000"
                          value={formData.monthly_income}
                          onChange={(e) => handleFormChange('monthly_income', e.target.value)}
                          data-testid="income-input"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="expenses">Monthly Expenses (NAD)</Label>
                        <Input
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
                      <Input
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
                            <span>Amount:</span>
                            <span>{formatNAD(loanDetails.amount)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Term:</span>
                            <span>{loanDetails.term} months</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Interest Rate:</span>
                            <span>{loanDetails.interestRate}% APR</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="font-medium mb-2">Financial Summary</h3>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Monthly Income:</span>
                            <span>{formatNAD(parseFloat(formData.monthly_income))}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Monthly Expenses:</span>
                            <span>{formatNAD(parseFloat(formData.monthly_expenses))}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Employment:</span>
                            <span className="capitalize">{formData.employment_status}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border-t pt-4">
                      <p className="text-sm text-muted-foreground mb-4">
                        By submitting this application, you agree to our Terms of Service and 
                        authorize us to verify the information provided.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setStep(step - 1)}
                    disabled={step === 1}
                    data-testid="loan-prev-button"
                  >
                    Previous
                  </Button>
                  
                  {step < 3 ? (
                    <Button
                      onClick={() => setStep(step + 1)}
                      disabled={
                        (step === 1 && (!formData.amount || !formData.term || !formData.purpose)) ||
                        (step === 2 && (!formData.employment_status || !formData.monthly_income))
                      }
                      data-testid="loan-next-button"
                    >
                      Next
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSubmit}
                      disabled={loading}
                      data-testid="loan-submit-button"
                    >
                      {loading ? "Submitting..." : "Submit Application"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Loan Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Processing Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Instant pre-approval check</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span>Final decision within 24 hours</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Funds disbursed next business day</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}