import { AdaptiveTabs, ResponsiveActionBar } from '@/components/adaptive';
import { ThemedButton } from '@/components/ui/ThemedButton';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { api } from '@/integrations/convex/api';
import { cn } from '@/lib/utils';
import type { Id } from '@/types/convex';
import { useMutation } from 'convex/react';
import {
  CheckCircle,
  Clock,
  Download,
  FileText,
  Filter,
  RefreshCw,
  Search,
  XCircle,
} from 'lucide-react';
import React, { useState } from 'react';

// Sub-components
import BulkActionsPanel from './BulkActionsPanel';
import LoanApplicationsList from './LoanApplicationsList';
import LoanPortfolioOverview from './LoanPortfolioOverview';
import { useLoanActions } from '../../hooks/useLoanActions';

interface LoanManagementDashboardProps {
  onLoanSelect?: (loanId: string) => void;
}

const LoanManagementDashboard: React.FC<LoanManagementDashboardProps> = ({ onLoanSelect }) => {
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedLoans, setSelectedLoans] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Enhanced filters
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Realtime updates
  const [refreshKey, setRefreshKey] = useState(0);
  const [hasNewItems, setHasNewItems] = useState(false);

  const { bulkApproveLoan, bulkRejectLoan } = useLoanActions();
  const moveToReview = useMutation(api.loans.moveToReview);

  const handleLoanSelection = (loanId: string, selected: boolean) => {
    if (selected) {
      setSelectedLoans((prev) => [...prev, loanId]);
    } else {
      setSelectedLoans((prev) => prev.filter((id) => id !== loanId));
    }
  };

  const handleBulkAction = async (action: 'approve' | 'reject' | 'review') => {
    if (selectedLoans.length === 0) return false;
    try {
      if (action === 'approve') return bulkApproveLoan(selectedLoans);
      if (action === 'reject') return bulkRejectLoan(selectedLoans);
      await Promise.all(
        selectedLoans.map((loanId) => moveToReview({ loanId: loanId as Id<'loans'> }))
      );
      return true;
    } catch {
      return false;
    }
  };

  const clearSelection = () => {
    setSelectedLoans([]);
  };

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
    setHasNewItems(false);
  };

  // Note: Convex provides automatic reactivity — no manual subscription needed

  return (
    <div className="space-y-6">
      {/* Header */}
      <ResponsiveActionBar
        title={<h2 className="text-2xl font-bold tracking-tight">Loan Management</h2>}
        description={
          <p className="text-muted-foreground">
            Review applications, manage portfolio, and process loan decisions
          </p>
        }
        actions={
          <>
            {hasNewItems && (
              <ThemedButton
                variant="primary"
                className="h-9 px-3 text-xs bg-blue-600 hover:bg-blue-700 animate-pulse"
                onClick={handleRefresh}
              >
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
                New Items Available
              </ThemedButton>
            )}
            <ThemedButton
              variant={showFilters ? 'primary' : 'secondary'}
              className="h-9 px-3 text-xs"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="mr-2 h-3.5 w-3.5" />
              Filters
            </ThemedButton>
            <ThemedButton
              variant="secondary"
              className="h-9 px-3 text-xs"
              disabled
              title="Loan CSV export is not implemented"
            >
              <Download className="mr-2 h-3.5 w-3.5" />
              Export
            </ThemedButton>
          </>
        }
      />

      {/* Portfolio Overview Cards */}
      <LoanPortfolioOverview />

      {/* Enhanced Filters Panel */}
      {showFilters && (
        <ThemedCard>
          <div className="mb-4">
            <h3 className={cn('text-lg font-semibold', 'font-sans text-[#274F35]')}>
              Filter Applications
            </h3>
          </div>
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Date Range Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Date From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className={cn(
                    'w-full px-3 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-input text-foreground',
                    'rounded-xl border border-[#B9CCB3] bg-white text-[#274F35] placeholder:text-slate-400 focus:border-[#3F713E] focus:ring-[#3F713E]/20'
                  )}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Date To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className={cn(
                    'w-full px-3 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-input text-foreground',
                    'rounded-xl border border-[#B9CCB3] bg-white text-[#274F35] placeholder:text-slate-400 focus:border-[#3F713E] focus:ring-[#3F713E]/20'
                  )}
                />
              </div>

              {/* Amount Range Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Min Amount (NAD)</label>
                <input
                  type="number"
                  value={amountMin}
                  onChange={(e) => setAmountMin(e.target.value)}
                  placeholder="0"
                  className={cn(
                    'w-full px-3 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-input text-foreground placeholder:text-muted-foreground',
                    'rounded-xl border border-[#B9CCB3] bg-white text-[#274F35] placeholder:text-slate-400 focus:border-[#3F713E] focus:ring-[#3F713E]/20'
                  )}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Max Amount (NAD)</label>
                <input
                  type="number"
                  value={amountMax}
                  onChange={(e) => setAmountMax(e.target.value)}
                  placeholder="100000"
                  className={cn(
                    'w-full px-3 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-input text-foreground placeholder:text-muted-foreground',
                    'rounded-xl border border-[#B9CCB3] bg-white text-[#274F35] placeholder:text-slate-400 focus:border-[#3F713E] focus:ring-[#3F713E]/20'
                  )}
                />
              </div>

              {/* Priority Filter (for pending only) */}
              {activeTab === 'pending' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Priority</label>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className={cn(
                      'w-full px-3 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring text-foreground',
                      'rounded-xl border border-[#B9CCB3] bg-white text-[#274F35] placeholder:text-slate-400 focus:border-[#3F713E] focus:ring-[#3F713E]/20'
                    )}
                  >
                    <option value="all">All Priorities</option>
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              )}

              {/* Clear Filters Button */}
              <div className="flex items-end">
                <ThemedButton
                  variant="secondary"
                  className="w-full h-[42px]"
                  onClick={() => {
                    setDateFrom('');
                    setDateTo('');
                    setAmountMin('');
                    setAmountMax('');
                    setPriorityFilter('all');
                  }}
                >
                  Clear Filters
                </ThemedButton>
              </div>
            </div>
          </div>
        </ThemedCard>
      )}

      {/* Bulk Actions Panel */}
      {selectedLoans.length > 0 && (
        <BulkActionsPanel
          selectedCount={selectedLoans.length}
          onBulkAction={handleBulkAction}
          onClearSelection={clearSelection}
        />
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <AdaptiveTabs
          desktopColumns={4}
          items={[
            { value: 'pending', label: 'Pending Review', shortLabel: 'Pending', icon: Clock },
            { value: 'approved', label: 'Approved', icon: CheckCircle },
            { value: 'rejected', label: 'Rejected', icon: XCircle },
            { value: 'all', label: 'All Loans', shortLabel: 'All', icon: FileText },
          ]}
        />

        {/* Search and Filter Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <input
              type="text"
              placeholder="Search by applicant name, ID, or amount..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={cn(
                'w-full pl-10 pr-4 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-input text-foreground placeholder:text-muted-foreground',
                'rounded-xl border border-[#B9CCB3] bg-white text-[#274F35] placeholder:text-slate-400 focus:border-[#3F713E] focus:ring-[#3F713E]/20'
              )}
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={cn(
              'w-full px-3 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring text-foreground sm:w-48',
              'rounded-xl border border-[#B9CCB3] bg-white text-[#274F35] placeholder:text-slate-400 focus:border-[#3F713E] focus:ring-[#3F713E]/20'
            )}
            data-testid="filter-status-select"
          >
            <option value="all" data-testid="filter-all">
              All Statuses
            </option>
            <option value="pending" data-testid="filter-pending">
              Pending
            </option>
            <option value="approved" data-testid="filter-approved">
              Approved
            </option>
            <option value="rejected" data-testid="filter-rejected">
              Rejected
            </option>
            <option value="disbursed" data-testid="filter-disbursed">
              Disbursed
            </option>
          </select>
        </div>

        {/* Tab Content */}
        <TabsContent value="pending" className="space-y-4">
          <LoanApplicationsList
            status="pending"
            searchTerm={searchTerm}
            selectedLoans={selectedLoans}
            onLoanSelect={handleLoanSelection}
            onLoanClick={onLoanSelect}
            dateFrom={dateFrom}
            dateTo={dateTo}
            amountMin={amountMin ? parseFloat(amountMin) : undefined}
            amountMax={amountMax ? parseFloat(amountMax) : undefined}
            priority={priorityFilter !== 'all' ? priorityFilter : undefined}
            refreshKey={refreshKey}
          />
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          <LoanApplicationsList
            status="approved"
            searchTerm={searchTerm}
            selectedLoans={selectedLoans}
            onLoanSelect={handleLoanSelection}
            onLoanClick={onLoanSelect}
            dateFrom={dateFrom}
            dateTo={dateTo}
            amountMin={amountMin ? parseFloat(amountMin) : undefined}
            amountMax={amountMax ? parseFloat(amountMax) : undefined}
            refreshKey={refreshKey}
          />
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          <LoanApplicationsList
            status="rejected"
            searchTerm={searchTerm}
            selectedLoans={selectedLoans}
            onLoanSelect={handleLoanSelection}
            onLoanClick={onLoanSelect}
            dateFrom={dateFrom}
            dateTo={dateTo}
            amountMin={amountMin ? parseFloat(amountMin) : undefined}
            amountMax={amountMax ? parseFloat(amountMax) : undefined}
            refreshKey={refreshKey}
          />
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <LoanApplicationsList
            status="all"
            searchTerm={searchTerm}
            selectedLoans={selectedLoans}
            onLoanSelect={handleLoanSelection}
            onLoanClick={onLoanSelect}
            dateFrom={dateFrom}
            dateTo={dateTo}
            amountMin={amountMin ? parseFloat(amountMin) : undefined}
            amountMax={amountMax ? parseFloat(amountMax) : undefined}
            refreshKey={refreshKey}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LoanManagementDashboard;
