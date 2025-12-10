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

            {/* Calculation Results - The "Receipt" */}
            <Card className="p-8 shadow-strong bg-zinc-900 text-white relative overflow-hidden border-zinc-800">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8 border-b border-dashed border-zinc-700 pb-4">
                  <h3 className="text-xl font-semibold">
                    Loan Estimate
                  </h3>
                  <div className="px-2 py-1 rounded bg-zinc-800 text-xs font-mono text-zinc-400">
                    RECEIPT #{Math.floor(Math.random() * 10000)}
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Monthly Payment */}
                  <div className="flex justify-between items-end">
                    <div className="text-sm text-zinc-400">
                      Monthly Payment
                    </div>
                    <div className="text-3xl font-bold font-mono text-white">
                      N$ {monthlyPayment.toFixed(2)}
                    </div>
                  </div>

                  {/* Total Payment */}
                  <div className="flex justify-between items-end">
                    <div className="text-sm text-zinc-400">
                      Total Amount
                    </div>
                    <div className="text-2xl font-bold font-mono text-zinc-200">
                      N$ {totalPayment.toFixed(2)}
                    </div>
                  </div>

                  {/* Interest Cost */}
                  <div className="flex justify-between items-end pb-6 border-b border-dashed border-zinc-700">
                    <div className="text-sm text-zinc-400">
                      Total Interest
                    </div>
                    <div className="text-2xl font-bold font-mono text-blue-400">
                      N$ {(totalPayment - loanAmount[0]).toFixed(2)}
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="pt-2">
                    <Button variant="hero" size="lg" className="w-full mb-4 rounded-xl bg-blue-600 hover:bg-blue-500 border-none" onClick={handleApplyClick}>
                      Apply Now
                    </Button>
                    <p className="text-xs text-zinc-500 text-center">
                      Get pre-approved in 5 minutes. No hidden fees.
                    </p>
                  </div>

                  {/* Disclaimer */}
                  <div className="p-3 bg-zinc-800/50 rounded-xl border border-zinc-800">
                    <p className="text-[10px] text-zinc-500 leading-relaxed">
                      <strong>Note:</strong> Estimate only. Actual rates vary by credit profile. 
                      Regulated by NAMFISA. APR capped at {interestRate}%.
                    </p>
                  </div>
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