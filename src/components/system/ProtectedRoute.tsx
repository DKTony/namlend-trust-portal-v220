import { useAuth } from '@/hooks/useAuth';
import { buildAuthRedirect, getLandingRoute, type RoleFlags } from '@/lib/routing';
import { Loader2 } from 'lucide-react';
import { ReactNode } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
  requireLoanOfficer?: boolean;
  /** Platform (control-plane) gates — orthogonal to the tenant-role gates above. */
  requirePlatform?: boolean;
  requirePlatformOwner?: boolean;
}

const Centered = ({ children }: { children: ReactNode }) => (
  <div className="min-h-screen flex items-center justify-center">{children}</div>
);

/**
 * Denial screen. Keeps the "Access Denied" heading and copy that the access-boundary E2E
 * asserts on, and adds the way out that was missing — without it a client who follows a
 * stale /admin link has no navigation at all and has to hand-edit the URL.
 */
const AccessDenied = ({ detail, flags }: { detail: string; flags: RoleFlags }) => {
  const navigate = useNavigate();
  const home = getLandingRoute(flags);

  return (
    <Centered>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
        <p className="text-muted-foreground mb-4">You don't have permission to access this page.</p>
        <p className="text-sm text-muted-foreground mb-6">{detail}</p>
        <button
          type="button"
          onClick={() => navigate(home, { replace: true })}
          className="text-sm font-medium text-primary hover:underline"
          data-testid="access-denied-home"
        >
          Go to my dashboard
        </button>
      </div>
    </Centered>
  );
};

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
    profileMissing,
    isAdmin,
    isLoanOfficer,
    isPlatformStaff,
    isPlatformOwner,
    platformRoleLoading,
    signOut,
  } = useAuth();
  const location = useLocation();
  const requiresPlatform = requirePlatform || requirePlatformOwner;
  const requiresRole = requireAdmin || requireLoanOfficer || requiresPlatform;
  const flags: RoleFlags = { isPlatformStaff, isLoanOfficer };

  // `loading` now covers the profile query too, so we no longer fall through to the
  // unauthenticated branch during the window where the session is live but `getMyProfile`
  // has not answered — that window was sending every hard page load through /auth?next=.
  if (loading || (requiresRole && roleLoading) || (requiresPlatform && platformRoleLoading)) {
    return (
      <Centered>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </Centered>
    );
  }

  // Authenticated, but the profile row is genuinely absent. Redirecting to /auth would loop
  // forever (the session is valid, so /auth would bounce straight back), so stop here.
  if (profileMissing) {
    return (
      <Centered>
        <div className="text-center max-w-md px-4">
          <h1 className="text-2xl font-bold mb-4">We couldn't load your profile</h1>
          <p className="text-muted-foreground mb-6">
            Your account is signed in but has no profile record. Try again, or sign out and back in.
            If this persists, contact support.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="text-sm font-medium text-primary hover:underline"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => void signOut()}
              className="text-sm font-medium text-muted-foreground hover:underline"
            >
              Sign out
            </button>
          </div>
        </div>
      </Centered>
    );
  }

  // Redirect to auth if not authenticated. `buildAuthRedirect` validates the path (no open
  // redirects) and keeps the query string and hash so deep links survive the round trip.
  if (!user) {
    return <Navigate to={buildAuthRedirect(location)} replace />;
  }

  // Check role-based access
  if (requireAdmin && !isAdmin) {
    return <AccessDenied detail="Admin privileges required." flags={flags} />;
  }

  if (requireLoanOfficer && !isLoanOfficer) {
    return <AccessDenied detail="Loan officer privileges required." flags={flags} />;
  }

  // Platform (control-plane) gates. Until the owner runs the Phase-0 seed, no user has a
  // platform role, so `/platform/*` is Access Denied for everyone — production stays inert.
  if (requirePlatform && !isPlatformStaff) {
    return <AccessDenied detail="Platform staff privileges required." flags={flags} />;
  }

  if (requirePlatformOwner && !isPlatformOwner) {
    return <AccessDenied detail="Platform owner privileges required." flags={flags} />;
  }

  return <>{children}</>;
};
