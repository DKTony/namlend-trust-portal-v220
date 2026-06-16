import { ThemedButton } from '@/components/ui/ThemedButton';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { Facebook, Instagram, Mail, MapPin, Phone, Shield, Twitter } from 'lucide-react';

const Footer = () => {
  const { styles } = useTheme();

  return (
    <footer
      className={cn(
        'border-t transition-colors duration-300',
        styles.background,
        styles.borderClass
      )}
    >
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className={cn('text-xl font-bold', styles.textClass)}>NamLend</h3>
                <p className="text-sm text-muted-foreground">NAMFISA Licensed</p>
              </div>
            </div>
            <p className="mb-4 text-muted-foreground">
              Providing accessible, transparent, and compliant microlending services to all
              Namibians.
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-primary" />
                <span>NAMFISA License: ML-2024-001</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-primary" />
                <span>FIC Registered</span>
              </div>
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className={cn('text-lg font-semibold mb-4', styles.textClass)}>Our Services</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="#"
                  className="block py-2 text-muted-foreground hover:text-primary transition-smooth"
                >
                  Personal Loans
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="block py-2 text-muted-foreground hover:text-primary transition-smooth"
                >
                  Emergency Loans
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="block py-2 text-muted-foreground hover:text-primary transition-smooth"
                >
                  SME Loans
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="block py-2 text-muted-foreground hover:text-primary transition-smooth"
                >
                  Loan Calculator
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="block py-2 text-muted-foreground hover:text-primary transition-smooth"
                >
                  Financial Education
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className={cn('text-lg font-semibold mb-4', styles.textClass)}>Customer Support</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Phone className="w-4 h-4 text-primary" />
                <div>
                  <p className={cn('text-sm font-medium', styles.textClass)}>+264 61 123 456</p>
                  <p className="text-xs text-muted-foreground">24/7 Support</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="w-4 h-4 text-primary" />
                <div>
                  <p className={cn('text-sm font-medium', styles.textClass)}>
                    support@namlend.com.na
                  </p>
                  <p className="text-xs text-muted-foreground">Email Support</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="w-4 h-4 text-primary" />
                <div>
                  <p className={cn('text-sm font-medium', styles.textClass)}>Windhoek, Namibia</p>
                  <p className="text-xs text-muted-foreground">Head Office</p>
                </div>
              </div>
            </div>
          </div>

          {/* Legal & Compliance */}
          <div>
            <h4 className={cn('text-lg font-semibold mb-4', styles.textClass)}>
              Legal & Compliance
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="#"
                  className="block py-2 text-muted-foreground hover:text-primary transition-smooth"
                >
                  Terms & Conditions
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="block py-2 text-muted-foreground hover:text-primary transition-smooth"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="block py-2 text-muted-foreground hover:text-primary transition-smooth"
                >
                  NAMFISA Complaints
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="block py-2 text-muted-foreground hover:text-primary transition-smooth"
                >
                  Responsible Lending
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="block py-2 text-muted-foreground hover:text-primary transition-smooth"
                >
                  Consumer Rights
                </a>
              </li>
            </ul>

            {/* Social Media */}
            <div className="mt-6">
              <h5 className={cn('text-sm font-semibold mb-3', styles.textClass)}>Follow Us</h5>
              <div className="flex space-x-3">
                <ThemedButton
                  variant="secondary"
                  size="icon"
                  className="rounded-full"
                  aria-label="Facebook"
                >
                  <Facebook className="w-5 h-5" />
                </ThemedButton>
                <ThemedButton
                  variant="secondary"
                  size="icon"
                  className="rounded-full"
                  aria-label="Twitter"
                >
                  <Twitter className="w-5 h-5" />
                </ThemedButton>
                <ThemedButton
                  variant="secondary"
                  size="icon"
                  className="rounded-full"
                  aria-label="Instagram"
                >
                  <Instagram className="w-5 h-5" />
                </ThemedButton>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className={cn('border-t mt-8 pt-8', styles.borderClass)}>
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 text-muted-foreground">
            <div className="text-sm">
              <p>&copy; 2024 NamLend. All rights reserved.</p>
              <p>Licensed microlender regulated by NAMFISA.</p>
            </div>

            <div className="text-sm text-center md:text-right">
              <p>
                <strong>Representative APR:</strong> up to 32% p.a.
              </p>
              <p>Rates depend on loan amount, term, and credit assessment.</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
