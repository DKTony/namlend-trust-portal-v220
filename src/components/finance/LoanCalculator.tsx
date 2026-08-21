import LandingButton from '@/components/landing/LandingButton';
import LandingCard from '@/components/landing/LandingCard';
import { Slider } from '@/components/ui/slider';
import { useAuth } from '@/hooks/useAuth';
import { ArrowRight, Calculator, Info } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LoanCalculator = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loanAmount, setLoanAmount] = useState([5000]);
  const [loanTerm, setLoanTerm] = useState([3]);
  const interestRate = 28;

  const estimate = useMemo(() => {
    const principal = loanAmount[0];
    const months = loanTerm[0];
    const monthlyRate = interestRate / 100 / 12;
    const monthly =
      (principal * (monthlyRate * (1 + monthlyRate) ** months)) / ((1 + monthlyRate) ** months - 1);
    const total = monthly * months;
    return { monthly, total, interest: total - principal };
  }, [loanAmount, loanTerm]);

  const apply = () => navigate(user ? '/loan-application' : '/auth');

  return (
    <section id="loans" className="relative scroll-mt-24 py-20 md:py-28">
      <div className="container mx-auto px-4 md:px-8">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-[#274F35] md:text-4xl lg:text-5xl">
            Loan calculator
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-[#274F35]/70 md:text-xl">
            Estimate your repayment using a representative rate below the regulatory ceiling.
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-2">
          <LandingCard className="p-6 md:p-8">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF5EB]">
                <Calculator className="h-6 w-6 text-[#3F713E]" />
              </div>
              <h3 className="text-xl font-bold text-[#274F35]">Calculate your loan</h3>
            </div>

            <div className="space-y-8">
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm font-medium text-[#274F35]">Loan amount</span>
                  <strong className="text-xl text-[#3F713E]">
                    N$ {loanAmount[0].toLocaleString()}
                  </strong>
                </div>
                <Slider
                  value={loanAmount}
                  onValueChange={setLoanAmount}
                  max={50000}
                  min={1000}
                  step={500}
                />
                <div className="mt-3 flex justify-between text-xs text-[#274F35]/50">
                  <span>N$ 1,000</span>
                  <span>N$ 50,000</span>
                </div>
              </div>
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm font-medium text-[#274F35]">Loan term</span>
                  <strong className="text-xl text-[#3F713E]">
                    {loanTerm[0]} month{loanTerm[0] === 1 ? '' : 's'}
                  </strong>
                </div>
                <Slider
                  value={loanTerm}
                  onValueChange={(value) => {
                    const values = [1, 3, 5];
                    setLoanTerm([
                      values.reduce((a, b) =>
                        Math.abs(b - value[0]) < Math.abs(a - value[0]) ? b : a
                      ),
                    ]);
                  }}
                  max={5}
                  min={1}
                  step={1}
                />
                <div className="mt-3 flex justify-between text-xs text-[#274F35]/50">
                  <span>1 month</span>
                  <span>3 months</span>
                  <span>5 months</span>
                </div>
              </div>
              <div className="rounded-2xl border border-[#DCE8D8] bg-[#EEF5EB] p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[#274F35]">
                  <Info className="h-4 w-4" />
                  Representative APR
                </div>
                <p className="text-2xl font-bold text-[#3F713E]">{interestRate}% p.a.</p>
                <p className="mt-1 text-xs text-[#274F35]/55">
                  The final rate depends on credit assessment and cannot exceed 32%.
                </p>
              </div>
            </div>
          </LandingCard>

          <div className="relative overflow-hidden rounded-3xl border border-[#7CA05C]/40 bg-gradient-to-br from-[#274F35] to-[#3F713E] p-6 text-white shadow-lg md:p-8">
            <div className="mb-8 flex items-center justify-between border-b border-dashed border-white/25 pb-4">
              <h3 className="text-xl font-semibold">Loan estimate</h3>
              <span className="rounded bg-white/10 px-2 py-1 text-xs">Indicative</span>
            </div>
            <dl className="space-y-6">
              <div className="flex items-end justify-between">
                <dt className="text-sm text-white/65">Monthly payment</dt>
                <dd className="font-mono text-2xl font-bold sm:text-3xl">
                  N$ {estimate.monthly.toFixed(2)}
                </dd>
              </div>
              <div className="flex items-end justify-between">
                <dt className="text-sm text-white/65">Total amount</dt>
                <dd className="font-mono text-2xl font-bold text-white/90">
                  N$ {estimate.total.toFixed(2)}
                </dd>
              </div>
              <div className="flex items-end justify-between border-b border-dashed border-white/25 pb-6">
                <dt className="text-sm text-white/65">Total interest</dt>
                <dd className="font-mono text-2xl font-bold text-[#DCE8D8]">
                  N$ {estimate.interest.toFixed(2)}
                </dd>
              </div>
            </dl>
            <div className="pt-8">
              <LandingButton variant="primary" fullWidth onClick={apply}>
                Apply now <ArrowRight className="h-5 w-5" />
              </LandingButton>
              <p className="mt-4 text-center text-xs text-white/55">
                Estimate only. Approval follows KYC and credit review.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LoanCalculator;
