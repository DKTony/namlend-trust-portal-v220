/**
 * Reconciliation Dashboard
 * Main component for the IRCS Back Office reconciliation and settlement management
 */

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
} from 'lucide-react';
import { useSettlementStatistics } from '@/hooks/useSettlement';
import { formatCurrency } from '@/lib/utils';

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

export function ReconciliationDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  // Get 30-day statistics
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const { data: stats, isLoading: statsLoading } = useSettlementStatistics(
    thirtyDaysAgo.toISOString().split('T')[0],
    new Date().toISOString().split('T')[0]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Settlement & Reconciliation
        </h2>
        <p className="text-muted-foreground">
          IRCS Back Office - Manage settlement runs, reports, and
          reconciliation
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
              {statsLoading ? '...' : stats?.runs?.settled || 0}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {stats?.runs?.total || 0} total,{' '}
              {stats?.runs?.failed || 0} failed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium truncate mr-2">
              Total Settled
            </CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-blue-500 dark:text-blue-400 shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold truncate tabular-nums" title={statsLoading ? '...' : formatCurrency(stats?.totals?.principal || 0)}>
              {statsLoading
                ? '...'
                : formatCurrency(stats?.totals?.principal || 0)}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {stats?.totals?.transactions || 0} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium truncate mr-2">
              Pending Adjustments
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500 dark:text-orange-400 shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold truncate tabular-nums">
              {statsLoading ? '...' : stats?.adjustments?.pending || 0}
            </div>
            <p className="text-xs text-muted-foreground truncate" title={formatCurrency(stats?.adjustments?.total_amount || 0) + ' total'}>
              {formatCurrency(stats?.adjustments?.total_amount || 0)} total
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
              {statsLoading ? '...' : stats?.timeouts?.pending || 0}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {stats?.timeouts?.resolved || 0} resolved
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Settlement Runs</span>
          </TabsTrigger>
          <TabsTrigger value="pacs009" className="flex items-center gap-1">
            <FileSpreadsheet className="h-4 w-4" />
            <span className="hidden sm:inline">MNSB (pacs.009)</span>
          </TabsTrigger>
          <TabsTrigger value="ntsl" className="flex items-center gap-1">
            <FileSpreadsheet className="h-4 w-4" />
            <span className="hidden sm:inline">NTSL</span>
          </TabsTrigger>
          <TabsTrigger value="rawdata" className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Raw Data</span>
          </TabsTrigger>
          <TabsTrigger value="adjustments" className="flex items-center gap-1">
            <FileWarning className="h-4 w-4" />
            <span className="hidden sm:inline">Adjustments</span>
          </TabsTrigger>
          <TabsTrigger value="pending-adj" className="flex items-center gap-1">
            <FileClock className="h-4 w-4" />
            <span className="hidden sm:inline">Pending Response</span>
          </TabsTrigger>
          <TabsTrigger value="pending-status" className="flex items-center gap-1">
            <FileQuestion className="h-4 w-4" />
            <span className="hidden sm:inline">Pending Status</span>
          </TabsTrigger>
          <TabsTrigger value="timeouts" className="flex items-center gap-1">
            <FileX className="h-4 w-4" />
            <span className="hidden sm:inline">Timeouts</span>
          </TabsTrigger>
          <TabsTrigger value="acks" className="flex items-center gap-1">
            {stats?.runs?.failed ? (
              <XCircle className="h-4 w-4 text-red-500" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Acknowledgements</span>
          </TabsTrigger>
        </TabsList>

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
      </Tabs>
    </div>
  );
}

export default ReconciliationDashboard;
