import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import ThemedSidebar, { MenuItem } from './ThemedSidebar';
import { NotificationBell } from '@/components/ApprovalNotifications';
import { ThemedButton } from '@/components/ui/ThemedButton';
import { NotificationCenter } from '@/components/NotificationCenter';
import { 
  RefreshCw, 
  BarChart3 
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  variant?: 'client' | 'admin';
  menuItems?: MenuItem[];
  title?: string;
  headerActions?: React.ReactNode;
  showNotifications?: boolean;
  userName?: string;
  userEmail?: string;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  activeTab,
  onTabChange,
  variant = 'client',
  menuItems,
  title,
  headerActions,
  showNotifications = true,
  userName,
  userEmail
}) => {
  const { user, userRole, signOut } = useAuth();
  const { styles } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const displayTitle = title || (variant === 'admin' ? 'Admin Dashboard' : 'Dashboard');
  const finalUserName = userName || user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'User';
  const finalUserEmail = userEmail || user?.email;

  return (
    <div className={cn("flex h-screen transition-colors duration-500", styles.background)}>
      {/* Sidebar */}
      <ThemedSidebar
        currentPage={activeTab}
        onNavigate={onTabChange}
        variant={variant}
        userName={finalUserName}
        userEmail={finalUserEmail}
        onSignOut={signOut}
        menuItems={menuItems}
        isOpen={sidebarOpen}
        onOpen={() => setSidebarOpen(true)}
        onClose={() => setSidebarOpen(false)}
        title={variant === 'admin' ? 'NamLend Admin' : 'NamLend'}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        {/* Header */}
        <header className={cn(
          "border-b p-4 flex items-center justify-between pl-14 sm:pl-16 backdrop-blur-md sticky top-0 z-20", 
          styles.cardClass, 
          "rounded-none border-x-0 border-t-0"
        )}>
          <div className="flex items-center gap-2">
            <h1 className={cn("text-xl font-semibold hidden sm:block", styles.textClass)}>
              {displayTitle}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {headerActions}
            
            {showNotifications && (
              <>
                {variant === 'admin' ? <NotificationBell /> : <NotificationCenter />}
              </>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
