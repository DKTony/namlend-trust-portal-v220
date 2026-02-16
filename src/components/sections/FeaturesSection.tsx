import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import LandingCard from '@/components/landing/LandingCard';
import { Shield, Zap, Users, Phone, CreditCard, FileCheck } from 'lucide-react';

const FeaturesSection = () => {
  const { styles, theme, isDark } = useTheme();

  const features = [
    {
      icon: Zap,
      title: '5-Minute Approval',
      description: 'Get approved instantly with our automated credit assessment system.',
      color: 'text-amber-500',
    },
    {
      icon: Shield,
      title: 'NAMFISA Regulated',
      description: 'Fully licensed and regulated. Your data and money are protected.',
      color: 'text-green-500',
    },
    {
      icon: Users,
      title: 'For All Namibians',
      description: 'Whether banked or unbanked, employed or self-employed.',
      color: 'text-blue-500',
    },
    {
      icon: Phone,
      title: 'Mobile-First',
      description: 'Apply via smartphone, feature phone, or USSD.',
      color: 'text-purple-500',
    },
    {
      icon: CreditCard,
      title: 'Flexible Payments',
      description: 'Repay via bank transfer, mobile money, or cash at agents.',
      color: 'text-cyan-500',
    },
    {
      icon: FileCheck,
      title: 'Transparent Terms',
      description: 'No hidden fees. All costs disclosed upfront.',
      color: 'text-rose-500',
    },
  ];

  return (
    <section id="how-it-works" className="relative py-20 md:py-28">
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
            Why Choose NamLend?
          </h2>
          <p className={cn('text-lg md:text-xl max-w-2xl mx-auto opacity-70', styles.textClass)}>
            Building financial inclusion for all Namibians with transparent, accessible, and
            compliant microlending services.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <LandingCard key={index} hoverEffect className="p-6 md:p-8">
                <div
                  className={cn(
                    'w-14 h-14 flex items-center justify-center mb-5',
                    theme === 'neo'
                      ? `border-2 ${isDark ? 'border-white' : 'border-black'}`
                      : theme === 'lux'
                        ? 'bg-amber-500/10 rounded-lg'
                        : 'bg-white/10 backdrop-blur-sm rounded-2xl'
                  )}
                >
                  <IconComponent className={cn('w-7 h-7', feature.color)} />
                </div>
                <h3 className={cn('text-xl font-bold mb-3', styles.textClass)}>{feature.title}</h3>
                <p className={cn('opacity-70 leading-relaxed', styles.textClass)}>
                  {feature.description}
                </p>
              </LandingCard>
            );
          })}
        </div>

        {/* Compliance Banner */}
        <div className="mt-16">
          <LandingCard className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <div
                className={cn(
                  'w-16 h-16 flex-shrink-0 flex items-center justify-center',
                  theme === 'neo'
                    ? `border-2 ${isDark ? 'border-white' : 'border-black'} bg-green-500`
                    : theme === 'lux'
                      ? 'bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg'
                      : 'bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl'
                )}
              >
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h4 className={cn('text-xl font-bold mb-2', styles.textClass)}>
                  Regulatory Compliance
                </h4>
                <p className={cn('mb-4 opacity-70', styles.textClass)}>
                  NamLend is fully licensed under the Microlending Act 2018 and regulated by
                  NAMFISA. We comply with all KYC/AML requirements under the Financial Intelligence
                  Act 2012.
                </p>
                <div className="flex flex-wrap gap-4">
                  {[
                    'NAMFISA License: ML-2024-001',
                    'Bank of Namibia Authorized',
                    'FIC Compliant',
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span className={cn('text-sm', styles.textClass)}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </LandingCard>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
