import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Shield, Clock, Users, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import heroImage from "@/assets/hero-image.jpg";

const HeroSection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

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
    <section className="relative py-20 bg-gradient-hero overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src={heroImage} 
          alt="NamLend Hero" 
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-hero opacity-90"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Hero Content */}
          <div className="text-center lg:text-left">
            {/* NAMFISA Badge */}
            <div className="inline-flex items-center space-x-2 bg-background/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-6">
              <Shield className="w-4 h-4 text-warm-orange" />
              <span className="text-sm text-primary-foreground font-medium">
                NAMFISA Licensed & Regulated
              </span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-primary-foreground mb-6 leading-tight">
              Quick Loans for
              <span className="text-warm-orange"> Every Namibian</span>
            </h1>
            
            <p className="text-xl text-primary-foreground/90 mb-8 max-w-lg">
              Get approved in minutes. Transparent terms. No hidden fees. 
              Serving both banked and unbanked communities across Namibia.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Button variant="accent" size="lg" className="text-lg" onClick={handleApplyClick}>
                Apply for Loan
              </Button>
              <Button variant="outline" size="lg" className="bg-white/10 border-white/30 text-primary-foreground hover:bg-white/20" onClick={handleCalculateClick}>
                Calculate Loan
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex items-center justify-center lg:justify-start space-x-6 text-primary-foreground/80">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-success-green" />
                <span className="text-sm">5-minute approval</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-success-green" />
                <span className="text-sm">No collateral</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-success-green" />
                <span className="text-sm">Flexible terms</span>
              </div>
            </div>
          </div>

          {/* Quick Application Card */}
          <div className="lg:max-w-md mx-auto w-full">
            <Card className="p-6 bg-background/95 backdrop-blur-sm shadow-strong">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-primary mb-2">
                  Get Started Today
                </h3>
                <p className="text-muted-foreground">
                  Pre-qualify in 2 minutes
                </p>
              </div>

              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Loan Amount (NAD)
                  </label>
                  <select className="w-full p-3 border border-border rounded-md bg-background focus:ring-2 focus:ring-accent focus:border-transparent">
                    <option>N$ 500 - N$ 2,000</option>
                    <option>N$ 2,000 - N$ 5,000</option>
                    <option>N$ 5,000 - N$ 10,000</option>
                    <option>N$ 10,000 - N$ 25,000</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Monthly Income (NAD)
                  </label>
                  <select className="w-full p-3 border border-border rounded-md bg-background focus:ring-2 focus:ring-accent focus:border-transparent">
                    <option>N$ 0 - N$ 3,000</option>
                    <option>N$ 3,000 - N$ 6,000</option>
                    <option>N$ 6,000 - N$ 10,000</option>
                    <option>N$ 10,000+</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Phone Number
                  </label>
                  <input 
                    type="tel" 
                    placeholder="+264 XX XXX XXXX"
                    className="w-full p-3 border border-border rounded-md bg-background focus:ring-2 focus:ring-accent focus:border-transparent"
                  />
                </div>

                <Button variant="hero" size="lg" className="w-full" onClick={handleApplyClick}>
                  Check Eligibility
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  By continuing, you agree to our terms and conditions. 
                  Representative APR: up to 32% p.a.
                </p>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;