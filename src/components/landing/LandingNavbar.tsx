import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Menu, X } from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LandingButton from './LandingButton';

const LandingNavbar: React.FC = () => {
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
    <nav
      className={cn(
        'fixed top-0 left-0 w-full z-50 px-4 md:px-8 py-4 transition-all duration-300',
        isOpen ? 'bg-[#F7FAF6]' : 'bg-transparent backdrop-blur-sm'
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img
            src="/og-financial-logo-v2.svg"
            alt="OG Financial Services"
            className="h-12 w-auto max-w-[190px] object-contain"
          />
        </div>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <button
              key={link.name}
              onClick={() => handleLinkClick(link.href)}
              className={cn(
                'text-sm font-medium hover:opacity-70 transition-opacity',
                'font-sans text-[#274F35]'
              )}
            >
              {link.name}
            </button>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-4">
          <button
            onClick={handleSignInClick}
            className={cn('text-sm font-medium hover:opacity-70', 'font-sans text-[#274F35]')}
          >
            Sign In
          </button>
          <LandingButton variant="primary" onClick={handleApplyClick}>
            Apply Now
          </LandingButton>
        </div>

        <button
          type="button"
          className={cn(
            'md:hidden flex min-h-11 min-w-11 items-center justify-center rounded-lg transition-colors',
            'hover:bg-[#DCE8D8]'
          )}
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={isOpen}
          aria-controls="landing-mobile-navigation"
          data-testid="landing-mobile-menu-trigger"
        >
          {isOpen ? (
            <X className={'font-sans text-[#274F35]'} />
          ) : (
            <Menu className={'font-sans text-[#274F35]'} />
          )}
        </button>
      </div>

      {isOpen && (
        <div
          id="landing-mobile-navigation"
          role="navigation"
          aria-label="Mobile navigation"
          className={cn(
            'md:hidden absolute top-full left-0 w-full p-4 border-b',
            'bg-[#F7FAF6]',
            'border-[#DCE8D8]'
          )}
        >
          <div className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <button
                key={link.name}
                onClick={() => handleLinkClick(link.href)}
                className={cn(
                  'block min-h-11 py-2 font-medium text-left',
                  'font-sans text-[#274F35]'
                )}
              >
                {link.name}
              </button>
            ))}
            <hr className={'border-[#DCE8D8]'} />
            <LandingButton fullWidth onClick={handleApplyClick}>
              Apply Now
            </LandingButton>
          </div>
        </div>
      )}
    </nav>
  );
};

export default LandingNavbar;
