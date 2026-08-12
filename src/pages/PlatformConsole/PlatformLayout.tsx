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
import { useAdaptiveLayout } from '@/hooks/useAdaptiveLayout';
import { useAuth } from '@/hooks/useAuth';
import { getLandingRoute } from '@/lib/routing';
import { cn } from '@/lib/utils';
import { ShieldCheck } from 'lucide-react';
import React, { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { getPlatformNavGroups } from './platformNav';

const PlatformLayout: React.FC = () => {
  const { user, isPlatformOwner, isPlatformStaff, isLoanOfficer, signOut } = useAuth();
  const layout = useAdaptiveLayout();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Defense in depth — the route guard already enforces this, but never render the owner
  // console for a non-platform identity even if mounted directly.
  if (!user || !isPlatformStaff) {
    // Send them to their own console rather than always /dashboard — a tenant admin who lands
    // here belongs in /admin, not the client dashboard.
    return <Navigate to={getLandingRoute({ isPlatformStaff, isLoanOfficer })} replace />;
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
        'rounded-2xl border border-[#DCE8D8] bg-white shadow-[0_12px_32px_rgba(39,79,53,0.06)]',
        'rounded-none border-x-0 border-t-0'
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0">
          <h1
            className={cn(
              'truncate text-base font-semibold sm:text-xl',
              'font-sans text-[#274F35]'
            )}
          >
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
      className={cn('transition-colors duration-500', 'bg-[#F7FAF6]')}
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
