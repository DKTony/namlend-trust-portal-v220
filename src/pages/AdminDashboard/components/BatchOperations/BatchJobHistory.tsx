import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BatchJob {
  id: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  total: number;
  processed: number;
  failed: number;
  startedAt?: string;
  completedAt?: string;
}

interface BatchJobHistoryProps {
  jobHistory: BatchJob[];
  totalLoans: number;
  selectedCount: number;
}

export function BatchJobHistory({ jobHistory, totalLoans, selectedCount }: BatchJobHistoryProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          {jobHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent jobs</p>
          ) : (
            <div className="space-y-3">
              {jobHistory.slice(0, 5).map((job) => (
                <div key={job.id} className="p-2 border border-border rounded text-sm bg-card">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-foreground capitalize">
                      {job.type.replace('_', ' ')}
                    </span>
                    <Badge
                      variant={job.status === 'completed' ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {job.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {job.processed}/{job.total} processed
                    {job.failed > 0 && `, ${job.failed} failed`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {job.completedAt && new Date(job.completedAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Quick Stats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Loans</span>
            <span className="font-medium text-foreground">{totalLoans}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Selected</span>
            <span className="font-medium text-foreground">{selectedCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Jobs Today</span>
            <span className="font-medium text-foreground">{jobHistory.length}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
