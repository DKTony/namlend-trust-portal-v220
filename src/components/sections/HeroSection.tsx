import LandingButton from '@/components/landing/LandingButton';
import LandingCard from '@/components/landing/LandingCard';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { ArrowRight, Shield, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const HeroSection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { styles, theme, isDark } = useTheme();

  const handleApplyClick = () => {
    if (user) {
      navigate('/loan-application');
    } else {
      navigate('/auth');
    }
  };

  const handleCalculateClick = () => {
    const element = document.getElementById('loans');
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-screen flex items-center pt-24 pb-16 overflow-hidden">
      <div className="container mx-auto px-4 md:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Hero Content */}
          <div className="text-center lg:text-left animate-fade-in-up">
            {/* Badges */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-3 mb-8">
              <div
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2',
                  theme === 'neo'
                    ? `border-2 ${isDark ? 'border-white bg-zinc-800 shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]' : 'border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}`
                    : styles.badgeClass
                )}
              >
                <Shield
                  className={cn(
                    'w-4 h-4',
                    theme === 'neo' ? (isDark ? 'text-white' : 'text-black') : 'text-green-500'
                  )}
                />
                <span
                  className={cn(
                    'text-sm font-bold uppercase tracking-wider',
                    theme === 'neo' ? (isDark ? 'text-white' : 'text-black') : ''
                  )}
                >
                  NAMFISA Licensed
                </span>
              </div>
              <div
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2',
                  theme === 'neo'
                    ? `border-2 ${isDark ? 'border-white bg-zinc-800 shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]' : 'border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}`
                    : styles.badgeClass
                )}
              >
                <Zap
                  className={cn('w-4 h-4', theme === 'neo' ? 'text-amber-500' : 'text-amber-500')}
                />
                <span
                  className={cn(
                    'text-sm font-bold uppercase tracking-wider',
                    theme === 'neo' ? (isDark ? 'text-white' : 'text-black') : ''
                  )}
                >
                  5-Min Approval
                </span>
              </div>
            </div>

            <h1
              className={cn(
                'text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6',
                styles.textClass,
                theme === 'lux'
                  ? 'font-serif leading-tight'
                  : theme === 'neo'
                    ? 'font-mono tracking-tighter leading-[1.0]'
                    : 'font-sans leading-tight'
              )}
            >
              {theme === 'neo' ? (
                <>
                  Quick Loans for
                  <br />
                  <span className="relative inline-block bg-[#bef264] px-2 py-1 border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transform -rotate-1 text-black mt-2">
                    Every Namibian
                  </span>
                </>
              ) : (
                <>
                  Quick Loans for{' '}
                  <span
                    className={cn(
                      theme === 'lux'
                        ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600'
                        : 'text-blue-500'
                    )}
                  >
                    Every Namibian
                  </span>
                </>
              )}
            </h1>

            <p
              className={cn(
                'text-lg md:text-xl mb-8 max-w-xl mx-auto lg:mx-0 opacity-80',
                styles.textClass
              )}
            >
              Get approved in minutes. Transparent terms. No hidden fees. Serving both banked and
              unbanked communities across Namibia.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-10">
              <LandingButton variant="primary" onClick={handleApplyClick}>
                Apply Now <ArrowRight className="w-5 h-5" />
              </LandingButton>
              <LandingButton variant="secondary" onClick={handleCalculateClick}>
                Calculate Loan
              </LandingButton>
            </div>

            {/* Trust Stats */}
            <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto lg:mx-0">
              <div className="text-center lg:text-left">
                <div className={cn('text-2xl md:text-3xl font-bold', styles.textClass)}>50K+</div>
                <div className={cn('text-sm opacity-60', styles.textClass)}>Happy Customers</div>
              </div>
              <div className="text-center lg:text-left">
                <div className={cn('text-2xl md:text-3xl font-bold', styles.textClass)}>
                  N$100M+
                </div>
                <div className={cn('text-sm opacity-60', styles.textClass)}>Loans Disbursed</div>
              </div>
              <div className="text-center lg:text-left">
                <div className={cn('text-2xl md:text-3xl font-bold', styles.textClass)}>4.8★</div>
                <div className={cn('text-sm opacity-60', styles.textClass)}>App Rating</div>
              </div>
            </div>
          </div>

          {/* Quick Check Card */}
          <div
            className="lg:max-w-md mx-auto w-full animate-fade-in-up relative"
            style={{ animationDelay: '0.2s' }}
          >
            {/* Neo theme decorative elements */}
            {theme === 'neo' && (
              <>
                <div
                  className={cn(
                    'absolute -top-10 -right-6 w-20 h-20 rounded-full border-2 flex items-center justify-center font-bold text-xs transform rotate-12 animate-float z-20',
                    isDark
                      ? 'bg-yellow-400 border-white text-black shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]'
                      : 'bg-yellow-400 border-black text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                  )}
                >
                  0% FEES
                </div>
                <div
                  className={cn(
                    'absolute top-3 left-3 w-full h-full -z-10',
                    isDark ? 'bg-white' : 'bg-black'
                  )}
                />
              </>
            )}
            <LandingCard className="p-6 md:p-8 relative z-10">
              <div className="text-center mb-6">
                <h3 className={cn('text-2xl font-bold mb-2', styles.textClass)}>Quick Check</h3>
                <p className={cn('text-sm opacity-60', styles.textClass)}>
                  See your eligibility in 2 minutes
                </p>
              </div>

              <form
                className="space-y-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleApplyClick();
                }}
              >
                <div>
                  <label className={cn('block text-sm font-medium mb-2', styles.textClass)}>
                    Loan Amount (NAD)
                  </label>
                  <select
                    aria-label="Select loan amount range"
                    className={cn('w-full p-3 transition-all', styles.inputClass)}
                  >
                    <option>N$ 500 - N$ 2,000</option>
                    <option>N$ 2,000 - N$ 5,000</option>
                    <option>N$ 5,000 - N$ 10,000</option>
                    <option>N$ 10,000 - N$ 25,000</option>
                  </select>
                </div>

                <div>
                  <label className={cn('block text-sm font-medium mb-2', styles.textClass)}>
                    Monthly Income (NAD)
                  </label>
                  <select
                    aria-label="Select monthly income range"
                    className={cn('w-full p-3 transition-all', styles.inputClass)}
                  >
                    <option>N$ 0 - N$ 3,000</option>
                    <option>N$ 3,000 - N$ 6,000</option>
                    <option>N$ 6,000 - N$ 10,000</option>
                    <option>N$ 10,000+</option>
                  </select>
                </div>

                <div>
                  <label className={cn('block text-sm font-medium mb-2', styles.textClass)}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+264 XX XXX XXXX"
                    className={cn('w-full p-3 transition-all', styles.inputClass)}
                  />
                </div>

                <LandingButton type="submit" variant="primary" fullWidth>
                  Check Eligibility
                </LandingButton>

                <p className={cn('text-xs text-center opacity-50', styles.textClass)}>
                  By continuing, you agree to our terms. APR up to 32% p.a.
                </p>
              </form>
            </LandingCard>
          </div>
        </div>
      </div>

      {/* Neo theme decorative elements */}
      {theme === 'neo' && (
        <>
          <div
            className={cn(
              'absolute top-32 right-10 w-16 h-16 border-4 rotate-12 animate-float hidden lg:block',
              isDark ? 'border-white' : 'border-black'
            )}
          />
          <div
            className={cn(
              'absolute bottom-32 left-10 w-12 h-12 rounded-full border-4 animate-float hidden lg:block',
              isDark ? 'border-[#A855F7]' : 'border-[#A855F7]'
            )}
            style={{ animationDelay: '-3s' }}
          />
        </>
      )}
    </section>
  );
};

export default HeroSection;
