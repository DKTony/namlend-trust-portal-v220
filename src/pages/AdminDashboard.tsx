// Backup of AdminDashboard.tsx before fixing syntax errors
// This file contains the working admin dashboard with system health monitoring

import React, { useState, useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { adminAPI } from '@/services/api-client';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { ThemedButton } from '@/components/ui/ThemedButton';
import SystemHealthDashboard from '@/components/dashboards/SystemHealthDashboard';
import {
  TrendingUp,
  Users,
  DollarSign,
  FileText,
  UserCheck,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Settings,
  CheckSquare,
  Database,
  Palette,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

import DashboardLayout from '@/components/Layout/DashboardLayout';
import { MenuItem } from '@/components/Layout/ThemedSidebar';

// Restore real Admin Dashboard components
import FinancialSummaryCards from '@/pages/AdminDashboard/components/Overview/FinancialSummaryCards';
import LoanManagementDashboard from '@/pages/AdminDashboard/components/LoanManagement/LoanManagementDashboard';
import ClientManagementDashboard from '@/pages/AdminDashboard/components/ClientManagement/ClientManagementDashboard';
import PaymentManagementDashboard from '@/pages/AdminDashboard/components/PaymentManagement/PaymentManagementDashboard';
import ApprovalManagementDashboard from '@/pages/AdminDashboard/components/ApprovalManagement/ApprovalManagementDashboard';
import UserManagementDashboard from '@/pages/AdminDashboard/components/UserManagement/UserManagementDashboard';
import { CollectionsDashboard } from '@/pages/AdminDashboard/components/CollectionsManagement';
import {
  CreditPolicyConfig,
  BrandingConfigComponent,
} from '@/pages/AdminDashboard/components/Settings';
import { TigerBeetleConfig } from '@/pages/AdminDashboard/components/Settings/TigerBeetleConfig';
import { SettlementConfig } from '@/pages/AdminDashboard/components/Settings/SettlementConfig';
import { BatchOperations } from '@/pages/AdminDashboard/components/BatchOperations';
import PortfolioAnalytics from '@/pages/AdminDashboard/components/Analytics/PortfolioAnalytics';
import { LedgerDashboard } from '@/pages/AdminDashboard/components/TigerBeetle';
import { IPPOnboardingDashboard } from '@/pages/AdminDashboard/components/IPPOnboarding';

const AdminDashboard: React.FC = () => {
  const { user, userRole, isAdmin, isLoanOfficer } = useAuth();
  const { styles } = useTheme();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('financial');
  const [metrics, setMetrics] = useState<any>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch admin dashboard metrics
  useEffect(() => {
    const fetchMetrics = async () => {
      if (activeTab !== 'financial' || !user) return;

      setMetricsLoading(true);
      try {
        console.log('🔄 Fetching admin dashboard metrics...');

        const fetchClients = supabase.from('profiles').select('id', { count: 'exact', head: true });

        const fetchLoans = supabase.from('loans').select('amount, status');

        const fetchPayments = supabase.from('payments').select('amount').eq('status', 'completed');

        // P1-001 FIX: Query payment_schedules for overdue (not payments table)
        // Using filter() instead of lt() to avoid TS inference issues with head: true
        const fetchOverdue = supabase
          .from('payment_schedules')
          .select('id', { count: 'exact', head: true })
          .filter('due_date', 'lt', new Date().toISOString())
          .neq('status', 'paid');

        // Direct database queries for reliability
        const [clientsResult, loansResult, paymentsResult, overdueResult] = await Promise.all([
          fetchClients,
          fetchLoans,
          fetchPayments,
          fetchOverdue,
        ]);

        console.log('📊 Query results:', {
          clients: clientsResult.count,
          loans: loansResult.data?.length,
          payments: paymentsResult.data?.length,
          overdue: overdueResult.count,
        });

        // Calculate totals
        const totalClients = clientsResult.count || 0;
        const loans = loansResult.data || [];
        const totalLoans = loans.length;
        const totalDisbursed = loans
          .filter(
            (l) => l.status === 'approved' || l.status === 'active' || l.status === 'completed'
          )
          .reduce((sum, loan) => sum + (Number(loan.amount) || 0), 0);

        const payments = paymentsResult.data || [];
        const totalRepayments = payments.reduce(
          (sum, payment) => sum + (Number(payment.amount) || 0),
          0
        );

        const overduePayments = overdueResult.count || 0;

        const calculatedMetrics = {
          totalClients,
          totalDisbursed,
          totalRepayments,
          overduePayments,
          totalLoans,
          pendingAmount: loans
            .filter((l) => l.status === 'pending')
            .reduce((sum, loan) => sum + (Number(loan.amount) || 0), 0),
          rejectedAmount: loans
            .filter((l) => l.status === 'rejected')
            .reduce((sum, loan) => sum + (Number(loan.amount) || 0), 0),
        };

        console.log('✅ Calculated metrics:', calculatedMetrics);
        setMetrics(calculatedMetrics);
      } catch (error) {
        console.error('❌ Error fetching admin metrics:', error);
        // Set fallback zero values on error
        setMetrics({
          totalClients: 0,
          totalDisbursed: 0,
          totalRepayments: 0,
          overduePayments: 0,
          totalLoans: 0,
          pendingAmount: 0,
          rejectedAmount: 0,
        });
      } finally {
        setMetricsLoading(false);
      }
    };

    fetchMetrics();
  }, [activeTab, user, refreshKey]);

  // Redirect if not authenticated or not authorized
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin && !isLoanOfficer) {
    return (
      <div className={cn('flex items-center justify-center min-h-screen', styles.background)}>
        <ThemedCard className="w-96">
          <div className="flex items-center mb-4">
            <AlertCircle className="h-5 w-5 mr-2 text-red-500" />
            <h3 className={cn('text-lg font-bold', styles.textClass)}>Access Denied</h3>
          </div>
          <p className="text-muted-foreground mb-4">
            You don't have permission to access the admin dashboard.
          </p>
          <ThemedButton onClick={() => navigate('/dashboard')} className="w-full">
            Go to Client Dashboard
          </ThemedButton>
        </ThemedCard>
      </div>
    );
  }

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  const menuItems: MenuItem[] = [
    { id: 'financial', label: 'Financial', icon: TrendingUp },
    { id: 'loans', label: 'Loans', icon: FileText },
    { id: 'clients', label: 'Clients', icon: UserCheck },
    { id: 'payments', label: 'Payments', icon: DollarSign },
    { id: 'approvals', label: 'Approvals', icon: CheckCircle2 },
    { id: 'collections', label: 'Collections', icon: AlertTriangle },
    { id: 'ipp-onboarding', label: 'IPP Onboarding', icon: UserCheck },
    { id: 'batch', label: 'Batch Operations', icon: CheckSquare },
    { id: 'users', label: 'User Management', icon: Users },
    ...(isAdmin
      ? [
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
          { id: 'ledger', label: 'TigerBeetle Ledger', icon: Database },
          { id: 'settings', label: 'Credit Policy', icon: Settings },
          { id: 'tigerbeetle-config', label: 'TB Config', icon: Database },
          { id: 'settlement-config', label: 'Settlement', icon: DollarSign },
          { id: 'branding', label: 'Branding', icon: Palette },
        ]
      : []),
  ];

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  const HeaderActions = (
    <>
      <ThemedButton variant="secondary" className="h-9 px-3 text-xs" onClick={handleRefresh}>
        <RefreshCw className="mr-2 h-3.5 w-3.5" />
        Refresh
      </ThemedButton>
      <ThemedButton variant="secondary" className="h-9 px-3 text-xs">
        <BarChart3 className="mr-2 h-3.5 w-3.5" />
        Reports
      </ThemedButton>
    </>
  );

  return (
    <DashboardLayout
      activeTab={activeTab}
      onTabChange={handleTabChange}
      variant="admin"
      menuItems={menuItems}
      title="Admin Dashboard"
      headerActions={HeaderActions}
    >
      {/* System Health Dashboard - Always Visible for Admin */}
      {isAdmin && <SystemHealthDashboard key={`health-${refreshKey}`} />}

      {activeTab === 'financial' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <FinancialSummaryCards
            key={`financial-${refreshKey}`}
            metrics={metrics}
            loading={metricsLoading}
          />

          {/* Placeholder for future financial charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{/* ... */}</div>
        </div>
      )}

      {activeTab === 'loans' && (
        <div className="space-y-6">
          <LoanManagementDashboard key={`loans-${refreshKey}`} />
        </div>
      )}

      {activeTab === 'clients' && (
        <div className="space-y-6">
          <ClientManagementDashboard key={`clients-${refreshKey}`} />
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="space-y-6">
          <PaymentManagementDashboard key={`payments-${refreshKey}`} />
        </div>
      )}

      {activeTab === 'approvals' && (
        <div className="space-y-6">
          <ApprovalManagementDashboard key={`approvals-${refreshKey}`} />
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-6">
          <UserManagementDashboard key={`users-${refreshKey}`} />
        </div>
      )}

      {activeTab === 'collections' && (
        <div className="space-y-6">
          <CollectionsDashboard key={`collections-${refreshKey}`} />
        </div>
      )}

      {activeTab === 'batch' && (
        <div className="space-y-6">
          <BatchOperations key={`batch-${refreshKey}`} />
        </div>
      )}

      {/* IPP Onboarding */}
      {activeTab === 'ipp-onboarding' && (
        <div className="space-y-6">
          <IPPOnboardingDashboard key={`ipp-onboarding-${refreshKey}`} />
        </div>
      )}

      {/* Analytics Content - Admin Only */}
      {activeTab === 'analytics' && isAdmin && (
        <div className="space-y-6">
          <PortfolioAnalytics key={`analytics-${refreshKey}`} />
        </div>
      )}

      {/* Analytics Access Denied for Non-Admin */}
      {activeTab === 'analytics' && !isAdmin && (
        <div className="space-y-6">
          <ThemedCard>
            <div className="flex items-center mb-4">
              <h3 className={cn('text-lg font-bold', styles.textClass)}>Analytics Dashboard</h3>
            </div>
            <div className="h-80 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
              <div className="text-center">
                <div className="text-lg font-medium text-muted-foreground mb-2">
                  Admin Access Required
                </div>
                <div className="text-sm text-muted-foreground">
                  Analytics dashboard is restricted to administrators only
                </div>
              </div>
            </div>
          </ThemedCard>
        </div>
      )}

      {/* TigerBeetle Ledger - Admin Only */}
      {activeTab === 'ledger' && isAdmin && (
        <div className="space-y-6">
          <LedgerDashboard key={`ledger-${refreshKey}`} />
        </div>
      )}

      {/* Credit Policy Settings - Admin Only */}
      {activeTab === 'settings' && isAdmin && (
        <div className="space-y-6">
          <CreditPolicyConfig key={`settings-${refreshKey}`} />
        </div>
      )}

      {/* TigerBeetle Configuration - Admin Only */}
      {activeTab === 'tigerbeetle-config' && isAdmin && (
        <div className="space-y-6">
          <TigerBeetleConfig key={`tb-config-${refreshKey}`} />
        </div>
      )}

      {/* Settlement & Reconciliation Configuration - Admin Only */}
      {activeTab === 'settlement-config' && isAdmin && (
        <div className="space-y-6">
          <SettlementConfig key={`settlement-config-${refreshKey}`} />
        </div>
      )}

      {/* Branding & White Label Configuration - Admin Only */}
      {activeTab === 'branding' && isAdmin && (
        <div className="space-y-6">
          <BrandingConfigComponent key={`branding-${refreshKey}`} />
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminDashboard;
