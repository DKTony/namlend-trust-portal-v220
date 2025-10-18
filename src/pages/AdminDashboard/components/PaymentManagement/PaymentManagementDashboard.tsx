import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  CreditCard, 
  Search, 
  Filter, 
  Download, 
  Plus,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  TrendingUp,
  Users,
  RefreshCw
} from 'lucide-react';

// Sub-components
import PaymentOverview from './PaymentOverview';
import PaymentsList from './PaymentsList';
import DisbursementManager from './DisbursementManager';
import OverdueManager from './OverdueManager';
import CollectionsCenter from './CollectionsCenter';

interface PaymentManagementDashboardProps {
  onPaymentSelect?: (paymentId: string) => void;
}

const PaymentManagementDashboard: React.FC<PaymentManagementDashboardProps> = ({ 
  onPaymentSelect 
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Realtime updates
  const [refreshKey, setRefreshKey] = useState(0);
  const [hasNewPayments, setHasNewPayments] = useState(false);
  const { toast } = useToast();

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    setHasNewPayments(false);
  };

  // Realtime subscription for payments
  useEffect(() => {
    const channel = supabase
      .channel('payments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments'
        },
        (payload) => {
          console.log('Payment change detected:', payload);
          
          if (payload.eventType === 'INSERT') {
            setHasNewPayments(true);
            toast({
              title: 'New Payment',
              description: 'A new payment has been initiated.',
              duration: 5000,
            });
          } else if (payload.eventType === 'UPDATE') {
            setHasNewPayments(true);
            toast({
              title: 'Payment Updated',
              description: 'A payment status has changed.',
              duration: 5000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <p className="text-muted-foreground">
            Manage payments, disbursements, and collections
          </p>
        </div>
        <div className="flex space-x-2">
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
        </div>
      </div>

      {/* Payment Overview */}
      <PaymentOverview />

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            All Payments
          </TabsTrigger>
          <TabsTrigger value="disbursements" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Disbursements
          </TabsTrigger>
          <TabsTrigger value="overdue" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Overdue
          </TabsTrigger>
          <TabsTrigger value="collections" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Collections
          </TabsTrigger>
          <TabsTrigger value="reconciliation" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Reconciliation
          </TabsTrigger>
        </TabsList>

        {/* Search and Filter Bar */}
        <div className="flex space-x-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search by client name, payment ID, or amount..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
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
          <PaymentsList
            status="all"
            searchTerm={searchTerm}
            onPaymentSelect={onPaymentSelect}
          />
        </TabsContent>

        <TabsContent value="disbursements" className="space-y-4">
          <DisbursementManager status={filterStatus as any} searchTerm={searchTerm} />
        </TabsContent>

        <TabsContent value="overdue" className="space-y-4">
          <OverdueManager />
        </TabsContent>

        <TabsContent value="collections" className="space-y-4">
          <CollectionsCenter />
        </TabsContent>

        <TabsContent value="reconciliation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Reconciliation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Reconciliation Tools</h3>
                <p className="text-gray-500">
                  Payment reconciliation and matching tools will be displayed here
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PaymentManagementDashboard;
