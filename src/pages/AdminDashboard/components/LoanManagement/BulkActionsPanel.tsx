import React, { useState } from 'react';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { ThemedButton } from '@/components/ui/ThemedButton';
import { ThemedBadge } from '@/components/ui/ThemedBadge';
import { CheckCircle, XCircle, FileText, X, AlertTriangle, Download, Mail } from 'lucide-react';
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
import { toast } from '@/hooks/use-toast';
import { handleMutationError } from '@/lib/mutationError';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

interface BulkActionsPanelProps {
  selectedCount: number;
  onBulkAction: (action: 'approve' | 'reject' | 'review') => void;
  onClearSelection: () => void;
}

const BulkActionsPanel: React.FC<BulkActionsPanelProps> = ({
  selectedCount,
  onBulkAction,
  onClearSelection,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { styles } = useTheme();

  const handleBulkAction = async (action: 'approve' | 'reject' | 'review') => {
    setIsProcessing(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      onBulkAction(action);

      toast({
        title: 'Bulk Action Completed',
        description: `Successfully ${action}d ${selectedCount} loan application${selectedCount > 1 ? 's' : ''}.`,
        variant: 'default',
      });

      onClearSelection();
    } catch (error) {
      toast({
        title: 'Bulk Action Failed',
        description: handleMutationError(
          error,
          'An error occurred while processing the bulk action. Please try again.'
        ),
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const bulkActions = [
    {
      id: 'approve',
      label: 'Bulk Approve',
      icon: CheckCircle,
      variant: 'primary' as const,
      className: 'bg-green-600 hover:bg-green-700 text-white border-none',
      description: `Approve ${selectedCount} selected application${selectedCount > 1 ? 's' : ''}`,
      confirmTitle: 'Confirm Bulk Approval',
      confirmDescription: `Are you sure you want to approve ${selectedCount} loan application${selectedCount > 1 ? 's' : ''}? This action cannot be undone.`,
    },
    {
      id: 'reject',
      label: 'Bulk Reject',
      icon: XCircle,
      variant: 'secondary' as const,
      className:
        'border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20',
      description: `Reject ${selectedCount} selected application${selectedCount > 1 ? 's' : ''}`,
      confirmTitle: 'Confirm Bulk Rejection',
      confirmDescription: `Are you sure you want to reject ${selectedCount} loan application${selectedCount > 1 ? 's' : ''}? This action cannot be undone.`,
    },
    {
      id: 'review',
      label: 'Mark for Review',
      icon: FileText,
      variant: 'secondary' as const,
      className:
        'border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20',
      description: `Mark ${selectedCount} application${selectedCount > 1 ? 's' : ''} for detailed review`,
      confirmTitle: 'Mark for Review',
      confirmDescription: `Mark ${selectedCount} loan application${selectedCount > 1 ? 's' : ''} for detailed review? They will be flagged for senior review.`,
    },
  ];

  return (
    <ThemedCard className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <ThemedBadge className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800">
              {selectedCount} Selected
            </ThemedBadge>
            <span className={cn('text-sm font-medium', styles.textClass)}>
              Bulk Actions Available
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Primary Actions */}
          {bulkActions.map((action) => {
            const Icon = action.icon;
            return (
              <AlertDialog key={action.id}>
                <AlertDialogTrigger asChild>
                  <ThemedButton
                    variant={action.variant}
                    className={cn('h-9 px-3 text-xs', action.className)}
                    disabled={isProcessing}
                  >
                    <Icon className="h-3.5 w-3.5 mr-2" />
                    {action.label}
                  </ThemedButton>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center space-x-2">
                      <Icon className="h-5 w-5" />
                      <span>{action.confirmTitle}</span>
                    </AlertDialogTitle>
                    <AlertDialogDescription>{action.confirmDescription}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleBulkAction(action.id as 'approve' | 'reject' | 'review')}
                      className={
                        action.id === 'approve'
                          ? 'bg-green-600 hover:bg-green-700'
                          : action.id === 'reject'
                            ? 'bg-red-600 hover:bg-red-700'
                            : ''
                      }
                    >
                      {isProcessing ? 'Processing...' : `Confirm ${action.label}`}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            );
          })}

          {/* Secondary Actions */}
          <div className="flex items-center space-x-1 ml-4 pl-4 border-l border-border">
            <ThemedButton variant="ghost" className="h-9 px-3 text-xs">
              <Download className="h-3.5 w-3.5 mr-2" />
              Export
            </ThemedButton>
            <ThemedButton variant="ghost" className="h-9 px-3 text-xs">
              <Mail className="h-3.5 w-3.5 mr-2" />
              Notify
            </ThemedButton>
          </div>

          {/* Clear Selection */}
          <ThemedButton
            variant="ghost"
            className="h-9 w-9 p-0 rounded-full"
            onClick={onClearSelection}
            title="Clear selection"
          >
            <X className="h-4 w-4" />
          </ThemedButton>
        </div>
      </div>

      {/* Processing Indicator */}
      {isProcessing && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
            <span className="text-sm">Processing bulk action...</span>
          </div>
        </div>
      )}

      {/* Warning for Large Selections */}
      {selectedCount > 10 && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center space-x-2 text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/10 p-2 rounded-md">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">
              Large selection detected. Please ensure you've reviewed all applications before
              proceeding.
            </span>
          </div>
        </div>
      )}
    </ThemedCard>
  );
};

export default BulkActionsPanel;
