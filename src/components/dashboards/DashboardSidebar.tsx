/**
 * Dashboard Sidebar Component
 * NamLend Premium Design System (NPDS) - NextGen
 * Ultra-modern slide-in drawer with refined glassmorphism and fluid animations
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  CreditCard,
  FileText,
  DollarSign,
  User,
  Settings,
  LogOut,
  X,
  ShieldCheck,
  Menu,
  Wallet,
  PieChart,
  ChevronRight,
  Bell,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/context/ThemeContext';
import SignOutButton from '../shared/SignOutButton';

interface DashboardSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
  userEmail?: string;
  userRole?: string;
  menuItems?: { id: string; label: string; icon: React.ComponentType<{ className?: string }> }[];
  title?: string;
  subtitle?: string;
}

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  activeTab,
  onTabChange,
  isOpen,
  onClose,
  onOpen,
  userEmail,
  userRole,
  menuItems: propMenuItems,
  title = 'NamLend',
  subtitle = 'Trust Portal',
}) => {
  const { styles, isDark } = useTheme();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Reset rotation when closed
  useEffect(() => {
    if (!isOpen) {
      setRotate({ x: 0, y: 0 });
    }
  }, [isOpen]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!sidebarRef.current) return;
    const rect = sidebarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Subtle parallax effect
    const xRotation = ((y - rect.height / 2) / rect.height) * -2;
    const yRotation = ((x - rect.width / 2) / rect.width) * 2;

    setRotate({ x: xRotation, y: yRotation });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 });
  };

  const defaultMenuItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'budget', label: 'Budget & Finance', icon: PieChart },
    { id: 'loans', label: 'My Loans', icon: CreditCard },
    { id: 'applications', label: 'Applications', icon: FileText },
    { id: 'payments', label: 'Payments', icon: DollarSign },
    { id: 'banking', label: 'Banking', icon: Wallet },
    { id: 'self-service', label: 'Self Service', icon: Settings },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const menuItems = propMenuItems || defaultMenuItems;

  return (
    <>
      {/* Floating Trigger Button - NextGen Style */}
      <button
        onClick={onOpen}
        className={cn(
          'fixed top-4 left-4 z-[60] w-12 h-12 flex items-center justify-center rounded-2xl shadow-lg transition-all duration-500',
          'hover:scale-110 active:scale-95 border group',
          styles.variant === 'glass'
            ? 'bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20'
            : 'bg-background/80 backdrop-blur-md border-border text-foreground hover:bg-accent',
          isOpen ? 'opacity-0 -translate-x-full' : 'opacity-100 translate-x-0'
        )}
        aria-label="Open Menu"
        data-testid="sidebar-trigger"
      >
        <Menu size={24} className="transition-transform duration-300 group-hover:rotate-180" />
      </button>

      {/* Backdrop with Blur */}
      <div
        className={cn(
          'fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[65] transition-all duration-500',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        data-testid="sidebar-backdrop"
      />

      {/* Sidebar Container */}
      <div
        ref={sidebarRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: isOpen
            ? `perspective(1000px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) translateX(0)`
            : 'translateX(-120%)',
        }}
        className={cn(
          'fixed left-0 top-0 h-screen w-[340px] p-4 z-[70]',
          'transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]'
        )}
        data-testid="sidebar-drawer"
      >
        {/* Main Card */}
        <div
          className={cn(
            'relative flex flex-col h-full rounded-[2.5rem] shadow-2xl overflow-hidden border',
            isDark ? 'border-white/10' : 'border-black/5',
            styles.cardClass
          )}
        >
          {/* Ambient Background Effects */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div
              className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/5 to-transparent opacity-50"
              style={{ transform: `translateX(${rotate.y * 15}px) translateY(${rotate.x * 15}px)` }}
            />
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/20 rounded-full blur-[80px]" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px]" />
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className={cn(
              'absolute top-6 right-6 p-2 rounded-full z-20 transition-all duration-300',
              'hover:bg-white/10 hover:rotate-90 active:scale-95',
              styles.textClass
            )}
            data-testid="sidebar-close"
          >
            <X size={20} />
          </button>

          {/* Header Section */}
          <div className="p-8 pb-4 relative z-10">
            <div className="flex items-center gap-4 mb-8">
              <div
                className={cn(
                  'w-12 h-12 rounded-2xl flex items-center justify-center font-bold shadow-lg ring-1 ring-white/20',
                  styles.accentClass
                )}
              >
                <ShieldCheck size={24} className="text-white" />
              </div>
              <div className="flex flex-col">
                <h2
                  className={cn('text-xl font-bold tracking-tight leading-none', styles.textClass)}
                >
                  {title}
                </h2>
                <p
                  className={cn(
                    'text-xs font-medium opacity-60 mt-1 uppercase tracking-wider',
                    styles.textClass
                  )}
                >
                  {subtitle}
                </p>
              </div>
            </div>

            {/* Search Bar Placeholder (Visual Only) */}
            <div
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-colors',
                isDark ? 'bg-white/5 border border-white/5' : 'bg-black/5 border border-black/5',
                styles.textClass
              )}
            >
              <Search size={16} className="opacity-50" />
              <span className="opacity-50">Quick search...</span>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 px-4 py-2 overflow-y-auto scrollbar-none relative z-10 space-y-1.5">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onMouseEnter={() => setHoveredItem(item.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                  onClick={() => {
                    onTabChange(item.id);
                    onClose();
                  }}
                  className={cn(
                    'w-full flex items-center justify-between px-5 py-3.5 rounded-2xl text-sm font-medium transition-all duration-300 group relative',
                    isActive
                      ? `${styles.accentClass} shadow-lg shadow-primary/20 scale-[1.02]`
                      : `hover:bg-white/5 ${styles.textClass} opacity-70 hover:opacity-100 hover:scale-[1.01]`
                  )}
                  style={{
                    animationDelay: `${index * 50}ms`,
                  }}
                  data-testid={`sidebar-nav-${item.id}`}
                >
                  <div className="flex items-center gap-4 relative z-10">
                    <Icon
                      size={20}
                      className={cn(
                        'transition-transform duration-300',
                        isActive || hoveredItem === item.id ? 'scale-110' : ''
                      )}
                    />
                    <span>{item.label}</span>
                  </div>

                  {isActive && (
                    <ChevronRight
                      size={16}
                      className="relative z-10 animate-in fade-in slide-in-from-left-1"
                    />
                  )}

                  {/* Active/Hover Glows */}
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-2xl" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* User Profile Section */}
          <div
            className={cn(
              'p-5 m-4 mt-2 rounded-3xl relative z-10 border overflow-hidden transition-all duration-300',
              isDark
                ? 'bg-white/5 border-white/5 hover:bg-white/10'
                : 'bg-black/5 border-black/5 hover:bg-black/10'
            )}
          >
            {/* Profile Glow */}
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-primary/20 rounded-full blur-2xl" />

            <div className="flex items-center gap-4 mb-4">
              <div
                className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shadow-inner relative overflow-hidden',
                  styles.accentClass
                )}
              >
                {userEmail?.charAt(0).toUpperCase() || 'U'}
                <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-bold truncate', styles.textClass)}>{userEmail}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className={cn(
                      'inline-block w-2 h-2 rounded-full animate-pulse',
                      userRole === 'admin' ? 'bg-amber-500' : 'bg-emerald-500'
                    )}
                  />
                  <p className={cn('text-xs opacity-60 capitalize font-medium', styles.textClass)}>
                    {userRole === 'admin' ? 'Administrator' : 'Premium Client'}
                  </p>
                </div>
              </div>
            </div>

            <SignOutButton
              className={cn(
                'w-full justify-center rounded-xl py-2.5 text-xs font-semibold uppercase tracking-wider transition-all duration-300',
                styles.textClass,
                'bg-white/5 hover:bg-red-500/10 hover:text-red-500 border border-transparent hover:border-red-500/20'
              )}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default DashboardSidebar;
