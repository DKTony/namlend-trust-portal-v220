import LoanCalculator from '@/components/finance/LoanCalculator';
import LandingNavbar from '@/components/landing/LandingNavbar';
import SectionDivider from '@/components/landing/SectionDivider';
import FeaturesSection from '@/components/sections/FeaturesSection';
import Footer from '@/components/sections/Footer';
import HeroSection from '@/components/sections/HeroSection';

const Index = () => {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#F7FAF6]">
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
    </div>
  );
};

export default Index;
