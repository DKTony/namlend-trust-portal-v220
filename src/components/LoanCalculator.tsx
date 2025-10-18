import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Calculator, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const LoanCalculator = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loanAmount, setLoanAmount] = useState([5000]);
  const [loanTerm, setLoanTerm] = useState([3]);
  const [monthlyPayment, setMonthlyPayment] = useState(0);
  const [totalPayment, setTotalPayment] = useState(0);
  const [interestRate, setInterestRate] = useState(28);

  const handleApplyClick = () => {
    if (user) {
      navigate('/loan-application');
    } else {
      navigate('/auth');
    }
  };

  // Calculate loan payments
  useEffect(() => {
    const principal = loanAmount[0];
    const months = loanTerm[0];
    const monthlyRate = interestRate / 100 / 12;
    
    if (monthlyRate === 0) {
      setMonthlyPayment(principal / months);
      setTotalPayment(principal);
    } else {
      const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / 
                     (Math.pow(1 + monthlyRate, months) - 1);
      setMonthlyPayment(payment);
      setTotalPayment(payment * months);
    }
  }, [loanAmount, loanTerm, interestRate]);

  return (
    <section id="loans" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
              Loan Calculator
            </h2>
            <p className="text-lg text-muted-foreground">
              See how much your loan will cost with our transparent pricing calculator
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Calculator Inputs */}
            <Card className="p-8 shadow-medium">
              <div className="flex items-center space-x-3 mb-6">
                <Calculator className="w-6 h-6 text-accent" />
                <h3 className="text-xl font-semibold text-primary">
                  Calculate Your Loan
                </h3>
              </div>

              <div className="space-y-8">
                {/* Loan Amount Slider */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <label className="text-sm font-medium text-foreground">
                      Loan Amount
                    </label>
                    <span className="text-lg font-bold text-primary">
                      N$ {loanAmount[0].toLocaleString()}
                    </span>
                  </div>
                  <Slider
                    value={loanAmount}
                    onValueChange={setLoanAmount}
                    max={25000}
                    min={500}
                    step={500}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>N$ 500</span>
                    <span>N$ 25,000</span>
                  </div>
                </div>

                {/* Loan Term Slider */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <label className="text-sm font-medium text-foreground">
                      Loan Term
                    </label>
                    <span className="text-lg font-bold text-primary">
                      {loanTerm[0]} month{loanTerm[0] !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <Slider
                    value={loanTerm}
                    onValueChange={(value) => {
                      // Snap to allowed values: 1, 3, or 5 months
                      const allowedValues = [1, 3, 5];
                      const closest = allowedValues.reduce((prev, curr) => 
                        Math.abs(curr - value[0]) < Math.abs(prev - value[0]) ? curr : prev
                      );
                      setLoanTerm([closest]);
                    }}
                    max={5}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>1 month</span>
                    <span>3 months</span>
                    <span>5 months</span>
                  </div>
                </div>

                {/* Interest Rate Display */}
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Info className="w-4 h-4 text-accent" />
                    <span className="text-sm font-medium text-foreground">
                      Representative APR
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-primary mb-1">
                    {interestRate}% p.a.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Rate depends on loan amount, term, and credit assessment
                  </p>
                </div>
              </div>
            </Card>

            {/* Calculation Results */}
            <Card className="p-8 shadow-medium bg-gradient-to-br from-primary/5 to-accent/5">
              <h3 className="text-xl font-semibold text-primary mb-6">
                Your Loan Summary
              </h3>

              <div className="space-y-6">
                {/* Monthly Payment */}
                <div className="p-4 bg-background rounded-lg border border-border">
                  <div className="text-sm text-muted-foreground mb-1">
                    Monthly Payment
                  </div>
                  <div className="text-3xl font-bold text-primary">
                    N$ {monthlyPayment.toFixed(2)}
                  </div>
                </div>

                {/* Total Payment */}
                <div className="p-4 bg-background rounded-lg border border-border">
                  <div className="text-sm text-muted-foreground mb-1">
                    Total Amount to Pay
                  </div>
                  <div className="text-2xl font-bold text-primary">
                    N$ {totalPayment.toFixed(2)}
                  </div>
                </div>

                {/* Interest Cost */}
                <div className="p-4 bg-background rounded-lg border border-border">
                  <div className="text-sm text-muted-foreground mb-1">
                    Total Interest Cost
                  </div>
                  <div className="text-2xl font-bold text-accent">
                    N$ {(totalPayment - loanAmount[0]).toFixed(2)}
                  </div>
                </div>

                {/* CTA */}
                <div className="pt-4">
                  <Button variant="hero" size="lg" className="w-full mb-3" onClick={handleApplyClick}>
                    Apply for This Loan
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    No obligation. Get pre-approved in 5 minutes.
                  </p>
                </div>

                {/* Disclaimer */}
                <div className="p-3 bg-accent/10 rounded-lg border border-accent/20">
                  <p className="text-xs text-muted-foreground">
                    <strong>Important:</strong> This is an estimate only. 
                    Actual rates may vary based on credit assessment. 
                    All fees will be disclosed before loan acceptance.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LoanCalculator;