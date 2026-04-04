/**
 * Collections Dashboard Component
 * Provides a comprehensive view of overdue loans with risk buckets
 */

import React, { useState, useMemo } from 'react';
import { useQuery as useConvexQuery, useMutation as useConvexMutation } from 'convex/react';
import { type Id } from '@/integrations/convex/api';
import { api } from '@/integrations/convex/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Phone,
  MessageSquare,
  Mail,
  Calendar,
  Clock,
  AlertTriangle,
  Search,
  RefreshCw,
  Loader2,
  User,
  DollarSign,
  TrendingUp,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
  HandshakeIcon,
} from 'lucide-react';
import { formatNAD } from '@/utils/currency';
import { useToast } from '@/hooks/use-toast';
import { handleMutationError } from '@/lib/mutationError';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Local view models — typed to match actual Convex query return shapes (N3)
// ---------------------------------------------------------------------------

/** Normalised queue row derived from Convex paymentSchedules + daysOverdue */
interface QueueItem {
  /** Convex Id<"loans"> stored as string for display/routing */
  loanId: Id<'loans'>;
  loanIdStr: string;
  daysOverdue: number;
  /** Risk bucket derived from daysOverdue */
  riskBucket: 'current' | 'bucket_1_30' | 'bucket_31_60' | 'bucket_61_90' | 'bucket_90_plus';
  totalDue: number;
  principalDue: number;
  interestDue: number;
  dueDate: number;
  status: string;
}

/** Flat stats view derived from Convex getCollectionsStats nested return */
interface StatsView {
  total_overdue: number;
  bucket_1_30: number;
  bucket_31_60: number;
  bucket_61_90: number;
  bucket_90_plus: number;
  pending_promises: number;
  promises_due_today: number;
  contacts_today: number;
  pending_reschedules: number;
}

function daysToRiskBucket(days: number): QueueItem['riskBucket'] {
  if (days <= 0) return 'current';
  if (days <= 30) return 'bucket_1_30';
  if (days <= 60) return 'bucket_31_60';
  if (days <= 90) return 'bucket_61_90';
  return 'bucket_90_plus';
}

// Risk bucket configuration
const RISK_BUCKETS = [
  {
    id: 'all',
    label: 'All',
    color: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
  },
  {
    id: 'current',
    label: 'Current',
    color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  },
  {
    id: 'bucket_1_30',
    label: '1-30 Days',
    color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  },
  {
    id: 'bucket_31_60',
    label: '31-60 Days',
    color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  },
  {
    id: 'bucket_61_90',
    label: '61-90 Days',
    color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  },
  {
    id: 'bucket_90_plus',
    label: '90+ Days',
    color: 'bg-red-200 dark:bg-red-900/50 text-red-800 dark:text-red-300',
  },
];

const INTERACTION_TYPES: Array<{
  value: 'call_attempt' | 'sms_sent' | 'email_sent' | 'whatsapp_sent' | 'note';
  label: string;
  icon: React.ElementType;
}> = [
  { value: 'call_attempt', label: 'Phone Call', icon: Phone },
  { value: 'sms_sent', label: 'SMS', icon: MessageSquare },
  { value: 'email_sent', label: 'Email', icon: Mail },
  { value: 'whatsapp_sent', label: 'WhatsApp', icon: MessageSquare },
  { value: 'note', label: 'Note', icon: FileText },
];

const OUTCOMES = [
  { value: 'contacted', label: 'Contacted' },
  { value: 'no_answer', label: 'No Answer' },
  { value: 'promised', label: 'Promised to Pay' },
  { value: 'refused', label: 'Refused' },
  { value: 'wrong_number', label: 'Wrong Number' },
  { value: 'callback_requested', label: 'Callback Requested' },
  { value: 'paid', label: 'Paid' },
  { value: 'escalated', label: 'Escalated' },
  { value: 'other', label: 'Other' },
];

export function CollectionsDashboard() {
  const { toast } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBucket, setSelectedBucket] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);

  // Dialog states
  const [showInteractionDialog, setShowInteractionDialog] = useState(false);
  const [showPTPDialog, setShowPTPDialog] = useState(false);
  const [interactionType, setInteractionType] = useState<
    'call_attempt' | 'sms_sent' | 'email_sent' | 'whatsapp_sent' | 'note'
  >('call_attempt');
  const [outcome, setOutcome] = useState('');
  const [notes, setNotes] = useState('');
  const [nextActionDate, setNextActionDate] = useState('');
  const [ptpAmount, setPtpAmount] = useState('');
  const [ptpDate, setPtpDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Convex reactive queries
  const rawQueue = useConvexQuery(api.collections.getCollectionsQueue, {});
  const rawStats = useConvexQuery(api.collections.getCollectionsStats);

  // Convex mutations (N3 — wired with proper Id<"loans"> types)
  const recordInteraction = useConvexMutation(api.collections.recordInteraction);
  const createPromiseToPay = useConvexMutation(api.collections.createPromiseToPay);

  const loading = rawQueue === undefined;

  // Map Convex paymentSchedules rows → typed QueueItem view model (N3)
  const queue: QueueItem[] = useMemo(() => {
    if (!rawQueue) return [];

    let items: QueueItem[] = rawQueue.map((row) => ({
      loanId: row.loanId,
      loanIdStr: String(row.loanId),
      daysOverdue: row.daysOverdue,
      riskBucket: daysToRiskBucket(row.daysOverdue),
      totalDue: row.totalDue ?? 0,
      principalDue: row.principalDue ?? 0,
      interestDue: row.interestDue ?? 0,
      dueDate: row.dueDate,
      status: row.status ?? 'overdue',
    }));

    if (selectedBucket !== 'all') {
      items = items.filter((i) => i.riskBucket === selectedBucket);
    }

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      items = items.filter((i) => i.loanIdStr.toLowerCase().includes(lower));
    }

    return items;
  }, [rawQueue, selectedBucket, searchTerm]);

  // Map Convex nested stats → flat StatsView (N3)
  const stats: StatsView | null = useMemo(() => {
    if (!rawStats) return null;
    const MS_PER_DAY = 86_400_000;
    const now = Date.now();
    const overdue = rawStats.overdue;
    // Derive bucket counts from rawQueue when available
    const q = rawQueue ?? [];
    return {
      total_overdue: overdue.count,
      bucket_1_30: q.filter((r) => r.daysOverdue > 0 && r.daysOverdue <= 30).length,
      bucket_31_60: q.filter((r) => r.daysOverdue > 30 && r.daysOverdue <= 60).length,
      bucket_61_90: q.filter((r) => r.daysOverdue > 60 && r.daysOverdue <= 90).length,
      bucket_90_plus: rawStats.overdue.over90Days,
      pending_promises: rawStats.promiseToPay.pending,
      promises_due_today: 0,
      contacts_today: rawStats.interactions.thisWeek,
      pending_reschedules: 0,
    };
  }, [rawStats, rawQueue]);

  const fetchData = (_showRefresh?: boolean) => {}; // Convex is reactive

  // Handle interaction submission — wired to Convex mutation (N3)
  const handleInteractionSubmit = async () => {
    if (!selectedItem) return;

    setSubmitting(true);
    try {
      await recordInteraction({
        loanId: selectedItem.loanId,
        activityType: interactionType,
        activityStatus: 'completed',
        contactMethod:
          interactionType === 'call_attempt'
            ? 'phone'
            : interactionType === 'sms_sent'
              ? 'sms'
              : interactionType === 'email_sent'
                ? 'email'
                : interactionType === 'whatsapp_sent'
                  ? 'whatsapp'
                  : undefined,
        outcome: outcome || undefined,
        notes: notes || undefined,
        nextActionDate: nextActionDate ? new Date(nextActionDate).getTime() : undefined,
      });
      toast({
        title: 'Interaction Logged',
        description: 'The interaction has been recorded successfully.',
      });
      setShowInteractionDialog(false);
      resetInteractionForm();
    } catch (error) {
      toast({
        title: 'Error',
        description: handleMutationError(error, 'Failed to log interaction'),
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle PTP submission — wired to Convex mutation (N3)
  const handlePTPSubmit = async () => {
    if (!selectedItem || !ptpAmount || !ptpDate) return;

    setSubmitting(true);
    try {
      await createPromiseToPay({
        loanId: selectedItem.loanId,
        promiseDate: new Date(ptpDate).getTime(),
        promiseAmount: parseFloat(ptpAmount),
        notes: notes || undefined,
      });
      toast({
        title: 'Promise Recorded',
        description: 'The promise to pay has been recorded successfully.',
      });
      setShowPTPDialog(false);
      resetPTPForm();
    } catch (error) {
      toast({
        title: 'Error',
        description: handleMutationError(error, 'Failed to record promise to pay'),
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetInteractionForm = () => {
    setInteractionType('call_attempt');
    setOutcome('');
    setNotes('');
    setNextActionDate('');
  };

  const resetPTPForm = () => {
    setPtpAmount('');
    setPtpDate('');
    setNotes('');
  };

  const getRiskBucketBadge = (bucket: string) => {
    const config = RISK_BUCKETS.find((b) => b.id === bucket);
    return config ? (
      <Badge className={cn('font-normal', config.color)}>{config.label}</Badge>
    ) : null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1 mr-2">
                <p className="text-sm text-muted-foreground truncate">Total Overdue</p>
                <p
                  className="text-xl sm:text-2xl font-bold truncate tabular-nums text-foreground"
                  title={stats?.total_overdue?.toLocaleString()}
                >
                  {stats?.total_overdue || 0}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500 opacity-50 shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1 mr-2">
                <p className="text-sm text-muted-foreground truncate">1-30 Days</p>
                <p
                  className="text-xl sm:text-2xl font-bold text-yellow-600 dark:text-yellow-400 truncate tabular-nums"
                  title={stats?.bucket_1_30?.toLocaleString()}
                >
                  {stats?.bucket_1_30 || 0}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500 opacity-50 shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1 mr-2">
                <p className="text-sm text-muted-foreground truncate">31-60 Days</p>
                <p
                  className="text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-400 truncate tabular-nums"
                  title={stats?.bucket_31_60?.toLocaleString()}
                >
                  {stats?.bucket_31_60 || 0}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500 opacity-50 shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1 mr-2">
                <p className="text-sm text-muted-foreground truncate">61-90 Days</p>
                <p
                  className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400 truncate tabular-nums"
                  title={stats?.bucket_61_90?.toLocaleString()}
                >
                  {stats?.bucket_61_90 || 0}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500 opacity-50 shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1 mr-2">
                <p className="text-sm text-muted-foreground truncate">90+ Days</p>
                <p
                  className="text-xl sm:text-2xl font-bold text-red-800 dark:text-red-300 truncate tabular-nums"
                  title={stats?.bucket_90_plus?.toLocaleString()}
                >
                  {stats?.bucket_90_plus || 0}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-700 opacity-50 shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1 mr-2">
                <p className="text-sm text-muted-foreground truncate">Pending Promises</p>
                <p
                  className="text-xl sm:text-2xl font-bold truncate tabular-nums"
                  title={stats?.pending_promises?.toLocaleString()}
                >
                  {stats?.pending_promises || 0}
                </p>
                <p
                  className="text-xs text-muted-foreground mt-1 truncate"
                  title={`${stats?.promises_due_today || 0} due today`}
                >
                  {stats?.promises_due_today || 0} due today
                </p>
              </div>
              <HandshakeIcon className="h-8 w-8 text-blue-500 opacity-50 shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1 mr-2">
                <p className="text-sm text-muted-foreground truncate">Contacts Today</p>
                <p
                  className="text-xl sm:text-2xl font-bold truncate tabular-nums"
                  title={stats?.contacts_today?.toLocaleString()}
                >
                  {stats?.contacts_today || 0}
                </p>
              </div>
              <Phone className="h-8 w-8 text-green-500 opacity-50 shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1 mr-2">
                <p className="text-sm text-muted-foreground truncate">Pending Reschedules</p>
                <p
                  className="text-xl sm:text-2xl font-bold truncate tabular-nums"
                  title={stats?.pending_reschedules?.toLocaleString()}
                >
                  {stats?.pending_reschedules || 0}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-purple-500 opacity-50 shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Collections Queue</CardTitle>
              <CardDescription>Manage overdue accounts and collection activities</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchData(true)}
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search overdue accounts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-background border-input text-foreground"
              />
            </div>
            <Tabs
              value={selectedBucket}
              onValueChange={setSelectedBucket}
              className="w-full md:w-auto"
            >
              <TabsList>
                {RISK_BUCKETS.map((bucket) => (
                  <TabsTrigger key={bucket.id} value={bucket.id} className="text-xs">
                    {bucket.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* Queue List */}
          <ScrollArea className="h-[500px]">
            {queue.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-medium">No accounts in this bucket</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  {selectedBucket === 'all'
                    ? 'All accounts are current!'
                    : 'No overdue accounts in this risk category.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {queue.map((item) => (
                  <div
                    key={item.loanIdStr}
                    className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors bg-card"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 min-w-0 flex-1 mr-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4
                              className="font-medium truncate text-foreground font-mono text-sm"
                              title={item.loanIdStr}
                            >
                              Loan {item.loanIdStr.slice(-8)}
                            </h4>
                            <div className="shrink-0">{getRiskBucketBadge(item.riskBucket)}</div>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Due: {new Date(item.dueDate).toLocaleDateString()}
                          </p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                            <span className="tabular-nums whitespace-nowrap">
                              Total Due: {formatNAD(item.totalDue)}
                            </span>
                            <span className="tabular-nums whitespace-nowrap">
                              Principal: {formatNAD(item.principalDue)}
                            </span>
                            <span className="text-red-600 dark:text-red-400 font-medium tabular-nums whitespace-nowrap">
                              {item.daysOverdue} days overdue
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedItem(item);
                          setShowInteractionDialog(true);
                        }}
                      >
                        <Phone className="h-4 w-4 mr-1" />
                        Log Contact
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedItem(item);
                          setPtpAmount(item.totalDue.toString());
                          setShowPTPDialog(true);
                        }}
                      >
                        <HandshakeIcon className="h-4 w-4 mr-1" />
                        Record PTP
                      </Button>
                      <Button size="sm" variant="ghost" className="ml-auto">
                        View Details
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Log Interaction Dialog */}
      <Dialog open={showInteractionDialog} onOpenChange={setShowInteractionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Interaction</DialogTitle>
            <DialogDescription>
              Record a contact attempt for loan {selectedItem?.loanIdStr?.slice(-8)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Contact Type</Label>
              <Select
                value={interactionType}
                onValueChange={(v) => setInteractionType(v as typeof interactionType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERACTION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Outcome</Label>
              <Select value={outcome} onValueChange={setOutcome}>
                <SelectTrigger>
                  <SelectValue placeholder="Select outcome..." />
                </SelectTrigger>
                <SelectContent>
                  {OUTCOMES.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about the interaction..."
                rows={3}
                className="bg-background border-input text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label>Next Action Date (optional)</Label>
              <Input
                type="date"
                value={nextActionDate}
                onChange={(e) => setNextActionDate(e.target.value)}
                className="bg-background border-input text-foreground"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInteractionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleInteractionSubmit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Log Interaction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Promise to Pay Dialog */}
      <Dialog open={showPTPDialog} onOpenChange={setShowPTPDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Promise to Pay</DialogTitle>
            <DialogDescription>
              Record a payment promise for loan {selectedItem?.loanIdStr?.slice(-8)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Promised Amount (NAD)</Label>
              <Input
                type="number"
                value={ptpAmount}
                onChange={(e) => setPtpAmount(e.target.value)}
                placeholder="Enter amount..."
                className="bg-background border-input text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label>Promise Date</Label>
              <Input
                type="date"
                value={ptpDate}
                onChange={(e) => setPtpDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="bg-background border-input text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about the promise..."
                rows={3}
                className="bg-background border-input text-foreground"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPTPDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handlePTPSubmit} disabled={submitting || !ptpAmount || !ptpDate}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Record Promise
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CollectionsDashboard;
