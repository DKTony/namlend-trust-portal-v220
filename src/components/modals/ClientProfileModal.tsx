import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api, type Id } from '@/integrations/convex/api';
import { cn } from '@/lib/utils';
import { formatNAD } from '@/utils/currency';
import { useQuery as useConvexQuery } from 'convex/react';
import {
  AlertCircle,
  Briefcase,
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  History,
  Phone,
  ShieldCheck,
  TrendingUp,
  User,
} from 'lucide-react';
import React, { useMemo } from 'react';

interface ClientProfileModalProps {
  open: boolean;
  onClose: () => void;
  userId: string | null;
}

export const ClientProfileModal: React.FC<ClientProfileModalProps> = ({
  open,
  onClose,
  userId,
}) => {
  // Convex reactive queries — skip when dialog is closed (N2 — no as any)
  const rawProfile = useConvexQuery(
    api.users.getUserProfile,
    open && userId ? { userId: userId as Id<'users'> } : 'skip'
  );

  const rawLoans = useConvexQuery(api.loans.adminListLoans, open && userId ? {} : 'skip');

  const rawApprovals = useConvexQuery(
    api.approvalWorkflow.adminListApprovals,
    open && userId ? {} : 'skip'
  );

  const loading = open && userId ? rawProfile === undefined : false;

  const profile = useMemo(() => {
    if (!rawProfile) return null;
    return {
      first_name: rawProfile.fullName?.split(' ')[0] ?? '',
      last_name: rawProfile.fullName?.split(' ').slice(1).join(' ') ?? '',
      phone_number: rawProfile.phone ?? '',
      id_number: rawProfile.idNumber ?? '',
      email: rawProfile.email ?? '',
      employment_status: rawProfile.employmentStatus ?? '',
      monthly_income: rawProfile.monthlyIncome ?? 0,
      credit_score: rawProfile.creditScore ?? null,
      verified: rawProfile.kycStatus === 'verified',
      employer_name: rawProfile.employerName ?? '',
    };
  }, [rawProfile]);

  const loans = useMemo(() => {
    if (!rawLoans || !userId) return [];
    return rawLoans
      .filter((l) => String(l.userId) === String(userId))
      .map((l) => ({
        id: String(l._id),
        amount: l.principal ?? 0,
        term_months: l.termMonths ?? 0,
        interest_rate: l.interestRate ?? 0,
        monthly_payment: l.monthlyPayment ?? 0,
        total_repayment: 0,
        purpose: l.purpose ?? '',
        status: l.status ?? 'pending',
        created_at: new Date(l._creationTime).toISOString(),
      }));
  }, [rawLoans, userId]);

  const payments: {
    amount: number;
    created_at: string;
    id: string;
    payment_method?: string;
    reference_number?: string;
    status: string;
  }[] = [];
  const documents: { id: string; name: string; status: string }[] = [];

  const activities = useMemo(() => {
    if (!rawApprovals || !userId) return [];
    return rawApprovals
      .filter((a) => String(a.requestedBy) === String(userId))
      .slice(0, 10)
      .map((a) => ({
        id: String(a._id),
        request_type: a.entityType ?? '',
        status: a.status ?? 'pending',
        priority: a.priority ?? 'normal',
        created_at: new Date(a.createdAt).toISOString(),
      }));
  }, [rawApprovals, userId]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-NA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; icon: React.ReactNode }> = {
      pending: {
        className:
          'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
        icon: <Clock className="h-3 w-3" />,
      },
      approved: {
        className:
          'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-800',
        icon: <CheckCircle className="h-3 w-3" />,
      },
      active: {
        className:
          'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800',
        icon: <TrendingUp className="h-3 w-3" />,
      },
      completed: {
        className:
          'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700',
        icon: <CheckCircle className="h-3 w-3" />,
      },
      rejected: {
        className:
          'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800',
        icon: <AlertCircle className="h-3 w-3" />,
      },
    };

    const variant = variants[status] || variants.pending;
    return (
      <Badge
        variant="outline"
        className={cn('flex items-center space-x-1.5 px-2.5 py-0.5 font-medium', variant.className)}
      >
        {variant.icon}
        <span className="capitalize">{status}</span>
      </Badge>
    );
  };

  if (!userId) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden p-0 gap-0 bg-background border-border flex flex-col">
        {/* Header Section */}
        <DialogHeader className="p-6 border-b border-border bg-background/95 backdrop-blur-xl shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              Client Profile
            </DialogTitle>
            <DialogDescription className="sr-only">
              View client profile details, loan history, and KYC information
            </DialogDescription>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-muted-foreground">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mb-4"></div>
            <p className="text-sm">Loading client data...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {profile && (
              <div className="p-6 pb-2">
                <div className="bg-gradient-to-br from-card to-card/50 rounded-2xl border border-border p-6 shadow-soft">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="flex items-start gap-5">
                      <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center border border-border shadow-inner">
                        <User className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-2xl font-bold text-foreground tracking-tight">
                            {profile.first_name} {profile.last_name}
                          </h3>
                          <Badge
                            variant={profile.verified ? 'default' : 'outline'}
                            className={cn(
                              'rounded-md px-2 py-0.5 text-xs font-medium border-0',
                              profile.verified
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-muted text-muted-foreground'
                            )}
                          >
                            {profile.verified ? 'Verified ID' : 'Unverified'}
                          </Badge>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5" />
                            <span>{profile.phone_number}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5" />
                            <span className="font-mono">{profile.id_number}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Briefcase className="h-3.5 w-3.5" />
                            <span className="capitalize">{profile.employment_status || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="bg-background/50 rounded-xl p-3 px-4 border border-border">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                          Monthly Income
                        </p>
                        <p className="text-lg font-bold text-foreground">
                          {formatNAD(profile.monthly_income || 0)}
                        </p>
                      </div>
                      <div className="bg-background/50 rounded-xl p-3 px-4 border border-border">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                          Credit Score
                        </p>
                        <p className="text-lg font-bold text-blue-500 dark:text-blue-400">
                          {profile.credit_score || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="p-6 pt-2">
              <Tabs defaultValue="loans" className="w-full">
                <TabsList className="w-full justify-start bg-transparent border-b border-border p-0 h-auto gap-6 rounded-none mb-6">
                  {['loans', 'payments', 'documents', 'activity'].map((tab) => (
                    <TabsTrigger
                      key={tab}
                      value={tab}
                      className="rounded-none border-b-2 border-transparent px-0 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary text-muted-foreground hover:text-foreground transition-colors capitalize font-medium"
                    >
                      {tab}
                      <span className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">
                        {tab === 'loans'
                          ? loans.length
                          : tab === 'payments'
                            ? payments.length
                            : tab === 'documents'
                              ? documents.length
                              : activities.length}
                      </span>
                    </TabsTrigger>
                  ))}
                </TabsList>

                {/* Loans Tab */}
                <TabsContent value="loans" className="m-0 space-y-3">
                  {loans.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground border border-dashed border-border rounded-xl">
                      <FileText className="h-10 w-10 mx-auto mb-3 opacity-20" />
                      <p>No active loans</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {loans.map((loan) => (
                        <div
                          key={loan.id}
                          className="group flex items-center justify-between p-4 bg-card hover:bg-accent/50 rounded-xl border border-border hover:border-accent transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                              <DollarSign className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-3">
                                <span className="font-bold text-foreground">
                                  {formatNAD(loan.amount)}
                                </span>
                                {getStatusBadge(loan.status)}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" /> {loan.term_months}mo
                                </span>
                                <span className="flex items-center gap-1">
                                  <TrendingUp className="h-3 w-3" /> {loan.interest_rate}%
                                </span>
                                <span className="flex items-center gap-1">
                                  <FileText className="h-3 w-3" /> {loan.purpose}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground mb-0.5">
                                Applied {formatDate(loan.created_at)}
                              </p>
                              <p className="text-[10px] font-mono text-muted-foreground">
                                ID: {loan.id.slice(0, 8)}
                              </p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Payments Tab */}
                <TabsContent value="payments" className="m-0 space-y-3">
                  {payments.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground border border-dashed border-border rounded-xl">
                      <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-20" />
                      <p>No payment history</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {payments.map((payment) => (
                        <div
                          key={payment.id}
                          className="group flex items-center justify-between p-4 bg-card hover:bg-accent/50 rounded-xl border border-border hover:border-accent transition-all"
                        >
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:text-green-500 transition-colors">
                              <CheckCircle className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-3">
                                <span className="font-bold text-foreground">
                                  {formatNAD(payment.amount)}
                                </span>
                                {getStatusBadge(payment.status)}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                <span className="flex items-center gap-1 capitalize">
                                  <CreditCard className="h-3 w-3" /> {payment.payment_method}
                                </span>
                                {payment.reference_number && (
                                  <span className="flex items-center gap-1 font-mono">
                                    <FileText className="h-3 w-3" /> {payment.reference_number}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground mb-0.5">
                              {formatDate(payment.created_at)}
                            </p>
                            <p className="text-[10px] font-mono text-muted-foreground">
                              ID: {payment.id.slice(0, 8)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Documents Tab */}
                <TabsContent value="documents" className="m-0">
                  <div className="p-12 text-center text-muted-foreground border border-dashed border-border rounded-xl">
                    <ShieldCheck className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p>Secure Document Storage</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      KYC documents and contracts will appear here.
                    </p>
                  </div>
                </TabsContent>

                {/* Activity Tab */}
                <TabsContent value="activity" className="m-0 space-y-3">
                  {activities.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground border border-dashed border-border rounded-xl">
                      <History className="h-10 w-10 mx-auto mb-3 opacity-20" />
                      <p>No recent activity</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {activities.map((activity) => (
                        <div
                          key={activity.id}
                          className="flex items-center justify-between p-4 bg-card rounded-xl border border-border"
                        >
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                              <History className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-foreground">
                                  {activity.request_type}
                                </span>
                                {getStatusBadge(activity.status)}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Priority:{' '}
                                <span className="capitalize text-foreground">
                                  {activity.priority}
                                </span>
                              </p>
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground font-mono">
                            {formatDate(activity.created_at)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ClientProfileModal;
