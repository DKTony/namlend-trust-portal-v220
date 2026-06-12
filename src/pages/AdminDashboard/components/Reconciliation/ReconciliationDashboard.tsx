/**
 * Reconciliation Dashboard
 * Main component for the IRCS Back Office reconciliation and settlement management
 */

import { useState } from 'react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdaptiveTabs } from '@/components/adaptive';
import {
  FileText,
  FileSpreadsheet,
  FileWarning,
  FileClock,
  FileQuestion,
  FileX,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';
import { useSettlementStatistics } from '@/hooks/useSettlement';
import { formatNAD } from '@/constants/regulatory';

// Sub-components
import { SettlementRunsList } from './SettlementRunsList';
import { Pacs009Viewer } from './Pacs009Viewer';
import { NTSLReportViewer } from './NTSLReportViewer';
import { RawDataReportViewer } from './RawDataReportViewer';
import { AdjustmentsViewer } from './AdjustmentsViewer';
import { PendingAdjustmentResponse } from './PendingAdjustmentResponse';
import { PendingStatusReport } from './PendingStatusReport';
import { TimeoutReportViewer } from './TimeoutReportViewer';
import { AcknowledgementsViewer } from './AcknowledgementsViewer';
import { IPSTransactionsViewer } from './IPSTransactionsViewer';
import { IPSHealthWidget } from './IPSHealthWidget';
import { IPPOperationsControlCenter } from './IPPOperationsControlCenter';

export function ReconciliationDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  // Get 30-day statistics
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
  } = useSettlementStatistics(
    thirtyDaysAgo.toISOString().split('T')[0],
    new Date().toISOString().split('T')[0]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settlement & Reconciliation</h2>
        <p className="text-muted-foreground">
          IRCS Back Office - Manage settlement runs, reports, and reconciliation
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium truncate mr-2">
              Settlement Runs (30d)
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400 shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold truncate tabular-nums">
              {statsLoading ? '...' : statsError ? '–' : stats?.runs?.settled || 0}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {statsError
                ? 'Unable to load'
                : `${stats?.runs?.total || 0} total, ${stats?.runs?.failed || 0} failed`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium truncate mr-2">Total Settled</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-blue-500 dark:text-blue-400 shrink-0" />
          </CardHeader>
          <CardContent>
            <div
              className="text-xl sm:text-2xl font-bold truncate tabular-nums"
              title={statsLoading ? '...' : formatNAD(stats?.totals?.principal || 0)}
            >
              {statsLoading ? '...' : statsError ? '–' : formatNAD(stats?.totals?.principal || 0)}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {statsError ? 'Unable to load' : `${stats?.totals?.transactions || 0} transactions`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium truncate mr-2">Pending Adjustments</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500 dark:text-orange-400 shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold truncate tabular-nums">
              {statsLoading ? '...' : statsError ? '–' : stats?.adjustments?.pending || 0}
            </div>
            <p
              className="text-xs text-muted-foreground truncate"
              title={formatNAD(stats?.adjustments?.total_amount || 0) + ' total'}
            >
              {statsError
                ? 'Unable to load'
                : `${formatNAD(stats?.adjustments?.total_amount || 0)} total`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium truncate mr-2">
              Timeout Transactions
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-500 dark:text-yellow-400 shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold truncate tabular-nums">
              {statsLoading ? '...' : statsError ? '–' : stats?.timeouts?.pending || 0}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {statsError ? 'Unable to load' : `${stats?.timeouts?.resolved || 0} resolved`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* IPS Health Widget */}
      <div className="grid gap-4 md:grid-cols-2">
        <IPSHealthWidget />
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <AdaptiveTabs
          desktopColumns={5}
          compactIconOnly
          items={[
            { value: 'overview', label: 'Settlement Runs', shortLabel: 'Runs', icon: FileText },
            {
              value: 'pacs009',
              label: 'MNSB (pacs.009)',
              shortLabel: 'MNSB',
              icon: FileSpreadsheet,
            },
            { value: 'ntsl', label: 'NTSL', icon: FileSpreadsheet },
            { value: 'rawdata', label: 'Raw Data', shortLabel: 'Raw', icon: FileText },
            { value: 'adjustments', label: 'Adjustments', shortLabel: 'Adjust', icon: FileWarning },
            {
              value: 'pending-adj',
              label: 'Pending Response',
              shortLabel: 'Pending',
              icon: FileClock,
            },
            {
              value: 'pending-status',
              label: 'Pending Status',
              shortLabel: 'Status',
              icon: FileQuestion,
            },
            { value: 'timeouts', label: 'Timeouts', icon: FileX },
            {
              value: 'acks',
              label: 'Acknowledgements',
              shortLabel: 'Acks',
              icon: stats?.runs?.failed ? XCircle : CheckCircle,
            },
            { value: 'ips', label: 'IPS Transactions', shortLabel: 'IPS', icon: FileSpreadsheet },
            { value: 'ipp-ops', label: 'IPP Operations', shortLabel: 'Ops', icon: ShieldAlert },
          ]}
        />

        <TabsContent value="overview" className="space-y-4">
          <SettlementRunsList />
        </TabsContent>

        <TabsContent value="pacs009" className="space-y-4">
          <Pacs009Viewer />
        </TabsContent>

        <TabsContent value="ntsl" className="space-y-4">
          <NTSLReportViewer />
        </TabsContent>

        <TabsContent value="rawdata" className="space-y-4">
          <RawDataReportViewer />
        </TabsContent>

        <TabsContent value="adjustments" className="space-y-4">
          <AdjustmentsViewer />
        </TabsContent>

        <TabsContent value="pending-adj" className="space-y-4">
          <PendingAdjustmentResponse />
        </TabsContent>

        <TabsContent value="pending-status" className="space-y-4">
          <PendingStatusReport />
        </TabsContent>

        <TabsContent value="timeouts" className="space-y-4">
          <TimeoutReportViewer />
        </TabsContent>

        <TabsContent value="acks" className="space-y-4">
          <AcknowledgementsViewer />
        </TabsContent>

        <TabsContent value="ips" className="space-y-4">
          <IPSTransactionsViewer />
        </TabsContent>

        <TabsContent value="ipp-ops" className="space-y-4">
          <IPPOperationsControlCenter />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ReconciliationDashboard;
