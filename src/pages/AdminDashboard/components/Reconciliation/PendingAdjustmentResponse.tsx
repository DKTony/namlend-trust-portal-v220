/**
 * Pending Adjustment Response Component
 * Items awaiting participant response/confirmation on adjustments
 */

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useSettlementReports } from '@/hooks/useSettlement';
import { AlertTriangle, FileClock } from 'lucide-react';

export function PendingAdjustmentResponse() {
  const {
    data: reports,
    isLoading,
    isError,
    refetch,
  } = useSettlementReports({
    reportType: 'pending_adjustment_response',
  });

  const overdueCount =
    reports?.filter(
      (r) =>
        r.distributed_at &&
        new Date(r.distributed_at) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileClock className="h-5 w-5" />
          Pending Adjustment Responses
        </CardTitle>
        <CardDescription>
          Items awaiting participant response or confirmation on adjustments
        </CardDescription>
      </CardHeader>
      <CardContent>
        {overdueCount > 0 && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Overdue Responses</AlertTitle>
            <AlertDescription>
              {overdueCount} adjustment(s) have been pending for more than 7 days
            </AlertDescription>
          </Alert>
        )}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report Date</TableHead>
                <TableHead>Window</TableHead>
                <TableHead>Participant</TableHead>
                <TableHead>File Name</TableHead>
                <TableHead>Distributed</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading pending responses...
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="text-destructive">Failed to load pending responses.</div>
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
                    ✓ No pending adjustment responses
                  </TableCell>
                </TableRow>
              ) : (
                reports?.map((report) => {
                  const distributedDate = report.distributed_at
                    ? new Date(report.distributed_at)
                    : null;
                  const ageInDays = distributedDate
                    ? Math.floor((Date.now() - distributedDate.getTime()) / (24 * 60 * 60 * 1000))
                    : 0;
                  const isOverdue = ageInDays > 7;

                  return (
                    <TableRow
                      key={report.id}
                      className={isOverdue ? 'bg-red-50 dark:bg-red-900/20' : ''}
                    >
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
                      <TableCell className="tabular-nums">
                        {distributedDate?.toLocaleDateString() || '-'}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`${isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : ''} tabular-nums`}
                        >
                          {ageInDays} days
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={isOverdue ? 'destructive' : 'secondary'}
                          className="shrink-0"
                        >
                          {isOverdue ? 'Overdue' : 'Pending'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export default PendingAdjustmentResponse;
