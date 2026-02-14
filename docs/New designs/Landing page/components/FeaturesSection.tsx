import React from 'react';
import { useTheme } from '../context/ThemeContext';
import Card from './ui/Card';
import { Zap, Shield, Users, Smartphone, CreditCard, FileText } from 'lucide-react';

const FeaturesSection: React.FC = () => {
  const { styles, theme, isDark } = useTheme();

  const features = [
    {
      icon: <Zap className="w-8 h-8 text-white" />,
      color: "bg-orange-500",
      title: "5-Minute Approval",
      desc: "Get approved instantly with our automated credit assessment system.",
    },
    {
      icon: <Shield className="w-8 h-8 text-white" />,
      color: "bg-emerald-500",
      title: "NAMFISA Regulated",
      desc: "Fully licensed and regulated. Your data and money are protected.",
    },
    {
      icon: <Users className="w-8 h-8 text-white" />,
      color: "bg-blue-500",
      title: "For All Namibians",
      desc: "Inclusive products for banked and unbanked communities.",
    },
    {
      icon: <Smartphone className="w-8 h-8 text-white" />,
      color: "bg-purple-500",
      title: "Mobile-First",
      desc: "Apply via smartphone, feature phone, or USSD.",
    },
    {
      icon: <CreditCard className="w-8 h-8 text-white" />,
      color: "bg-pink-500",
      title: "Flexible Payment",
      desc: "Repay via bank transfer, mobile money, or cash.",
    },
    {
      icon: <FileText className="w-8 h-8 text-white" />,
      color: "bg-amber-500",
      title: "Transparent Terms",
      desc: "No hidden fees. All costs disclosed upfront.",
    }
  ];

  return (
    <div className={`relative py-32 px-4 md:px-8 z-10 ${theme === 'neo' ? (isDark ? 'bg-zinc-800' : 'bg-white') : ''}`}>
      <div className="max-w-7xl mx-auto">
        
        <div className="mb-20 text-center">
          <h2 className={`text-4xl md:text-5xl font-bold mb-6 ${styles.textClass}`}>Why Choose NamLend?</h2>
          <p className={`text-xl opacity-60 max-w-2xl mx-auto ${styles.textClass}`}>
             We are redefining financial inclusion in Namibia with technology that works for you.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, idx) => (
            <div key={idx} className={theme === 'neo' ? 'relative group' : ''}>
              {theme === 'neo' && (
                <div className="absolute top-0 left-0 w-full h-full bg-black transform translate-x-2 translate-y-2 transition-transform group-hover:translate-x-3 group-hover:translate-y-3" />
              )}
              <Card className="h-full p-8 flex flex-col items-start gap-6 transition-transform" hoverEffect>
                 <div className={`p-4 ${theme === 'neo' ? 'border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : 'rounded-2xl shadow-lg'} ${feature.color}`}>
                    {feature.icon}
                 </div>
                 
                 <div>
                   <h3 className={`text-2xl font-bold mb-2 ${styles.textClass}`}>{feature.title}</h3>
                   <p className={`opacity-70 leading-relaxed ${styles.textClass}`}>{feature.desc}</p>
                 </div>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FeaturesSection;