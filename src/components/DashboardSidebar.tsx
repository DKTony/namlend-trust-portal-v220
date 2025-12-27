import React from 'react';
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
  Wallet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import SignOutButton from './SignOutButton';

interface DashboardSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  userRole?: string;
  menuItems?: { id: string; label: string; icon: any }[];
  title?: string;
  subtitle?: string;
}

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({ 
  activeTab, 
  onTabChange, 
  isOpen, 
  onClose,
  userEmail,
  userRole,
  menuItems: propMenuItems,
  title = "NamLend",
  subtitle = "Trust Portal"
}) => {
  const defaultMenuItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
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
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-sidebar border-r border-sidebar-border text-sidebar-foreground transform transition-transform duration-300 ease-in-out lg:translate-x-0 flex flex-col h-screen lg:sticky lg:top-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Header */}
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center font-bold text-primary-foreground shadow-glow">
              N
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">{title}</h2>
              {subtitle && <p className="text-xs text-sidebar-foreground/60">{subtitle}</p>}
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden text-sidebar-foreground/60 hover:text-sidebar-foreground"
            onClick={onClose}
          >
            <X size={20} />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <p className="px-4 text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider mb-2">Menu</p>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  onClose();
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-full bg-primary" />
                )}
                <Icon size={20} className={cn(
                  isActive ? "text-primary" : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground"
                )} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-sidebar-border bg-sidebar-accent/20">
          <div className="flex items-center gap-3 mb-4 p-2 rounded-lg bg-sidebar-accent/50 border border-sidebar-border">
            <div className="w-10 h-10 rounded-full bg-sidebar-accent flex items-center justify-center text-sidebar-foreground/60">
              <User size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-sidebar-foreground">{userEmail}</p>
              <p className="text-xs text-sidebar-foreground/60 capitalize">{userRole || 'Client'}</p>
            </div>
          </div>
          <SignOutButton className="w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent" />
        </div>
      </div>
    </>
  );
};

export default DashboardSidebar;
