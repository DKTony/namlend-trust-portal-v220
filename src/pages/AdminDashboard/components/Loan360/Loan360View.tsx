/**
 * Loan 360° View Component
 * Unified view of all loan information in one place.
 * Refactored into tab sub-components for maintainability.
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AdaptiveTabs } from '@/components/adaptive/AdaptiveTabs';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { api } from '@/integrations/convex/api';
import type { Id, QueryItem } from '@/types/convex';
import { useQuery } from 'convex/react';
import { Eye, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { LoanSummaryCards } from './components/LoanSummaryCards';
import { CollectionsTab } from './tabs/CollectionsTab';
import { DocumentsTab } from './tabs/DocumentsTab';
import { OverviewTab } from './tabs/OverviewTab';
import { PaymentsTab } from './tabs/PaymentsTab';
import { PromisesTab } from './tabs/PromisesTab';
import { TimelineTab } from './tabs/TimelineTab';

interface Loan360Props {
  loanId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function Loan360View({ loanId, isOpen, onClose }: Loan360Props) {
  const [activeTab, setActiveTab] = useState('overview');

  // Convex reactive queries — skip when dialog is closed
  const rawLoan = useQuery(
    api.loans.getLoan,
    isOpen && loanId ? { loanId: loanId as Id<'loans'> } : 'skip'
  );

  const rawClient = useQuery(
    api.users.getUserProfile,
    isOpen && rawLoan?.userId ? { userId: rawLoan.userId } : 'skip'
  );

  // Reactive queries for all loan sub-resources
  const rawPayments = useQuery(
    api.payments.getPaymentsByLoan,
    isOpen && loanId ? { loanId: loanId as Id<'loans'> } : 'skip'
  );

  const rawDocuments = useQuery(
    api.loanDocuments.getLoanDocuments,
    isOpen && loanId ? { loanId: loanId as Id<'loans'> } : 'skip'
  );

  const rawInteractions = useQuery(
    api.collections.listInteractionsByLoan,
    isOpen && loanId ? { loanId: loanId as Id<'loans'> } : 'skip'
  );

  const rawPromises = useQuery(
    api.collections.listPromisesToPay,
    isOpen && loanId ? { loanId: loanId as Id<'loans'> } : 'skip'
  );

  const loading = isOpen && loanId ? rawLoan === undefined : false;

  // Transform Convex data to legacy shapes expected by sub-components
  const loan = useMemo(() => {
    if (!rawLoan) return null;
    return {
      id: String(rawLoan._id),
      user_id: String(rawLoan.userId ?? ''),
      amount: rawLoan.amount ?? rawLoan.principal ?? 0,
      total_repayment: rawLoan.totalRepayment ?? rawLoan.principal ?? 0,
      monthly_payment: rawLoan.monthlyPayment ?? 0,
      term_months: rawLoan.termMonths ?? 0,
      interest_rate: rawLoan.interestRate ?? 0,
      purpose: rawLoan.purpose ?? '',
      status: rawLoan.status ?? 'pending',
      created_at: rawLoan._creationTime ? new Date(rawLoan._creationTime).toISOString() : '',
      disbursed_at: rawLoan.disbursedAt ? new Date(rawLoan.disbursedAt).toISOString() : undefined,
      // Canonical credit scoring fields (N1)
      creditScore: rawLoan.creditScore ?? null,
      debtToIncomeRatio: rawLoan.debtToIncomeRatio ?? null,
      recommendation: rawLoan.recommendation ?? null,
    };
  }, [rawLoan]);

  const client = useMemo(() => {
    if (!rawClient) return null;
    return {
      first_name: rawClient.fullName?.split(' ')[0] ?? '',
      last_name: rawClient.fullName?.split(' ').slice(1).join(' ') ?? '',
      email: rawClient.email ?? '',
      phone_number: rawClient.phone ?? '',
      // Fields required by OverviewTab
      id_number: rawClient.idNumber ?? undefined,
      employment_status: rawClient.employmentStatus ?? 'Not specified',
      employer_name: undefined,
      monthly_income: rawClient.monthlyIncome ?? 0,
      verified: rawClient.kycStatus === 'verified',
    };
  }, [rawClient]);

  const payments = useMemo(() => {
    if (!rawPayments) return [];
    type RawPayment = QueryItem<typeof api.payments.getPaymentsByLoan>;
    return rawPayments.map((p: RawPayment) => ({
      id: String(p._id),
      amount: p.amount ?? 0,
      payment_method: p.paymentMethod ?? 'manual',
      reference_number: p.referenceNumber ?? String(p._id),
      status: p.status ?? 'pending',
      paid_at: p.paidAt ? new Date(p.paidAt).toISOString() : '',
      created_at: p.createdAt ? new Date(p.createdAt).toISOString() : '',
    }));
  }, [rawPayments]);

  // Wire Convex queries — fall back to empty array while loading
  const documents = useMemo(
    () =>
      (rawDocuments ?? []).map((doc) => ({
        id: String(doc.id),
        file_name: doc.fileName,
        document_type: doc.documentType,
        status: doc.status,
        created_at: new Date(doc.uploadedAt).toISOString(),
        file_size: doc.fileSize,
        mime_type: doc.mimeType,
        file_available: doc.fileAvailable,
        review_notes: doc.reviewNotes,
      })),
    [rawDocuments]
  );
  const interactions = useMemo(
    () =>
      (rawInteractions ?? []).map((interaction) => ({
        id: String(interaction._id),
        interaction_type: interaction.activityType ?? interaction.interactionType ?? 'interaction',
        outcome: interaction.outcome,
        notes: interaction.notes,
        created_at: new Date(interaction.createdAt).toISOString(),
        created_by: String(interaction.agentId ?? interaction.userId ?? ''),
      })),
    [rawInteractions]
  );
  const promises = useMemo(
    () =>
      (rawPromises ?? []).map((promise) => ({
        id: String(promise._id),
        promised_amount: promise.amount,
        promised_date: new Date(promise.promiseDate).toISOString(),
        status: promise.status,
        notes: promise.notes,
      })),
    [rawPromises]
  );

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
        return 'bg-green-100  text-green-800  border-green-200 ';
      case 'pending':
      case 'under_review':
        return 'bg-yellow-100  text-yellow-800  border-yellow-200 ';
      case 'rejected':
      case 'defaulted':
        return 'bg-red-100  text-red-800  border-red-200 ';
      default:
        return 'bg-gray-100  text-gray-800  border-gray-200 ';
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
          <DialogDescription className="sr-only">
            Comprehensive loan overview with financials, schedule, and history
          </DialogDescription>
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
              <AdaptiveTabs
                items={[
                  { value: 'overview', label: 'Overview' },
                  {
                    value: 'payments',
                    label: `Payments (${payments.length})`,
                    shortLabel: `Pay (${payments.length})`,
                  },
                  {
                    value: 'documents',
                    label: `Documents (${documents.length})`,
                    shortLabel: `Docs (${documents.length})`,
                  },
                  {
                    value: 'collections',
                    label: `Collections (${interactions.length})`,
                    shortLabel: `Coll (${interactions.length})`,
                  },
                  { value: 'promises', label: `PTP (${promises.length})` },
                  { value: 'timeline', label: 'Timeline' },
                ]}
              />
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
                    creditScore={loan.creditScore}
                    debtToIncomeRatio={loan.debtToIncomeRatio}
                    recommendation={loan.recommendation}
                  />
                </TabsContent>
                <TabsContent value="payments" className="mt-0">
                  <PaymentsTab payments={payments} />
                </TabsContent>
                <TabsContent value="documents" className="mt-0">
                  <DocumentsTab loanId={loanId} />
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
