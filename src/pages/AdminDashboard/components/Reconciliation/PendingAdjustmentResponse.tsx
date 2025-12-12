/**
 * Pending Adjustment Response Component
 * Items awaiting participant response/confirmation on adjustments
 */

import React from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FileClock, AlertTriangle } from 'lucide-react';
import { useSettlementReports } from '@/hooks/useSettlement';
import { formatCurrency } from '@/lib/utils';

export function PendingAdjustmentResponse() {
  const { data: reports, isLoading } = useSettlementReports({
    reportType: 'pending_adjustment_response',
  });

  const overdueCount = reports?.filter(
    (r) => r.distributed_at && new Date(r.distributed_at) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
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
              ) : reports?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-green-600">
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
                    <TableRow key={report.id} className={isOverdue ? 'bg-red-50' : ''}>
                      <TableCell>
                        {new Date(report.run_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{report.window_id}</TableCell>
                      <TableCell>{report.participant_name || 'All'}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {report.file_name}
                      </TableCell>
                      <TableCell>
                        {distributedDate?.toLocaleDateString() || '-'}
                      </TableCell>
                      <TableCell>
                        <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                          {ageInDays} days
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={isOverdue ? 'destructive' : 'secondary'}>
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
