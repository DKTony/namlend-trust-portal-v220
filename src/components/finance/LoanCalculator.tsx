import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import LandingCard from '@/components/landing/LandingCard';
import LandingButton from '@/components/landing/LandingButton';
import { Slider } from '@/components/ui/slider';
import { Calculator, Info, ArrowRight } from 'lucide-react';

const LoanCalculator = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { styles, theme, isDark } = useTheme();

  const [loanAmount, setLoanAmount] = useState([5000]);
  const [loanTerm, setLoanTerm] = useState([3]);
  const interestRate = 28;

  const handleApplyClick = () => {
    if (user) {
      navigate('/loan-application');
    } else {
      navigate('/auth');
    }
  };

  const { monthlyPayment, totalPayment, totalInterest } = useMemo(() => {
    const principal = loanAmount[0];
    const months = loanTerm[0];
    const monthlyRate = interestRate / 100 / 12;

    let monthly = 0;
    let total = 0;

    if (monthlyRate === 0) {
      monthly = principal / months;
      total = principal;
    } else {
      monthly =
        (principal * (monthlyRate * Math.pow(1 + monthlyRate, months))) /
        (Math.pow(1 + monthlyRate, months) - 1);
      total = monthly * months;
    }

    return {
      monthlyPayment: monthly,
      totalPayment: total,
      totalInterest: total - principal,
    };
  }, [loanAmount, loanTerm, interestRate]);

  const receiptNumber = useMemo(
    () =>
      Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, '0'),
    []
  );

  return (
    <section id="loans" className="relative py-20 md:py-28">
      <div className="container mx-auto px-4 md:px-8">
        {/* Section Header */}
        <div className="text-center mb-16 animate-fade-in-up">
          <h2
            className={cn(
              'text-3xl md:text-4xl lg:text-5xl font-bold mb-4',
              styles.textClass,
              theme === 'lux' ? 'font-serif' : theme === 'neo' ? 'font-mono' : 'font-sans'
            )}
          >
            Loan Calculator
          </h2>
          <p className={cn('text-lg md:text-xl max-w-2xl mx-auto opacity-70', styles.textClass)}>
            See how much your loan will cost with our transparent pricing
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Calculator Inputs */}
            <LandingCard className="p-6 md:p-8">
              <div className="flex items-center gap-3 mb-8">
                <div
                  className={cn(
                    'w-12 h-12 flex items-center justify-center',
                    theme === 'neo'
                      ? `border-2 ${isDark ? 'border-white' : 'border-black'}`
                      : theme === 'lux'
                        ? 'bg-amber-500/10 rounded-lg'
                        : 'bg-blue-500/10 rounded-2xl'
                  )}
                >
                  <Calculator
                    className={cn('w-6 h-6', theme === 'lux' ? 'text-amber-500' : 'text-blue-500')}
                  />
                </div>
                <h3 className={cn('text-xl font-bold', styles.textClass)}>Calculate Your Loan</h3>
              </div>

              <div className="space-y-8">
                {/* Loan Amount Slider */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <label className={cn('text-sm font-medium', styles.textClass)}>
                      Loan Amount
                    </label>
                    <span
                      className={cn(
                        'text-xl font-bold',
                        theme === 'lux'
                          ? 'text-amber-500'
                          : theme === 'neo'
                            ? 'text-[#A855F7]'
                            : 'text-blue-500'
                      )}
                    >
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
                  <div
                    className={cn('flex justify-between text-xs mt-3 opacity-50', styles.textClass)}
                  >
                    <span>N$ 500</span>
                    <span>N$ 25,000</span>
                  </div>
                </div>

                {/* Loan Term Slider */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <label className={cn('text-sm font-medium', styles.textClass)}>Loan Term</label>
                    <span
                      className={cn(
                        'text-xl font-bold',
                        theme === 'lux'
                          ? 'text-amber-500'
                          : theme === 'neo'
                            ? 'text-[#A855F7]'
                            : 'text-blue-500'
                      )}
                    >
                      {loanTerm[0]} month{loanTerm[0] !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <Slider
                    value={loanTerm}
                    onValueChange={(value) => {
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
                  <div
                    className={cn('flex justify-between text-xs mt-3 opacity-50', styles.textClass)}
                  >
                    <span>1 month</span>
                    <span>3 months</span>
                    <span>5 months</span>
                  </div>
                </div>

                {/* Interest Rate Display */}
                <div
                  className={cn(
                    'p-4',
                    theme === 'neo'
                      ? `border-2 ${isDark ? 'border-white' : 'border-black'}`
                      : theme === 'lux'
                        ? 'bg-amber-500/5 border border-amber-500/20 rounded-lg'
                        : 'bg-blue-500/5 border border-blue-500/10 rounded-2xl'
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Info
                      className={cn(
                        'w-4 h-4',
                        theme === 'lux' ? 'text-amber-500' : 'text-blue-500'
                      )}
                    />
                    <span className={cn('text-sm font-medium', styles.textClass)}>
                      Representative APR
                    </span>
                  </div>
                  <p
                    className={cn(
                      'text-2xl font-bold',
                      theme === 'lux'
                        ? 'text-amber-500'
                        : theme === 'neo'
                          ? 'text-[#A855F7]'
                          : 'text-blue-500'
                    )}
                  >
                    {interestRate}% p.a.
                  </p>
                  <p className={cn('text-xs mt-1 opacity-50', styles.textClass)}>
                    Rate depends on credit assessment
                  </p>
                </div>
              </div>
            </LandingCard>

            {/* Calculation Results - The "Receipt" */}
            <div
              className={cn(
                'p-6 md:p-8 relative overflow-hidden',
                theme === 'neo'
                  ? `border-2 ${isDark ? 'border-white bg-zinc-800' : 'border-black bg-white'} shadow-[6px_6px_0px_0px_${isDark ? 'rgba(255,255,255,1)' : 'rgba(0,0,0,1)'}]`
                  : theme === 'lux'
                    ? 'bg-gradient-to-br from-zinc-900 to-zinc-950 border border-amber-500/20 rounded-xl'
                    : 'bg-gradient-to-br from-slate-900 to-slate-950 border border-white/10 rounded-3xl backdrop-blur-xl'
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

              <div className="relative z-10">
                <div
                  className={cn(
                    'flex items-center justify-between mb-8 pb-4 border-b border-dashed',
                    isDark || theme !== 'neo' ? 'border-zinc-700' : 'border-zinc-300'
                  )}
                >
                  <h3
                    className={cn(
                      'text-xl font-semibold',
                      theme === 'neo' && !isDark ? 'text-black' : 'text-white'
                    )}
                  >
                    Loan Estimate
                  </h3>
                  <div
                    className={cn(
                      'px-2 py-1 text-xs font-mono',
                      theme === 'neo'
                        ? `border-2 ${isDark ? 'border-white text-white' : 'border-black text-black'}`
                        : 'bg-zinc-800 rounded text-zinc-400'
                    )}
                  >
                    #{receiptNumber}
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Monthly Payment */}
                  <div className="flex justify-between items-end">
                    <span
                      className={cn(
                        'text-sm',
                        theme === 'neo' && !isDark ? 'text-zinc-600' : 'text-zinc-400'
                      )}
                    >
                      Monthly Payment
                    </span>
                    <span
                      className={cn(
                        'text-2xl sm:text-3xl font-bold font-mono',
                        theme === 'lux'
                          ? 'text-amber-400'
                          : theme === 'neo' && !isDark
                            ? 'text-black'
                            : 'text-white'
                      )}
                    >
                      N$ {monthlyPayment.toFixed(2)}
                    </span>
                  </div>

                  {/* Total Payment */}
                  <div className="flex justify-between items-end">
                    <span
                      className={cn(
                        'text-sm',
                        theme === 'neo' && !isDark ? 'text-zinc-600' : 'text-zinc-400'
                      )}
                    >
                      Total Amount
                    </span>
                    <span
                      className={cn(
                        'text-2xl font-bold font-mono',
                        theme === 'neo' && !isDark ? 'text-zinc-700' : 'text-zinc-200'
                      )}
                    >
                      N$ {totalPayment.toFixed(2)}
                    </span>
                  </div>

                  {/* Interest Cost */}
                  <div
                    className={cn(
                      'flex justify-between items-end pb-6 border-b border-dashed',
                      isDark || theme !== 'neo' ? 'border-zinc-700' : 'border-zinc-300'
                    )}
                  >
                    <span
                      className={cn(
                        'text-sm',
                        theme === 'neo' && !isDark ? 'text-zinc-600' : 'text-zinc-400'
                      )}
                    >
                      Total Interest
                    </span>
                    <span
                      className={cn(
                        'text-2xl font-bold font-mono',
                        theme === 'lux'
                          ? 'text-amber-500'
                          : theme === 'neo'
                            ? 'text-[#A855F7]'
                            : 'text-blue-400'
                      )}
                    >
                      N$ {totalInterest.toFixed(2)}
                    </span>
                  </div>

                  {/* CTA */}
                  <div className="pt-2">
                    <LandingButton variant="primary" fullWidth onClick={handleApplyClick}>
                      Apply Now <ArrowRight className="w-5 h-5" />
                    </LandingButton>
                    <p
                      className={cn(
                        'text-xs text-center mt-4',
                        theme === 'neo' && !isDark ? 'text-zinc-500' : 'text-zinc-500'
                      )}
                    >
                      Get pre-approved in 5 minutes. No hidden fees.
                    </p>
                  </div>

                  {/* Disclaimer */}
                  <div
                    className={cn(
                      'p-3 border',
                      theme === 'neo'
                        ? isDark
                          ? 'border-white/20 bg-white/5'
                          : 'border-black/20 bg-black/5'
                        : 'border-zinc-800 bg-zinc-800/50 rounded-xl'
                    )}
                  >
                    <p
                      className={cn(
                        'text-[10px] leading-relaxed',
                        theme === 'neo' && !isDark ? 'text-zinc-500' : 'text-zinc-500'
                      )}
                    >
                      <strong>Note:</strong> Estimate only. Actual rates vary by credit profile.
                      Regulated by NAMFISA. APR capped at {interestRate}%.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LoanCalculator;
