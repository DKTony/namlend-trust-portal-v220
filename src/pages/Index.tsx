import React from 'react';
import HeroSection from '@/components/sections/HeroSection';
import FeaturesSection from '@/components/sections/FeaturesSection';
import LoanCalculator from '@/components/finance/LoanCalculator';
import Footer from '@/components/sections/Footer';
import LandingNavbar from '@/components/landing/LandingNavbar';
import SectionDivider from '@/components/landing/SectionDivider';
import BackgroundLayer from '@/components/landing/BackgroundLayer';
import LandingThemeToggle from '@/components/landing/LandingThemeToggle';

const Index = () => {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Theme-aware background layer */}
      <BackgroundLayer />

      {/* Fixed navigation */}
      <LandingNavbar />

      {/* Main content */}
      <main className="relative z-10">
        <HeroSection />
        <SectionDivider position="bottom" />
        <FeaturesSection />
        <SectionDivider position="bottom" />
        <LoanCalculator />
      </main>

      {/* Footer */}
      <Footer />

      {/* Theme toggle (fixed position) */}
      <LandingThemeToggle />
    </div>
  );
};

export default Index;
