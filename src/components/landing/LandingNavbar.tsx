import SignOutButton from '@/components/shared/SignOutButton';
import { useAuth } from '@/hooks/useAuth';
import { getLandingLabel, getLandingRoute } from '@/lib/routing';
import { cn } from '@/lib/utils';
import { Menu, X } from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LandingButton from './LandingButton';

const LandingNavbar: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoanOfficer, isPlatformStaff } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const roleFlags = { isPlatformStaff, isLoanOfficer };
  const homeRoute = getLandingRoute(roleFlags);
  const homeLabel = getLandingLabel(roleFlags);

  const navLinks = [
    { name: 'Loans', href: '#loans' },
    { name: 'How It Works', href: '#how-it-works' },
    { name: 'About', href: '#about' },
    { name: 'Contact', href: '#contact' },
  ];

  const closeAndNavigate = (path: string) => {
    setIsOpen(false);
    navigate(path);
  };

  const handleApplyClick = () => {
    closeAndNavigate(user ? '/loan-application' : '/auth');
  };

  const handleSignInClick = () => {
    closeAndNavigate('/auth');
  };

  const handleSignUpClick = () => {
    closeAndNavigate('/auth?mode=signup');
  };

  const handleLinkClick = (href: string) => {
    if (href.startsWith('#')) {
      const element = document.querySelector(href);
      element?.scrollIntoView({ behavior: 'smooth' });
    }
    setIsOpen(false);
  };

  const guestActions = (layout: 'desktop' | 'mobile') => {
    const fullWidth = layout === 'mobile';
    const suffix = layout === 'mobile' ? '-mobile' : '';
    return (
      <>
        <LandingButton
          type="button"
          variant="secondary"
          fullWidth={fullWidth}
          onClick={handleSignInClick}
          data-testid={`landing-signin-button${suffix}`}
        >
          Sign In
        </LandingButton>
        <LandingButton
          type="button"
          variant="ghost"
          fullWidth={fullWidth}
          onClick={handleSignUpClick}
          data-testid={`landing-signup-button${suffix}`}
        >
          Sign Up
        </LandingButton>
        <LandingButton
          type="button"
          variant="primary"
          fullWidth={fullWidth}
          onClick={handleApplyClick}
          data-testid={`landing-apply-now-button${suffix}`}
        >
          Apply Now
        </LandingButton>
      </>
    );
  };

  const signedInActions = (layout: 'desktop' | 'mobile') => {
    const fullWidth = layout === 'mobile';
    const suffix = layout === 'mobile' ? '-mobile' : '';
    return (
      <>
        <LandingButton
          type="button"
          variant="secondary"
          fullWidth={fullWidth}
          onClick={() => closeAndNavigate(homeRoute)}
          data-testid={`landing-dashboard-button${suffix}`}
        >
          {homeLabel}
        </LandingButton>
        <SignOutButton
          variant="ghost"
          withIcon={layout === 'desktop'}
          className={cn(
            'font-sans text-[#274F35] hover:bg-[#EEF5EB]',
            fullWidth && 'h-11 w-full justify-center'
          )}
          data-testid={`landing-signout-button${suffix}`}
          onClick={() => setIsOpen(false)}
        />
        <LandingButton
          type="button"
          variant="primary"
          fullWidth={fullWidth}
          onClick={handleApplyClick}
          data-testid={`landing-apply-now-button${suffix}`}
        >
          Apply Now
        </LandingButton>
      </>
    );
  };

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 w-full z-50 px-4 md:px-8 py-4 transition-all duration-300',
        isOpen ? 'bg-[#F7FAF6]' : 'bg-transparent backdrop-blur-sm'
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <button
          type="button"
          onClick={() => closeAndNavigate('/')}
          className="flex items-center gap-2 rounded-lg text-left"
          aria-label="OG Financial Services home"
          data-testid="landing-logo-home"
        >
          <img
            src="/og-financial-logo-v2.svg"
            alt="OG Financial Services"
            className="h-12 w-auto max-w-[190px] object-contain"
          />
        </button>

        <div className="hidden lg:flex items-center gap-8">
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

        <div className="hidden lg:flex items-center gap-3">
          {user ? signedInActions('desktop') : guestActions('desktop')}
        </div>

        <button
          type="button"
          className={cn(
            'lg:hidden flex min-h-11 min-w-11 items-center justify-center rounded-lg transition-colors',
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
            'lg:hidden absolute top-full left-0 w-full p-4 border-b',
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
            {user ? signedInActions('mobile') : guestActions('mobile')}
          </div>
        </div>
      )}
    </nav>
  );
};

export default LandingNavbar;
