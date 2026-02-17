/**
 * Pending Status Report Component
 * Items still awaiting final status/closure in back office processes
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileQuestion } from 'lucide-react';
import { useSettlementReports } from '@/hooks/useSettlement';

export function PendingStatusReport() {
  const {
    data: reports,
    isLoading,
    isError,
    refetch,
  } = useSettlementReports({
    reportType: 'pending_status',
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileQuestion className="h-5 w-5" />
          Pending Status Reports
        </CardTitle>
        <CardDescription>
          Items still awaiting final status or closure in back office processes
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
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading pending status reports...
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="text-destructive">Failed to load pending status reports.</div>
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
                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-green-600 dark:text-green-400"
                  >
                    ✓ No items pending status
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
                    <TableCell className="tabular-nums">
                      {new Date(report.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="shrink-0">
                        Pending
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export default PendingStatusReport;
