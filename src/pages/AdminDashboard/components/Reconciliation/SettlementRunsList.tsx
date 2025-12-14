/**
 * Settlement Runs List Component
 * Displays all settlement runs with filtering and details view
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
import { Progress } from '@/components/ui/progress';
import { Eye, Calendar, RefreshCw } from 'lucide-react';
import { useSettlementRuns, useSettlementRunDetails } from '@/hooks/useSettlement';
import { formatCurrency } from '@/lib/utils';
import {
  SETTLEMENT_STATE_LABELS,
  SETTLEMENT_STATE_COLORS,
  getSettlementProgress,
  formatWindowId,
  type SettlementRunState,
} from '@/types/settlement';

export function SettlementRunsList() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const { data: runs, isLoading, refetch } = useSettlementRuns({
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    state: stateFilter !== 'all' ? (stateFilter as SettlementRunState) : undefined,
  });

  const { data: runDetails, isLoading: detailsLoading } = useSettlementRunDetails(
    selectedRunId || undefined
  );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Settlement Runs</CardTitle>
              <CardDescription>
                View and manage settlement runs across all windows
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                placeholder="From"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-40"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="date"
                placeholder="To"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-40"
              />
            </div>
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                <SelectItem value="collecting">Collecting</SelectItem>
                <SelectItem value="netting">Netting</SelectItem>
                <SelectItem value="generated">Generated</SelectItem>
                <SelectItem value="dispatched">Dispatched</SelectItem>
                <SelectItem value="niss_accepted">NISS Accepted</SelectItem>
                <SelectItem value="settled">Settled</SelectItem>
                <SelectItem value="failed_validation">Failed</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Run ID</TableHead>
                  <TableHead>Window</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead className="text-right">Transactions</TableHead>
                  <TableHead className="text-right">Principal</TableHead>
                  <TableHead className="text-right">Net Instructions</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      Loading settlement runs...
                    </TableCell>
                  </TableRow>
                ) : runs?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      No settlement runs found
                    </TableCell>
                  </TableRow>
                ) : (
                  runs?.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell className="font-mono text-sm tabular-nums">
                        {run.run_id}
                      </TableCell>
                      <TableCell>{run.window_id}</TableCell>
                      <TableCell className="tabular-nums">
                        {new Date(run.settlement_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${SETTLEMENT_STATE_COLORS[run.state]} shrink-0`}
                          variant="outline"
                        >
                          {SETTLEMENT_STATE_LABELS[run.state]}
                        </Badge>
                      </TableCell>
                      <TableCell className="w-32">
                        <Progress
                          value={getSettlementProgress(run.state)}
                          className="h-2"
                        />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {run.transaction_count.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(run.total_principal)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {run.net_instruction_count}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedRunId(run.id)}
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

      {/* Run Details Dialog */}
      <Dialog open={!!selectedRunId} onOpenChange={() => setSelectedRunId(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Settlement Run Details: {runDetails?.run?.run_id}
            </DialogTitle>
          </DialogHeader>

          {detailsLoading ? (
            <div className="py-8 text-center">Loading details...</div>
          ) : runDetails ? (
            <div className="space-y-6">
              {/* Run Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Window</p>
                  <p className="font-medium">
                    {formatWindowId(
                      runDetails.run.window_id,
                      runDetails.run.settlement_date
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">State</p>
                  <Badge
                    className={SETTLEMENT_STATE_COLORS[runDetails.run.state]}
                    variant="outline"
                  >
                    {SETTLEMENT_STATE_LABELS[runDetails.run.state]}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Transactions</p>
                  <p className="font-medium">
                    {runDetails.run.transaction_count.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Principal</p>
                  <p className="font-medium">
                    {formatCurrency(runDetails.run.total_principal)}
                  </p>
                </div>
              </div>

              {/* Batches */}
              {runDetails.batches.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">pacs.009 Batches</h4>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Batch Type</TableHead>
                          <TableHead>Message ID</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Instructions</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {runDetails.batches.map((batch) => (
                          <TableRow key={batch.id}>
                            <TableCell>
                              {batch.batch_type === 'main'
                                ? 'MNSB Settlement'
                                : 'Switching Fee'}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {batch.msg_id}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{batch.status}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {batch.instruction_count}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(batch.total_amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Net Instructions */}
              {runDetails.net_instructions.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Net Instructions</h4>
                  <div className="rounded-md border max-h-64 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>From</TableHead>
                          <TableHead>To</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {runDetails.net_instructions.map((instr, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{instr.source}</p>
                                <p className="text-xs text-muted-foreground">
                                  {instr.source_bic}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{instr.target}</p>
                                <p className="text-xs text-muted-foreground">
                                  {instr.target_bic}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{instr.category_group}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(instr.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Exposures */}
              {runDetails.exposures.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Participant Exposures</h4>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Participant</TableHead>
                          <TableHead className="text-right">Payables</TableHead>
                          <TableHead className="text-right">Receivables</TableHead>
                          <TableHead className="text-right">Net Position</TableHead>
                          <TableHead className="text-right">Switching Fee</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {runDetails.exposures.map((exp, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">
                              {exp.participant}
                            </TableCell>
                            <TableCell className="text-right text-red-600 dark:text-red-400">
                              {formatCurrency(exp.gross_payables)}
                            </TableCell>
                            <TableCell className="text-right text-green-600 dark:text-green-400">
                              {formatCurrency(exp.gross_receivables)}
                            </TableCell>
                            <TableCell
                              className={`text-right font-medium ${
                                exp.net_position >= 0
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-red-600 dark:text-red-400'
                              }`}
                            >
                              {formatCurrency(exp.net_position)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(exp.switching_fee_payable)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default SettlementRunsList;
