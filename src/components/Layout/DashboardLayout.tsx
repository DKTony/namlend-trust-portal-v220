import { AdaptiveShell } from '@/components/adaptive';
import { NotificationBell } from '@/components/shared/ApprovalNotifications';
import { NotificationCenter } from '@/components/shared/NotificationCenter';
import { useAdaptiveLayout } from '@/hooks/useAdaptiveLayout';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { CreditCard, FileText, LayoutDashboard, User, Wallet } from 'lucide-react';
import React, { useState } from 'react';
import ThemedSidebar, { MenuItem } from './ThemedSidebar';

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
  userEmail,
}) => {
  const { user, signOut } = useAuth();
  const layout = useAdaptiveLayout();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const displayTitle = title || (variant === 'admin' ? 'Admin Dashboard' : 'Dashboard');
  const finalUserName =
    userName || String(user?.user_metadata?.first_name ?? user?.email?.split('@')[0] ?? 'User');
  const finalUserEmail = userEmail || user?.email;

  const fallbackClientMenuItems: MenuItem[] = [
    { icon: LayoutDashboard, label: 'Overview', id: 'dashboard' },
    { icon: Wallet, label: 'Loans', id: 'loans' },
    { icon: FileText, label: 'Apply', id: 'applications' },
    { icon: CreditCard, label: 'Payments', id: 'payments' },
    { icon: User, label: 'Profile', id: 'profile' },
  ];
  const navItems = menuItems || fallbackClientMenuItems;
  const bottomItems = navItems.filter((item) =>
    ['dashboard', 'overview', 'loans', 'applications', 'payments', 'profile'].includes(item.id)
  );
  const isActive = (id: string) =>
    activeTab === id || (activeTab === 'overview' && id === 'dashboard');

  const sidebarProps = {
    currentPage: activeTab,
    onNavigate: onTabChange,
    variant,
    userName: finalUserName,
    userEmail: finalUserEmail,
    onSignOut: signOut,
    menuItems,
    title: variant === 'admin' ? 'OG Financial Services Admin' : 'OG Financial Services',
  };

  const header = (
    <header
      className={cn(
        'border-b px-4 py-3 sm:px-5 flex min-h-16 items-center justify-between gap-3 backdrop-blur-md sticky top-0 z-20',
        layout.isCompact && 'pl-14',
        'rounded-2xl border border-[#DCE8D8] bg-white shadow-[0_12px_32px_rgba(39,79,53,0.06)]',
        'rounded-none border-x-0 border-t-0'
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <h1
          className={cn('truncate text-base font-semibold sm:text-xl', 'font-sans text-[#274F35]')}
        >
          {displayTitle}
        </h1>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {headerActions}
        {showNotifications && (
          <>{variant === 'admin' ? <NotificationBell /> : <NotificationCenter />}</>
        )}
      </div>
    </header>
  );

  // In constrained landscape (short viewport, wider than tall) the bottom nav
  // would eat ~84px of a ~375px-tall screen — hide it; the drawer stays
  // available. Passing undefined also drops AdaptiveShell's bottom padding.
  const hideBottomNav = layout.height < 500 && layout.width > layout.height;

  const bottomNavigation =
    variant === 'client' && !hideBottomNav ? (
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/95 px-2 pb-safe pt-2 backdrop-blur-xl md:hidden">
        <div
          className="mx-auto grid max-w-md gap-1"
          style={{
            gridTemplateColumns: `repeat(${Math.min(bottomItems.length, 5)}, minmax(0, 1fr))`,
          }}
        >
          {bottomItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const active = isActive(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-medium transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="h-4 w-4" />
                <span className="max-w-full truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    ) : undefined;

  return (
    <AdaptiveShell
      className={cn('transition-colors duration-500', 'bg-[#F7FAF6]')}
      sidebar={<ThemedSidebar {...sidebarProps} displayMode="sidebar" />}
      rail={<ThemedSidebar {...sidebarProps} displayMode="rail" />}
      mobileNavigation={
        <ThemedSidebar
          {...sidebarProps}
          displayMode="drawer"
          isOpen={sidebarOpen}
          onOpen={() => setSidebarOpen(true)}
          onClose={() => setSidebarOpen(false)}
        />
      }
      header={header}
      bottomNavigation={bottomNavigation}
    >
      {children}
    </AdaptiveShell>
  );
};

export default DashboardLayout;
