import React, { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ErrorBoundary from "@/components/ErrorBoundary";
import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import LoanApplication from "@/pages/LoanApplication";
import Payment from "@/pages/Payment";
import LoanDetails from "@/pages/LoanDetails";
import KYC from "@/pages/KYC";
import BudgetTracker from "@/pages/BudgetTracker";
import NotFound from "@/pages/NotFound";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { supabase } from "@/integrations/supabase/client";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeProvider as EnhancedThemeProvider } from "@/context/ThemeContext";
import { BrandingProvider } from "@/context/BrandingContext";
import { ThemeSwitcher } from "@/components/Layout/ThemeSwitcher";
import { ThemeBackground } from "@/components/Layout/ThemeBackground";

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

// Listens for auth events and ensures redirect to /auth on SIGNED_OUT
const AuthEventBridge = () => {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        let hasPersistedSession = false;
        try {
          hasPersistedSession = !!window.localStorage.getItem('namlend-auth');
        } catch {}

        if (hasPersistedSession) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            return;
          }
        }

        if (location.pathname !== '/auth') {
          navigate('/auth', { replace: true });
        }
      }
    });
    return () => subscription?.unsubscribe();
  }, [navigate, location.pathname]);
  return null;
};

const App = () => (
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
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/*" element={
                    <ProtectedRoute requireAdmin>
                      <AdminDashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/loan-application" element={
                    <ProtectedRoute>
                      <LoanApplication />
                    </ProtectedRoute>
                  } />
                  <Route path="/payment" element={
                    <ProtectedRoute>
                      <Payment />
                    </ProtectedRoute>
                  } />
                  <Route path="/loans/:id" element={
                    <ProtectedRoute>
                      <LoanDetails />
                    </ProtectedRoute>
                  } />
                  <Route path="/kyc" element={
                    <ProtectedRoute>
                      <KYC />
                    </ProtectedRoute>
                  } />
                  <Route path="/budget" element={
                    <ProtectedRoute>
                      <BudgetTracker />
                    </ProtectedRoute>
                  } />
                  <Route path="*" element={<NotFound />} />
                </Routes>
                <ThemeSwitcher />
              </Router>
            </TooltipProvider>
          </AuthProvider>
          </BrandingProvider>
        </EnhancedThemeProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
