import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import Button from './ui/Button';
import { Shield, Menu, X } from 'lucide-react';

const Navbar: React.FC = () => {
  const { styles, theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { name: 'Loans', href: '#' },
    { name: 'How It Works', href: '#' },
    { name: 'About', href: '#' },
    { name: 'Contact', href: '#' },
  ];

  return (
    <nav className={`fixed top-0 left-0 w-full z-50 px-4 md:px-8 py-4 transition-all duration-300 ${isOpen ? styles.background : 'bg-transparent backdrop-blur-sm'}`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${theme === 'neo' ? 'bg-[#8b5cf6] border-2 border-black' : theme === 'lux' ? 'bg-amber-600' : 'bg-blue-600'}`}>
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className={`text-xl font-bold ${styles.textClass}`}>NamLend</h1>
            <p className={`text-[10px] uppercase tracking-wider opacity-70 ${styles.textClass}`}>NAMFISA Licensed</p>
          </div>
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a 
              key={link.name} 
              href={link.href} 
              className={`text-sm font-medium hover:opacity-70 transition-opacity ${styles.textClass}`}
            >
              {link.name}
            </a>
          ))}
        </div>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-4">
          <button className={`text-sm font-medium hover:opacity-70 ${styles.textClass}`}>Sign In</button>
          <Button variant="primary">Apply Now</Button>
        </div>

        {/* Mobile Toggle */}
        <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X className={styles.textClass} /> : <Menu className={styles.textClass} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className={`md:hidden absolute top-full left-0 w-full p-4 border-b ${styles.background} ${styles.borderClass}`}>
          <div className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <a key={link.name} href={link.href} className={`block py-2 font-medium ${styles.textClass}`}>
                {link.name}
              </a>
            ))}
            <hr className={styles.borderClass} />
            <Button fullWidth>Apply Now</Button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;