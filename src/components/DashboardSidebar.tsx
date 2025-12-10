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
  Menu
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
}

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({ 
  activeTab, 
  onTabChange, 
  isOpen, 
  onClose,
  userEmail,
  userRole
}) => {
  const menuItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'loans', label: 'My Loans', icon: CreditCard },
    { id: 'applications', label: 'Applications', icon: FileText },
    { id: 'payments', label: 'Payments', icon: DollarSign },
    { id: 'self-service', label: 'Self Service', icon: Settings },
    { id: 'profile', label: 'Profile', icon: User },
  ];

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
        "fixed lg:static inset-y-0 left-0 z-50 w-72 bg-zinc-950 text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 flex flex-col",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Header */}
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-white shadow-glow">
              N
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">NamLend</h2>
              <p className="text-xs text-zinc-400">Trust Portal</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden text-zinc-400 hover:text-white"
            onClick={onClose}
          >
            <X size={20} />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <p className="px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Menu</p>
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
                    ? "bg-blue-600/10 text-blue-500" 
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-full bg-blue-500" />
                )}
                <Icon size={20} className={cn(
                  isActive ? "text-blue-500" : "text-zinc-500 group-hover:text-zinc-300"
                )} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-3 mb-4 p-2 rounded-lg bg-zinc-900 border border-zinc-800">
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
              <User size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-white">{userEmail}</p>
              <p className="text-xs text-zinc-500 capitalize">{userRole || 'Client'}</p>
            </div>
          </div>
          <SignOutButton className="w-full justify-start text-zinc-400 hover:text-white hover:bg-zinc-800" />
        </div>
      </div>
    </>
  );
};

export default DashboardSidebar;
