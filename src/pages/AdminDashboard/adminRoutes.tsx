/**
 * Admin portal route definitions.
 * All routes are lazy-loaded for code splitting.
 */

import React, { Suspense } from 'react';
import { Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/system/ProtectedRoute';
import ConvexErrorBoundary from '@/components/system/ConvexErrorBoundary';

// Lazy-loaded page components
const OverviewPage = React.lazy(() => import('./pages/OverviewPage'));

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

// Finance & Ledger (admin only)
const PortfolioAnalytics = React.lazy(() => import('./components/Analytics/PortfolioAnalytics'));
const LedgerDashboard = React.lazy(() => import('./components/TigerBeetle/LedgerDashboard'));
const ReconciliationDashboard = React.lazy(
  () => import('./components/Reconciliation/ReconciliationDashboard')
);

// Platform / Ontology (admin only)
const InstitutionsDashboard = React.lazy(
  () => import('./components/Institutions/InstitutionsDashboard')
);
const ProductsDashboard = React.lazy(() => import('./components/Products/ProductsDashboard'));
const PaymentRailsDashboard = React.lazy(
  () => import('./components/PaymentRails/PaymentRailsDashboard')
);
const BusinessRulesDashboard = React.lazy(
  () => import('./components/BusinessRules/BusinessRulesDashboard')
);
const WorkflowManagementDashboard = React.lazy(
  () => import('./components/WorkflowManagement/WorkflowManagementDashboard')
);
const MandatesDashboard = React.lazy(() => import('./components/Mandates/MandatesDashboard'));
const ConsentDashboard = React.lazy(() => import('./components/Consent/ConsentDashboard'));

// Settings (admin only)
const CreditPolicyConfig = React.lazy(() => import('./components/Settings/CreditPolicy'));
const TigerBeetleConfig = React.lazy(() => import('./components/Settings/TigerBeetleConfig'));
const SettlementConfig = React.lazy(() => import('./components/Settings/SettlementConfig'));
const BrandingConfigComponent = React.lazy(() => import('./components/Settings/BrandingConfig'));

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
          <PageSuspense>
            <CollectionsDashboard />
          </PageSuspense>
        }
      />
      <Route
        path="ipp-onboarding"
        element={
          <PageSuspense>
            <IPPOnboardingDashboard />
          </PageSuspense>
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
            <PageSuspense>
              <PortfolioAnalytics />
            </PageSuspense>
          </AdminOnly>
        }
      />
      <Route
        path="ledger"
        element={
          <AdminOnly>
            <PageSuspense>
              <LedgerDashboard />
            </PageSuspense>
          </AdminOnly>
        }
      />
      <Route
        path="reconciliation"
        element={
          <AdminOnly>
            <PageSuspense>
              <ReconciliationDashboard />
            </PageSuspense>
          </AdminOnly>
        }
      />

      {/* Platform / Ontology (admin only) */}
      <Route
        path="institutions"
        element={
          <AdminOnly>
            <PageSuspense>
              <InstitutionsDashboard />
            </PageSuspense>
          </AdminOnly>
        }
      />
      <Route
        path="products"
        element={
          <AdminOnly>
            <PageSuspense>
              <ProductsDashboard />
            </PageSuspense>
          </AdminOnly>
        }
      />
      <Route
        path="payment-rails"
        element={
          <AdminOnly>
            <PageSuspense>
              <PaymentRailsDashboard />
            </PageSuspense>
          </AdminOnly>
        }
      />
      <Route
        path="business-rules"
        element={
          <AdminOnly>
            <PageSuspense>
              <BusinessRulesDashboard />
            </PageSuspense>
          </AdminOnly>
        }
      />
      <Route
        path="workflows"
        element={
          <AdminOnly>
            <PageSuspense>
              <WorkflowManagementDashboard />
            </PageSuspense>
          </AdminOnly>
        }
      />
      <Route
        path="mandates"
        element={
          <AdminOnly>
            <PageSuspense>
              <MandatesDashboard />
            </PageSuspense>
          </AdminOnly>
        }
      />
      <Route
        path="consent"
        element={
          <AdminOnly>
            <PageSuspense>
              <ConsentDashboard />
            </PageSuspense>
          </AdminOnly>
        }
      />

      {/* Settings (admin only) */}
      <Route
        path="settings/credit-policy"
        element={
          <AdminOnly>
            <PageSuspense>
              <CreditPolicyConfig />
            </PageSuspense>
          </AdminOnly>
        }
      />
      <Route
        path="settings/tigerbeetle"
        element={
          <AdminOnly>
            <PageSuspense>
              <TigerBeetleConfig />
            </PageSuspense>
          </AdminOnly>
        }
      />
      <Route
        path="settings/settlement"
        element={
          <AdminOnly>
            <PageSuspense>
              <SettlementConfig />
            </PageSuspense>
          </AdminOnly>
        }
      />
      <Route
        path="settings/branding"
        element={
          <AdminOnly>
            <PageSuspense>
              <BrandingConfigComponent />
            </PageSuspense>
          </AdminOnly>
        }
      />
    </>
  );
}
