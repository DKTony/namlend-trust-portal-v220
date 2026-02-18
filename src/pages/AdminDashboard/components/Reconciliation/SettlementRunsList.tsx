/**
 * Settlement Runs List Component
 * Displays all settlement runs with filtering and details view
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Eye, Calendar, RefreshCw, Plus, Play, Loader2 } from 'lucide-react';
import {
  useSettlementRuns,
  useSettlementRunDetails,
  useCreateSettlementRun,
  useProcessSettlementRun,
  useMarkSettlementSettled,
} from '@/hooks/useSettlement';
import { formatNAD } from '@/constants/regulatory';
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
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newRunDate, setNewRunDate] = useState(new Date().toISOString().split('T')[0]);
  const [newRunWindow, setNewRunWindow] = useState('SW1');
  const [processingRunId, setProcessingRunId] = useState<string | null>(null);

  const createRunMutation = useCreateSettlementRun();
  const processRunMutation = useProcessSettlementRun();
  const settleRunMutation = useMarkSettlementSettled();

  const {
    data: runs,
    isLoading,
    isError,
    refetch,
  } = useSettlementRuns({
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    state: stateFilter !== 'all' ? (stateFilter as SettlementRunState) : undefined,
  });

  const { data: runDetails, isLoading: detailsLoading } = useSettlementRunDetails(
    selectedRunId || undefined
  );

  const handleCreateAndProcess = async () => {
    try {
      // Step 1: Create run
      const createResult = await createRunMutation.mutateAsync({
        settlementDate: newRunDate,
        windowId: newRunWindow,
      });

      if (!createResult.success || !createResult.run_id) {
        return;
      }

      setShowCreateDialog(false);
      setProcessingRunId(createResult.run_id);

      // Step 2: Process run (ingest, netting, generate batches & reports)
      const processResult = await processRunMutation.mutateAsync({
        runId: createResult.run_id,
        dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        dateTo: new Date().toISOString(),
      });

      if (!processResult.success) {
        setProcessingRunId(null);
        return;
      }

      // Step 3: Mark as settled (simulate NISS acceptance)
      await settleRunMutation.mutateAsync(createResult.run_id);
      setProcessingRunId(null);
      refetch();
    } catch (error) {
      console.error('Error creating/processing settlement:', error);
      setProcessingRunId(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Settlement Runs</CardTitle>
              <CardDescription>View and manage settlement runs across all windows</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowCreateDialog(true)}
                disabled={processingRunId !== null}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Settlement Run
              </Button>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
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
                ) : isError ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <div className="text-destructive">Failed to load settlement runs.</div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => refetch()}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Retry
                      </Button>
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
                      <TableCell className="font-mono text-sm tabular-nums">{run.run_id}</TableCell>
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
                        <Progress value={getSettlementProgress(run.state)} className="h-2" />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {run.transaction_count.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNAD(run.total_principal)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {run.net_instruction_count}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedRunId(run.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {processingRunId === run.id && (
                            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                          )}
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

      {/* Run Details Dialog */}
      <Dialog open={!!selectedRunId} onOpenChange={() => setSelectedRunId(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Settlement Run Details: {runDetails?.run?.run_id}</DialogTitle>
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
                    {formatWindowId(runDetails.run.window_id, runDetails.run.settlement_date)}
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
                  <p className="font-medium">{runDetails.run.transaction_count.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Principal</p>
                  <p className="font-medium">{formatNAD(runDetails.run.total_principal)}</p>
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
                              {batch.batch_type === 'main' ? 'MNSB Settlement' : 'Switching Fee'}
                            </TableCell>
                            <TableCell className="font-mono text-sm">{batch.msg_id}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{batch.status}</Badge>
                            </TableCell>
                            <TableCell className="text-right">{batch.instruction_count}</TableCell>
                            <TableCell className="text-right">
                              {formatNAD(batch.total_amount)}
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
                            <TableCell className="font-medium">{exp.participant}</TableCell>
                            <TableCell className="text-right text-red-600 dark:text-red-400">
                              {formatNAD(exp.gross_payables)}
                            </TableCell>
                            <TableCell className="text-right text-green-600 dark:text-green-400">
                              {formatNAD(exp.gross_receivables)}
                            </TableCell>
                            <TableCell
                              className={`text-right font-medium ${
                                exp.net_position >= 0
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-red-600 dark:text-red-400'
                              }`}
                            >
                              {formatNAD(exp.net_position)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatNAD(exp.switching_fee_payable)}
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

      {/* Create Settlement Run Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Settlement Run</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Settlement Date</label>
              <Input
                type="date"
                value={newRunDate}
                onChange={(e) => setNewRunDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Settlement Window</label>
              <Select value={newRunWindow} onValueChange={setNewRunWindow}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SW1">SW1 - Morning (08:00)</SelectItem>
                  <SelectItem value="SW2">SW2 - Noon (12:00)</SelectItem>
                  <SelectItem value="SW3">SW3 - Afternoon (15:00)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="bg-muted p-3 rounded-md text-sm">
              <p className="font-medium mb-1">This will:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Create a new settlement run</li>
                <li>Ingest all successful IPS disbursements from the past 7 days</li>
                <li>Compute bilateral netting obligations</li>
                <li>Generate pacs.009 batch files</li>
                <li>Generate NTSL and Raw Data reports</li>
                <li>Simulate NISS acceptance (mark as settled)</li>
              </ul>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateAndProcess}
                disabled={
                  createRunMutation.isPending ||
                  processRunMutation.isPending ||
                  settleRunMutation.isPending
                }
              >
                {createRunMutation.isPending ||
                processRunMutation.isPending ||
                settleRunMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Create & Process
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default SettlementRunsList;
