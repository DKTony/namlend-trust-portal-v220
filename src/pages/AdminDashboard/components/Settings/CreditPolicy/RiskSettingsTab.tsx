import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { AlertTriangle } from 'lucide-react';

interface RiskSettingsTabProps {
  policy: {
    autoApproveThreshold: number;
    autoRejectThreshold: number;
    manualReviewRequired: boolean;
  };
  onUpdate: (key: string, value: number | boolean) => void;
}

export function RiskSettingsTab({ policy, onUpdate }: RiskSettingsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Risk & Automation Settings
        </CardTitle>
        <CardDescription>
          Configure automated approval thresholds and risk parameters
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Label>Auto-Approve Score Threshold</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[policy.autoApproveThreshold]}
                onValueChange={([value]) => onUpdate('autoApproveThreshold', value)}
                min={50}
                max={100}
                step={1}
                className="flex-1"
              />
              <span className="w-16 text-right font-medium">{policy.autoApproveThreshold}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Applications scoring above {policy.autoApproveThreshold} may be auto-approved
            </p>
          </div>
          <div className="space-y-4">
            <Label>Auto-Reject Score Threshold</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[policy.autoRejectThreshold]}
                onValueChange={([value]) => onUpdate('autoRejectThreshold', value)}
                min={0}
                max={50}
                step={1}
                className="flex-1"
              />
              <span className="w-16 text-right font-medium">{policy.autoRejectThreshold}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Applications scoring below {policy.autoRejectThreshold} will be auto-rejected
            </p>
          </div>
        </div>
        <Separator />
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <Label>Require Manual Review</Label>
            <p className="text-xs text-muted-foreground">
              All applications require human review before final decision
            </p>
          </div>
          <Switch
            checked={policy.manualReviewRequired}
            onCheckedChange={(checked) => onUpdate('manualReviewRequired', checked)}
          />
        </div>
        <div className="p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2 text-foreground">Scoring Range Breakdown</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center p-2 bg-red-100 dark:bg-red-900/30 rounded">
              <div className="font-medium text-red-700 dark:text-red-300">
                0 - {policy.autoRejectThreshold}
              </div>
              <div className="text-red-600 dark:text-red-400 text-xs">Auto-Reject</div>
            </div>
            <div className="text-center p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded">
              <div className="font-medium text-yellow-700 dark:text-yellow-300">
                {policy.autoRejectThreshold} - {policy.autoApproveThreshold}
              </div>
              <div className="text-yellow-600 dark:text-yellow-400 text-xs">Manual Review</div>
            </div>
            <div className="text-center p-2 bg-green-100 dark:bg-green-900/30 rounded">
              <div className="font-medium text-green-700 dark:text-green-300">
                {policy.autoApproveThreshold} - 100
              </div>
              <div className="text-green-600 dark:text-green-400 text-xs">Auto-Approve</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
