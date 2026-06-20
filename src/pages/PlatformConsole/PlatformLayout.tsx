/**
 * Platform Console Layout — the application-owner shell, parallel to AdminLayout.
 *
 * Reachable only by platform staff (the route is wrapped in <ProtectedRoute requirePlatform>),
 * so until the owner runs the Phase-0 seed this whole tree is inaccessible and production is
 * unaffected. Reuses the same AdaptiveShell + GroupedSidebar primitives as the backoffice; the
 * difference is the nav source (platformNav) and the absence of tenant-scoped chrome.
 */

import { GroupedSidebar } from '@/components/Layout/GroupedSidebar';
import { AdaptiveShell } from '@/components/adaptive';
import { useTheme } from '@/context/ThemeContext';
import { useAdaptiveLayout } from '@/hooks/useAdaptiveLayout';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { ShieldCheck } from 'lucide-react';
import React, { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { getPlatformNavGroups } from './platformNav';

const PlatformLayout: React.FC = () => {
  const { user, isPlatformOwner, isPlatformStaff, signOut } = useAuth();
  const { styles } = useTheme();
  const layout = useAdaptiveLayout();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Defense in depth — the route guard already enforces this, but never render the owner
  // console for a non-platform identity even if mounted directly.
  if (!user || !isPlatformStaff) {
    return <Navigate to="/dashboard" replace />;
  }

  const navGroups = getPlatformNavGroups(isPlatformOwner);
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Platform';
  const userEmail = user?.email;

  const sidebarProps = {
    groups: navGroups,
    userName,
    userEmail,
    onSignOut: signOut,
  };

  const header = (
    <header
      data-testid="platform-console-shell"
      className={cn(
        'border-b px-4 py-3 sm:px-5 flex min-h-16 items-center justify-between gap-3 backdrop-blur-md sticky top-0 z-20',
        layout.isCompact && 'pl-14',
        styles.cardClass,
        'rounded-none border-x-0 border-t-0'
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0">
          <h1 className={cn('truncate text-base font-semibold sm:text-xl', styles.textClass)}>
            Platform Console
          </h1>
          <p className="truncate text-xs text-muted-foreground">
            {isPlatformOwner ? 'Application owner' : 'Platform support'}
          </p>
        </div>
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
      <Outlet />
    </AdaptiveShell>
  );
};

export default PlatformLayout;
