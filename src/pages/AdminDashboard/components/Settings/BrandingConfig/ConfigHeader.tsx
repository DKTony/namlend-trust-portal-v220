/**
 * ConfigHeader - Title, preview toggle, save/reset/discard actions
 * Part of BrandingConfig split
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
import { Eye, EyeOff, Loader2, Palette, RotateCcw, Save } from 'lucide-react';

interface ConfigHeaderProps {
  hasChanges: boolean;
  saving: boolean;
  previewMode: boolean;
  onTogglePreview: () => void;
  onDiscard: () => void;
  onReset: () => void;
  onSave: () => void;
}

export function ConfigHeader({
  hasChanges,
  saving,
  previewMode,
  onTogglePreview,
  onDiscard,
  onReset,
  onSave,
}: ConfigHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Palette className="h-6 w-6" />
          Branding & White Label
        </h2>
        <p className="text-muted-foreground">Customize your platform's appearance and identity</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {hasChanges && (
          <Badge
            variant="outline"
            className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400"
          >
            Unsaved Changes
          </Badge>
        )}
        <Button variant="outline" size="sm" onClick={onTogglePreview}>
          {previewMode ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
          {previewMode ? 'Hide Preview' : 'Preview'}
        </Button>
        {hasChanges && (
          <Button variant="ghost" size="sm" onClick={onDiscard}>
            Discard
          </Button>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset Branding?</AlertDialogTitle>
              <AlertDialogDescription>
                This will reset all branding settings to defaults. This action cannot be undone
                after you save.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onReset}>Reset</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button onClick={onSave} disabled={saving || !hasChanges}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save
        </Button>
      </div>
    </div>
  );
}

export default ConfigHeader;
