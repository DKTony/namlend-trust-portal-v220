// Backup of AdminDashboard.tsx before fixing syntax errors
// This file contains the working admin dashboard with system health monitoring

import React, { useState, useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  Clock,
  RefreshCw,
  Download,
  Menu,
  X,
  LogOut
} from 'lucide-react';

// Import dashboard components
import FinancialSummaryCards from './components/Overview/FinancialSummaryCards';
import LoanManagementDashboard from './components/LoanManagement/LoanManagementDashboard';
import ClientManagementDashboard from './components/ClientManagement/ClientManagementDashboard';
import PaymentsDashboard from './components/Payments/PaymentsDashboard';
import ApprovalsDashboard from './components/Approvals/ApprovalsDashboard';
import UserManagementDashboard from './components/UserManagement/UserManagementDashboard';

const AdminDashboard: React.FC = () => {
  const { user, userRole, isAdmin, isLoanOfficer, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('financial');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);

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
    window.location.reload();
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const navigationItems = [
    { id: 'financial', label: 'Financial', icon: TrendingUp },
    { id: 'loans', label: 'Loans', icon: FileText },
    { id: 'clients', label: 'Clients', icon: UserCheck },
    { id: 'payments', label: 'Payments', icon: DollarSign },
    { id: 'approvals', label: 'Approvals', icon: CheckCircle2 },
    { id: 'users', label: 'User Management', icon: Users },
    ...(isAdmin ? [{ id: 'analytics', label: 'Analytics', icon: BarChart3 }] : []),
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-card border-r border-border
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-semibold">Admin Panel</h2>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 p-4 space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors
                    ${activeTab === item.id 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-accent hover:text-accent-foreground'
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* User Info & Sign Out */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground text-sm font-medium">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.email}</p>
                <p className="text-xs text-muted-foreground">{userRole}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="w-full"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

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
            <SystemHealthDashboard isAdmin={isAdmin} />
            
            {/* Tab Content */}
            {activeTab === 'financial' && (
              <div className="space-y-6">
                <FinancialSummaryCards 
                  metrics={metrics} 
                  loading={metricsLoading} 
                />
              </div>
            )}

            {activeTab === 'loans' && (
              <div className="space-y-6">
                <LoanManagementDashboard />
              </div>
            )}

            {activeTab === 'clients' && (
              <div className="space-y-6">
                <ClientManagementDashboard />
              </div>
            )}

            {activeTab === 'payments' && (
              <div className="space-y-6">
                <PaymentsDashboard />
              </div>
            )}

            {activeTab === 'approvals' && (
              <div className="space-y-6">
                <ApprovalsDashboard />
              </div>
            )}

            {activeTab === 'users' && (
              <div className="space-y-6">
                <UserManagementDashboard />
              </div>
            )}

            {/* Analytics Content - Admin Only */}
            {activeTab === 'analytics' && isAdmin && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Analytics Dashboard</CardTitle>
                    <CardDescription>Portfolio analytics and insights (Admin Access)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                      <div className="text-center">
                        <div className="text-lg font-medium text-muted-foreground mb-2">Analytics Temporarily Disabled</div>
                        <div className="text-sm text-muted-foreground">Recharts disabled due to d3-array build issue</div>
                        <div className="mt-4 text-xs text-muted-foreground">
                          Portfolio analytics, risk analysis, and performance metrics will be available once charts are restored
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
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
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
