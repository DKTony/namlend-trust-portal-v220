import { ReactNode } from 'react';
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
  const { user, loading, isAdmin, isLoanOfficer } = useAuth();
  const location = useLocation();

  // Show loading spinner while auth state is being determined
  if (loading) {
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
    return <Navigate to={`/auth?next=${location.pathname}`} replace />;
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
