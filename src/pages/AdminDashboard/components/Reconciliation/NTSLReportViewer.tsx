/**
 * NTSL (Net Settlement Report) Viewer Component
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Eye, Download, FileSpreadsheet } from 'lucide-react';
import { useSettlementReports, useReportContent } from '@/hooks/useSettlement';
import { formatNAD } from '@/constants/regulatory';

interface NTSLReportData {
  participant: string;
  participantBic: string;
  settlementDate: string;
  windowId: string;
  credits: number;
  debits: number;
  netPosition: number;
  interchangeOwed: number;
  interchangePaid: number;
  switchingFee: number;
  transactions: Array<{
    txId: string;
    counterparty: string;
    amount: number;
    type: 'credit' | 'debit';
    category: string;
  }>;
}

function parseNTSLReport(reportData: Record<string, unknown>): NTSLReportData | null {
  try {
    return reportData as unknown as NTSLReportData;
  } catch {
    return null;
  }
}

export function NTSLReportViewer() {
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const {
    data: reports,
    isLoading,
    isError,
    refetch,
  } = useSettlementReports({
    reportType: 'ntsl',
  });

  const { data: reportContent, isLoading: contentLoading } = useReportContent(
    selectedReportId || undefined
  );

  const ntslData = reportContent?.report_data ? parseNTSLReport(reportContent.report_data) : null;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Net Settlement Reports (NTSL)
          </CardTitle>
          <CardDescription>
            Net positions, interchange, and switching fees per participant
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report Date</TableHead>
                  <TableHead>Window</TableHead>
                  <TableHead>Participant</TableHead>
                  <TableHead>File Name</TableHead>
                  <TableHead className="text-right">Size</TableHead>
                  <TableHead>Distributed</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading NTSL reports...
                    </TableCell>
                  </TableRow>
                ) : isError ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="text-destructive">Failed to load NTSL reports.</div>
                      <button
                        onClick={() => refetch()}
                        className="mt-2 text-sm text-primary underline"
                      >
                        Retry
                      </button>
                    </TableCell>
                  </TableRow>
                ) : reports?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      No NTSL reports found
                    </TableCell>
                  </TableRow>
                ) : (
                  reports?.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="tabular-nums">
                        {new Date(report.run_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{report.window_id}</TableCell>
                      <TableCell
                        className="max-w-[150px] truncate"
                        title={report.participant_name || 'All'}
                      >
                        {report.participant_name || 'All'}
                      </TableCell>
                      <TableCell
                        className="font-mono text-sm max-w-[200px] truncate"
                        title={report.file_name}
                      >
                        {report.file_name}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {report.file_size ? `${(report.file_size / 1024).toFixed(1)} KB` : '-'}
                      </TableCell>
                      <TableCell>
                        {report.distributed_at ? (
                          <Badge variant="default" className="shrink-0">
                            Distributed
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="shrink-0">
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedReportId(report.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* NTSL Details Dialog */}
      <Dialog open={!!selectedReportId} onOpenChange={() => setSelectedReportId(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Net Settlement Report (NTSL)</DialogTitle>
            <DialogDescription className="sr-only">
              View net settlement totals and participant obligations
            </DialogDescription>
          </DialogHeader>

          {contentLoading ? (
            <div className="py-8 text-center">Loading report...</div>
          ) : ntslData ? (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Participant</p>
                  <p className="font-medium">{ntslData.participant}</p>
                  <p className="text-xs text-muted-foreground">{ntslData.participantBic}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Settlement Date</p>
                  <p className="font-medium">{ntslData.settlementDate}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Window</p>
                  <p className="font-medium">{ntslData.windowId}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Net Position</p>
                  <p
                    className={`font-medium ${ntslData.netPosition >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                  >
                    {formatNAD(ntslData.netPosition)}
                  </p>
                </div>
              </div>

              {/* Position Summary */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Position Summary</CardTitle>
                </CardHeader>
                <CardContent className="py-3">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Credits</p>
                      <p className="text-lg font-medium text-green-600 dark:text-green-400">
                        {formatNAD(ntslData.credits)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Debits</p>
                      <p className="text-lg font-medium text-red-600 dark:text-red-400">
                        {formatNAD(ntslData.debits)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Switching Fee</p>
                      <p className="text-lg font-medium">{formatNAD(ntslData.switchingFee)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Interchange Owed</p>
                      <p className="font-medium text-green-600 dark:text-green-400">
                        {formatNAD(ntslData.interchangeOwed)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Interchange Paid</p>
                      <p className="font-medium text-red-600 dark:text-red-400">
                        {formatNAD(ntslData.interchangePaid)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Transactions */}
              {ntslData.transactions?.length > 0 && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">
                      Transaction Breakdown ({ntslData.transactions.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-0">
                    <div className="max-h-64 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Transaction ID</TableHead>
                            <TableHead>Counterparty</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {ntslData.transactions.map((txn, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-mono text-xs">{txn.txId}</TableCell>
                              <TableCell>{txn.counterparty}</TableCell>
                              <TableCell>
                                <Badge variant={txn.type === 'credit' ? 'default' : 'secondary'}>
                                  {txn.type}
                                </Badge>
                              </TableCell>
                              <TableCell>{txn.category}</TableCell>
                              <TableCell
                                className={`text-right ${
                                  txn.type === 'credit'
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-red-600 dark:text-red-400'
                                }`}
                              >
                                {formatNAD(txn.amount)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">No report data available</div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default NTSLReportViewer;
