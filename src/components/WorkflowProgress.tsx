/**
 * Workflow Progress Component
 * Visual indicator for multi-stage workflow progress
 * Version: v2.4.0
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, XCircle, Circle } from 'lucide-react';
import { WorkflowStageExecution } from '@/services/workflowEngine';

interface WorkflowProgressProps {
  stages: WorkflowStageExecution[];
  currentStage: number;
  status: string;
}

const WorkflowProgress: React.FC<WorkflowProgressProps> = ({
  stages,
  currentStage,
  status
}) => {
  const getStageIcon = (stage: WorkflowStageExecution) => {
    switch (stage.status) {
      case 'approved':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-6 w-6 text-red-500" />;
      case 'pending':
        return <Clock className="h-6 w-6 text-yellow-500" />;
      default:
        return <Circle className="h-6 w-6 text-gray-300" />;
    }
  };

  const getStageStatus = (stage: WorkflowStageExecution) => {
    switch (stage.status) {
      case 'approved':
        return <Badge className="bg-green-500">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case 'skipped':
        return <Badge variant="outline">Skipped</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getWorkflowStatus = () => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-500">In Progress</Badge>;
      case 'cancelled':
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">Workflow Progress</CardTitle>
          {getWorkflowStatus()}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stages.map((stage, index) => (
            <div key={stage.id} className="relative">
              {/* Connector line */}
              {index < stages.length - 1 && (
                <div className="absolute left-3 top-10 bottom-0 w-0.5 bg-gray-200" />
              )}
              
              <div className="flex items-start space-x-4">
                {/* Stage icon */}
                <div className="relative z-10 bg-white">
                  {getStageIcon(stage)}
                </div>
                
                {/* Stage details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">
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
                      <p>
                        Decided: {new Date(stage.decided_at).toLocaleString()}
                      </p>
                      {stage.decision_notes && (
                        <p className="mt-1 italic">"{stage.decision_notes}"</p>
                      )}
                    </div>
                  )}
                  
                  {/* Pending indicator */}
                  {stage.status === 'pending' && stage.stage_number === currentStage && (
                    <div className="mt-2">
                      <Badge variant="outline" className="text-xs">
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
              {stages.filter(s => s.status === 'approved').length} / {stages.length} stages completed
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${(stages.filter(s => s.status === 'approved').length / stages.length) * 100}%`
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkflowProgress;
