import LandingButton from '@/components/landing/LandingButton';
import LandingCard from '@/components/landing/LandingCard';
import { useAuth } from '@/hooks/useAuth';
import { ArrowRight, Shield, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const fieldClass =
  'w-full rounded-xl border border-[#B9CCB3] bg-white p-3 text-[#274F35] outline-none transition-colors placeholder:text-slate-400 focus:border-[#3F713E] focus:ring-2 focus:ring-[#3F713E]/20';

const HeroSection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const apply = () => navigate(user ? '/loan-application' : '/auth');
  const calculate = () => document.getElementById('loans')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <section className="relative flex min-h-screen items-center overflow-hidden pb-16 pt-24">
      <div className="absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_top_left,rgba(124,160,92,0.18),transparent_55%)]" />
      <div className="container relative z-10 mx-auto px-4 md:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="text-center lg:text-left">
            <div className="mb-8 flex flex-wrap justify-center gap-3 lg:justify-start">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#B9CCB3] bg-[#EEF5EB] px-4 py-2 text-sm font-bold uppercase tracking-wider text-[#274F35]">
                <Shield className="h-4 w-4" /> NAMFISA licensed
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#DCE8D8] bg-white px-4 py-2 text-sm font-bold uppercase tracking-wider text-[#274F35]">
                <Zap className="h-4 w-4 text-[#7CA05C]" /> Credit review
              </span>
            </div>

            <h1 className="mb-6 font-sans text-4xl font-bold leading-tight text-[#274F35] sm:text-5xl md:text-6xl lg:text-7xl">
              Quick loans for <span className="text-[#3F713E]">every Namibian</span>
            </h1>
            <p className="mx-auto mb-8 max-w-xl text-lg text-[#274F35]/75 md:text-xl lg:mx-0">
              Apply online with transparent terms. Your verified application goes directly to an OG
              Financial Services loan officer for credit review.
            </p>
            <div className="mb-10 flex flex-col justify-center gap-4 sm:flex-row lg:justify-start">
              <LandingButton variant="primary" onClick={apply}>
                Apply now <ArrowRight className="h-5 w-5" />
              </LandingButton>
              <LandingButton variant="secondary" onClick={calculate}>
                Calculate loan
              </LandingButton>
            </div>
            <div className="grid max-w-lg grid-cols-3 gap-4 text-left text-[#274F35] lg:mx-0">
              <div>
                <strong className="block text-2xl">32%</strong>
                <span className="text-sm text-[#274F35]/60">Maximum APR</span>
              </div>
              <div>
                <strong className="block text-2xl">3 steps</strong>
                <span className="text-sm text-[#274F35]/60">Application</span>
              </div>
              <div>
                <strong className="block text-2xl">KYC</strong>
                <span className="text-sm text-[#274F35]/60">Verified first</span>
              </div>
            </div>
          </div>

          <div className="mx-auto w-full max-w-md">
            <LandingCard className="p-6 md:p-8">
              <div className="mb-6 text-center">
                <img
                  src="/og-financial-logo-v2.svg"
                  alt="OG Financial Services CC"
                  className="mx-auto mb-6 h-16 w-auto max-w-full"
                />
                <h2 className="text-2xl font-bold text-[#274F35]">Start your application</h2>
                <p className="mt-1 text-sm text-[#274F35]/60">Review the indicative ranges below</p>
              </div>
              <form
                className="space-y-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  apply();
                }}
              >
                <label className="block text-sm font-medium text-[#274F35]">
                  Loan amount (NAD)
                  <select aria-label="Select loan amount range" className={`${fieldClass} mt-2`}>
                    <option>N$ 1,000 - N$ 5,000</option>
                    <option>N$ 5,000 - N$ 10,000</option>
                    <option>N$ 10,000 - N$ 25,000</option>
                    <option>N$ 25,000 - N$ 50,000</option>
                  </select>
                </label>
                <label className="block text-sm font-medium text-[#274F35]">
                  Monthly income (NAD)
                  <select aria-label="Select monthly income range" className={`${fieldClass} mt-2`}>
                    <option>N$ 0 - N$ 3,000</option>
                    <option>N$ 3,000 - N$ 6,000</option>
                    <option>N$ 6,000 - N$ 10,000</option>
                    <option>N$ 10,000+</option>
                  </select>
                </label>
                <LandingButton type="submit" variant="primary" fullWidth>
                  Continue to application
                </LandingButton>
                <p className="text-center text-xs text-[#274F35]/55">
                  Indicative only. Approval follows KYC and credit review. APR never exceeds 32%.
                </p>
              </form>
            </LandingCard>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
