/**
 * Collections Dashboard Component
 * Provides a comprehensive view of overdue loans with risk buckets
 */

import { useState, useEffect, useCallback } from 'react';
import { collectionsAPI, analyticsAPI } from '@/services/api-client';
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
  HandshakeIcon
} from 'lucide-react';
import { formatNAD } from '@/utils/currency';
import { type CollectionsQueueItem, type CollectionsStats } from '@/services/collectionsService';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Risk bucket configuration
const RISK_BUCKETS = [
  { id: 'all', label: 'All', color: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300' },
  { id: 'current', label: 'Current', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
  { id: 'bucket_1_30', label: '1-30 Days', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' },
  { id: 'bucket_31_60', label: '31-60 Days', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' },
  { id: 'bucket_61_90', label: '61-90 Days', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
  { id: 'bucket_90_plus', label: '90+ Days', color: 'bg-red-200 dark:bg-red-900/50 text-red-800 dark:text-red-300' },
];

const INTERACTION_TYPES = [
  { value: 'call', label: 'Phone Call', icon: Phone },
  { value: 'sms', label: 'SMS', icon: MessageSquare },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [queue, setQueue] = useState<CollectionsQueueItem[]>([]);
  const [stats, setStats] = useState<CollectionsStats | null>(null);
  const [selectedBucket, setSelectedBucket] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<CollectionsQueueItem | null>(null);
  
  // Dialog states
  const [showInteractionDialog, setShowInteractionDialog] = useState(false);
  const [showPTPDialog, setShowPTPDialog] = useState(false);
  const [interactionType, setInteractionType] = useState('call');
  const [outcome, setOutcome] = useState('');
  const [notes, setNotes] = useState('');
  const [nextActionDate, setNextActionDate] = useState('');
  const [ptpAmount, setPtpAmount] = useState('');
  const [ptpDate, setPtpDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch data
  const fetchData = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true);
    else setLoading(true);

    try {
      const [queueResult, statsResult] = await Promise.all([
        collectionsAPI.getQueue({
          priority: selectedBucket === 'all' ? undefined : selectedBucket as 'high' | 'medium' | 'low' | undefined,
        }),
        analyticsAPI.getCollectionsStats()
      ]);

      if (queueResult.success && queueResult.data) {
        // Apply search filter client-side if needed
        let queueData = queueResult.data as CollectionsQueueItem[];
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          queueData = queueData.filter((item: CollectionsQueueItem) =>
            item.first_name?.toLowerCase().includes(searchLower) ||
            item.last_name?.toLowerCase().includes(searchLower) ||
            item.phone_number?.toLowerCase().includes(searchLower)
          );
        }
        setQueue(queueData);
      }

      if (statsResult.success && statsResult.data) {
        setStats(statsResult.data as CollectionsStats);
      }
    } catch (error) {
      console.error('Error fetching collections data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load collections data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedBucket, searchTerm, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle interaction submission
  const handleInteractionSubmit = async () => {
    if (!selectedItem) return;
    
    setSubmitting(true);
    try {
      const result = await collectionsAPI.recordInteraction({
        loan_id: selectedItem.loan_id,
        interaction_type: interactionType,
        notes: notes || '',
        outcome: outcome || undefined,
        next_action_date: nextActionDate || undefined
      });

      if (result.success) {
        toast({
          title: 'Interaction Logged',
          description: 'The interaction has been recorded successfully.'
        });
        setShowInteractionDialog(false);
        resetInteractionForm();
        fetchData(true);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to log interaction',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle PTP submission
  const handlePTPSubmit = async () => {
    if (!selectedItem || !ptpAmount || !ptpDate) return;
    
    setSubmitting(true);
    try {
      const result = await collectionsAPI.createPromise({
        loan_id: selectedItem.loan_id,
        promised_amount: parseFloat(ptpAmount),
        promised_date: ptpDate,
        notes: notes || undefined
      });

      if (result.success) {
        toast({
          title: 'Promise Recorded',
          description: 'The promise to pay has been recorded successfully.'
        });
        setShowPTPDialog(false);
        resetPTPForm();
        fetchData(true);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to record promise to pay',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetInteractionForm = () => {
    setInteractionType('call');
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
    const config = RISK_BUCKETS.find(b => b.id === bucket);
    return config ? (
      <Badge className={cn('font-normal', config.color)}>
        {config.label}
      </Badge>
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
                <p className="text-xl sm:text-2xl font-bold truncate tabular-nums text-foreground" title={stats?.total_overdue?.toLocaleString()}>{stats?.total_overdue || 0}</p>
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
                <p className="text-xl sm:text-2xl font-bold text-yellow-600 dark:text-yellow-400 truncate tabular-nums" title={stats?.bucket_1_30?.toLocaleString()}>{stats?.bucket_1_30 || 0}</p>
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
                <p className="text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-400 truncate tabular-nums" title={stats?.bucket_31_60?.toLocaleString()}>{stats?.bucket_31_60 || 0}</p>
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
                <p className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400 truncate tabular-nums" title={stats?.bucket_61_90?.toLocaleString()}>{stats?.bucket_61_90 || 0}</p>
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
                <p className="text-xl sm:text-2xl font-bold text-red-800 dark:text-red-300 truncate tabular-nums" title={stats?.bucket_90_plus?.toLocaleString()}>{stats?.bucket_90_plus || 0}</p>
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
                <p className="text-xl sm:text-2xl font-bold truncate tabular-nums" title={stats?.pending_promises?.toLocaleString()}>{stats?.pending_promises || 0}</p>
                <p className="text-xs text-muted-foreground mt-1 truncate" title={`${stats?.promises_due_today || 0} due today`}>
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
                <p className="text-xl sm:text-2xl font-bold truncate tabular-nums" title={stats?.contacts_today?.toLocaleString()}>{stats?.contacts_today || 0}</p>
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
                <p className="text-xl sm:text-2xl font-bold truncate tabular-nums" title={stats?.pending_reschedules?.toLocaleString()}>{stats?.pending_reschedules || 0}</p>
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
              <CardDescription>
                Manage overdue accounts and collection activities
              </CardDescription>
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
            <Tabs value={selectedBucket} onValueChange={setSelectedBucket} className="w-full md:w-auto">
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
                    key={item.loan_id}
                    className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors bg-card"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 min-w-0 flex-1 mr-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className="font-medium truncate text-foreground" title={`${item.first_name} ${item.last_name}`}>
                              {item.first_name} {item.last_name}
                            </h4>
                            <div className="shrink-0">{getRiskBucketBadge(item.risk_bucket)}</div>
                          </div>
                          <p className="text-sm text-muted-foreground truncate" title={item.phone_number}>{item.phone_number}</p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                            <span className="tabular-nums whitespace-nowrap">Loan: {formatNAD(item.loan_amount)}</span>
                            <span className="tabular-nums whitespace-nowrap">Monthly: {formatNAD(item.monthly_payment)}</span>
                            <span className="text-red-600 dark:text-red-400 font-medium tabular-nums whitespace-nowrap">
                              {item.days_overdue} days overdue
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {item.pending_promises > 0 && (
                          <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 whitespace-nowrap border-blue-200 dark:border-blue-800">
                            {item.pending_promises} PTP pending
                          </Badge>
                        )}
                        {item.last_contact_date && (
                          <p className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                            Last contact: {new Date(item.last_contact_date).toLocaleDateString()}
                          </p>
                        )}
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
                          setPtpAmount(item.monthly_payment.toString());
                          setShowPTPDialog(true);
                        }}
                      >
                        <HandshakeIcon className="h-4 w-4 mr-1" />
                        Record PTP
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-auto"
                      >
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
              Record a contact attempt with {selectedItem?.first_name} {selectedItem?.last_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Contact Type</Label>
              <Select value={interactionType} onValueChange={setInteractionType}>
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
              Record a payment promise from {selectedItem?.first_name} {selectedItem?.last_name}
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
            <Button 
              onClick={handlePTPSubmit} 
              disabled={submitting || !ptpAmount || !ptpDate}
            >
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
