import LoanCalculator from '@/components/finance/LoanCalculator';
import BackgroundLayer from '@/components/landing/BackgroundLayer';
import LandingNavbar from '@/components/landing/LandingNavbar';
import LandingThemeToggle from '@/components/landing/LandingThemeToggle';
import SectionDivider from '@/components/landing/SectionDivider';
import FeaturesSection from '@/components/sections/FeaturesSection';
import Footer from '@/components/sections/Footer';
import HeroSection from '@/components/sections/HeroSection';

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
