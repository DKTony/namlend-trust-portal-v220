/**
 * Platform Console route definitions (nested under /platform, lazy-loaded).
 *
 * The whole subtree is gated once at the mount point (<ProtectedRoute requirePlatform>), so
 * these routes carry no per-route guard. Tenant/Guardrails/Infra REUSE the same dashboard
 * components the backoffice loads — Phase 3 is a structural split, not a rebuild — while
 * Overview/Plans/Entitlements/Support are platform-only pages.
 */

import ConvexErrorBoundary from '@/components/system/ConvexErrorBoundary';
import { ProtectedRoute } from '@/components/system/ProtectedRoute';
import React, { Suspense } from 'react';
import { Navigate, Route } from 'react-router-dom';

// Platform-only pages
const PlatformOverview = React.lazy(() => import('./pages/PlatformOverview'));
const TenantsView = React.lazy(() => import('./pages/TenantsView'));
const TenantOverviewPage = React.lazy(() => import('./pages/TenantOverviewPage'));
const TenantInfoPage = React.lazy(() => import('../TenantInfo/TenantInfoPage'));
const PlansView = React.lazy(() => import('./pages/PlansView'));
const EntitlementsView = React.lazy(() => import('./pages/EntitlementsView'));
const PlatformSupport = React.lazy(() => import('./pages/PlatformSupport'));

// Reused backoffice dashboards (same components, mounted in the owner console)
const BusinessRulesDashboard = React.lazy(
  () => import('../AdminDashboard/components/BusinessRules/BusinessRulesDashboard')
);
const LedgerDashboard = React.lazy(
  () => import('../AdminDashboard/components/TigerBeetle/LedgerDashboard')
);
const TigerBeetleConfig = React.lazy(
  () => import('../AdminDashboard/components/Settings/TigerBeetleConfig')
);
const SettlementConfig = React.lazy(
  () => import('../AdminDashboard/components/Settings/SettlementConfig')
);
const PaymentRailsDashboard = React.lazy(
  () => import('../AdminDashboard/components/PaymentRails/PaymentRailsDashboard')
);

function PageSuspense({ children }: { children: React.ReactNode }) {
  return (
    <ConvexErrorBoundary>
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          </div>
        }
      >
        {children}
      </Suspense>
    </ConvexErrorBoundary>
  );
}

export function platformRoutes() {
  return (
    <>
      <Route index element={<Navigate to="/platform/overview" replace />} />

      <Route
        path="overview"
        element={
          <PageSuspense>
            <PlatformOverview />
          </PageSuspense>
        }
      />
      <Route
        path="tenants"
        element={
          <PageSuspense>
            <TenantsView />
          </PageSuspense>
        }
      />
      <Route
        path="tenants/:institutionId"
        element={
          <ProtectedRoute requirePlatformOwner>
            <PageSuspense>
              <TenantOverviewPage />
            </PageSuspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="tenants/:institutionId/info"
        element={
          <ProtectedRoute requirePlatformOwner>
            <PageSuspense>
              <TenantInfoPage />
            </PageSuspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="plans"
        element={
          <PageSuspense>
            <PlansView />
          </PageSuspense>
        }
      />
      <Route
        path="entitlements"
        element={
          <PageSuspense>
            <EntitlementsView />
          </PageSuspense>
        }
      />
      <Route
        path="guardrails"
        element={
          <PageSuspense>
            <BusinessRulesDashboard />
          </PageSuspense>
        }
      />
      <Route
        path="ledger"
        element={
          <PageSuspense>
            <LedgerDashboard />
          </PageSuspense>
        }
      />
      <Route
        path="tigerbeetle"
        element={
          <PageSuspense>
            <TigerBeetleConfig />
          </PageSuspense>
        }
      />
      <Route
        path="settlement"
        element={
          <PageSuspense>
            <SettlementConfig />
          </PageSuspense>
        }
      />
      <Route
        path="payment-rails"
        element={
          <PageSuspense>
            <PaymentRailsDashboard />
          </PageSuspense>
        }
      />
      <Route
        path="support"
        element={
          <PageSuspense>
            <PlatformSupport />
          </PageSuspense>
        }
      />
    </>
  );
}
