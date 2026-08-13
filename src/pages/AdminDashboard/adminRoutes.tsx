/**
 * Admin portal route definitions.
 * All routes are lazy-loaded for code splitting.
 */

import ConvexErrorBoundary from '@/components/system/ConvexErrorBoundary';
import { EntitledRoute } from '@/components/system/EntitledRoute';
import { ProtectedRoute } from '@/components/system/ProtectedRoute';
import React, { Suspense } from 'react';
import { Navigate, Route } from 'react-router-dom';

// Lazy-loaded page components
const OverviewPage = React.lazy(() => import('./pages/OverviewPage'));
const TenantInfoPage = React.lazy(() => import('../TenantInfo/TenantInfoPage'));
const BrandingConfigComponent = React.lazy(() => import('./components/Settings/BrandingConfig'));

// Operations
const LoanManagementDashboard = React.lazy(
  () => import('./components/LoanManagement/LoanManagementDashboard')
);
const ClientManagementDashboard = React.lazy(
  () => import('./components/ClientManagement/ClientManagementDashboard')
);
const PaymentManagementDashboard = React.lazy(
  () => import('./components/PaymentManagement/PaymentManagementDashboard')
);
const ApprovalManagementDashboard = React.lazy(
  () => import('./components/ApprovalManagement/ApprovalManagementDashboard')
);
const CollectionsDashboard = React.lazy(
  () => import('./components/CollectionsManagement/CollectionsDashboard')
);
const IPPOnboardingDashboard = React.lazy(
  () => import('./components/IPPOnboarding/IPPOnboardingDashboard')
);
const BatchOperations = React.lazy(() => import('./components/BatchOperations/BatchOperations'));

// People
const UserManagementDashboard = React.lazy(
  () => import('./components/UserManagement/UserManagementDashboard')
);

// Finance (admin only) — Ledger moved to the Platform Console (/platform/ledger)
const PortfolioAnalytics = React.lazy(() => import('./components/Analytics/PortfolioAnalytics'));
const ReconciliationDashboard = React.lazy(
  () => import('./components/Reconciliation/ReconciliationDashboard')
);

// Configuration (admin only) — Institutions/Business Rules/Payment Rails moved to /platform
const ProductsDashboard = React.lazy(() => import('./components/Products/ProductsDashboard'));
const WorkflowManagementDashboard = React.lazy(
  () => import('./components/WorkflowManagement/WorkflowManagementDashboard')
);
const MandatesDashboard = React.lazy(() => import('./components/Mandates/MandatesDashboard'));
const ConsentDashboard = React.lazy(() => import('./components/Consent/ConsentDashboard'));

// Settings (admin only) — TB Config/Settlement moved to /platform
const CreditPolicyConfig = React.lazy(() => import('./components/Settings/CreditPolicy'));

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

function AdminOnly({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute requireAdmin>{children}</ProtectedRoute>;
}

function FeatureOnly({ featureKey, children }: { featureKey: string; children: React.ReactNode }) {
  return (
    <EntitledRoute featureKey={featureKey} returnTo="/admin/overview">
      {children}
    </EntitledRoute>
  );
}

export function adminRoutes() {
  return (
    <>
      {/* Default redirect */}
      <Route index element={<Navigate to="/admin/overview" replace />} />

      {/* Overview */}
      <Route
        path="overview"
        element={
          <PageSuspense>
            <OverviewPage />
          </PageSuspense>
        }
      />
      <Route
        path="tenant-info"
        element={
          <PageSuspense>
            <TenantInfoPage />
          </PageSuspense>
        }
      />

      {/* Operations (loan_officer+) */}
      <Route
        path="loans"
        element={
          <PageSuspense>
            <LoanManagementDashboard />
          </PageSuspense>
        }
      />
      <Route
        path="clients"
        element={
          <PageSuspense>
            <ClientManagementDashboard />
          </PageSuspense>
        }
      />
      <Route
        path="payments"
        element={
          <PageSuspense>
            <PaymentManagementDashboard />
          </PageSuspense>
        }
      />
      <Route
        path="approvals"
        element={
          <PageSuspense>
            <ApprovalManagementDashboard />
          </PageSuspense>
        }
      />
      <Route
        path="collections"
        element={
          <FeatureOnly featureKey="collections">
            <PageSuspense>
              <CollectionsDashboard />
            </PageSuspense>
          </FeatureOnly>
        }
      />
      <Route
        path="ipp-onboarding"
        element={
          <FeatureOnly featureKey="ippOnboarding">
            <PageSuspense>
              <IPPOnboardingDashboard />
            </PageSuspense>
          </FeatureOnly>
        }
      />
      {/* Management (admin only) */}
      <Route
        path="batch"
        element={
          <AdminOnly>
            <PageSuspense>
              <BatchOperations />
            </PageSuspense>
          </AdminOnly>
        }
      />
      <Route
        path="users"
        element={
          <AdminOnly>
            <PageSuspense>
              <UserManagementDashboard />
            </PageSuspense>
          </AdminOnly>
        }
      />

      {/* Finance & Ledger (admin only) */}
      <Route
        path="analytics"
        element={
          <AdminOnly>
            <FeatureOnly featureKey="advancedAnalytics">
              <PageSuspense>
                <PortfolioAnalytics />
              </PageSuspense>
            </FeatureOnly>
          </AdminOnly>
        }
      />
      <Route
        path="reconciliation"
        element={
          <AdminOnly>
            <FeatureOnly featureKey="tenantReconciliation">
              <PageSuspense>
                <ReconciliationDashboard />
              </PageSuspense>
            </FeatureOnly>
          </AdminOnly>
        }
      />

      {/* Configuration (admin only) — platform-level sections moved to /platform */}
      <Route
        path="products"
        element={
          <AdminOnly>
            <FeatureOnly featureKey="products">
              <PageSuspense>
                <ProductsDashboard />
              </PageSuspense>
            </FeatureOnly>
          </AdminOnly>
        }
      />
      <Route
        path="workflows"
        element={
          <AdminOnly>
            <FeatureOnly featureKey="workflows">
              <PageSuspense>
                <WorkflowManagementDashboard />
              </PageSuspense>
            </FeatureOnly>
          </AdminOnly>
        }
      />
      <Route
        path="mandates"
        element={
          <AdminOnly>
            <FeatureOnly featureKey="mandates">
              <PageSuspense>
                <MandatesDashboard />
              </PageSuspense>
            </FeatureOnly>
          </AdminOnly>
        }
      />
      <Route
        path="consent"
        element={
          <AdminOnly>
            <FeatureOnly featureKey="popiaConsent">
              <PageSuspense>
                <ConsentDashboard />
              </PageSuspense>
            </FeatureOnly>
          </AdminOnly>
        }
      />

      {/* Settings (admin only) */}
      <Route
        path="settings/credit-policy"
        element={
          <AdminOnly>
            <FeatureOnly featureKey="creditPolicy">
              <PageSuspense>
                <CreditPolicyConfig />
              </PageSuspense>
            </FeatureOnly>
          </AdminOnly>
        }
      />
      <Route
        path="settings/branding"
        element={
          <AdminOnly>
            <FeatureOnly featureKey="whiteLabelBranding">
              <PageSuspense>
                <BrandingConfigComponent />
              </PageSuspense>
            </FeatureOnly>
          </AdminOnly>
        }
      />
    </>
  );
}
