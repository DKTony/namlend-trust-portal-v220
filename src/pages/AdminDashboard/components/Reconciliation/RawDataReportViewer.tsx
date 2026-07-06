/**
 * Raw Data Report Viewer Component
 * Transaction-level data for settlement windows
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatNAD } from '@/utils/currency';
import { useReportContent, useSettlementReports } from '@/hooks/useSettlement';
import { downloadCsv } from '@/utils/downloadFile';
import { Download, Eye, FileText, Search } from 'lucide-react';
import { useState } from 'react';

interface RawDataReportEntry {
  txId: string;
  timestamp: string;
  remitterParticipant: string;
  beneficiaryParticipant: string;
  amount: number;
  currency: string;
  productType: string;
  status: string;
  interchangeAmount: number;
  switchingFee: number;
}

function parseRawDataReport(reportData: Record<string, unknown>): RawDataReportEntry[] {
  try {
    if (Array.isArray(reportData.transactions)) {
      return reportData.transactions as RawDataReportEntry[];
    }
    if (Array.isArray(reportData.rows)) {
      return reportData.rows.map((row, index) => {
        const record = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
        const metadata =
          record.metadata && typeof record.metadata === 'object'
            ? (record.metadata as Record<string, unknown>)
            : {};
        const sourceParticipant = String(record.sourceParticipantId ?? '');
        const targetParticipant = String(record.targetParticipantId ?? '');
        const debtorVpa = String(metadata.debtorVpa ?? '');
        const creditorVpa = String(metadata.creditorVpa ?? '');

        return {
          txId: String(metadata.msgId ?? record.sourceTxId ?? `raw-row-${index + 1}`),
          timestamp: String(metadata.completedAt ?? metadata.createdAt ?? new Date().toISOString()),
          remitterParticipant: [sourceParticipant, debtorVpa].filter(Boolean).join(' '),
          beneficiaryParticipant: [targetParticipant, creditorVpa].filter(Boolean).join(' '),
          amount: Number(record.amount ?? 0),
          currency: 'NAD',
          productType: String(metadata.useCaseType ?? record.category ?? 'IPP'),
          status: 'SUCCESS',
          interchangeAmount: 0,
          switchingFee: 0,
        };
      });
    }
    return [];
  } catch {
    return [];
  }
}

export function RawDataReportViewer() {
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const {
    data: reports,
    isLoading,
    isError,
    refetch,
  } = useSettlementReports({
    reportType: 'raw_data',
  });

  const { data: reportContent, isLoading: contentLoading } = useReportContent(
    selectedReportId || undefined
  );

  const rawData = reportContent?.report_data ? parseRawDataReport(reportContent.report_data) : [];

  const filteredData = rawData.filter(
    (entry) =>
      entry.txId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.remitterParticipant.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.beneficiaryParticipant.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Raw Data Reports
          </CardTitle>
          <CardDescription>
            Transaction-level data for settlement windows (participants see only their own
            transactions)
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
                      Loading raw data reports...
                    </TableCell>
                  </TableRow>
                ) : isError ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="text-destructive">Failed to load raw data reports.</div>
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
                      No raw data reports found
                    </TableCell>
                  </TableRow>
                ) : (
                  reports?.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>{new Date(report.run_date).toLocaleDateString()}</TableCell>
                      <TableCell>{report.window_id}</TableCell>
                      <TableCell>{report.participant_name || 'All'}</TableCell>
                      <TableCell className="font-mono text-sm">{report.file_name}</TableCell>
                      <TableCell className="text-right">
                        {report.file_size ? `${(report.file_size / 1024).toFixed(1)} KB` : '-'}
                      </TableCell>
                      <TableCell>
                        {report.distributed_at ? (
                          <Badge variant="default">Distributed</Badge>
                        ) : (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedReportId(report.id)}
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

      {/* Raw Data Details Dialog */}
      <Dialog open={!!selectedReportId} onOpenChange={() => setSelectedReportId(null)}>
        <DialogContent className="max-w-6xl max-h-[min(85vh,calc(100dvh-2rem))] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Raw Data Report</DialogTitle>
            <DialogDescription className="sr-only">
              View transaction-level raw data report with search and export
            </DialogDescription>
          </DialogHeader>

          {contentLoading ? (
            <div className="py-8 text-center">Loading report...</div>
          ) : (
            <div className="space-y-4">
              {/* Search */}
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by transaction ID or participant..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
                <span className="text-sm text-muted-foreground">
                  {filteredData.length} of {rawData.length} transactions
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto"
                  disabled={filteredData.length === 0}
                  onClick={() =>
                    downloadCsv(
                      `raw-data-report-${selectedReportId}.csv`,
                      [
                        'Transaction ID',
                        'Timestamp',
                        'Remitter',
                        'Beneficiary',
                        'Product',
                        'Status',
                        'Amount',
                        'Interchange',
                        'Switch Fee',
                      ],
                      filteredData.map((e) => [
                        e.txId,
                        e.timestamp,
                        e.remitterParticipant,
                        e.beneficiaryParticipant,
                        e.productType,
                        e.status,
                        e.amount.toFixed(2),
                        e.interchangeAmount.toFixed(2),
                        e.switchingFee.toFixed(2),
                      ])
                    )
                  }
                >
                  <Download className="h-4 w-4 mr-1" />
                  Export CSV
                </Button>
              </div>

              {/* Data Table */}
              <ScrollArea className="h-96 rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Remitter</TableHead>
                      <TableHead>Beneficiary</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Interchange</TableHead>
                      <TableHead className="text-right">Switch Fee</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8">
                          No transactions found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredData.map((entry, idx) => (
                        <TableRow key={idx}>
                          <TableCell
                            className="font-mono text-xs max-w-[150px] truncate"
                            title={entry.txId}
                          >
                            {entry.txId}
                          </TableCell>
                          <TableCell className="text-sm tabular-nums">
                            {new Date(entry.timestamp).toLocaleString()}
                          </TableCell>
                          <TableCell
                            className="max-w-[150px] truncate"
                            title={entry.remitterParticipant}
                          >
                            {entry.remitterParticipant}
                          </TableCell>
                          <TableCell
                            className="max-w-[150px] truncate"
                            title={entry.beneficiaryParticipant}
                          >
                            {entry.beneficiaryParticipant}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="shrink-0">
                              {entry.productType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={entry.status === 'SUCCESS' ? 'default' : 'secondary'}
                              className="shrink-0"
                            >
                              {entry.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatNAD(entry.amount)} {entry.currency}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatNAD(entry.interchangeAmount)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatNAD(entry.switchingFee)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default RawDataReportViewer;
