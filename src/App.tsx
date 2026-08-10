import { ThemeBackground } from '@/components/Layout/ThemeBackground';
import { ThemeSwitcher } from '@/components/Layout/ThemeSwitcher';
import ErrorBoundary from '@/components/system/ErrorBoundary';
import { ProtectedRoute } from '@/components/system/ProtectedRoute';
import { ThemeProvider } from '@/components/system/ThemeProvider';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BrandingProvider } from '@/context/BrandingContext';
import { ThemeProvider as EnhancedThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/hooks/useAuth';
import { convex } from '@/integrations/convex/client';
import { buildAuthRedirect } from '@/lib/routing';
import { adminRoutes } from '@/pages/AdminDashboard/adminRoutes';
import { platformRoutes } from '@/pages/PlatformConsole/platformRoutes';
import { ConvexAuthProvider } from '@convex-dev/auth/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConvexProvider, useConvexAuth } from 'convex/react';
import React, { Suspense, useEffect } from 'react';
import { Route, BrowserRouter as Router, Routes, useLocation, useNavigate } from 'react-router-dom';
// Route-level code splitting: pages are loaded on demand
const Index = React.lazy(() => import('@/pages/Index'));
const Auth = React.lazy(() => import('@/pages/Auth'));
const Dashboard = React.lazy(() => import('@/pages/Dashboard'));
const AdminLayout = React.lazy(() => import('@/pages/AdminDashboard/AdminLayout'));
const PlatformLayout = React.lazy(() => import('@/pages/PlatformConsole/PlatformLayout'));
const LoanApplication = React.lazy(() => import('@/pages/LoanApplication'));
const Payment = React.lazy(() => import('@/pages/Payment'));
const LoanDetails = React.lazy(() => import('@/pages/LoanDetails'));
const KYC = React.lazy(() => import('@/pages/KYC'));
const BudgetTracker = React.lazy(() => import('@/pages/BudgetTracker'));
const NotFound = React.lazy(() => import('@/pages/NotFound'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds default
      gcTime: 5 * 60 * 1000, // 5 minutes cache time (formerly cacheTime)
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors (client errors)
        if (error && typeof error === 'object' && 'status' in error) {
          const status = (error as { status: number }).status;
          if (status >= 400 && status < 500) return false;
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false, // Prevent excessive refetches
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false, // Don't retry mutations by default (financial safety)
      onError: (error) => {
        console.error('[Mutation Error]', error);
      },
    },
  },
});

// Redirects to /auth when the Convex session is lost (replaces Supabase listener)
const AuthEventBridge = () => {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const wasAuthenticated = React.useRef(false);

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) {
      wasAuthenticated.current = true;
    } else if (wasAuthenticated.current && location.pathname !== '/auth') {
      // User was signed in but session is now gone → redirect, keeping where they were so
      // signing back in returns them there instead of dumping them on a default console.
      navigate(buildAuthRedirect(location), { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, location]);

  return null;
};

const App = () => (
  <ConvexProvider client={convex}>
    <ConvexAuthProvider client={convex}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
            <EnhancedThemeProvider>
              <BrandingProvider>
                <ThemeBackground />
                <AuthProvider>
                  <TooltipProvider>
                    <Toaster />
                    <Sonner />
                    <Router>
                      <AuthEventBridge />
                      <Suspense
                        fallback={
                          <div className="flex items-center justify-center min-h-screen bg-background">
                            <div className="flex flex-col items-center gap-3">
                              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                              <p className="text-sm text-muted-foreground">Loading...</p>
                            </div>
                          </div>
                        }
                      >
                        <Routes>
                          <Route path="/" element={<Index />} />
                          <Route path="/auth" element={<Auth />} />
                          <Route
                            path="/dashboard"
                            element={
                              <ProtectedRoute>
                                <Dashboard />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/admin"
                            element={
                              <ProtectedRoute requireLoanOfficer>
                                <AdminLayout />
                              </ProtectedRoute>
                            }
                          >
                            {adminRoutes()}
                          </Route>
                          <Route
                            path="/platform"
                            element={
                              <ProtectedRoute requirePlatform>
                                <PlatformLayout />
                              </ProtectedRoute>
                            }
                          >
                            {platformRoutes()}
                          </Route>
                          <Route
                            path="/loan-application"
                            element={
                              <ProtectedRoute>
                                <LoanApplication />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/payment"
                            element={
                              <ProtectedRoute>
                                <Payment />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/loans/:id"
                            element={
                              <ProtectedRoute>
                                <LoanDetails />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/kyc"
                            element={
                              <ProtectedRoute>
                                <KYC />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/budget"
                            element={
                              <ProtectedRoute>
                                <BudgetTracker />
                              </ProtectedRoute>
                            }
                          />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </Suspense>
                      <ThemeSwitcher />
                    </Router>
                  </TooltipProvider>
                </AuthProvider>
              </BrandingProvider>
            </EnhancedThemeProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </ConvexAuthProvider>
  </ConvexProvider>
);

export default App;
