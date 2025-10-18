import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, Shield, Phone, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { NotificationBell } from "./ApprovalNotifications";
import SignOutButton from "./SignOutButton";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, userRole, signOut } = useAuth();
  const navigate = useNavigate();
  
  const isAdmin = userRole === 'admin';

  const handleSignIn = () => {
    navigate('/auth');
  };

  const handleApplyNow = () => {
    if (user) {
      navigate('/loan-application');
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
            <div className="w-8 h-8 bg-gradient-primary rounded-md flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary">NamLend</h1>
              <p className="text-xs text-muted-foreground">NAMFISA Licensed</p>
            </div>
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
                <NotificationBell />
                <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} data-testid="dashboard-button-header">
                  Dashboard
                </Button>
                <SignOutButton variant="ghost" size="sm" data-testid="signout-button-header" />
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={handleSignIn}>
                  Sign In
                </Button>
                <Button variant="accent" size="sm" onClick={handleApplyNow} data-testid="apply-now-button-header">
                  Apply Now
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden h-11 w-11 -m-2 flex items-center justify-center rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
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

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav id="mobile-menu" aria-label="Mobile navigation" className="md:hidden mt-4 py-4 border-t border-border">
            <div className="flex flex-col space-y-4">
              <a href="#loans" className="block py-3 text-base text-foreground hover:text-accent transition-smooth touch-manipulation">
                Loans
              </a>
              <a href="#how-it-works" className="block py-3 text-base text-foreground hover:text-accent transition-smooth touch-manipulation">
                How It Works
              </a>
              <a href="#about" className="block py-3 text-base text-foreground hover:text-accent transition-smooth touch-manipulation">
                About
              </a>
              <a href="#contact" className="block py-3 text-base text-foreground hover:text-accent transition-smooth touch-manipulation">
                Contact
              </a>
              <div className="flex flex-col space-y-2 pt-4">
                {user ? (
                  <>
                    <Button variant="ghost" size="lg" className="justify-start h-11" onClick={() => navigate('/dashboard')} data-testid="dashboard-button-mobile">
                      Dashboard
                    </Button>
                    <SignOutButton variant="ghost" size="lg" className="justify-start h-11" data-testid="signout-button-mobile" />
                  </>
                ) : (
                  <>
                    <Button variant="ghost" size="lg" className="justify-start h-11" onClick={handleSignIn}>
                      Sign In
                    </Button>
                    <Button variant="accent" size="lg" className="justify-start h-11" onClick={handleApplyNow} data-testid="apply-now-button-mobile">
                      Apply Now
                    </Button>
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