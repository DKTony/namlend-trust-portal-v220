import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  XCircle, 
  FileText, 
  X, 
  AlertTriangle,
  Download,
  Mail
} from 'lucide-react';
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

interface BulkActionsPanelProps {
  selectedCount: number;
  onBulkAction: (action: 'approve' | 'reject' | 'review') => void;
  onClearSelection: () => void;
}

const BulkActionsPanel: React.FC<BulkActionsPanelProps> = ({
  selectedCount,
  onBulkAction,
  onClearSelection
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBulkAction = async (action: 'approve' | 'reject' | 'review') => {
    setIsProcessing(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      onBulkAction(action);
      
      toast({
        title: 'Bulk Action Completed',
        description: `Successfully ${action}d ${selectedCount} loan application${selectedCount > 1 ? 's' : ''}.`,
        variant: 'default'
      });
      
      onClearSelection();
    } catch (error) {
      toast({
        title: 'Bulk Action Failed',
        description: 'An error occurred while processing the bulk action. Please try again.',
        variant: 'destructive'
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
      variant: 'default' as const,
      className: 'bg-green-600 hover:bg-green-700 text-white',
      description: `Approve ${selectedCount} selected application${selectedCount > 1 ? 's' : ''}`,
      confirmTitle: 'Confirm Bulk Approval',
      confirmDescription: `Are you sure you want to approve ${selectedCount} loan application${selectedCount > 1 ? 's' : ''}? This action cannot be undone.`
    },
    {
      id: 'reject',
      label: 'Bulk Reject',
      icon: XCircle,
      variant: 'outline' as const,
      className: 'border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20',
      description: `Reject ${selectedCount} selected application${selectedCount > 1 ? 's' : ''}`,
      confirmTitle: 'Confirm Bulk Rejection',
      confirmDescription: `Are you sure you want to reject ${selectedCount} loan application${selectedCount > 1 ? 's' : ''}? This action cannot be undone.`
    },
    {
      id: 'review',
      label: 'Mark for Review',
      icon: FileText,
      variant: 'outline' as const,
      className: 'border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20',
      description: `Mark ${selectedCount} application${selectedCount > 1 ? 's' : ''} for detailed review`,
      confirmTitle: 'Mark for Review',
      confirmDescription: `Mark ${selectedCount} loan application${selectedCount > 1 ? 's' : ''} for detailed review? They will be flagged for senior review.`
    }
  ];

  return (
    <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                {selectedCount} Selected
              </Badge>
              <span className="text-sm text-blue-700 dark:text-blue-400 font-medium">
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
                    <Button
                      variant={action.variant}
                      size="sm"
                      className={action.className}
                      disabled={isProcessing}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {action.label}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center space-x-2">
                        <Icon className="h-5 w-5" />
                        <span>{action.confirmTitle}</span>
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {action.confirmDescription}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleBulkAction(action.id as 'approve' | 'reject' | 'review')}
                        className={action.id === 'approve' ? 'bg-green-600 hover:bg-green-700' : 
                                 action.id === 'reject' ? 'bg-red-600 hover:bg-red-700' : ''}
                      >
                        {isProcessing ? 'Processing...' : `Confirm ${action.label}`}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              );
            })}

            {/* Secondary Actions */}
            <div className="flex items-center space-x-1 ml-4 pl-4 border-l border-blue-300 dark:border-blue-700">
              <Button variant="ghost" size="sm" className="text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="ghost" size="sm" className="text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30">
                <Mail className="h-4 w-4 mr-2" />
                Notify
              </Button>
            </div>

            {/* Clear Selection */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              className="text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
            <div className="flex items-center space-x-2 text-blue-700 dark:text-blue-400">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 dark:border-blue-400"></div>
              <span className="text-sm">Processing bulk action...</span>
            </div>
          </div>
        )}

        {/* Warning for Large Selections */}
        {selectedCount > 10 && (
          <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
            <div className="flex items-center space-x-2 text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded-md">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">
                Large selection detected. Please ensure you've reviewed all applications before proceeding.
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BulkActionsPanel;
