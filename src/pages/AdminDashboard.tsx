// Backup of AdminDashboard.tsx before fixing syntax errors
// This file contains the working admin dashboard with system health monitoring

import React, { useState, useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import SignOutButton from '@/components/SignOutButton';
import { Badge } from '@/components/ui/badge';
import SystemHealthDashboard from '@/components/SystemHealthDashboard';
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
  Clock,
  RefreshCw,
  Download,
  Menu,
  X,
  LogOut,
  Settings,
  CheckSquare
} from 'lucide-react';
import { NotificationBell } from '@/components/ApprovalNotifications';
import { ModeToggle } from '@/components/ModeToggle';

import DashboardSidebar from '@/components/DashboardSidebar';

// Restore real Admin Dashboard components
import FinancialSummaryCards from '@/pages/AdminDashboard/components/Overview/FinancialSummaryCards';
import LoanManagementDashboard from '@/pages/AdminDashboard/components/LoanManagement/LoanManagementDashboard';
import ClientManagementDashboard from '@/pages/AdminDashboard/components/ClientManagement/ClientManagementDashboard';
import PaymentManagementDashboard from '@/pages/AdminDashboard/components/PaymentManagement/PaymentManagementDashboard';
import ApprovalManagementDashboard from '@/pages/AdminDashboard/components/ApprovalManagement/ApprovalManagementDashboard';
import UserManagementDashboard from '@/pages/AdminDashboard/components/UserManagement/UserManagementDashboard';
import { CollectionsDashboard } from '@/pages/AdminDashboard/components/CollectionsManagement';
import { CreditPolicyConfig } from '@/pages/AdminDashboard/components/Settings';
import { BatchOperations } from '@/pages/AdminDashboard/components/BatchOperations';
import PortfolioAnalytics from '@/pages/AdminDashboard/components/Analytics/PortfolioAnalytics';


const AdminDashboard: React.FC = () => {
  const { user, userRole, isAdmin, isLoanOfficer, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('financial');
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
        
        // Direct database queries for reliability
        const [clientsResult, loansResult, paymentsResult, overdueResult] = await Promise.all([
          // Total clients
          supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true }),
          
          // Total loans and disbursed amount
          supabase
            .from('loans')
            .select('amount, status'),
          
          // Total repayments
          supabase
            .from('payments')
            .select('amount')
            .eq('status', 'completed'),
          
          // Overdue payments
          supabase
            .from('payments')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'overdue')
        ]);

        console.log('📊 Query results:', {
          clients: clientsResult.count,
          loans: loansResult.data?.length,
          payments: paymentsResult.data?.length,
          overdue: overdueResult.count
        });

        // Calculate totals
        const totalClients = clientsResult.count || 0;
        const loans = loansResult.data || [];
        const totalLoans = loans.length;
        const totalDisbursed = loans
          .filter(l => l.status === 'approved' || l.status === 'active' || l.status === 'completed')
          .reduce((sum, loan) => sum + (Number(loan.amount) || 0), 0);
        
        const payments = paymentsResult.data || [];
        const totalRepayments = payments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
        
        const overduePayments = overdueResult.count || 0;

        const calculatedMetrics = {
          totalClients,
          totalDisbursed,
          totalRepayments,
          overduePayments,
          totalLoans,
          pendingAmount: loans
            .filter(l => l.status === 'pending')
            .reduce((sum, loan) => sum + (Number(loan.amount) || 0), 0),
          rejectedAmount: loans
            .filter(l => l.status === 'rejected')
            .reduce((sum, loan) => sum + (Number(loan.amount) || 0), 0)
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
          rejectedAmount: 0
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
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 text-red-500" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              You don't have permission to access the admin dashboard.
            </p>
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              Go to Client Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  // Sign-out handled by shared SignOutButton

  const navigationItems = [
    { id: 'financial', label: 'Financial', icon: TrendingUp },
    { id: 'loans', label: 'Loans', icon: FileText },
    { id: 'clients', label: 'Clients', icon: UserCheck },
    { id: 'payments', label: 'Payments', icon: DollarSign },
    { id: 'approvals', label: 'Approvals', icon: CheckCircle2 },
    { id: 'collections', label: 'Collections', icon: AlertTriangle },
    { id: 'batch', label: 'Batch Operations', icon: CheckSquare },
    { id: 'users', label: 'User Management', icon: Users },
    ...(isAdmin ? [
      { id: 'analytics', label: 'Analytics', icon: BarChart3 },
      { id: 'settings', label: 'Credit Policy', icon: Settings },
    ] : []),
  ];

  return (
    <div className="flex h-screen bg-background">
      <DashboardSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userEmail={user?.email}
        userRole={userRole}
        menuItems={navigationItems}
        title="NamLend"
        subtitle="Admin Portal"
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-card border-b border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-4 w-4" />
              </Button>
              <h1 className="text-xl font-semibold">Dashboard</h1>
            </div>
            <div className="flex items-center gap-2">
              <ModeToggle />
              <NotificationBell />
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button variant="outline" size="sm">
                <BarChart3 className="mr-2 h-4 w-4" />
                Reports
              </Button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* System Health Status */}
            <SystemHealthDashboard key={`health-${refreshKey}`} isAdmin={isAdmin} />
            
            {/* Tab Content */}
            {activeTab === 'financial' && (
              <div className="space-y-6">
                <FinancialSummaryCards 
                  key={`financial-${refreshKey}`}
                  metrics={metrics} 
                  loading={metricsLoading} 
                />
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

            {/* Analytics Content - Admin Only */}
            {activeTab === 'analytics' && isAdmin && (
              <div className="space-y-6">
                <PortfolioAnalytics key={`analytics-${refreshKey}`} />
              </div>
            )}
            
            {/* Analytics Access Denied for Non-Admin */}
            {activeTab === 'analytics' && !isAdmin && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Analytics Dashboard</CardTitle>
                    <CardDescription>Advanced portfolio analytics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                      <div className="text-center">
                        <div className="text-lg font-medium text-muted-foreground mb-2">Admin Access Required</div>
                        <div className="text-sm text-muted-foreground">Analytics dashboard is restricted to administrators only</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Credit Policy Settings - Admin Only */}
            {activeTab === 'settings' && isAdmin && (
              <div className="space-y-6">
                <CreditPolicyConfig key={`settings-${refreshKey}`} />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
