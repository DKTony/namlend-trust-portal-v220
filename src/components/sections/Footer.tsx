import { ThemedButton } from '@/components/ui/ThemedButton';
import { cn } from '@/lib/utils';
import { Facebook, Instagram, Mail, MapPin, Phone, Shield, Twitter } from 'lucide-react';

const Footer = () => {
  return (
    <footer
      className={cn('border-t transition-colors duration-300', 'bg-[#F7FAF6]', 'border-[#DCE8D8]')}
    >
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <img src="/og-financial-mark-v2.svg" alt="" className="h-10 w-10" />
              <div>
                <h3 className={cn('text-xl font-bold', 'font-sans text-[#274F35]')}>
                  OG Financial Services
                </h3>
                <p className="text-sm text-muted-foreground">NAMFISA registered microlender</p>
              </div>
            </div>
            <p className="mb-4 text-muted-foreground">
              Providing accessible, transparent, and compliant microlending services to all
              Namibians.
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-primary" />
                <span>NAMFISA licence: 25/11/2366</span>
              </div>
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className={cn('text-lg font-semibold mb-4', 'font-sans text-[#274F35]')}>
              Our Services
            </h4>
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
            <h4 className={cn('text-lg font-semibold mb-4', 'font-sans text-[#274F35]')}>
              Customer Support
            </h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Phone className="w-4 h-4 text-primary" />
                <div>
                  <p className={cn('text-sm font-medium', 'font-sans text-[#274F35]')}>
                    +264 81 417 4288
                  </p>
                  <p className="text-xs text-muted-foreground">Customer support</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="w-4 h-4 text-primary" />
                <div>
                  <p className={cn('text-sm font-medium', 'font-sans text-[#274F35]')}>
                    finance@mgholdingsptyltd.com
                  </p>
                  <p className="text-xs text-muted-foreground">Email Support</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="w-4 h-4 text-primary" />
                <div>
                  <p className={cn('text-sm font-medium', 'font-sans text-[#274F35]')}>
                    Maerua Mall, Centaurus Road
                  </p>
                  <p className="text-xs text-muted-foreground">Contact office, Windhoek</p>
                </div>
              </div>
            </div>
          </div>

          {/* Legal & Compliance */}
          <div>
            <h4 className={cn('text-lg font-semibold mb-4', 'font-sans text-[#274F35]')}>
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
              <h5 className={cn('text-sm font-semibold mb-3', 'font-sans text-[#274F35]')}>
                Follow Us
              </h5>
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
        <div className={cn('border-t mt-8 pt-8', 'border-[#DCE8D8]')}>
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 text-muted-foreground">
            <div className="text-sm">
              <p>
                &copy; {new Date().getFullYear()} OG Financial Services CC. All rights reserved.
              </p>
              <p>NAMFISA-registered microlender, licence 25/11/2366.</p>
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
