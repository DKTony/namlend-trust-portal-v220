import { Shield, Phone, Mail, MapPin, Facebook, Twitter, Instagram } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-accent rounded-md flex items-center justify-center">
                <Shield className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <h3 className="text-xl font-bold">NamLend</h3>
                <p className="text-sm text-primary-foreground/80">NAMFISA Licensed</p>
              </div>
            </div>
            <p className="text-primary-foreground/80 mb-4">
              Providing accessible, transparent, and compliant microlending services 
              to all Namibians.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-accent" />
                <span>NAMFISA License: ML-2024-001</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-accent" />
                <span>FIC Registered</span>
              </div>
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Our Services</h4>
            <ul className="space-y-2 text-primary-foreground/80">
              <li><a href="#" className="block py-2 hover:text-accent transition-smooth">Personal Loans</a></li>
              <li><a href="#" className="block py-2 hover:text-accent transition-smooth">Emergency Loans</a></li>
              <li><a href="#" className="block py-2 hover:text-accent transition-smooth">SME Loans</a></li>
              <li><a href="#" className="block py-2 hover:text-accent transition-smooth">Loan Calculator</a></li>
              <li><a href="#" className="block py-2 hover:text-accent transition-smooth">Financial Education</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Customer Support</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Phone className="w-4 h-4 text-accent" />
                <div>
                  <p className="text-sm font-medium">+264 61 123 456</p>
                  <p className="text-xs text-primary-foreground/60">24/7 Support</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="w-4 h-4 text-accent" />
                <div>
                  <p className="text-sm font-medium">support@namlend.com.na</p>
                  <p className="text-xs text-primary-foreground/60">Email Support</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="w-4 h-4 text-accent" />
                <div>
                  <p className="text-sm font-medium">Windhoek, Namibia</p>
                  <p className="text-xs text-primary-foreground/60">Head Office</p>
                </div>
              </div>
            </div>
          </div>

          {/* Legal & Compliance */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Legal & Compliance</h4>
            <ul className="space-y-2 text-primary-foreground/80 text-sm">
              <li><a href="#" className="block py-2 hover:text-accent transition-smooth">Terms & Conditions</a></li>
              <li><a href="#" className="block py-2 hover:text-accent transition-smooth">Privacy Policy</a></li>
              <li><a href="#" className="block py-2 hover:text-accent transition-smooth">NAMFISA Complaints</a></li>
              <li><a href="#" className="block py-2 hover:text-accent transition-smooth">Responsible Lending</a></li>
              <li><a href="#" className="block py-2 hover:text-accent transition-smooth">Consumer Rights</a></li>
            </ul>
            
            {/* Social Media */}
            <div className="mt-6">
              <h5 className="text-sm font-semibold mb-3">Follow Us</h5>
              <div className="flex space-x-3">
                <a href="#" aria-label="Facebook" className="w-11 h-11 bg-accent rounded-full flex items-center justify-center hover:bg-accent-hover transition-smooth">
                  <Facebook className="w-5 h-5 text-accent-foreground" />
                </a>
                <a href="#" aria-label="Twitter" className="w-11 h-11 bg-accent rounded-full flex items-center justify-center hover:bg-accent-hover transition-smooth">
                  <Twitter className="w-5 h-5 text-accent-foreground" />
                </a>
                <a href="#" aria-label="Instagram" className="w-11 h-11 bg-accent rounded-full flex items-center justify-center hover:bg-accent-hover transition-smooth">
                  <Instagram className="w-5 h-5 text-accent-foreground" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-primary-foreground/20 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-sm text-primary-foreground/60">
              <p>&copy; 2024 NamLend. All rights reserved.</p>
              <p>Licensed microlender regulated by NAMFISA.</p>
            </div>
            
            <div className="text-sm text-primary-foreground/60 text-center md:text-right">
              <p><strong>Representative APR:</strong> up to 32% p.a.</p>
              <p>Rates depend on loan amount, term, and credit assessment.</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;