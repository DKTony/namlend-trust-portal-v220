import { AdaptiveTabs, ResponsiveActionBar } from '@/components/adaptive';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  CheckCircle,
  CreditCard,
  Download,
  Filter,
  RefreshCw,
  Search,
  TrendingUp,
  Users,
} from 'lucide-react';
import React, { useState } from 'react';

// Sub-components
import { ReconciliationDashboard } from '../Reconciliation';
import CollectionsCenter from './CollectionsCenter';
import DisbursementManager from './DisbursementManager';
import OverdueManager from './OverdueManager';
import PaymentOverview from './PaymentOverview';
import PaymentsList from './PaymentsList';
import RescheduleRequests from './RescheduleRequests';
import SettledLoansList from './SettledLoansList';

interface PaymentManagementDashboardProps {
  onPaymentSelect?: (paymentId: string) => void;
}

const PaymentManagementDashboard: React.FC<PaymentManagementDashboardProps> = ({
  onPaymentSelect,
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<
    'all' | 'pending' | 'approved' | 'processing' | 'completed' | 'failed'
  >('all');

  // Realtime updates
  const [, setRefreshKey] = useState(0);
  const [hasNewPayments, setHasNewPayments] = useState(false);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
    setHasNewPayments(false);
  };

  // Note: Convex provides automatic reactivity — no manual subscription needed

  return (
    <div className="space-y-6">
      {/* Header */}
      <ResponsiveActionBar
        description={
          <p className="text-muted-foreground">Manage payments, disbursements, and collections</p>
        }
        actions={
          <>
            {hasNewPayments && (
              <Button
                variant="default"
                size="sm"
                onClick={handleRefresh}
                className="bg-blue-600 hover:bg-blue-700 animate-pulse"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                New Payments Available
              </Button>
            )}
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Advanced Filters
            </Button>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </>
        }
      />

      {/* Payment Overview */}
      <PaymentOverview />

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <AdaptiveTabs
          desktopColumns={7}
          items={[
            { value: 'overview', label: 'All Payments', shortLabel: 'Payments', icon: CreditCard },
            {
              value: 'disbursements',
              label: 'Disbursements',
              shortLabel: 'Disburse',
              icon: TrendingUp,
            },
            { value: 'settled', label: 'Settled Loans', shortLabel: 'Settled', icon: BadgeCheck },
            { value: 'overdue', label: 'Overdue', icon: AlertTriangle },
            { value: 'collections', label: 'Collections', icon: Users },
            {
              value: 'reschedules',
              label: 'Reschedules',
              shortLabel: 'Reschedule',
              icon: CalendarClock,
            },
            {
              value: 'reconciliation',
              label: 'Reconciliation',
              shortLabel: 'Recon',
              icon: CheckCircle,
            },
          ]}
        />

        {/* Search and Filter Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <input
              type="text"
              placeholder="Search by client name, payment ID, or amount..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-input text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
            className="w-full px-3 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring text-foreground sm:w-48"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>

        {/* Tab Content */}
        <TabsContent value="overview" className="space-y-4">
          <PaymentsList status="all" searchTerm={searchTerm} onPaymentSelect={onPaymentSelect} />
        </TabsContent>

        <TabsContent value="disbursements" className="space-y-4">
          <DisbursementManager status={filterStatus} searchTerm={searchTerm} />
        </TabsContent>

        <TabsContent value="settled" className="space-y-4">
          <SettledLoansList />
        </TabsContent>

        <TabsContent value="overdue" className="space-y-4">
          <OverdueManager />
        </TabsContent>

        <TabsContent value="collections" className="space-y-4">
          <CollectionsCenter />
        </TabsContent>

        <TabsContent value="reschedules" className="space-y-4">
          <RescheduleRequests />
        </TabsContent>

        <TabsContent value="reconciliation" className="space-y-4">
          <ReconciliationDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PaymentManagementDashboard;
