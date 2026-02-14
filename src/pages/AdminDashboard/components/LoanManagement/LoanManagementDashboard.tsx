import React, { useState, useEffect } from 'react';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { ThemedButton } from '@/components/ui/ThemedButton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Filter,
  Download,
  Search,
  RefreshCw
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

// Sub-components
import LoanApplicationsList from './LoanApplicationsList';
import LoanReviewPanel from './LoanReviewPanel';
import BulkActionsPanel from './BulkActionsPanel';
import LoanPortfolioOverview from './LoanPortfolioOverview';

interface LoanManagementDashboardProps {
  onLoanSelect?: (loanId: string) => void;
}

const LoanManagementDashboard: React.FC<LoanManagementDashboardProps> = ({ 
  onLoanSelect 
}) => {
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
  const { toast } = useToast();
  const { styles } = useTheme();

  const handleLoanSelection = (loanId: string, selected: boolean) => {
    if (selected) {
      setSelectedLoans(prev => [...prev, loanId]);
    } else {
      setSelectedLoans(prev => prev.filter(id => id !== loanId));
    }
  };

  const handleBulkAction = (action: 'approve' | 'reject' | 'review') => {
    console.log(`Bulk ${action} for loans:`, selectedLoans);
    // Implementation will be added in the specific components
  };

  const clearSelection = () => {
    setSelectedLoans([]);
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    setHasNewItems(false);
  };

  // Realtime subscription for approval_requests
  useEffect(() => {
    // Subscribe to INSERT and UPDATE events on approval_requests
    const channel = supabase
      .channel('loan-applications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'approval_requests',
          filter: 'request_type=eq.loan_application'
        },
        (payload) => {
          console.log('Approval request change detected:', payload);
          
          // Show toast notification
          if (payload.eventType === 'INSERT') {
            setHasNewItems(true);
            toast({
              title: 'New Loan Application',
              description: 'A new loan application has been submitted.',
              duration: 5000,
            });
          } else if (payload.eventType === 'UPDATE') {
            setHasNewItems(true);
            toast({
              title: 'Application Updated',
              description: 'A loan application status has changed.',
              duration: 5000,
            });
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Loan Management</h2>
          <p className="text-muted-foreground">
            Review applications, manage portfolio, and process loan decisions
          </p>
        </div>
        <div className="flex space-x-2">
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
            variant={showFilters ? "primary" : "secondary"} 
            className="h-9 px-3 text-xs"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-2 h-3.5 w-3.5" />
            Filters
          </ThemedButton>
          <ThemedButton variant="secondary" className="h-9 px-3 text-xs">
            <Download className="mr-2 h-3.5 w-3.5" />
            Export
          </ThemedButton>
        </div>
      </div>

      {/* Portfolio Overview Cards */}
      <LoanPortfolioOverview />

      {/* Enhanced Filters Panel */}
      {showFilters && (
        <ThemedCard>
          <div className="mb-4">
            <h3 className={cn("text-lg font-semibold", styles.textClass)}>Filter Applications</h3>
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
                  className={cn("w-full px-3 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-input text-foreground", styles.inputClass)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Date To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className={cn("w-full px-3 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-input text-foreground", styles.inputClass)}
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
                  className={cn("w-full px-3 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-input text-foreground placeholder:text-muted-foreground", styles.inputClass)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Max Amount (NAD)</label>
                <input
                  type="number"
                  value={amountMax}
                  onChange={(e) => setAmountMax(e.target.value)}
                  placeholder="100000"
                  className={cn("w-full px-3 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-input text-foreground placeholder:text-muted-foreground", styles.inputClass)}
                />
              </div>

              {/* Priority Filter (for pending only) */}
              {activeTab === 'pending' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Priority</label>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className={cn("w-full px-3 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring text-foreground", styles.inputClass)}
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending Review
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Approved
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            Rejected
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            All Loans
          </TabsTrigger>
        </TabsList>

        {/* Search and Filter Bar */}
        <div className="flex space-x-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <input
              type="text"
              placeholder="Search by applicant name, ID, or amount..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={cn("w-full pl-10 pr-4 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring focus:border-input text-foreground placeholder:text-muted-foreground", styles.inputClass)}
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={cn("px-3 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring text-foreground", styles.inputClass)}
            data-testid="filter-status-select"
          >
            <option value="all" data-testid="filter-all">All Statuses</option>
            <option value="pending" data-testid="filter-pending">Pending</option>
            <option value="approved" data-testid="filter-approved">Approved</option>
            <option value="rejected" data-testid="filter-rejected">Rejected</option>
            <option value="disbursed" data-testid="filter-disbursed">Disbursed</option>
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
