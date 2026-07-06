import { useMutation, useQuery } from 'convex/react';
import {
  CheckCircle,
  ListX,
  ReceiptText,
  RefreshCw,
  Scale,
  ShieldAlert,
  Undo2,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatNAD } from '@/utils/currency';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/integrations/convex/api';

function formatDate(value?: number) {
  return value ? new Date(value).toLocaleString() : '-';
}

function badgeVariant(status?: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (!status) return 'outline';
  if (['accepted', 'resolved', 'completed', 'settled', 'active'].includes(status)) return 'default';
  if (['critical', 'failed', 'rejected', 'blacklist', 'block'].includes(status))
    return 'destructive';
  if (['opened', 'open', 'pending', 'awaiting_response', 'hotlist', 'alert'].includes(status)) {
    return 'secondary';
  }
  return 'outline';
}

export function IPPOperationsControlCenter() {
  const { toast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  const summary = useQuery(api.ippOperations.getOperationsSummary, {});
  const disputes = useQuery(api.ippOperations.listDisputeCases, { limit: 25 });
  const riskEvents = useQuery(api.ippOperations.listRiskEvents, { status: 'open', limit: 25 });
  const listings = useQuery(api.ippOperations.listHandleListings, { status: 'active', limit: 25 });
  const receipts = useQuery(api.ippOperations.listReceipts, { limit: 25 });

  const runRiskScan = useMutation(api.ippOperations.runRiskScan);
  const transitionDispute = useMutation(api.ippOperations.transitionDisputeCase);
  const resolveRiskEvent = useMutation(api.ippOperations.resolveRiskEvent);
  const revokeListing = useMutation(api.ippOperations.revokeHandleListing);

  const operate = async (id: string, operation: () => Promise<unknown>, title: string) => {
    setBusyId(id);
    try {
      await operation();
      toast({ title });
    } catch (error: any) {
      toast({
        title: 'IPP operation failed',
        description: error?.message ?? 'The request could not be completed.',
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  const scan = async () => {
    setBusyId('risk-scan');
    try {
      const result = await runRiskScan({ limit: 100 });
      toast({
        title: 'Risk scan complete',
        description: `${result.scanned} transactions scanned, ${result.flagged} flagged.`,
      });
    } catch (error: any) {
      toast({
        title: 'Risk scan failed',
        description: error?.message ?? 'The scan could not be completed.',
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  const loading =
    summary === undefined ||
    disputes === undefined ||
    riskEvents === undefined ||
    listings === undefined ||
    receipts === undefined;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Disputes</CardTitle>
            <Scale className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{summary?.openDisputes ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Risk</CardTitle>
            <ShieldAlert className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{summary?.openRiskEvents ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Risk</CardTitle>
            <ShieldAlert className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {summary?.criticalRiskEvents ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Listings</CardTitle>
            <ListX className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{summary?.activeListings ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Receipts</CardTitle>
            <ReceiptText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{summary?.recentReceipts ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" onClick={scan} disabled={busyId === 'risk-scan'}>
          <RefreshCw className={`mr-2 h-4 w-4 ${busyId === 'risk-scan' ? 'animate-spin' : ''}`} />
          Scan Risk
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Dispute Cases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="w-[116px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      Loading
                    </TableCell>
                  </TableRow>
                ) : disputes?.length ? (
                  disputes.map((item) => (
                    <TableRow key={item._id}>
                      <TableCell className="font-medium">{item.caseId}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.caseType}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={badgeVariant(item.status)}>{item.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNAD(item.amount)}
                      </TableCell>
                      <TableCell>{formatDate(item.responseDueAt)}</TableCell>
                      <TableCell>
                        {['opened', 'awaiting_response'].includes(item.status) && (
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={busyId === item._id}
                              onClick={() =>
                                operate(
                                  item._id,
                                  () =>
                                    transitionDispute({
                                      disputeCaseId: item._id,
                                      status: 'accepted',
                                      notes: 'Accepted from operations control center.',
                                    }),
                                  'Dispute accepted'
                                )
                              }
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={busyId === item._id}
                              onClick={() =>
                                operate(
                                  item._id,
                                  () =>
                                    transitionDispute({
                                      disputeCaseId: item._id,
                                      status: 'rejected',
                                      notes: 'Rejected from operations control center.',
                                    }),
                                  'Dispute rejected'
                                )
                              }
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No dispute cases
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              Risk Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Severity</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Decision</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="w-[72px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {riskEvents?.length ? (
                  riskEvents.map((event) => (
                    <TableRow key={event._id}>
                      <TableCell>
                        <Badge variant={badgeVariant(event.severity)}>{event.severity}</Badge>
                      </TableCell>
                      <TableCell className="tabular-nums">{event.score}</TableCell>
                      <TableCell>
                        <Badge variant={badgeVariant(event.decision)}>{event.decision}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[260px] truncate" title={event.reason}>
                        {event.reason}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={busyId === event._id}
                          onClick={() =>
                            operate(
                              event._id,
                              () =>
                                resolveRiskEvent({
                                  riskEventId: event._id,
                                  notes: 'Resolved from operations control center.',
                                }),
                              'Risk event resolved'
                            )
                          }
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      No open risk events
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListX className="h-5 w-5" />
              Handle Listings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Address</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Review</TableHead>
                  <TableHead className="w-[72px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listings?.length ? (
                  listings.map((listing) => (
                    <TableRow key={listing._id}>
                      <TableCell className="font-medium">{listing.addr}</TableCell>
                      <TableCell>
                        <Badge variant={badgeVariant(listing.listingType)}>
                          {listing.listingType}
                        </Badge>
                      </TableCell>
                      <TableCell>{listing.source}</TableCell>
                      <TableCell>{formatDate(listing.reviewDueAt)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={busyId === listing._id}
                          onClick={() =>
                            operate(
                              listing._id,
                              () =>
                                revokeListing({
                                  listingId: listing._id,
                                  notes: 'Revoked from operations control center.',
                                }),
                              'Listing revoked'
                            )
                          }
                        >
                          <Undo2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      No active listings
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ReceiptText className="h-5 w-5" />
              Terminal Receipts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receipts?.length ? (
                  receipts.map((receipt) => (
                    <TableRow key={receipt._id}>
                      <TableCell className="font-medium">{receipt.receiptNumber}</TableCell>
                      <TableCell>
                        <Badge variant={badgeVariant(receipt.terminalStatus)}>
                          {receipt.terminalStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNAD(receipt.amount)}
                      </TableCell>
                      <TableCell>{formatDate(receipt.createdAt)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      No terminal receipts
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default IPPOperationsControlCenter;
