/**
 * Acknowledgements Viewer Component
 * NISS/SWIFT acknowledgements (xsys.001, xsys.002, xsys.003)
 */

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Eye, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useSettlementRuns, useAcknowledgements } from '@/hooks/useSettlement';
import { ACK_TYPE_LABELS, ACK_TYPE_COLORS, type AckType } from '@/types/settlement';

export function AcknowledgementsViewer() {
  const [selectedRunId, setSelectedRunId] = useState<string>('');
  const [selectedAck, setSelectedAck] = useState<{
    id: string;
    raw_payload: string | null;
  } | null>(null);

  const { data: runs } = useSettlementRuns({ limit: 20 });
  const { data: acks, isLoading } = useAcknowledgements(selectedRunId || undefined);

  const getAckIcon = (ackType: AckType) => {
    switch (ackType) {
      case 'xsys_002':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'xsys_001':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'xsys_003':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default:
        return null;
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            NISS/SWIFT Acknowledgements
          </CardTitle>
          <CardDescription>
            View acknowledgements from NISS and SWIFT (xsys.001, xsys.002, xsys.003)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Run Selector */}
          <div className="mb-4">
            <Select value={selectedRunId} onValueChange={setSelectedRunId}>
              <SelectTrigger className="w-80">
                <SelectValue placeholder="Select a settlement run" />
              </SelectTrigger>
              <SelectContent>
                {runs?.map((run) => (
                  <SelectItem key={run.id} value={run.id}>
                    {run.run_id} - {new Date(run.settlement_date).toLocaleDateString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Acknowledgements Table */}
          {selectedRunId && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Message ID</TableHead>
                    <TableHead>Received At</TableHead>
                    <TableHead>Error Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Processed</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        Loading acknowledgements...
                      </TableCell>
                    </TableRow>
                  ) : acks?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        No acknowledgements found for this run
                      </TableCell>
                    </TableRow>
                  ) : (
                    acks?.map((ack) => (
                      <TableRow key={ack.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getAckIcon(ack.ack_type)}
                            <Badge className={ACK_TYPE_COLORS[ack.ack_type]}>
                              {ack.ack_type.replace('_', '.')}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {ack.msg_id}
                        </TableCell>
                        <TableCell>
                          {new Date(ack.received_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {ack.error_code ? (
                            <Badge variant="destructive">{ack.error_code}</Badge>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {ack.error_description?.substring(0, 50)}
                            {(ack.error_description?.length || 0) > 50 && '...'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {ack.processed_at ? (
                            <Badge variant="default">Processed</Badge>
                          ) : (
                            <Badge variant="secondary">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {ack.raw_payload && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setSelectedAck({
                                  id: ack.id,
                                  raw_payload: ack.raw_payload,
                                })
                              }
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {!selectedRunId && (
            <div className="text-center py-8 text-muted-foreground">
              Select a settlement run to view its acknowledgements
            </div>
          )}

          {/* Legend */}
          <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>xsys.002 - Positive Acknowledgement (Success)</span>
            </div>
            <div className="flex items-center gap-1">
              <XCircle className="h-4 w-4 text-red-500" />
              <span>xsys.001 - Negative Acknowledgement (Failed)</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <span>xsys.003 - Abort Notification</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Raw Payload Dialog */}
      <Dialog open={!!selectedAck} onOpenChange={() => setSelectedAck(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Raw Acknowledgement Payload</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-96 rounded-md border bg-slate-950 p-4">
            <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
              {selectedAck?.raw_payload || 'No payload available'}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default AcknowledgementsViewer;
