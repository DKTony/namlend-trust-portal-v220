/**
 * Workflow Management Dashboard
 * Admin interface for configuring approval workflows
 * Version: v2.4.0
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/integrations/convex/api';
import { useQuery as useConvexQuery } from 'convex/react';
import { CheckCircle, Clock, Edit, Eye, GitBranch, History, Plus, Settings } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import WorkflowEditor from './WorkflowEditor';
import WorkflowStats from './WorkflowStats';

interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  entity_type: string;
  version: number;
  is_active: boolean;
  stages: {
    description: string;
    stage: number;
    name: string;
    required_role: string;
    required_approvals: number;
    auto_assign: boolean;
    timeout_hours: number;
    conditions: { amount_min?: number | null; amount_max?: number | null };
  }[];
  created_at: string;
  updated_at: string;
}

const WorkflowManagementDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowDefinition | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  // Convex reactive query — no as any (N2)
  const rawWorkflows = useConvexQuery(api.approvalWorkflow.listWorkflowDefinitions);
  const loading = rawWorkflows === undefined;

  const workflows: WorkflowDefinition[] = useMemo(() => {
    if (!rawWorkflows) return [];
    return rawWorkflows.map((w) => ({
      id: String(w._id),
      name: w.name ?? '',
      description: '',
      entity_type: w.entityType ?? '',
      version: 1,
      is_active: w.isActive ?? false,
      stages: (w.stages ?? []).map((s) => ({
        description: '',
        stage: s.order ?? 0,
        name: s.name ?? '',
        required_role: s.requiredRole ?? '',
        required_approvals: 1,
        auto_assign: false,
        timeout_hours: 24,
        conditions:
          (s.conditions as { amount_min?: number | null; amount_max?: number | null }) ?? {},
      })),
      created_at: w.createdAt ? new Date(w.createdAt).toISOString() : '',
      updated_at: w.updatedAt ? new Date(w.updatedAt).toISOString() : '',
    }));
  }, [rawWorkflows]);

  const handleEditWorkflow = (workflow: WorkflowDefinition) => {
    setSelectedWorkflow(workflow);
    setShowEditor(true);
  };

  const handleCreateNew = () => {
    setSelectedWorkflow(null);
    setShowEditor(true);
  };

  const getEntityTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      loan_application: 'Loan Applications',
      disbursement: 'Disbursements',
      payment: 'Payments',
      user_role_change: 'Role Changes',
    };
    return labels[type] || type;
  };

  if (showEditor) {
    return (
      <WorkflowEditor
        workflow={selectedWorkflow}
        onClose={() => {
          setShowEditor(false);
          setSelectedWorkflow(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Workflow Management</h2>
          <p className="text-muted-foreground">Configure multi-stage approval workflows</p>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="mr-2 h-4 w-4" />
          Create Workflow
        </Button>
      </div>

      {/* Stats Overview */}
      <WorkflowStats />

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">
            <GitBranch className="mr-2 h-4 w-4" />
            Workflows
          </TabsTrigger>
          <TabsTrigger value="active">
            <CheckCircle className="mr-2 h-4 w-4" />
            Active Instances
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="mr-2 h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Workflows Tab */}
        <TabsContent value="overview" className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">Loading workflows...</p>
              </CardContent>
            </Card>
          ) : workflows.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <div className="text-center">
                  <GitBranch className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">No workflows configured yet</p>
                  <Button onClick={handleCreateNew}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Workflow
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {workflows.map((workflow) => (
                <Card key={workflow.id} className={workflow.is_active ? 'border-blue-200' : ''}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0 mr-2">
                        <CardTitle className="text-lg truncate" title={workflow.name}>
                          {workflow.name}
                        </CardTitle>
                        <CardDescription className="mt-1 truncate">
                          {getEntityTypeLabel(workflow.entity_type)}
                        </CardDescription>
                      </div>
                      {workflow.is_active && (
                        <Badge className="bg-green-500 shrink-0">Active</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Description */}
                      {workflow.description && (
                        <p
                          className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]"
                          title={workflow.description}
                        >
                          {workflow.description}
                        </p>
                      )}

                      {/* Stages */}
                      <div className="flex items-center text-sm">
                        <GitBranch className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="tabular-nums">{workflow.stages.length} stages</span>
                      </div>

                      {/* Version */}
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Settings className="mr-2 h-4 w-4 shrink-0" />
                        <span className="tabular-nums">Version {workflow.version}</span>
                      </div>

                      {/* Actions */}
                      <div className="flex space-x-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditWorkflow(workflow)}
                          className="flex-1"
                        >
                          <Edit className="mr-2 h-3 w-3" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedWorkflow(workflow);
                            setActiveTab('active');
                          }}
                          className="flex-1"
                        >
                          <Eye className="mr-2 h-3 w-3" />
                          View
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Active Instances Tab */}
        <TabsContent value="active" className="space-y-4">
          <ActiveWorkflowInstances selectedWorkflow={selectedWorkflow} />
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <WorkflowHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Active Workflow Instances Component
const ActiveWorkflowInstances: React.FC<{ selectedWorkflow: WorkflowDefinition | null }> = ({
  selectedWorkflow,
}) => {
  // Convex reactive query for active approval requests (N2 — no as any)
  const rawApprovals = useConvexQuery(api.approvalWorkflow.adminListApprovals, {
    status: 'pending',
  });
  const loading = rawApprovals === undefined;

  const instances = useMemo(() => {
    if (!rawApprovals) return [];
    let filtered = rawApprovals;
    if (selectedWorkflow) {
      filtered = filtered.filter((a) => a.entityType === selectedWorkflow.entity_type);
    }
    return filtered.map((a) => ({
      id: String(a._id),
      entity_type: a.entityType ?? '',
      entity_id: a.entityId ?? '',
      current_stage: Number(a.metadata?.currentStage ?? 1),
      status: a.status ?? 'in_progress',
      started_at: a.createdAt ? new Date(a.createdAt).toISOString() : '',
      workflow_definitions: { name: a.entityType ?? 'Approval Workflow' },
    }));
  }, [rawApprovals, selectedWorkflow]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Loading active workflows...</p>
        </CardContent>
      </Card>
    );
  }

  if (instances.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No active workflow instances</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {instances.map((instance) => (
        <Card key={instance.id}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0 mr-2">
                <CardTitle
                  className="text-lg truncate"
                  title={instance.workflow_definitions.name || 'Unknown Workflow'}
                >
                  {instance.workflow_definitions.name || 'Unknown Workflow'}
                </CardTitle>
                <CardDescription
                  className="truncate"
                  title={`Entity: ${instance.entity_type} • Stage ${instance.current_stage}`}
                >
                  Entity: {instance.entity_type} • Stage {instance.current_stage}
                </CardDescription>
              </div>
              <Badge className="bg-blue-500 shrink-0">In Progress</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground shrink-0 mr-2">Started:</span>
                <span className="truncate tabular-nums text-right">
                  {new Date(instance.started_at).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground shrink-0 mr-2">Entity ID:</span>
                <span className="font-mono text-xs truncate tabular-nums text-right">
                  {instance.entity_id.slice(0, 8)}...
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// Workflow History Component
const WorkflowHistory: React.FC = () => {
  // Convex reactive query for completed approval requests (N2 — no as any)
  const rawHistory = useConvexQuery(api.approvalWorkflow.adminListApprovals, {
    status: 'approved',
    limit: 20,
  });
  const rawRejected = useConvexQuery(api.approvalWorkflow.adminListApprovals, {
    status: 'rejected',
    limit: 20,
  });
  const loading = rawHistory === undefined;

  const history = useMemo(() => {
    const all = [...(rawHistory ?? []), ...(rawRejected ?? [])];
    return all
      .sort((a, b) => (b.updatedAt ?? b.createdAt ?? 0) - (a.updatedAt ?? a.createdAt ?? 0))
      .slice(0, 20)
      .map((a) => ({
        id: String(a._id),
        entity_type: a.entityType ?? '',
        entity_id: a.entityId ?? '',
        status: a.status ?? 'completed',
        started_at: a.createdAt ? new Date(a.createdAt).toISOString() : '',
        completed_at: a.updatedAt ? new Date(a.updatedAt).toISOString() : null,
        workflow_definitions: { name: a.entityType ?? 'Approval Workflow' },
      }));
  }, [rawHistory, rawRejected]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Loading history...</p>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <History className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No workflow history yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'cancelled':
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {history.map((item) => (
        <Card key={item.id}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">
                  {item.workflow_definitions.name || 'Unknown Workflow'}
                </CardTitle>
                <CardDescription>Entity: {item.entity_type}</CardDescription>
              </div>
              {getStatusBadge(item.status)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Started:</span>
                <span>{new Date(item.started_at).toLocaleString()}</span>
              </div>
              {item.completed_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Completed:</span>
                  <span>{new Date(item.completed_at).toLocaleString()}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default WorkflowManagementDashboard;
