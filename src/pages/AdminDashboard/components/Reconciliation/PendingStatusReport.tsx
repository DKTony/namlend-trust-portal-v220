/**
 * Pending Status Report Component
 * Items still awaiting final status/closure in back office processes
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
import { FileQuestion } from 'lucide-react';
import { useSettlementReports } from '@/hooks/useSettlement';

export function PendingStatusReport() {
  const { data: reports, isLoading } = useSettlementReports({
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
              ) : reports?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-green-600">
                    ✓ No items pending status
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
                      {new Date(report.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">Pending</Badge>
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
