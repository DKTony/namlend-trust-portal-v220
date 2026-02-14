import React, { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import LandingButton from './LandingButton';
import { Shield, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const LandingNavbar: React.FC = () => {
  const { styles, theme } = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { name: 'Loans', href: '#loans' },
    { name: 'How It Works', href: '#how-it-works' },
    { name: 'About', href: '#about' },
    { name: 'Contact', href: '#contact' },
  ];

  const handleApplyClick = () => {
    if (user) {
      navigate('/loan-application');
    } else {
      navigate('/auth');
    }
  };

  const handleSignInClick = () => {
    navigate('/auth');
  };

  const handleLinkClick = (href: string) => {
    if (href.startsWith('#')) {
      const element = document.querySelector(href);
      element?.scrollIntoView({ behavior: 'smooth' });
    }
    setIsOpen(false);
  };

  return (
    <nav className={cn(
      'fixed top-0 left-0 w-full z-50 px-4 md:px-8 py-4 transition-all duration-300',
      isOpen ? styles.background : 'bg-transparent backdrop-blur-sm'
    )}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn(
            'p-2 rounded-lg',
            theme === 'neo' ? 'bg-[#8b5cf6] border-2 border-black dark:border-white' : 
            theme === 'lux' ? 'bg-amber-600' : 'bg-blue-600'
          )}>
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className={cn('text-xl font-bold', styles.textClass)}>NamLend</h1>
            <p className={cn('text-[10px] uppercase tracking-wider opacity-70', styles.textClass)}>NAMFISA Licensed</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <button 
              key={link.name} 
              onClick={() => handleLinkClick(link.href)}
              className={cn('text-sm font-medium hover:opacity-70 transition-opacity', styles.textClass)}
            >
              {link.name}
            </button>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-4">
          <button 
            onClick={handleSignInClick}
            className={cn('text-sm font-medium hover:opacity-70', styles.textClass)}
          >
            Sign In
          </button>
          <LandingButton variant="primary" onClick={handleApplyClick}>Apply Now</LandingButton>
        </div>

        <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X className={styles.textClass} /> : <Menu className={styles.textClass} />}
        </button>
      </div>

      {isOpen && (
        <div className={cn(
          'md:hidden absolute top-full left-0 w-full p-4 border-b',
          styles.background,
          styles.borderClass
        )}>
          <div className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <button 
                key={link.name} 
                onClick={() => handleLinkClick(link.href)}
                className={cn('block py-2 font-medium text-left', styles.textClass)}
              >
                {link.name}
              </button>
            ))}
            <hr className={styles.borderClass} />
            <LandingButton fullWidth onClick={handleApplyClick}>Apply Now</LandingButton>
          </div>
        </div>
      )}
    </nav>
  );
};

export default LandingNavbar;
