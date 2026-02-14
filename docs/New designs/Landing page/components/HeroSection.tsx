import React from 'react';
import { useTheme } from '../context/ThemeContext';
import Card from './ui/Card';
import Button from './ui/Button';
import { CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';

const HeroSection: React.FC = () => {
  const { styles, theme } = useTheme();

  return (
    <div className="relative pt-32 pb-32 px-4 md:px-8 flex items-center min-h-[90vh]">
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        
        {/* Left Content */}
        <div className="space-y-10 animate-fade-in-up z-10">
          {/* Badge */}
          <div className={`inline-flex items-center gap-2 px-4 py-2 ${theme === 'neo' ? 'border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : 'rounded-full border'} ${styles.borderClass} ${theme === 'glass' ? 'bg-white/10' : ''}`}>
            <ShieldCheck className={`w-4 h-4 ${theme === 'neo' ? 'text-black' : 'text-emerald-500'}`} />
            <span className={`text-sm font-bold uppercase tracking-wider ${styles.textClass}`}>NAMFISA Licensed</span>
          </div>

          <h1 className={`text-6xl md:text-7xl lg:text-8xl font-bold leading-[1.0] ${styles.textClass} ${theme === 'neo' ? 'tracking-tighter' : ''}`}>
            Money when <br/>
            <span className={`relative inline-block ${theme === 'neo' ? 'bg-[#bef264] px-2 border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transform -rotate-1' : theme === 'lux' ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600' : 'text-blue-500'}`}>
               You Need It
            </span>
          </h1>

          <p className={`text-xl md:text-2xl opacity-80 max-w-lg leading-relaxed ${styles.textClass}`}>
            Simple, fast, and fair loans for everyone in Namibia. No hidden fees, just instant support.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
             <Button variant="primary" className="px-10 py-5 text-xl">
               Get Started <ArrowRight className="w-5 h-5 ml-2" />
             </Button>
             <Button variant="secondary" className="px-10 py-5 text-xl">
               Learn More
             </Button>
          </div>
          
          <div className="flex items-center gap-6 text-sm opacity-70">
             <div className={`flex items-center gap-2 ${styles.textClass}`}>
                <CheckCircle2 className="w-4 h-4" /> <span>Instant Approval</span>
             </div>
             <div className={`flex items-center gap-2 ${styles.textClass}`}>
                <CheckCircle2 className="w-4 h-4" /> <span>No Collateral</span>
             </div>
          </div>
        </div>

        {/* Right Form Card */}
        <div className="relative animate-fade-in-up z-10" style={{ animationDelay: '200ms' }}>
          {theme === 'neo' && (
             // Decorative elements for Neo theme
             <>
                <div className="absolute -top-12 -right-12 w-24 h-24 bg-yellow-400 rounded-full border-2 border-black flex items-center justify-center font-bold text-xs transform rotate-12 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-float">
                  0% FEES
                </div>
                <div className="absolute top-4 left-4 w-full h-full bg-black -z-10" />
             </>
          )}
          
          <Card className="p-8 md:p-12">
            <div className="space-y-8">
              <div className="text-center space-y-2 mb-8">
                <h3 className={`text-3xl font-bold ${styles.textClass}`}>Quick Check</h3>
                <p className={`opacity-60 ${styles.textClass}`}>See how much you qualify for</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className={`text-sm font-bold uppercase tracking-wider ${styles.textClass}`}>I want to borrow</label>
                  <select className={`w-full p-4 outline-none transition-all appearance-none cursor-pointer ${styles.inputClass}`}>
                    <option>N$ 500 - N$ 2,000</option>
                    <option>N$ 2,000 - N$ 5,000</option>
                    <option>N$ 5,000 - N$ 10,000</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className={`text-sm font-bold uppercase tracking-wider ${styles.textClass}`}>My Monthly Income</label>
                  <select className={`w-full p-4 outline-none transition-all appearance-none cursor-pointer ${styles.inputClass}`}>
                    <option>N$ 0 - N$ 3,000</option>
                    <option>N$ 3,000 - N$ 10,000</option>
                    <option>N$ 10,000+</option>
                  </select>
                </div>
              </div>

              <Button fullWidth className="mt-6 py-4 text-lg">Check Eligibility</Button>

              <div className={`text-[10px] text-center opacity-40 mt-6 ${styles.textClass}`}>
                <p>Protected by 256-bit SSL Encryption.</p>
                <p>Your data is never shared with third parties.</p>
              </div>
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
};

export default HeroSection;