/**
 * Loan 360° View Component
 * Unified view of all loan information in one place.
 * Refactored into tab sub-components for maintainability.
 */

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LoanSummaryCards } from './components/LoanSummaryCards';
import { OverviewTab } from './tabs/OverviewTab';
import { PaymentsTab } from './tabs/PaymentsTab';
import { DocumentsTab } from './tabs/DocumentsTab';
import { CollectionsTab } from './tabs/CollectionsTab';
import { PromisesTab } from './tabs/PromisesTab';
import { TimelineTab } from './tabs/TimelineTab';

interface Loan360Props {
  loanId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function Loan360View({ loanId, isOpen, onClose }: Loan360Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [loan, setLoan] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [interactions, setInteractions] = useState<any[]>([]);
  const [promises, setPromises] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && loanId) fetchAllData();
  }, [isOpen, loanId]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const { data: loanData, error: loanError } = await supabase
        .from('loans')
        .select('*')
        .eq('id', loanId)
        .single();
      if (loanError) throw loanError;
      setLoan(loanData);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', loanData.user_id)
        .single();
      setClient(profileData);

      const { data: paymentsData } = await supabase
        .from('payments')
        .select('*')
        .eq('loan_id', loanId)
        .order('paid_at', { ascending: false });
      setPayments(paymentsData || []);

      const { data: docsData } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', loanData.user_id)
        .order('created_at', { ascending: false });
      setDocuments(docsData || []);

      const { data: interactionsData } = await supabase
        .from('collections_interactions')
        .select('*')
        .eq('loan_id', loanId)
        .order('created_at', { ascending: false });
      setInteractions(interactionsData || []);

      const { data: promisesData } = await supabase
        .from('promise_to_pay')
        .select('*')
        .eq('loan_id', loanId)
        .order('promised_date', { ascending: false });
      setPromises(promisesData || []);
    } catch (error) {
      console.error('Error fetching loan 360 data:', error);
      toast({ title: 'Error', description: 'Failed to load loan details', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const totalPaid = payments.reduce(
    (sum, p) => (p.status === 'completed' ? sum + p.amount : sum),
    0
  );
  const remainingBalance = loan ? loan.total_repayment - totalPaid : 0;
  const progressPercent = loan ? (totalPaid / loan.total_repayment) * 100 : 0;
  const paymentsMade = payments.filter((p) => p.status === 'completed').length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'disbursed':
      case 'completed':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800';
      case 'pending':
      case 'under_review':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
      case 'rejected':
      case 'defaulted':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700';
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Loan 360° View
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : loan && client ? (
          <div className="flex flex-col h-[calc(90vh-120px)]">
            <LoanSummaryCards
              loan={loan}
              client={client}
              remainingBalance={remainingBalance}
              progressPercent={progressPercent}
              getStatusColor={getStatusColor}
            />
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <TabsList className="grid grid-cols-6 w-full">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="payments">Payments ({payments.length})</TabsTrigger>
                <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
                <TabsTrigger value="collections">Collections ({interactions.length})</TabsTrigger>
                <TabsTrigger value="promises">PTP ({promises.length})</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
              </TabsList>
              <ScrollArea className="flex-1 mt-4">
                <TabsContent value="overview" className="mt-0">
                  <OverviewTab
                    loan={loan}
                    client={client}
                    totalPaid={totalPaid}
                    remainingBalance={remainingBalance}
                    progressPercent={progressPercent}
                    paymentsMade={paymentsMade}
                    monthlyPayment={loan.monthly_payment}
                  />
                </TabsContent>
                <TabsContent value="payments" className="mt-0">
                  <PaymentsTab payments={payments} />
                </TabsContent>
                <TabsContent value="documents" className="mt-0">
                  <DocumentsTab documents={documents} />
                </TabsContent>
                <TabsContent value="collections" className="mt-0">
                  <CollectionsTab interactions={interactions} />
                </TabsContent>
                <TabsContent value="promises" className="mt-0">
                  <PromisesTab promises={promises} />
                </TabsContent>
                <TabsContent value="timeline" className="mt-0">
                  <TimelineTab loan={loan} />
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">Loan not found</div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default Loan360View;
