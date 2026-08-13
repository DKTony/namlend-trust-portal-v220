import { ProfileCompletionGate } from '@/components/system/ProfileCompletionGate';
import { useAuth } from '@/hooks/useAuth';
import { buildAuthRedirect, getLandingRoute, type RoleFlags } from '@/lib/routing';
import { Loader2 } from 'lucide-react';
import { ReactNode } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: ReactNode;
  /** Client portal routes are reserved for the tenant `client` role. */
  requireClient?: boolean;
  requireAdmin?: boolean;
  requireLoanOfficer?: boolean;
  /** Platform (control-plane) gates — orthogonal to the tenant-role gates above. */
  requirePlatform?: boolean;
  requirePlatformOwner?: boolean;
}

const Centered = ({ children }: { children: ReactNode }) => (
  <div className="min-h-screen flex items-center justify-center">{children}</div>
);

const AccessDenied = ({ detail, flags }: { detail: string; flags: RoleFlags }) => {
  const navigate = useNavigate();

  return (
    <Centered>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
        <p className="text-muted-foreground mb-4">You don't have permission to access this page.</p>
        <p className="text-sm text-muted-foreground mb-6">{detail}</p>
        <button
          type="button"
          onClick={() => navigate(getLandingRoute(flags), { replace: true })}
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
  requireClient = false,
  requireAdmin = false,
  requireLoanOfficer = false,
  requirePlatform = false,
  requirePlatformOwner = false,
}: ProtectedRouteProps) => {
  const {
    user,
    loading,
    isAuthenticated,
    profileMissing,
    roleLoading,
    userRole,
    isAdmin,
    isLoanOfficer,
    isPlatformStaff,
    isPlatformOwner,
    platformRoleLoading,
    signOut,
  } = useAuth();
  const location = useLocation();
  const requiresPlatform = requirePlatform || requirePlatformOwner;
  const requiresRole = requireClient || requireAdmin || requireLoanOfficer || requiresPlatform;
  const flags: RoleFlags = { isPlatformStaff, isLoanOfficer };

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

  // A valid session without a profile must not be redirected into an auth loop. The
  // enrollment self-heal is already running in useAuth; retry and sign-out remain available.
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

  if (!user && !isAuthenticated) {
    return <Navigate to={buildAuthRedirect(location)} replace />;
  }

  // An authenticated profile can briefly be absent while the enrollment self-heal commits.
  if (!user) {
    return (
      <Centered>
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Finishing your account setup…</p>
        </div>
      </Centered>
    );
  }

  if (requireAdmin && !isAdmin) {
    return <AccessDenied detail="Admin privileges required." flags={flags} />;
  }
  if (requireClient && userRole !== 'client') {
    return <AccessDenied detail="Client privileges required." flags={flags} />;
  }
  if (requireLoanOfficer && !isLoanOfficer) {
    return <AccessDenied detail="Loan officer privileges required." flags={flags} />;
  }
  if (requirePlatform && !isPlatformStaff) {
    return <AccessDenied detail="Platform staff privileges required." flags={flags} />;
  }
  if (requirePlatformOwner && !isPlatformOwner) {
    return <AccessDenied detail="Platform owner privileges required." flags={flags} />;
  }

  return <ProfileCompletionGate>{children}</ProfileCompletionGate>;
};
