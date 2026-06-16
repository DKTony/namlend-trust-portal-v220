/**
 * TigerBeetle Config Header
 * Displays the title, info banner, unsaved changes badge, reset and save buttons.
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Database, Info, Loader2, RotateCcw, Save } from 'lucide-react';

interface ConfigHeaderProps {
  hasChanges: boolean;
  saving: boolean;
  onSave: () => void;
  onReset: () => void;
  readOnly?: boolean;
}

export function ConfigHeader({ hasChanges, saving, onSave, onReset, readOnly }: ConfigHeaderProps) {
  return (
    <>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6" />
            TigerBeetle Configuration
          </h2>
          <p className="text-muted-foreground">
            Configure financial ledger settings, outbox processing, and reconciliation
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge
              variant="outline"
              className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800"
            >
              Unsaved Changes
            </Badge>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={readOnly}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset to Default
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset TigerBeetle Configuration?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will reset all TigerBeetle settings to their default values. This action
                  cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onReset} disabled={readOnly}>
                  Reset
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button onClick={onSave} disabled={saving || !hasChanges || readOnly}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-500 dark:text-blue-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-300">
                Financial Ledger Integration
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-400">
                TigerBeetle provides strict double-entry bookkeeping with built-in idempotency and
                immutability. Changes to these settings may affect financial reconciliation.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export default ConfigHeader;
