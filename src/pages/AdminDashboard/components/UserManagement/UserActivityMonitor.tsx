import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/integrations/convex/api';
import { useQuery } from 'convex/react';
import { Activity, AlertCircle, RefreshCw } from 'lucide-react';
import React from 'react';

const UserActivityMonitor: React.FC = () => {
  const logs = useQuery(api.audit.getAuditLogs, { limit: 50 });

  const recentActivity = (logs ?? []).map((log) => ({
    id: String(log._id),
    userId: log.userId ? String(log.userId) : 'system',
    action: log.action,
    timestamp: new Date(log.timestamp).toISOString(),
    details: `${log.entityType} ${log.entityId}`,
    severity: /FAIL|REJECT|ERROR|SECURITY/i.test(log.action)
      ? ('warning' as const)
      : ('info' as const),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">User Activity Monitor</h2>
          <p className="text-muted-foreground">
            Recent audit events. Live sessions and device presence are not tracked.
          </p>
        </div>
        <Badge variant="outline" className="bg-green-100 text-green-800">
          <Activity className="h-3 w-3 mr-1" />
          Audit log
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Presence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This deployment does not store active sessions, IP addresses, or page paths. The list
            below is the staff audit trail.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent audit events</CardTitle>
          <Button variant="outline" size="sm" disabled>
            <RefreshCw className="h-4 w-4 mr-2" />
            Live
          </Button>
        </CardHeader>
        <CardContent>
          {logs === undefined ? (
            <p className="text-sm text-muted-foreground">Loading audit events…</p>
          ) : recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit events yet.</p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start justify-between border-b border-border pb-3 last:border-0"
                >
                  <div>
                    <p className="font-medium text-foreground">{event.action}</p>
                    <p className="text-sm text-muted-foreground">{event.details}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline">{event.severity}</Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(event.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserActivityMonitor;
