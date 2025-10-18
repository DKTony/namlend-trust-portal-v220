import { Card } from "@/components/ui/card";
import { Shield, Zap, Users, Phone, CreditCard, FileCheck } from "lucide-react";
import securityIcon from "@/assets/security-icon.png";
import speedIcon from "@/assets/speed-icon.png";

const FeaturesSection = () => {
  const features = [
    {
      icon: <Zap className="w-8 h-8 text-accent" />,
      title: "5-Minute Approval",
      description: "Get approved instantly with our automated credit assessment system. No waiting weeks for loan decisions.",
      highlight: "Fast & Efficient"
    },
    {
      icon: <Shield className="w-8 h-8 text-success" />,
      title: "NAMFISA Regulated",
      description: "Fully licensed and regulated by NAMFISA. Your data and money are protected by Namibian financial law.",
      highlight: "100% Secure"
    },
    {
      icon: <Users className="w-8 h-8 text-accent" />,
      title: "For All Namibians",
      description: "Whether you're banked or unbanked, employed or self-employed, we have loan products for you.",
      highlight: "Inclusive"
    },
    {
      icon: <Phone className="w-8 h-8 text-primary" />,
      title: "Mobile-First",
      description: "Apply via smartphone, feature phone, or USSD. Works on any device, even with slow internet.",
      highlight: "Accessible"
    },
    {
      icon: <CreditCard className="w-8 h-8 text-success" />,
      title: "Multiple Payment Options",
      description: "Repay via bank transfer, mobile money, or cash at agent locations. Choose what works for you.",
      highlight: "Flexible"
    },
    {
      icon: <FileCheck className="w-8 h-8 text-accent" />,
      title: "Transparent Terms",
      description: "No hidden fees. All costs disclosed upfront. Clear loan agreements in English and local languages.",
      highlight: "Honest"
    }
  ];

  return (
    <section id="how-it-works" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
            Why Choose NamLend?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We're building financial inclusion for all Namibians with transparent, 
            accessible, and compliant microlending services.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="p-6 hover:shadow-medium transition-smooth bg-background border-border">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 p-3 bg-muted rounded-lg">
                  {feature.icon}
                </div>
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-lg font-semibold text-primary">
                      {feature.title}
                    </h3>
                    <span className="px-2 py-1 bg-accent/10 text-accent text-xs rounded-full">
                      {feature.highlight}
                    </span>
                  </div>
                  <p className="text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Compliance Statement */}
        <div className="mt-16 p-6 bg-background rounded-lg border-l-4 border-l-accent shadow-soft">
          <div className="flex items-start space-x-4">
            <Shield className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
            <div>
              <h4 className="text-lg font-semibold text-primary mb-2">
                Regulatory Compliance
              </h4>
              <p className="text-muted-foreground mb-3">
                NamLend is fully licensed under the Microlending Act 2018 and regulated by the 
                Namibia Financial Institutions Supervisory Authority (NAMFISA). 
                We comply with all KYC/AML requirements under the Financial Intelligence Act 2012.
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-success rounded-full"></div>
                  <span>NAMFISA License: ML-2024-001</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-success rounded-full"></div>
                  <span>Bank of Namibia Authorized</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-success rounded-full"></div>
                  <span>FIC Compliant</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;