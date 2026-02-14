import React, { useState, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Page } from '../../types';
import { 
  LayoutDashboard, 
  Wallet, 
  CreditCard, 
  FileText, 
  Settings, 
  LogOut, 
  ShieldCheck,
  Menu,
  X,
  PieChart
} from 'lucide-react';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  const { styles } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  
  // State for the hover tilt effect
  const [rotate, setRotate] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!sidebarRef.current) return;
    
    const rect = sidebarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left; // x position within the element.
    const y = e.clientY - rect.top;  // y position within the element.
    
    // Calculate rotation (limit to small degrees for subtle "reverberate" feel)
    const xRotation = ((y - rect.height / 2) / rect.height) * -4; // Rotate X axis based on Y pos
    const yRotation = ((x - rect.width / 2) / rect.width) * 4;   // Rotate Y axis based on X pos
    
    setRotate({ x: xRotation, y: yRotation });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 });
  };

  const menuItems: { icon: React.ReactNode; label: string; id: Page }[] = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', id: 'dashboard' },
    { icon: <PieChart size={20} />, label: 'Budget & Finance', id: 'budget' },
    { icon: <Wallet size={20} />, label: 'Loans', id: 'loans' },
    { icon: <CreditCard size={20} />, label: 'Payments', id: 'payments' },
    { icon: <FileText size={20} />, label: 'Documents', id: 'documents' },
    { icon: <ShieldCheck size={20} />, label: 'Security', id: 'security' },
    { icon: <Settings size={20} />, label: 'Settings', id: 'settings' },
  ];

  const handleNavigation = (page: Page) => {
    onNavigate(page);
    setIsOpen(false);
  };

  return (
    <>
      {/* Menu Burger Trigger (Fixed Top Left, Smaller, Transparent) */}
      <button 
        onClick={() => setIsOpen(true)}
        className={`fixed top-4 left-4 z-[60] w-10 h-10 flex items-center justify-center rounded-full shadow-sm transition-transform hover:scale-105 active:scale-95 backdrop-blur-md border border-white/10 ${styles.variant === 'glass' ? 'bg-white/20 text-white' : 'bg-black/10 dark:bg-white/10 text-inherit'}`}
      >
        <Menu size={20} />
      </button>

      {/* Backdrop Overlay */}
      <div 
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[65] transition-opacity duration-500 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsOpen(false)}
      />

      {/* Sidebar Drawer */}
      <div 
        ref={sidebarRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
           transform: isOpen 
             ? `perspective(1000px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) translateX(0)` 
             : 'translateX(-120%)',
        }}
        className={`
           fixed left-0 top-0 h-screen w-80 p-6 z-[70]
           transition-all duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]
        `}
      >
        <div className={`
            relative flex flex-col h-full rounded-3xl p-6 shadow-2xl overflow-hidden
            ${styles.cardClass}
        `}>
          {/* Internal Glow Effect for Reverberation feel */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-30 pointer-events-none" 
               style={{ transform: `translateX(${rotate.y * 10}px) translateY(${rotate.x * 10}px)` }} 
          />

          {/* Close Button */}
          <button 
            onClick={() => setIsOpen(false)}
            className={`absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 ${styles.textClass}`}
          >
            <X size={20} />
          </button>
          
          {/* Logo Area */}
          <div className="flex items-center gap-3 mb-10 mt-2">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${styles.accentClass}`}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <h1 className={`font-bold text-xl ${styles.textClass}`}>NamLend</h1>
              <p className={`text-xs opacity-60 ${styles.textClass}`}>Trust & Finance</p>
            </div>
          </div>

          {/* Menu */}
          <div className="flex-1 flex flex-col gap-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                className={`
                  flex items-center gap-4 p-4 rounded-xl transition-all duration-300 group relative overflow-hidden
                  ${currentPage === item.id 
                    ? `${styles.accentClass} shadow-md` 
                    : `hover:bg-white/5 ${styles.textClass} opacity-70 hover:opacity-100`
                  }
                `}
              >
                <div className="relative z-10 flex items-center gap-4">
                    {item.icon}
                    <span className="font-medium">{item.label}</span>
                </div>
                {/* Hover shine effect */}
                {currentPage !== item.id && (
                   <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                )}
              </button>
            ))}
          </div>

          {/* User Profile Snippet */}
          <div className={`mt-auto p-4 rounded-2xl flex items-center gap-3 backdrop-blur-md ${styles.variant === 'glass' ? 'bg-white/10' : 'bg-black/5 dark:bg-white/5'}`}>
            <img 
              src="https://picsum.photos/100/100" 
              alt="Profile" 
              className="w-10 h-10 rounded-full border-2 border-white/20"
            />
            <div className="overflow-hidden">
              <p className={`text-sm font-semibold truncate ${styles.textClass}`}>Client User</p>
              <p className={`text-xs opacity-60 truncate ${styles.textClass}`}>client@namlend.com</p>
            </div>
            <button className={`ml-auto p-2 rounded-lg hover:bg-white/10 ${styles.textClass}`}>
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
