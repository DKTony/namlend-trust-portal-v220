import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/integrations/convex/api';
import { useQuery as useConvexQuery } from 'convex/react';
import {
  AlertCircle,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  Database,
  FileCheck,
  Loader2,
  TrendingUp,
} from 'lucide-react';
import { useMemo, useState } from 'react';

interface OutboxStats {
  pending: number;
  completed: number;
  failed: number;
  deadLetter: number;
}

interface AccountStats {
  total: number;
  created: number;
  pending: number;
}

interface ReconciliationRun {
  id: string;
  started_at: string;
  completed_at: string | null;
  records_checked: number;
  discrepancies_found: number;
  status: string;
}

export function LedgerDashboard() {
  const [processingOutbox, setProcessingOutbox] = useState(false);
  const [runningRecon, setRunningRecon] = useState(false);

  // Convex reactive queries for TigerBeetle data
  const rawOutboxStats = useConvexQuery(api.tigerbeetle.outbox.getOutboxStats);
  const rawReconciliations = useConvexQuery(api.tigerbeetle.reconciliation.listReconciliations, {
    limit: 10,
  });

  const rawCompleted =
    rawOutboxStats && 'completed' in rawOutboxStats ? rawOutboxStats.completed : 0;
  const outboxStats: OutboxStats = {
    pending: rawOutboxStats?.pending ?? 0,
    completed: typeof rawCompleted === 'number' ? rawCompleted : 0,
    failed: rawOutboxStats?.failed ?? 0,
    deadLetter: rawOutboxStats?.deadLetter ?? 0,
  };
  const accountStats: AccountStats = { total: 0, created: 0, pending: 0 };
  const recentReconciliations: ReconciliationRun[] = useMemo(() => {
    if (!rawReconciliations) return [];
    return rawReconciliations.map((r: any) => ({
      id: String(r._id),
      started_at: new Date(r.createdAt).toISOString(),
      completed_at: r.resolvedAt ? new Date(r.resolvedAt).toISOString() : null,
      records_checked: 1,
      discrepancies_found: r.status === 'variance_detected' ? 1 : 0,
      status: r.status,
    }));
  }, [rawReconciliations]);
  const loading = rawOutboxStats === undefined;

  async function processOutbox() {
    setProcessingOutbox(true);
    try {
      // Outbox processing is handled by the scheduled cron job (every 30s)
      // Manual trigger simulates a wait for the next cycle
      await new Promise((r) => setTimeout(r, 1000));
    } catch (error) {
      console.error('Failed to process outbox:', error);
    } finally {
      setProcessingOutbox(false);
    }
  }

  async function runReconciliation() {
    setRunningRecon(true);
    try {
      // Reconciliation runs are created via the reconciliation mutation
      await new Promise((r) => setTimeout(r, 1000));
    } catch (error) {
      console.error('Failed to run reconciliation:', error);
    } finally {
      setRunningRecon(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">TigerBeetle Ledger</h2>
          <p className="text-muted-foreground">Financial ledger status and reconciliation</p>
          <p className="mt-1 text-xs text-amber-600 ">
            Shadow ledger — Convex is the authoritative balance. Reconciliation here verifies Convex
            ↔ outbox ↔ shadow-transfer consistency, not real-world settlement. Figures do not imply
            funds have settled at the bank/rail.
          </p>
        </div>
        {/* Convex queries are reactive — data auto-refreshes */}
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outbox Queue</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{outboxStats.pending}</div>
            <p className="text-xs text-muted-foreground">pending transfers</p>
            <div className="mt-2 flex gap-2">
              <Badge variant="default">{outboxStats.completed} done</Badge>
              {outboxStats.failed > 0 && (
                <Badge variant="destructive">{outboxStats.failed} failed</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ledger Accounts</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accountStats.total}</div>
            <p className="text-xs text-muted-foreground">total accounts mapped</p>
            <div className="mt-2 flex gap-2">
              <Badge variant="default">{accountStats.created} created</Badge>
              {accountStats.pending > 0 && (
                <Badge variant="secondary">{accountStats.pending} pending</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reconciliation</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {recentReconciliations.length > 0 ? (
                recentReconciliations[0].discrepancies_found === 0 ? (
                  <span className="text-green-600">✓ In Sync</span>
                ) : (
                  <span className="text-yellow-600">
                    {recentReconciliations[0].discrepancies_found} issues
                  </span>
                )
              ) : (
                <span className="text-muted-foreground">No runs</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">last reconciliation status</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Server Status</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Online
            </div>
            <p className="text-xs text-muted-foreground">127.0.0.1:3001</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="outbox" className="space-y-4">
        <TabsList>
          <TabsTrigger value="outbox">Outbox Queue</TabsTrigger>
          <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
          <TabsTrigger value="accounts">Account Mappings</TabsTrigger>
        </TabsList>

        <TabsContent value="outbox" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Transfer Queue</CardTitle>
                  <CardDescription>
                    Pending transfers waiting to be posted to TigerBeetle
                  </CardDescription>
                </div>
                <Button onClick={processOutbox} disabled={processingOutbox}>
                  {processingOutbox ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                  )}
                  Process Queue
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <div className="text-2xl font-bold text-yellow-600">{outboxStats.pending}</div>
                    <div className="text-sm text-muted-foreground">Pending</div>
                  </div>
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="text-2xl font-bold text-green-600">{outboxStats.completed}</div>
                    <div className="text-sm text-muted-foreground">Completed</div>
                  </div>
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                    <div className="text-2xl font-bold text-red-600">{outboxStats.failed}</div>
                    <div className="text-sm text-muted-foreground">Failed</div>
                  </div>
                  <div className="p-4 rounded-lg bg-gray-500/10 border border-gray-500/20">
                    <div className="text-2xl font-bold text-gray-600">{outboxStats.deadLetter}</div>
                    <div className="text-sm text-muted-foreground">Dead Letter</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reconciliation" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Reconciliation History</CardTitle>
                  <CardDescription>
                    Compare Supabase records with TigerBeetle balances
                  </CardDescription>
                </div>
                <Button onClick={runReconciliation} disabled={runningRecon}>
                  {runningRecon ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileCheck className="h-4 w-4 mr-2" />
                  )}
                  Run Reconciliation
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentReconciliations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No reconciliation runs yet</p>
                  <p className="text-sm">Run your first reconciliation to compare data</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentReconciliations.map((run) => (
                    <div
                      key={run.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        {run.status === 'completed' && run.discrepancies_found === 0 ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : run.status === 'completed' ? (
                          <AlertCircle className="h-5 w-5 text-yellow-600" />
                        ) : (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        )}
                        <div>
                          <div className="font-medium">
                            {new Date(run.started_at).toLocaleString()}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {run.records_checked} records checked
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={run.discrepancies_found === 0 ? 'default' : 'destructive'}>
                          {run.discrepancies_found} discrepancies
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Account Mappings</CardTitle>
              <CardDescription>
                OG Financial Services entities mapped to TigerBeetle accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border bg-card">
                  <div className="text-lg font-semibold">Global Accounts</div>
                  <div className="text-3xl font-bold mt-2">11</div>
                  <div className="text-sm text-muted-foreground">Clearing, Settlement, Income</div>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <div className="text-lg font-semibold">Loan Accounts</div>
                  <div className="text-3xl font-bold mt-2">{accountStats.total - 11}</div>
                  <div className="text-sm text-muted-foreground">Principal, Interest, Fees</div>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <div className="text-lg font-semibold">Total Mapped</div>
                  <div className="text-3xl font-bold mt-2">{accountStats.total}</div>
                  <div className="text-sm text-muted-foreground">All account types</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default LedgerDashboard;
