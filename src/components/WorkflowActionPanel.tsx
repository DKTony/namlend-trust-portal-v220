/**
 * Workflow Action Panel
 * UI for approving/rejecting workflow stages
 * Version: v2.4.0
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useWorkflowActions } from '@/hooks/useWorkflow';
import { WorkflowStageExecution } from '@/services/workflowEngine';

interface WorkflowActionPanelProps {
  stageExecution: WorkflowStageExecution;
  onActionComplete?: () => void;
}

const WorkflowActionPanel: React.FC<WorkflowActionPanelProps> = ({
  stageExecution,
  onActionComplete
}) => {
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const { approveStage, rejectStage, loading } = useWorkflowActions();

  const handleApprove = async () => {
    try {
      await approveStage(stageExecution.id, notes || undefined);
      setNotes('');
      setShowNotes(false);
      if (onActionComplete) {
        onActionComplete();
      }
    } catch (err) {
      console.error('Approval error:', err);
    }
  };

  const handleReject = async () => {
    if (!notes.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    try {
      await rejectStage(stageExecution.id, notes);
      setNotes('');
      setShowNotes(false);
      if (onActionComplete) {
        onActionComplete();
      }
    } catch (err) {
      console.error('Rejection error:', err);
    }
  };

  if (stageExecution.status !== 'pending') {
    return null;
  }

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="text-lg">Action Required</CardTitle>
        <CardDescription>
          Stage {stageExecution.stage_number}: {stageExecution.stage_name}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Notes section */}
        {showNotes && (
          <div className="space-y-2">
            <Label htmlFor="decision-notes">
              Decision Notes {!showNotes && '(Optional)'}
            </Label>
            <Textarea
              id="decision-notes"
              placeholder="Add notes about your decision..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
        )}

        {/* Action buttons */}
        <div className="flex space-x-3">
          <Button
            onClick={handleApprove}
            disabled={loading}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="mr-2 h-4 w-4" />
            )}
            Approve
          </Button>
          
          <Button
            onClick={handleReject}
            disabled={loading}
            variant="destructive"
            className="flex-1"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="mr-2 h-4 w-4" />
            )}
            Reject
          </Button>
        </div>

        {/* Toggle notes */}
        {!showNotes && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNotes(true)}
            className="w-full"
          >
            Add Notes
          </Button>
        )}

        {/* Stage info */}
        <div className="text-xs text-muted-foreground pt-2 border-t">
          <p>Assigned Role: <span className="font-medium">{stageExecution.assigned_role}</span></p>
          <p>Created: {new Date(stageExecution.created_at).toLocaleString()}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkflowActionPanel;
