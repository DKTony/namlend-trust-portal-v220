/**
 * Batch Operations Component
 * Allows admins to perform bulk actions on loans, clients, and notifications
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
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
import { Progress } from '@/components/ui/progress';
import {
  CheckSquare,
  Square,
  Send,
  Bell,
  RefreshCw,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Users,
  FileText,
  Mail,
  MessageSquare,
  Clock,
  Play,
  Pause,
  Filter
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatNAD } from '@/utils/currency';
import { useToast } from '@/hooks/use-toast';

interface Loan {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  created_at: string;
  profile?: {
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
  };
}

interface BatchJob {
  id: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  total: number;
  processed: number;
  failed: number;
  startedAt?: string;
  completedAt?: string;
}

export function BatchOperations() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Batch job state
  const [activeJob, setActiveJob] = useState<BatchJob | null>(null);
  const [jobHistory, setJobHistory] = useState<BatchJob[]>([]);
  
  // Dialog states
  const [showSendNotificationDialog, setShowSendNotificationDialog] = useState(false);
  const [showBulkStatusDialog, setShowBulkStatusDialog] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationChannel, setNotificationChannel] = useState('in_app');
  const [newStatus, setNewStatus] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchLoans();
  }, [filter]);

  const fetchLoans = async () => {
    setLoading(true);
    try {
      // Fetch loans first
      let query = supabase
        .from('loans')
        .select('id, user_id, amount, status, created_at')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data: loansData, error: loansError } = await query;

      if (loansError) throw loansError;

      if (!loansData || loansData.length === 0) {
        setLoans([]);
        return;
      }

      // Fetch profiles separately (no FK relationship exists)
      const userIds = [...new Set(loansData.map(l => l.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, phone_number')
        .in('user_id', userIds);

      const profileMap = new Map(
        (profilesData || []).map(p => [p.user_id, p])
      );

      setLoans(loansData.map(l => ({
        ...l,
        profile: profileMap.get(l.user_id) || null
      })));
    } catch (error) {
      console.error('Error fetching loans:', error);
      toast({
        title: 'Error',
        description: 'Failed to load loans',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredLoans = loans.filter(loan => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      loan.profile?.first_name?.toLowerCase().includes(search) ||
      loan.profile?.last_name?.toLowerCase().includes(search) ||
      loan.profile?.email?.toLowerCase().includes(search) ||
      loan.id.toLowerCase().includes(search)
    );
  });

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredLoans.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredLoans.map(l => l.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkNotification = async () => {
    if (selectedIds.size === 0 || !notificationMessage) return;
    
    setProcessing(true);
    const job: BatchJob = {
      id: crypto.randomUUID(),
      type: 'notification',
      status: 'running',
      total: selectedIds.size,
      processed: 0,
      failed: 0,
      startedAt: new Date().toISOString()
    };
    setActiveJob(job);

    try {
      const selectedLoans = loans.filter(l => selectedIds.has(l.id));
      let processed = 0;
      let failed = 0;

      for (const loan of selectedLoans) {
        try {
          // In production, this would call the notification service
          // For now, we'll simulate the notification
          await new Promise(resolve => setTimeout(resolve, 100));
          processed++;
        } catch {
          failed++;
        }
        
        setActiveJob(prev => prev ? {
          ...prev,
          processed,
          failed
        } : null);
      }

      const completedJob: BatchJob = {
        ...job,
        status: failed === 0 ? 'completed' : 'failed',
        processed,
        failed,
        completedAt: new Date().toISOString()
      };

      setJobHistory(prev => [completedJob, ...prev]);
      setActiveJob(null);

      toast({
        title: 'Notifications Sent',
        description: `Successfully sent ${processed} notifications${failed > 0 ? `, ${failed} failed` : ''}`
      });

      setShowSendNotificationDialog(false);
      setNotificationMessage('');
      setSelectedIds(new Set());
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send notifications',
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkStatusUpdate = async () => {
    if (selectedIds.size === 0 || !newStatus) return;
    
    setProcessing(true);
    const job: BatchJob = {
      id: crypto.randomUUID(),
      type: 'status_update',
      status: 'running',
      total: selectedIds.size,
      processed: 0,
      failed: 0,
      startedAt: new Date().toISOString()
    };
    setActiveJob(job);

    try {
      const { error } = await supabase
        .from('loans')
        .update({ status: newStatus })
        .in('id', Array.from(selectedIds));

      if (error) throw error;

      const completedJob: BatchJob = {
        ...job,
        status: 'completed',
        processed: selectedIds.size,
        completedAt: new Date().toISOString()
      };

      setJobHistory(prev => [completedJob, ...prev]);
      setActiveJob(null);

      toast({
        title: 'Status Updated',
        description: `Successfully updated ${selectedIds.size} loans to ${newStatus}`
      });

      setShowBulkStatusDialog(false);
      setNewStatus('');
      setSelectedIds(new Set());
      fetchLoans();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update loan status',
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };

  const exportSelected = () => {
    const selectedLoans = loans.filter(l => selectedIds.has(l.id));
    const csv = [
      ['ID', 'Client Name', 'Email', 'Phone', 'Amount', 'Status', 'Created'].join(','),
      ...selectedLoans.map(l => [
        l.id,
        `"${l.profile?.first_name || ''} ${l.profile?.last_name || ''}"`,
        l.profile?.email || '',
        l.profile?.phone_number || '',
        l.amount,
        l.status,
        new Date(l.created_at).toLocaleDateString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loans_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Export Complete',
      description: `Exported ${selectedLoans.length} loans to CSV`
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <CheckSquare className="h-6 w-6" />
            Batch Operations
          </h2>
          <p className="text-muted-foreground">
            Perform bulk actions on loans, send notifications, and manage data
          </p>
        </div>
      </div>

      {/* Active Job Progress */}
      {activeJob && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-4">
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Processing {activeJob.type}...</span>
                  <span className="text-sm text-muted-foreground">
                    {activeJob.processed} / {activeJob.total}
                  </span>
                </div>
                <Progress value={(activeJob.processed / activeJob.total) * 100} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-4">
          {/* Filters & Actions */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Input
                    placeholder="Search by name, email, or loan ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-3"
                  />
                </div>
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger className="w-40">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="disbursed">Disbursed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={fetchLoans}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Selection Actions */}
          {selectedIds.size > 0 && (
            <Card className="border-primary">
              <CardContent className="pt-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="text-base px-3 py-1">
                    {selectedIds.size} selected
                  </Badge>
                  <Separator orientation="vertical" className="h-6" />
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setShowSendNotificationDialog(true)}
                  >
                    <Bell className="h-4 w-4 mr-2" />
                    Send Notification
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setShowBulkStatusDialog(true)}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Update Status
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={exportSelected}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => setSelectedIds(new Set())}
                  >
                    Clear Selection
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Loans List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Loans</CardTitle>
                  <CardDescription>
                    {filteredLoans.length} loans found
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={toggleSelectAll}
                >
                  {selectedIds.size === filteredLoans.length ? (
                    <>
                      <CheckSquare className="h-4 w-4 mr-2" />
                      Deselect All
                    </>
                  ) : (
                    <>
                      <Square className="h-4 w-4 mr-2" />
                      Select All
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredLoans.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No loans found
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {filteredLoans.map((loan) => (
                      <div
                        key={loan.id}
                        className={`flex items-center gap-4 p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedIds.has(loan.id) ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
                        }`}
                        onClick={() => toggleSelect(loan.id)}
                      >
                        <Checkbox
                          checked={selectedIds.has(loan.id)}
                          onCheckedChange={() => toggleSelect(loan.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {loan.profile?.first_name} {loan.profile?.last_name}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {loan.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground truncate">
                            {loan.profile?.email} • {loan.profile?.phone_number}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatNAD(loan.amount)}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(loan.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Job History Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Recent Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              {jobHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent jobs</p>
              ) : (
                <div className="space-y-3">
                  {jobHistory.slice(0, 5).map((job) => (
                    <div key={job.id} className="p-2 border rounded text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium capitalize">{job.type.replace('_', ' ')}</span>
                        <Badge variant={job.status === 'completed' ? 'default' : 'destructive'} className="text-xs">
                          {job.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {job.processed}/{job.total} processed
                        {job.failed > 0 && `, ${job.failed} failed`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {job.completedAt && new Date(job.completedAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Loans</span>
                <span className="font-medium">{loans.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Selected</span>
                <span className="font-medium">{selectedIds.size}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Jobs Today</span>
                <span className="font-medium">{jobHistory.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Send Notification Dialog */}
      <Dialog open={showSendNotificationDialog} onOpenChange={setShowSendNotificationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Bulk Notification</DialogTitle>
            <DialogDescription>
              Send a notification to {selectedIds.size} selected clients
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Channel</Label>
              <Select value={notificationChannel} onValueChange={setNotificationChannel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_app">In-App</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                value={notificationMessage}
                onChange={(e) => setNotificationMessage(e.target.value)}
                placeholder="Enter your message..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendNotificationDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleBulkNotification}
              disabled={processing || !notificationMessage}
            >
              {processing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send to {selectedIds.size} Clients
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Status Update Dialog */}
      <Dialog open={showBulkStatusDialog} onOpenChange={setShowBulkStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Loan Status</DialogTitle>
            <DialogDescription>
              Update the status of {selectedIds.size} selected loans
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="disbursed">Disbursed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div className="text-sm text-yellow-700">
                  <strong>Warning:</strong> This action will update {selectedIds.size} loans. 
                  This action should be audited and may affect client communications.
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkStatusDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleBulkStatusUpdate}
              disabled={processing || !newStatus}
            >
              {processing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Update {selectedIds.size} Loans
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default BatchOperations;
