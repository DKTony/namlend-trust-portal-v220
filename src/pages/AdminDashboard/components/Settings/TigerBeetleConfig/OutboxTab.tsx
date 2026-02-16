/**
 * TigerBeetle Outbox Tab
 * Outbox processing toggle, batch size slider, interval, retries,
 * dead letter settings, and processing summary.
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { RefreshCw } from 'lucide-react';
import type { TigerBeetleOutboxConfig } from '@/hooks/useTigerBeetleConfig';

interface OutboxTabProps {
  config: TigerBeetleOutboxConfig;
  onUpdateConfig: (key: keyof TigerBeetleOutboxConfig, value: string | number | boolean) => void;
}

export function OutboxTab({ config, onUpdateConfig }: OutboxTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Outbox Processing
        </CardTitle>
        <CardDescription>
          Configure the transactional outbox pattern for reliable ledger posting
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <Label>Enable Outbox Processing</Label>
            <p className="text-xs text-muted-foreground">
              Process pending ledger entries via the outbox worker
            </p>
          </div>
          <Switch
            checked={config.processing_enabled}
            onCheckedChange={(checked) => onUpdateConfig('processing_enabled', checked)}
          />
        </div>

        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Label>Batch Size</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[config.batch_size]}
                onValueChange={([value]) => onUpdateConfig('batch_size', value)}
                min={10}
                max={500}
                step={10}
                className="flex-1"
              />
              <span className="w-16 text-right font-medium tabular-nums">{config.batch_size}</span>
            </div>
            <p className="text-xs text-muted-foreground">Number of entries to process per batch</p>
          </div>

          <div className="space-y-4">
            <Label>Processing Interval (ms)</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[config.processing_interval_ms]}
                onValueChange={([value]) => onUpdateConfig('processing_interval_ms', value)}
                min={1000}
                max={30000}
                step={1000}
                className="flex-1"
              />
              <span className="w-20 text-right font-medium tabular-nums">
                {(config.processing_interval_ms / 1000).toFixed(0)}s
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <Label>Max Retries</Label>
            <Input
              type="number"
              value={config.max_retries}
              onChange={(e) => onUpdateConfig('max_retries', Number(e.target.value))}
              min={1}
              max={20}
              className="bg-background"
            />
            <p className="text-xs text-muted-foreground">Maximum retry attempts before failure</p>
          </div>

          <div className="space-y-4">
            <Label>Retry Delay (ms)</Label>
            <Input
              type="number"
              value={config.retry_delay_ms}
              onChange={(e) => onUpdateConfig('retry_delay_ms', Number(e.target.value))}
              min={100}
              max={10000}
              className="bg-background"
            />
          </div>

          <div className="space-y-4">
            <Label>Dead Letter After Retries</Label>
            <Input
              type="number"
              value={config.dead_letter_after_retries}
              onChange={(e) => onUpdateConfig('dead_letter_after_retries', Number(e.target.value))}
              min={config.max_retries}
              max={50}
              className="bg-background"
            />
            <p className="text-xs text-muted-foreground">
              Move to dead letter queue after this many retries
            </p>
          </div>
        </div>

        <div className="p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">Processing Summary</h4>
          <div className="text-sm text-muted-foreground">
            The outbox worker will process up to {config.batch_size} entries every{' '}
            {config.processing_interval_ms / 1000} seconds. Failed entries will be retried up to{' '}
            {config.max_retries} times with a {config.retry_delay_ms}ms delay. After{' '}
            {config.dead_letter_after_retries} failures, entries move to the dead letter queue.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default OutboxTab;
