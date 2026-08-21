import LandingCard from '@/components/landing/LandingCard';
import { CreditCard, FileCheck, Phone, Shield, Users, Zap } from 'lucide-react';

const features = [
  {
    icon: Zap,
    title: 'Straightforward Application',
    description: 'Submit your details online for a responsible credit review by our team.',
  },
  {
    icon: Shield,
    title: 'NAMFISA Regulated',
    description: 'Licensed and regulated, with secure handling of customer information.',
  },
  {
    icon: Users,
    title: 'For Namibians',
    description: 'A clear application path for employed and self-employed borrowers.',
  },
  {
    icon: Phone,
    title: 'Mobile-First',
    description: 'Apply from a phone, tablet, or desktop with the same guided experience.',
  },
  {
    icon: CreditCard,
    title: 'Flexible Payments',
    description: 'Use the repayment options available for your approved loan.',
  },
  {
    icon: FileCheck,
    title: 'Transparent Terms',
    description: 'Review amounts, costs, and repayment information before submission.',
  },
];

const FeaturesSection = () => (
  <section id="how-it-works" className="relative scroll-mt-24 py-20 md:py-28">
    <div className="container mx-auto px-4 md:px-8">
      <div className="mb-16 text-center">
        <h2 className="mb-4 font-sans text-3xl font-bold text-[#274F35] md:text-4xl lg:text-5xl">
          Why choose OG Financial Services?
        </h2>
        <p className="mx-auto max-w-2xl text-lg text-[#274F35]/70 md:text-xl">
          Transparent, accessible, and compliant microlending services for Namibia.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <LandingCard key={feature.title} hoverEffect className="p-6 md:p-8">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#DCE8D8] bg-[#EEF5EB]">
                <Icon className="h-7 w-7 text-[#3F713E]" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-[#274F35]">{feature.title}</h3>
              <p className="leading-relaxed text-[#274F35]/70">{feature.description}</p>
            </LandingCard>
          );
        })}
      </div>

      <div id="about" className="mt-16 scroll-mt-24">
        <LandingCard className="p-6 md:p-8">
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#3F713E] to-[#274F35]">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="mb-2 text-xl font-bold text-[#274F35]">Regulatory compliance</h4>
              <p className="mb-4 text-[#274F35]/70">
                OG Financial Services CC is registered as a microlender with NAMFISA. Verified KYC
                and responsible credit review apply to every application.
              </p>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#274F35]">
                {[
                  'NAMFISA licence 25/11/2366',
                  'NAMRA taxpayer registered',
                  'Verified KYC required',
                ].map((item) => (
                  <span key={item} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#3F713E]" />
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </LandingCard>
      </div>
    </div>
  </section>
);

export default FeaturesSection;
