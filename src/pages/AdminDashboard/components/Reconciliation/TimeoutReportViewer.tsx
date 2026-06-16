/**
 * Timeout Report Viewer Component
 * Transactions with timeout/uncertain outcome requiring follow-up
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { formatNAD } from '@/constants/regulatory';
import { useResolveTimeout, useTimeoutTransactions } from '@/hooks/useSettlement';
import { CheckCircle, Clock, FileX, XCircle } from 'lucide-react';
import { useState } from 'react';

export function TimeoutReportViewer() {
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [selectedTimeout, setSelectedTimeout] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const {
    data: timeouts,
    isLoading,
    isError,
    refetch,
  } = useTimeoutTransactions(statusFilter !== 'all' ? statusFilter : undefined);

  const resolveTimeout = useResolveTimeout();

  const selectedItem = timeouts?.find((t) => t.id === selectedTimeout);

  const handleResolve = (status: 'resolved' | 'written_off') => {
    if (selectedTimeout && resolutionNotes) {
      resolveTimeout.mutate({
        timeoutId: selectedTimeout,
        status,
        notes: resolutionNotes,
      });
      setSelectedTimeout(null);
      setResolutionNotes('');
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileX className="h-5 w-5" />
            Timeout Transactions
          </CardTitle>
          <CardDescription>
            Transactions with timeout or uncertain outcome requiring follow-up
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filter */}
          <div className="mb-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="written_off">Written Off</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Participant</TableHead>
                  <TableHead>Counterparty</TableHead>
                  <TableHead>Timeout Reason</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading timeout transactions...
                    </TableCell>
                  </TableRow>
                ) : isError ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="text-destructive">Failed to load timeout transactions.</div>
                      <button
                        onClick={() => refetch()}
                        className="mt-2 text-sm text-primary underline"
                      >
                        Retry
                      </button>
                    </TableCell>
                  </TableRow>
                ) : timeouts?.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-green-600 dark:text-green-400"
                    >
                      ✓ No timeout transactions
                    </TableCell>
                  </TableRow>
                ) : (
                  timeouts?.map((timeout) => (
                    <TableRow key={timeout.id}>
                      <TableCell className="tabular-nums">
                        {new Date(timeout.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="max-w-[120px] truncate" title={timeout.participant}>
                        {timeout.participant}
                      </TableCell>
                      <TableCell className="max-w-[120px] truncate" title={timeout.counterparty}>
                        {timeout.counterparty}
                      </TableCell>
                      <TableCell className="max-w-[150px]">
                        <span
                          className="text-sm truncate block"
                          title={timeout.timeout_reason || 'Unknown'}
                        >
                          {timeout.timeout_reason || 'Unknown'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatNAD(timeout.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            timeout.status === 'resolved'
                              ? 'default'
                              : timeout.status === 'written_off'
                                ? 'secondary'
                                : 'destructive'
                          }
                          className="shrink-0"
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          {timeout.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {timeout.status === 'pending' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedTimeout(timeout.id)}
                          >
                            Resolve
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Resolution Dialog */}
      <Dialog
        open={!!selectedTimeout}
        onOpenChange={() => {
          setSelectedTimeout(null);
          setResolutionNotes('');
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Timeout Transaction</DialogTitle>
            <DialogDescription className="sr-only">
              Resolve a timed-out transaction with notes and status update
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Participant</p>
                  <p className="font-medium">{selectedItem.participant}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Counterparty</p>
                  <p className="font-medium">{selectedItem.counterparty}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="font-medium">{formatNAD(selectedItem.amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Timeout Reason</p>
                  <p className="font-medium">{selectedItem.timeout_reason || 'Unknown'}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Resolution Notes *</Label>
                <Textarea
                  id="notes"
                  placeholder="Enter resolution notes (required)..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleResolve('written_off')}
              disabled={resolveTimeout.isPending || !resolutionNotes}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Write Off
            </Button>
            <Button
              onClick={() => handleResolve('resolved')}
              disabled={resolveTimeout.isPending || !resolutionNotes}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark Resolved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default TimeoutReportViewer;
