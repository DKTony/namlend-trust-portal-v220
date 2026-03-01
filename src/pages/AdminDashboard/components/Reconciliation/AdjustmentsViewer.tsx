/**
 * Adjustments Viewer Component
 * Settlement adjustments from disputes/chargebacks/corrections
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Eye, FileWarning, CheckCircle, XCircle } from 'lucide-react';
import { useSettlementAdjustments, useUpdateAdjustmentStatus } from '@/hooks/useSettlement';
import { formatNAD } from '@/constants/regulatory';

export function AdjustmentsViewer() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedAdjustment, setSelectedAdjustment] = useState<string | null>(null);
  const [responseNotes, setResponseNotes] = useState('');

  const {
    data: adjustments,
    isLoading,
    isError,
    refetch,
  } = useSettlementAdjustments({
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });

  const updateStatus = useUpdateAdjustmentStatus();

  const selectedItem = adjustments?.find((a) => a.id === selectedAdjustment);

  const handleApprove = () => {
    if (selectedAdjustment) {
      updateStatus.mutate({
        adjustmentId: selectedAdjustment,
        status: 'approved',
        notes: responseNotes,
      });
      setSelectedAdjustment(null);
      setResponseNotes('');
    }
  };

  const handleReject = () => {
    if (selectedAdjustment) {
      updateStatus.mutate({
        adjustmentId: selectedAdjustment,
        status: 'rejected',
        notes: responseNotes,
      });
      setSelectedAdjustment(null);
      setResponseNotes('');
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileWarning className="h-5 w-5" />
            Settlement Adjustments
          </CardTitle>
          <CardDescription>Disputes, chargebacks, and operational corrections</CardDescription>
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
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="settled">Settled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Response Due</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      Loading adjustments...
                    </TableCell>
                  </TableRow>
                ) : isError ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <div className="text-destructive">Failed to load adjustments.</div>
                      <button
                        onClick={() => refetch()}
                        className="mt-2 text-sm text-primary underline"
                      >
                        Retry
                      </button>
                    </TableCell>
                  </TableRow>
                ) : adjustments?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      No adjustments found
                    </TableCell>
                  </TableRow>
                ) : (
                  adjustments?.map((adj) => (
                    <TableRow key={adj.id}>
                      <TableCell className="tabular-nums">
                        {new Date(adj.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="shrink-0">
                          {adj.adjustment_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[120px] truncate" title={adj.source_participant}>
                        {adj.source_participant}
                      </TableCell>
                      <TableCell className="max-w-[120px] truncate" title={adj.target_participant}>
                        {adj.target_participant}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="flex items-center truncate" title={adj.reason_description}>
                          {adj.reason_code && (
                            <Badge variant="secondary" className="mr-1 shrink-0">
                              {adj.reason_code}
                            </Badge>
                          )}
                          <span className="truncate text-sm">{adj.reason_description}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatNAD(adj.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            adj.status === 'approved'
                              ? 'default'
                              : adj.status === 'rejected'
                                ? 'destructive'
                                : adj.status === 'settled'
                                  ? 'default'
                                  : 'secondary'
                          }
                          className="shrink-0"
                        >
                          {adj.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {adj.response_required_by && (
                          <span
                            className={
                              new Date(adj.response_required_by) < new Date()
                                ? 'text-red-600 dark:text-red-400'
                                : ''
                            }
                          >
                            {new Date(adj.response_required_by).toLocaleDateString()}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedAdjustment(adj.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Adjustment Details Dialog */}
      <Dialog
        open={!!selectedAdjustment}
        onOpenChange={() => {
          setSelectedAdjustment(null);
          setResponseNotes('');
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Adjustment Details</DialogTitle>
            <DialogDescription className="sr-only">
              View and respond to settlement adjustment details
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <Badge variant="outline">{selectedItem.adjustment_type}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={selectedItem.status === 'approved' ? 'default' : 'secondary'}>
                    {selectedItem.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">From Participant</p>
                  <p className="font-medium">{selectedItem.source_participant}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">To Participant</p>
                  <p className="font-medium">{selectedItem.target_participant}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="font-medium text-lg">{formatNAD(selectedItem.amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Response Due</p>
                  <p className="font-medium">
                    {selectedItem.response_required_by
                      ? new Date(selectedItem.response_required_by).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Reason</p>
                <p className="mt-1">
                  {selectedItem.reason_code && (
                    <Badge variant="secondary" className="mr-2">
                      {selectedItem.reason_code}
                    </Badge>
                  )}
                  {selectedItem.reason_description || 'No reason provided'}
                </p>
              </div>

              {selectedItem.status === 'pending' && (
                <div className="space-y-2">
                  <Label htmlFor="notes">Response Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Enter notes for your response..."
                    value={responseNotes}
                    onChange={(e) => setResponseNotes(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          {selectedItem?.status === 'pending' && (
            <DialogFooter>
              <Button variant="outline" onClick={handleReject} disabled={updateStatus.isPending}>
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button onClick={handleApprove} disabled={updateStatus.isPending}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default AdjustmentsViewer;
