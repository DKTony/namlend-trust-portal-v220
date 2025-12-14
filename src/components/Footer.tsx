import { Shield, Phone, Mail, MapPin, Facebook, Twitter, Instagram } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-zinc-950 text-zinc-400 border-t border-zinc-900">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">NamLend</h3>
                <p className="text-sm">NAMFISA Licensed</p>
              </div>
            </div>
            <p className="mb-4">
              Providing accessible, transparent, and compliant microlending services 
              to all Namibians.
            </p>
            <div className="space-y-2 text-sm">
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
            <h4 className="text-lg font-semibold text-white mb-4">Our Services</h4>
            <ul className="space-y-2">
              <li><a href="#" className="block py-2 hover:text-white transition-smooth">Personal Loans</a></li>
              <li><a href="#" className="block py-2 hover:text-white transition-smooth">Emergency Loans</a></li>
              <li><a href="#" className="block py-2 hover:text-white transition-smooth">SME Loans</a></li>
              <li><a href="#" className="block py-2 hover:text-white transition-smooth">Loan Calculator</a></li>
              <li><a href="#" className="block py-2 hover:text-white transition-smooth">Financial Education</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-4">Customer Support</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Phone className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-sm font-medium text-zinc-300">+264 61 123 456</p>
                  <p className="text-xs">24/7 Support</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-sm font-medium text-zinc-300">support@namlend.com.na</p>
                  <p className="text-xs">Email Support</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-sm font-medium text-zinc-300">Windhoek, Namibia</p>
                  <p className="text-xs">Head Office</p>
                </div>
              </div>
            </div>
          </div>

          {/* Legal & Compliance */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-4">Legal & Compliance</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="block py-2 hover:text-white transition-smooth">Terms & Conditions</a></li>
              <li><a href="#" className="block py-2 hover:text-white transition-smooth">Privacy Policy</a></li>
              <li><a href="#" className="block py-2 hover:text-white transition-smooth">NAMFISA Complaints</a></li>
              <li><a href="#" className="block py-2 hover:text-white transition-smooth">Responsible Lending</a></li>
              <li><a href="#" className="block py-2 hover:text-white transition-smooth">Consumer Rights</a></li>
            </ul>
            
            {/* Social Media */}
            <div className="mt-6">
              <h5 className="text-sm font-semibold text-white mb-3">Follow Us</h5>
              <div className="flex space-x-3">
                <a href="#" aria-label="Facebook" className="w-11 h-11 bg-zinc-900 rounded-full flex items-center justify-center hover:bg-zinc-800 transition-smooth">
                  <Facebook className="w-5 h-5 text-zinc-400" />
                </a>
                <a href="#" aria-label="Twitter" className="w-11 h-11 bg-zinc-900 rounded-full flex items-center justify-center hover:bg-zinc-800 transition-smooth">
                  <Twitter className="w-5 h-5 text-zinc-400" />
                </a>
                <a href="#" aria-label="Instagram" className="w-11 h-11 bg-zinc-900 rounded-full flex items-center justify-center hover:bg-zinc-800 transition-smooth">
                  <Instagram className="w-5 h-5 text-zinc-400" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-zinc-900 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-sm">
              <p>&copy; 2024 NamLend. All rights reserved.</p>
              <p>Licensed microlender regulated by NAMFISA.</p>
            </div>
            
            <div className="text-sm text-center md:text-right">
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