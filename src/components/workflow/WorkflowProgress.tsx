/**
 * Workflow Progress Component
 * Visual indicator for multi-stage workflow progress
 * Version: v2.4.0
 */

import { Badge } from '@/components/ui/badge';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { CheckCircle, Circle, Clock, XCircle } from 'lucide-react';
import React from 'react';

interface WorkflowStageExecution {
  id: string;
  workflow_instance_id: string;
  stage_number: number;
  stage_name: string;
  assigned_role: string;
  assigned_to?: string;
  status: 'pending' | 'approved' | 'rejected' | 'skipped';
  decision?: string;
  decision_notes?: string;
  decided_by?: string;
  decided_at?: string;
  created_at: string;
}

interface WorkflowProgressProps {
  stages: WorkflowStageExecution[];
  currentStage: number;
  status: string;
}

const WorkflowProgress: React.FC<WorkflowProgressProps> = ({ stages, currentStage, status }) => {
  const getStageIcon = (stage: WorkflowStageExecution) => {
    switch (stage.status) {
      case 'approved':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-6 w-6 text-red-500" />;
      case 'pending':
        return <Clock className="h-6 w-6 text-yellow-600 " />;
      default:
        return <Circle className="h-6 w-6 text-muted-foreground" />;
    }
  };

  const getStageStatus = (stage: WorkflowStageExecution) => {
    switch (stage.status) {
      case 'approved':
        return <Badge className="bg-green-600 hover:bg-green-700  ">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-600 hover:bg-yellow-700   text-white">Pending</Badge>;
      case 'skipped':
        return <Badge variant="outline">Skipped</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getWorkflowStatus = () => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-600 hover:bg-green-700  ">Completed</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-600 hover:bg-blue-700  ">In Progress</Badge>;
      case 'cancelled':
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <ThemedCard className="bg-card border-border">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg text-foreground">Workflow Progress</CardTitle>
          {getWorkflowStatus()}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stages.map((stage, index) => (
            <div key={stage.id} className="relative">
              {/* Connector line */}
              {index < stages.length - 1 && (
                <div className="absolute left-3 top-10 bottom-0 w-0.5 bg-border" />
              )}

              <div className="flex items-start space-x-4">
                {/* Stage icon */}
                <div className="relative z-10 bg-background">{getStageIcon(stage)}</div>

                {/* Stage details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm text-foreground">
                        Stage {stage.stage_number}: {stage.stage_name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Role: {stage.assigned_role}
                      </p>
                    </div>
                    {getStageStatus(stage)}
                  </div>

                  {/* Decision info */}
                  {stage.decided_by && stage.decided_at && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      <p>Decided: {new Date(stage.decided_at).toLocaleString()}</p>
                      {stage.decision_notes && (
                        <p className="mt-1 italic">"{stage.decision_notes}"</p>
                      )}
                    </div>
                  )}

                  {/* Pending indicator */}
                  {stage.status === 'pending' && stage.stage_number === currentStage && (
                    <div className="mt-2">
                      <Badge
                        variant="outline"
                        className="text-xs border-blue-200 text-blue-700 bg-blue-50   "
                      >
                        Current Stage - Awaiting Action
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="mt-6">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Progress</span>
            <span>
              {stages.filter((s) => s.status === 'approved').length} / {stages.length} stages
              completed
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-blue-600  h-2 rounded-full transition-all duration-300"
              style={{
                width: `${(stages.filter((s) => s.status === 'approved').length / stages.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </CardContent>
    </ThemedCard>
  );
};

export default WorkflowProgress;
