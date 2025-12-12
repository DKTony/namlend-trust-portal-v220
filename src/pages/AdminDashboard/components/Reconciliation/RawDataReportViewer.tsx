/**
 * Raw Data Report Viewer Component
 * Transaction-level data for settlement windows
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
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Eye, Download, FileText, Search } from 'lucide-react';
import { useSettlementReports, useReportContent } from '@/hooks/useSettlement';
import { formatCurrency } from '@/lib/utils';
import { parseRawDataReport } from '@/services/settlementService';

export function RawDataReportViewer() {
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: reports, isLoading } = useSettlementReports({
    reportType: 'raw_data',
  });

  const { data: reportContent, isLoading: contentLoading } = useReportContent(
    selectedReportId || undefined
  );

  const rawData = reportContent?.report_data
    ? parseRawDataReport(reportContent.report_data)
    : [];

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
            Transaction-level data for settlement windows (participants see only their own transactions)
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
                ) : reports?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      No raw data reports found
                    </TableCell>
                  </TableRow>
                ) : (
                  reports?.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        {new Date(report.run_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{report.window_id}</TableCell>
                      <TableCell>{report.participant_name || 'All'}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {report.file_name}
                      </TableCell>
                      <TableCell className="text-right">
                        {report.file_size
                          ? `${(report.file_size / 1024).toFixed(1)} KB`
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {report.distributed_at ? (
                          <Badge variant="default">Distributed</Badge>
                        ) : (
                          <Badge variant="secondary">Pending</Badge>
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

      {/* Raw Data Details Dialog */}
      <Dialog open={!!selectedReportId} onOpenChange={() => setSelectedReportId(null)}>
        <DialogContent className="max-w-6xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Raw Data Report</DialogTitle>
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
                          <TableCell className="font-mono text-xs">
                            {entry.txId}
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(entry.timestamp).toLocaleString()}
                          </TableCell>
                          <TableCell>{entry.remitterParticipant}</TableCell>
                          <TableCell>{entry.beneficiaryParticipant}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{entry.productType}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                entry.status === 'SUCCESS' ? 'default' : 'secondary'
                              }
                            >
                              {entry.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(entry.amount)} {entry.currency}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(entry.interchangeAmount)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(entry.switchingFee)}
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
