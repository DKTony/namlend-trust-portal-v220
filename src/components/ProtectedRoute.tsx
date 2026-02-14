import { ReactNode, useEffect, useRef, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
  requireLoanOfficer?: boolean;
}

export const ProtectedRoute = ({ 
  children, 
  requireAdmin = false, 
  requireLoanOfficer = false 
}: ProtectedRouteProps) => {
  const { user, loading, roleLoading, isAdmin, isLoanOfficer, refreshUser } = useAuth();
  const location = useLocation();
  const requiresRole = requireAdmin || requireLoanOfficer;
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
  if (loading || checkingSession || (requiresRole && roleLoading)) {
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
    const isValidRedirect = safePath.startsWith('/') &&
                            !safePath.startsWith('//') &&
                            !safePath.includes('://');
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
          <p className="text-sm text-muted-foreground">
            Admin privileges required.
          </p>
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
          <p className="text-sm text-muted-foreground">
            Loan officer privileges required.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
