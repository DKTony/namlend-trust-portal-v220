import { ReactNode, useEffect, useRef, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
  requireLoanOfficer?: boolean;
  /** Platform (control-plane) gates — orthogonal to the tenant-role gates above. */
  requirePlatform?: boolean;
  requirePlatformOwner?: boolean;
}

export const ProtectedRoute = ({
  children,
  requireAdmin = false,
  requireLoanOfficer = false,
  requirePlatform = false,
  requirePlatformOwner = false,
}: ProtectedRouteProps) => {
  const {
    user,
    loading,
    roleLoading,
    isAdmin,
    isLoanOfficer,
    isPlatformStaff,
    isPlatformOwner,
    platformRoleLoading,
    refreshUser,
  } = useAuth();
  const location = useLocation();
  const requiresPlatform = requirePlatform || requirePlatformOwner;
  const requiresRole = requireAdmin || requireLoanOfficer || requiresPlatform;
  const [checkingSession, setCheckingSession] = useState(false);
  const checkedSession = useRef(false);

  useEffect(() => {
    if (!user && !loading && !checkedSession.current) {
      checkedSession.current = true;
      setCheckingSession(true);
      refreshUser().finally(() => setCheckingSession(false));
    }
  }, [user, loading, refreshUser]);

  // Show loading spinner while auth state is being determined
  if (
    loading ||
    checkingSession ||
    (requiresRole && roleLoading) ||
    (requiresPlatform && platformRoleLoading)
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to auth if not authenticated
  if (!user) {
    // SECURITY: Validate redirect path to prevent open redirect vulnerabilities
    // Only allow internal paths (starting with /) and not protocol-relative URLs (//)
    const safePath = location.pathname;
    const isValidRedirect =
      safePath.startsWith('/') && !safePath.startsWith('//') && !safePath.includes('://');
    const redirectPath = isValidRedirect ? encodeURIComponent(safePath) : '/dashboard';
    return <Navigate to={`/auth?next=${redirectPath}`} replace />;
  }

  // Check role-based access
  if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-4">
            You don't have permission to access this page.
          </p>
          <p className="text-sm text-muted-foreground">Admin privileges required.</p>
        </div>
      </div>
    );
  }

  if (requireLoanOfficer && !isLoanOfficer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-4">
            You don't have permission to access this page.
          </p>
          <p className="text-sm text-muted-foreground">Loan officer privileges required.</p>
        </div>
      </div>
    );
  }

  // Platform (control-plane) gates. Until the owner runs the Phase-0 seed, no user has a
  // platform role, so `/platform/*` is Access Denied for everyone — production stays inert.
  if (requirePlatform && !isPlatformStaff) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-4">
            You don't have permission to access the platform console.
          </p>
          <p className="text-sm text-muted-foreground">Platform staff privileges required.</p>
        </div>
      </div>
    );
  }

  if (requirePlatformOwner && !isPlatformOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-4">
            You don't have permission to access this page.
          </p>
          <p className="text-sm text-muted-foreground">Platform owner privileges required.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
