/**
 * TigerBeetle Reconciliation Tab
 * Reconciliation toggle, cron schedule, variance threshold,
 * alert and auto-resolve toggles.
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { FileCheck, AlertTriangle } from 'lucide-react';
import type { TigerBeetleReconciliationConfig } from '@/hooks/useTigerBeetleConfig';

interface ReconciliationTabProps {
  config: TigerBeetleReconciliationConfig;
  onUpdateConfig: (
    key: keyof TigerBeetleReconciliationConfig,
    value: string | number | boolean
  ) => void;
}

export function ReconciliationTab({ config, onUpdateConfig }: ReconciliationTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCheck className="h-5 w-5" />
          Reconciliation Settings
        </CardTitle>
        <CardDescription>
          Configure automated reconciliation between Supabase and TigerBeetle
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <Label>Enable Reconciliation</Label>
            <p className="text-xs text-muted-foreground">Run scheduled reconciliation jobs</p>
          </div>
          <Switch
            checked={config.enabled}
            onCheckedChange={(checked) => onUpdateConfig('enabled', checked)}
          />
        </div>

        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Label>Schedule (Cron Expression)</Label>
            <Input
              value={config.schedule_cron}
              onChange={(e) => onUpdateConfig('schedule_cron', e.target.value)}
              placeholder="0 3 * * *"
              className="bg-background font-mono"
            />
            <p className="text-xs text-muted-foreground">Default: 3:00 AM daily (0 3 * * *)</p>
          </div>

          <div className="space-y-4">
            <Label>Variance Threshold (%)</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[config.variance_threshold_percent * 100]}
                onValueChange={([value]) =>
                  onUpdateConfig('variance_threshold_percent', value / 100)
                }
                min={0}
                max={5}
                step={0.01}
                className="flex-1"
              />
              <span className="w-20 text-right font-medium tabular-nums">
                {(config.variance_threshold_percent * 100).toFixed(2)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Flag discrepancies above this threshold</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label>Alert on Variance</Label>
              <p className="text-xs text-muted-foreground">Send alerts when variances detected</p>
            </div>
            <Switch
              checked={config.alert_on_variance}
              onCheckedChange={(checked) => onUpdateConfig('alert_on_variance', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label>Auto-Resolve Minor Discrepancies</Label>
              <p className="text-xs text-muted-foreground">
                Automatically resolve sub-threshold variances
              </p>
            </div>
            <Switch
              checked={config.auto_resolve_minor_discrepancies}
              onCheckedChange={(checked) =>
                onUpdateConfig('auto_resolve_minor_discrepancies', checked)
              }
            />
          </div>
        </div>

        {config.auto_resolve_minor_discrepancies && (
          <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-900 dark:text-yellow-300">Caution</h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    Auto-resolving discrepancies may mask underlying data issues. All auto-resolved
                    variances are logged for audit purposes.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}

export default ReconciliationTab;
