/**
 * Admin Layout
 * Wraps all admin routes with the grouped sidebar, header, and notifications.
 * Replaces the monolithic AdminDashboard tab-based layout.
 */

import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { ThemedButton } from '@/components/ui/ThemedButton';
import { GroupedSidebar } from '@/components/Layout/GroupedSidebar';
import { NotificationBell } from '@/components/shared/ApprovalNotifications';
import SystemHealthDashboard from '@/components/dashboards/SystemHealthDashboard';
import { getAdminNavGroups } from '@/config/adminNav';
import { RefreshCw, BarChart3, AlertCircle } from 'lucide-react';

const AdminLayout: React.FC = () => {
  const { user, isAdmin, isLoanOfficer, signOut } = useAuth();
  const { styles } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  if (!user) {
    return <Navigate to="/auth" replace />;
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
          <ThemedButton onClick={() => (window.location.href = '/dashboard')} className="w-full">
            Go to Client Dashboard
          </ThemedButton>
        </ThemedCard>
      </div>
    );
  }

  const navGroups = getAdminNavGroups(isAdmin);
  const userName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'Admin';
  const userEmail = user?.email;

  return (
    <div className={cn('flex h-screen transition-colors duration-500', styles.background)}>
      <GroupedSidebar
        groups={navGroups}
        userName={userName}
        userEmail={userEmail}
        onSignOut={signOut}
        isOpen={sidebarOpen}
        onOpen={() => setSidebarOpen(true)}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        {/* Header */}
        <header
          className={cn(
            'border-b p-4 flex items-center justify-between pl-14 sm:pl-16 backdrop-blur-md sticky top-0 z-20',
            styles.cardClass,
            'rounded-none border-x-0 border-t-0'
          )}
        >
          <div className="flex items-center gap-2">
            <h1 className={cn('text-xl font-semibold hidden sm:block', styles.textClass)}>
              Admin Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemedButton
              variant="secondary"
              className="h-9 px-3 text-xs"
              onClick={() => setRefreshKey((k) => k + 1)}
            >
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              Refresh
            </ThemedButton>
            <ThemedButton variant="secondary" className="h-9 px-3 text-xs">
              <BarChart3 className="mr-2 h-3.5 w-3.5" />
              Reports
            </ThemedButton>
            <NotificationBell />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {isAdmin && <SystemHealthDashboard key={`health-${refreshKey}`} />}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
