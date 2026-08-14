import { ThemedButton } from '@/components/ui/ThemedButton';
import { useAuth } from '@/hooks/useAuth';
import { useEntitlements } from '@/hooks/useEntitlements';
import { getLandingLabel, getLandingRoute } from '@/lib/routing';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NotificationCenter } from './shared/NotificationCenter';
import SignOutButton from './shared/SignOutButton';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, isLoanOfficer, isPlatformStaff } = useAuth();
  const { hasFeature } = useEntitlements();
  const navigate = useNavigate();

  // "My console", not always the client dashboard — staff and platform users were being sent
  // to /dashboard from here regardless of role.
  const roleFlags = { isPlatformStaff, isLoanOfficer };
  const homeRoute = getLandingRoute(roleFlags);
  const homeLabel = getLandingLabel(roleFlags);
  const applicationsEnabled = hasFeature('clientApplications');

  const handleSignIn = () => {
    navigate('/auth');
  };

  const handleApplyNow = () => {
    if (user) {
      navigate(applicationsEnabled ? '/loan-application' : homeRoute);
    } else {
      navigate('/auth');
    }
  };

  // Sign-out is handled by the shared SignOutButton component

  return (
    <header className="bg-background/95 backdrop-blur-sm border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <img
              src="/og-financial-logo-v2.svg"
              alt="OG Financial Services"
              className="h-12 w-auto max-w-[190px] object-contain"
            />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <a href="#loans" className="text-foreground hover:text-accent transition-smooth">
              Loans
            </a>
            <a href="#how-it-works" className="text-foreground hover:text-accent transition-smooth">
              How It Works
            </a>
            <a href="#about" className="text-foreground hover:text-accent transition-smooth">
              About
            </a>
            <a href="#contact" className="text-foreground hover:text-accent transition-smooth">
              Contact
            </a>
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center space-x-3">
            {user ? (
              <>
                <NotificationCenter />
                <ThemedButton
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(homeRoute)}
                  data-testid="dashboard-button-header"
                >
                  {homeLabel}
                </ThemedButton>
                <SignOutButton variant="ghost" size="sm" data-testid="signout-button-header" />
              </>
            ) : (
              <>
                <ThemedButton variant="ghost" size="sm" onClick={handleSignIn}>
                  Sign In
                </ThemedButton>
                <ThemedButton
                  variant="primary"
                  size="sm"
                  onClick={handleApplyNow}
                  data-testid="apply-now-button-header"
                >
                  Apply Now
                </ThemedButton>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex items-center space-x-2">
            <button
              className="h-11 w-11 -m-2 flex items-center justify-center rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle navigation menu"
              aria-expanded={isMenuOpen}
              aria-controls="mobile-menu"
            >
              {isMenuOpen ? (
                <X className="w-6 h-6 text-primary" />
              ) : (
                <Menu className="w-6 h-6 text-primary" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav
            id="mobile-menu"
            aria-label="Mobile navigation"
            className="md:hidden mt-4 py-4 border-t border-border"
          >
            <div className="flex flex-col space-y-4">
              <a
                href="#loans"
                className="block py-3 text-base text-foreground hover:text-accent transition-smooth touch-manipulation"
              >
                Loans
              </a>
              <a
                href="#how-it-works"
                className="block py-3 text-base text-foreground hover:text-accent transition-smooth touch-manipulation"
              >
                How It Works
              </a>
              <a
                href="#about"
                className="block py-3 text-base text-foreground hover:text-accent transition-smooth touch-manipulation"
              >
                About
              </a>
              <a
                href="#contact"
                className="block py-3 text-base text-foreground hover:text-accent transition-smooth touch-manipulation"
              >
                Contact
              </a>
              <div className="flex flex-col space-y-2 pt-4">
                {user ? (
                  <>
                    <ThemedButton
                      variant="ghost"
                      size="lg"
                      className="justify-start h-11"
                      onClick={() => navigate(homeRoute)}
                      data-testid="dashboard-button-mobile"
                    >
                      {homeLabel}
                    </ThemedButton>
                    <SignOutButton
                      variant="ghost"
                      size="lg"
                      className="justify-start h-11"
                      data-testid="signout-button-mobile"
                    />
                  </>
                ) : (
                  <>
                    <ThemedButton
                      variant="ghost"
                      size="lg"
                      className="justify-start h-11"
                      onClick={handleSignIn}
                    >
                      Sign In
                    </ThemedButton>
                    <ThemedButton
                      variant="primary"
                      size="lg"
                      className="justify-start h-11"
                      onClick={handleApplyNow}
                      data-testid="apply-now-button-mobile"
                    >
                      Apply Now
                    </ThemedButton>
                  </>
                )}
              </div>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
