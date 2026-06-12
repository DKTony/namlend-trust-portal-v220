/**
 * pacs.009 (MNSB) Viewer Component
 * Displays and parses ISO 20022 pacs.009 settlement batch files
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
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Eye, FileCode, Download, Copy, Check } from 'lucide-react';
import {
  useSettlementRuns,
  usePacs009Batches,
  usePacs009BatchDetails,
} from '@/hooks/useSettlement';
import { formatNAD } from '@/constants/regulatory';
import { BATCH_TYPE_LABELS } from '@/types/settlement';

function parsePacs009Xml(xmlContent: string): {
  groupHeader: {
    msgId: string;
    creDtTm: string;
    nbOfTxs: number;
    ctrlSum: number;
    sttlmDt: string;
  };
  transactions: Array<{
    instrId: string;
    endToEndId: string;
    amount: number;
    currency: string;
    dbtrBic: string;
    cdtrBic: string;
  }>;
} | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlContent, 'text/xml');
    if (doc.querySelector('parsererror')) return null;
    const grpHdr = doc.querySelector('GrpHdr');
    const groupHeader = {
      msgId: grpHdr?.querySelector('MsgId')?.textContent || '',
      creDtTm: grpHdr?.querySelector('CreDtTm')?.textContent || '',
      nbOfTxs: parseInt(grpHdr?.querySelector('NbOfTxs')?.textContent || '0'),
      ctrlSum: parseFloat(
        grpHdr?.querySelector('CtrlSum')?.textContent ||
          grpHdr?.querySelector('TtlIntrBkSttlmAmt')?.textContent ||
          '0'
      ),
      sttlmDt:
        grpHdr?.querySelector('SttlmInf SttlmDt')?.textContent ||
        grpHdr?.querySelector('IntrBkSttlmDt')?.textContent ||
        '',
    };
    const transactions = Array.from(doc.querySelectorAll('CdtTrfTxInf')).map((txn) => ({
      instrId: txn.querySelector('PmtId InstrId')?.textContent || '',
      endToEndId: txn.querySelector('PmtId EndToEndId')?.textContent || '',
      amount: parseFloat(txn.querySelector('IntrBkSttlmAmt')?.textContent || '0'),
      currency: txn.querySelector('IntrBkSttlmAmt')?.getAttribute('Ccy') || 'NAD',
      dbtrBic:
        txn.querySelector('DbtrAgt FinInstnId BICFI')?.textContent ||
        txn.querySelector('Dbtr FinInstnId BIC')?.textContent ||
        '',
      cdtrBic:
        txn.querySelector('CdtrAgt FinInstnId BICFI')?.textContent ||
        txn.querySelector('Cdtr FinInstnId BIC')?.textContent ||
        '',
    }));
    return { groupHeader, transactions };
  } catch {
    return null;
  }
}

function formatXmlForDisplay(xmlContent: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlContent, 'text/xml');
    const serializer = new XMLSerializer();
    return serializer
      .serializeToString(doc)
      .replace(/></g, '>\n<')
      .replace(/(<[^/][^>]*>)([^<]+)(<\/)/g, '$1\n  $2\n$3');
  } catch {
    return xmlContent;
  }
}

export function Pacs009Viewer() {
  const [selectedRunId, setSelectedRunId] = useState<string>('');
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: runs, isError: runsError } = useSettlementRuns({ limit: 20 });
  const {
    data: batches,
    isLoading: batchesLoading,
    isError: batchesError,
    refetch: refetchBatches,
  } = usePacs009Batches(selectedRunId || undefined);
  const { data: batchDetails, isLoading: detailsLoading } = usePacs009BatchDetails(
    selectedBatchId || undefined
  );

  const handleCopyXml = async () => {
    if (batchDetails?.batch?.file_content) {
      await navigator.clipboard.writeText(batchDetails.batch.file_content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const parsedXml = batchDetails?.batch?.file_content
    ? parsePacs009Xml(batchDetails.batch.file_content)
    : null;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>MNSB Settlement Batch Files (pacs.009)</CardTitle>
          <CardDescription>
            View ISO 20022 pacs.009 files generated for NISS settlement
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
                {runsError ? (
                  <SelectItem value="__error" disabled>
                    Failed to load runs
                  </SelectItem>
                ) : (
                  runs?.map((run) => (
                    <SelectItem key={run.id} value={run.id}>
                      {run.run_id} - {new Date(run.settlement_date).toLocaleDateString()}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Batches Table */}
          {selectedRunId && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch Type</TableHead>
                    <TableHead>Message ID</TableHead>
                    <TableHead>File Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Instructions</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead className="text-right">Size</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batchesLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        Loading batches...
                      </TableCell>
                    </TableRow>
                  ) : batchesError ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <div className="text-destructive">Failed to load batches.</div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => refetchBatches()}
                        >
                          Retry
                        </Button>
                      </TableCell>
                    </TableRow>
                  ) : batches?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        No batches found for this run
                      </TableCell>
                    </TableRow>
                  ) : (
                    batches?.map((batch) => (
                      <TableRow key={batch.id}>
                        <TableCell>
                          <Badge variant="outline" className="shrink-0">
                            {BATCH_TYPE_LABELS[batch.batch_type]}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className="font-mono text-sm max-w-[150px] truncate"
                          title={batch.msg_id}
                        >
                          {batch.msg_id}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate" title={batch.file_name}>
                          {batch.file_name}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              batch.status === 'accepted'
                                ? 'default'
                                : batch.status === 'failed'
                                  ? 'destructive'
                                  : 'secondary'
                            }
                            className="shrink-0"
                          >
                            {batch.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {batch.instruction_count}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatNAD(batch.total_amount)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {batch.file_size ? `${(batch.file_size / 1024).toFixed(1)} KB` : '-'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedBatchId(batch.id)}
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
          )}

          {!selectedRunId && (
            <div className="text-center py-8 text-muted-foreground">
              Select a settlement run to view its pacs.009 batches
            </div>
          )}
        </CardContent>
      </Card>

      {/* Batch Details Dialog */}
      <Dialog open={!!selectedBatchId} onOpenChange={() => setSelectedBatchId(null)}>
        <DialogContent className="max-w-5xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCode className="h-5 w-5" />
              pacs.009 Batch: {batchDetails?.batch?.msg_id}
            </DialogTitle>
            <DialogDescription className="sr-only">
              View pacs.009 batch details, XML content, and transaction entries
            </DialogDescription>
          </DialogHeader>

          {detailsLoading ? (
            <div className="py-8 text-center">Loading batch details...</div>
          ) : batchDetails ? (
            <Tabs defaultValue="parsed" className="w-full">
              <div className="flex items-center justify-between mb-4">
                <TabsList>
                  <TabsTrigger value="parsed">Parsed View</TabsTrigger>
                  <TabsTrigger value="xml">Raw XML</TabsTrigger>
                  <TabsTrigger value="instructions">Instructions</TabsTrigger>
                </TabsList>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopyXml}>
                    {copied ? (
                      <Check className="h-4 w-4 mr-1" />
                    ) : (
                      <Copy className="h-4 w-4 mr-1" />
                    )}
                    {copied ? 'Copied' : 'Copy XML'}
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                </div>
              </div>

              <TabsContent value="parsed" className="space-y-4">
                {parsedXml ? (
                  <>
                    {/* Group Header */}
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm">Group Header</CardTitle>
                      </CardHeader>
                      <CardContent className="py-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Message ID</p>
                            <p className="font-mono">{parsedXml.groupHeader.msgId}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Created</p>
                            <p>{new Date(parsedXml.groupHeader.creDtTm).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Transactions</p>
                            <p>{parsedXml.groupHeader.nbOfTxs}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Control Sum</p>
                            <p>{formatNAD(parsedXml.groupHeader.ctrlSum)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Transactions */}
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm">
                          Credit Transfer Instructions ({parsedXml.transactions.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="py-0">
                        <ScrollArea className="h-64">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Instruction ID</TableHead>
                                <TableHead>End-to-End ID</TableHead>
                                <TableHead>Debtor BIC</TableHead>
                                <TableHead>Creditor BIC</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {parsedXml.transactions.map((txn, idx) => (
                                <TableRow key={idx}>
                                  <TableCell className="font-mono text-xs">{txn.instrId}</TableCell>
                                  <TableCell className="font-mono text-xs">
                                    {txn.endToEndId}
                                  </TableCell>
                                  <TableCell className="font-mono">{txn.dbtrBic}</TableCell>
                                  <TableCell className="font-mono">{txn.cdtrBic}</TableCell>
                                  <TableCell className="text-right">
                                    {formatNAD(txn.amount)} {txn.currency}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Unable to parse XML content
                  </div>
                )}
              </TabsContent>

              <TabsContent value="xml">
                <ScrollArea className="h-96 rounded-md border bg-slate-950 p-4">
                  <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
                    {batchDetails.batch.file_content
                      ? formatXmlForDisplay(batchDetails.batch.file_content)
                      : 'No XML content available'}
                  </pre>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="instructions">
                <ScrollArea className="h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Instruction ID</TableHead>
                        <TableHead>From</TableHead>
                        <TableHead>To</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {batchDetails.instructions?.map((instr, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-sm">
                            {instr.instruction_id}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{instr.source}</p>
                              <p className="text-xs text-muted-foreground">{instr.source_bic}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{instr.target}</p>
                              <p className="text-xs text-muted-foreground">{instr.target_bic}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{instr.category_group}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatNAD(instr.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default Pacs009Viewer;
