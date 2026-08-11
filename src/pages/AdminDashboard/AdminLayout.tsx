/**
 * Admin Layout
 * Wraps all admin routes with the grouped sidebar, header, and notifications.
 * Replaces the monolithic AdminDashboard tab-based layout.
 */

import { AdaptiveShell } from '@/components/adaptive';
import SystemHealthDashboard from '@/components/dashboards/SystemHealthDashboard';
import { GroupedSidebar } from '@/components/Layout/GroupedSidebar';
import { NotificationBell } from '@/components/shared/ApprovalNotifications';
import { ThemedButton } from '@/components/ui/ThemedButton';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { getAdminNavGroups } from '@/config/adminNav';
import { useTheme } from '@/context/ThemeContext';
import { useAdaptiveLayout } from '@/hooks/useAdaptiveLayout';
import { useAuth } from '@/hooks/useAuth';
import { useEntitlements } from '@/hooks/useEntitlements';
import { buildAuthRedirect, getLandingRoute } from '@/lib/routing';
import { cn } from '@/lib/utils';
import { AlertCircle, BarChart3, RefreshCw } from 'lucide-react';
import React, { useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';

const AdminLayout: React.FC = () => {
  const { user, isAdmin, isLoanOfficer, isPlatformStaff, signOut } = useAuth();
  const { styles } = useTheme();
  const layout = useAdaptiveLayout();
  const navigate = useNavigate();
  const location = useLocation();
  // Tenant entitlements drive backoffice nav filtering — inert until the owner enforces.
  const { enforced, hasFeature } = useEntitlements();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  if (!user) {
    return <Navigate to={buildAuthRedirect(location)} replace />;
  }

  if (!isAdmin && !isLoanOfficer) {
    return (
      <div className={cn('flex items-center justify-center min-h-screen', styles.background)}>
        <ThemedCard className="w-96">
          <div className="flex items-center mb-4">
            <AlertCircle className="h-5 w-5 mr-2 text-red-500" />
            <h3 className={cn('text-lg font-bold', styles.textClass)}>Access Denied</h3>
          </div>
          <p className="text-muted-foreground mb-4">
            You don't have permission to access the admin dashboard.
          </p>
          <ThemedButton
            onClick={() => navigate(getLandingRoute({ isPlatformStaff, isLoanOfficer }))}
            className="w-full"
          >
            Go to my dashboard
          </ThemedButton>
        </ThemedCard>
      </div>
    );
  }

  const navGroups = getAdminNavGroups(isAdmin, { enforced, hasFeature });
  const userName = String(user?.user_metadata?.first_name ?? user?.email?.split('@')[0] ?? 'Admin');
  const userEmail = user?.email;

  const sidebarProps = {
    groups: navGroups,
    userName,
    userEmail,
    onSignOut: signOut,
  };

  const header = (
    <header
      className={cn(
        'border-b px-4 py-3 sm:px-5 flex min-h-16 items-center justify-between gap-3 backdrop-blur-md sticky top-0 z-20',
        layout.isCompact && 'pl-14',
        styles.cardClass,
        'rounded-none border-x-0 border-t-0'
      )}
    >
      <div className="min-w-0">
        <h1 className={cn('truncate text-base font-semibold sm:text-xl', styles.textClass)}>
          Admin Dashboard
        </h1>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <ThemedButton
          variant="secondary"
          className="h-9 px-2 text-xs sm:px-3"
          onClick={() => setRefreshKey((k) => k + 1)}
          aria-label="Refresh admin data"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', !layout.isCompact && 'mr-2')} />
          {!layout.isCompact && 'Refresh'}
        </ThemedButton>
        <ThemedButton
          variant="secondary"
          className="hidden h-9 px-3 text-xs sm:inline-flex"
          aria-label="Reports"
          onClick={() => navigate('/admin/analytics?tab=reports')}
        >
          <BarChart3 className="mr-2 h-3.5 w-3.5" />
          Reports
        </ThemedButton>
        <NotificationBell />
      </div>
    </header>
  );

  return (
    <AdaptiveShell
      className={cn('transition-colors duration-500', styles.background)}
      sidebar={<GroupedSidebar {...sidebarProps} displayMode="sidebar" />}
      rail={<GroupedSidebar {...sidebarProps} displayMode="rail" />}
      mobileNavigation={
        <GroupedSidebar
          {...sidebarProps}
          displayMode="drawer"
          isOpen={sidebarOpen}
          onOpen={() => setSidebarOpen(true)}
          onClose={() => setSidebarOpen(false)}
        />
      }
      header={header}
    >
      {isAdmin && <SystemHealthDashboard key={`health-${refreshKey}`} />}
      <Outlet />
    </AdaptiveShell>
  );
};

export default AdminLayout;
