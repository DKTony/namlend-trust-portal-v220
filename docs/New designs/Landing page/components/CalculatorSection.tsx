import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import Card from './ui/Card';
import Button from './ui/Button';

const CalculatorSection: React.FC = () => {
  const { styles, theme } = useTheme();
  const [amount, setAmount] = useState(5000);
  const [term, setTerm] = useState(3);
  const [interest, setInterest] = useState(0);
  const [total, setTotal] = useState(0);
  const [monthly, setMonthly] = useState(0);

  useEffect(() => {
    // Simple mock calculation logic
    const rate = 0.28; // 28%
    const totalInterest = (amount * rate * (term / 12));
    const totalPayable = amount + totalInterest;
    
    setInterest(totalInterest);
    setTotal(totalPayable);
    setMonthly(totalPayable / term);
  }, [amount, term]);

  return (
    <div className="relative py-20 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-start">
          
          {/* Controls */}
          <Card className="p-8 md:p-12 space-y-10">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-4xl">🧮</span>
              <h2 className={`text-2xl font-bold ${styles.textClass}`}>Calculate Your Loan</h2>
            </div>

            {/* Amount Slider */}
            <div className="space-y-6">
              <div className="flex justify-between items-end">
                <label className={`font-semibold ${styles.textClass}`}>Loan Amount</label>
                <span className={`text-2xl font-bold text-blue-600`}>N$ {amount.toLocaleString()}</span>
              </div>
              <input 
                type="range" 
                min="500" 
                max="25000" 
                step="500" 
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className={`flex justify-between text-xs opacity-50 ${styles.textClass}`}>
                <span>N$ 500</span>
                <span>N$ 25,000</span>
              </div>
            </div>

            {/* Term Slider */}
            <div className="space-y-6">
              <div className="flex justify-between items-end">
                <label className={`font-semibold ${styles.textClass}`}>Loan Term</label>
                <span className={`text-2xl font-bold text-blue-600`}>{term} months</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="12" 
                step="1" 
                value={term}
                onChange={(e) => setTerm(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className={`flex justify-between text-xs opacity-50 ${styles.textClass}`}>
                <span>1 month</span>
                <span>12 months</span>
              </div>
            </div>

            <div className={`p-6 rounded-xl ${theme === 'neo' ? 'bg-gray-100' : 'bg-gray-50 dark:bg-white/5'}`}>
              <h4 className={`font-bold mb-2 ${styles.textClass}`}>Representative APR</h4>
              <p className={`text-3xl font-bold text-blue-600 mb-2`}>28% p.a.</p>
              <p className={`text-sm opacity-60 ${styles.textClass}`}>Rate depends on loan amount, term, and credit assessment.</p>
            </div>
          </Card>

          {/* Receipt/Breakdown */}
          <div className="relative">
             {theme === 'neo' && (
                <div className="absolute top-4 left-4 w-full h-full bg-gray-900 rounded-md -z-10" />
             )}
             <Card className={`p-8 md:p-12 ${theme === 'neo' ? 'bg-zinc-900 border-zinc-800' : theme === 'lux' ? 'bg-[#1a1a1a]' : 'bg-slate-900 text-white'}`}>
                <div className="flex justify-between items-start mb-8 pb-8 border-b border-white/10">
                  <h3 className="text-white text-xl font-bold">Loan Estimate</h3>
                  <span className="text-xs font-mono bg-white/10 px-2 py-1 rounded text-white/60">RECEIPT #3735</span>
                </div>

                <div className="space-y-8">
                  <div className="flex justify-between items-center">
                    <span className="text-white/60">Monthly Payment</span>
                    <span className="text-3xl font-bold text-white tracking-tight">N$ {monthly.toFixed(2)}</span>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-white/60">Total Amount</span>
                      <span className="text-xl font-mono text-white">N$ {total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/60">Total Interest</span>
                      <span className="text-xl font-mono text-blue-400">N$ {interest.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-12 space-y-6">
                  <Button fullWidth variant="primary" className="bg-blue-600 hover:bg-blue-500 border-none text-white shadow-lg shadow-blue-900/50">
                    Apply Now
                  </Button>
                  <p className="text-[10px] text-white/40 text-center">
                    Get pre-approved in 5 minutes. No hidden fees.
                  </p>
                </div>

                <div className="mt-8 p-4 bg-white/5 rounded border border-white/5">
                  <p className="text-[10px] text-white/50 leading-relaxed">
                    Note: Estimate only. Actual rates vary by credit profile. Regulated by NAMFISA. APR capped at 28%.
                  </p>
                </div>
             </Card>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CalculatorSection;