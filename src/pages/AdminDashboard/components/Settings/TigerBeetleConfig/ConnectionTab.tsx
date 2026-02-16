/**
 * TigerBeetle Connection Tab
 * Connection status display, enable toggle, cluster ID, replica addresses, timeout settings.
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Server, Zap, Loader2 } from 'lucide-react';
import type { TigerBeetleConnectionConfig } from '@/hooks/useTigerBeetleConfig';

interface ConnectionTabProps {
  config: TigerBeetleConnectionConfig;
  connectionStatus: 'unknown' | 'connected' | 'disconnected';
  testingConnection: boolean;
  onUpdateConfig: (
    key: keyof TigerBeetleConnectionConfig,
    value: string | number | boolean | string[]
  ) => void;
  onTestConnection: () => void;
}

export function ConnectionTab({
  config,
  connectionStatus,
  testingConnection,
  onUpdateConfig,
  onTestConnection,
}: ConnectionTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5" />
          Cluster Connection
        </CardTitle>
        <CardDescription>Configure TigerBeetle cluster connection settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connection Status */}
        <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full ${
                connectionStatus === 'connected'
                  ? 'bg-green-500'
                  : connectionStatus === 'disconnected'
                    ? 'bg-red-500'
                    : 'bg-gray-400'
              }`}
            />
            <div>
              <div className="font-medium">Connection Status</div>
              <div className="text-sm text-muted-foreground">
                {connectionStatus === 'connected'
                  ? 'Connected to TigerBeetle cluster'
                  : connectionStatus === 'disconnected'
                    ? 'Not connected'
                    : 'Status unknown - test connection'}
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={onTestConnection} disabled={testingConnection}>
            {testingConnection ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            Test Connection
          </Button>
        </div>

        <Separator />

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <Label>Enable TigerBeetle Integration</Label>
            <p className="text-xs text-muted-foreground">
              When disabled, financial operations use Postgres only
            </p>
          </div>
          <Switch
            checked={config.enabled}
            onCheckedChange={(checked) => onUpdateConfig('enabled', checked)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Label>Cluster ID</Label>
            <Input
              type="number"
              value={config.cluster_id}
              onChange={(e) => onUpdateConfig('cluster_id', Number(e.target.value))}
              min={0}
              className="bg-background"
            />
            <p className="text-xs text-muted-foreground">
              TigerBeetle cluster identifier (0 for development)
            </p>
          </div>

          <div className="space-y-4">
            <Label>Replica Addresses</Label>
            <Input
              value={config.replica_addresses.join(', ')}
              onChange={(e) =>
                onUpdateConfig(
                  'replica_addresses',
                  e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean)
                )
              }
              placeholder="127.0.0.1:3001, 127.0.0.1:3002"
              className="bg-background"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated list of replica addresses
            </p>
          </div>

          <div className="space-y-4">
            <Label>Connection Timeout (ms)</Label>
            <Input
              type="number"
              value={config.connection_timeout_ms}
              onChange={(e) => onUpdateConfig('connection_timeout_ms', Number(e.target.value))}
              min={1000}
              max={30000}
              className="bg-background"
            />
          </div>

          <div className="space-y-4">
            <Label>Request Timeout (ms)</Label>
            <Input
              type="number"
              value={config.request_timeout_ms}
              onChange={(e) => onUpdateConfig('request_timeout_ms', Number(e.target.value))}
              min={1000}
              max={60000}
              className="bg-background"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ConnectionTab;
