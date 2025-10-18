/**
 * Workflow Management Dashboard
 * Admin interface for configuring approval workflows
 * Version: v2.4.0
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Plus, 
  GitBranch, 
  Clock, 
  CheckCircle,
  XCircle,
  Edit,
  Eye,
  History
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import WorkflowEditor from './WorkflowEditor';
import WorkflowStats from './WorkflowStats';

interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  entity_type: string;
  version: number;
  is_active: boolean;
  stages: any[];
  created_at: string;
  updated_at: string;
}

const WorkflowManagementDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowDefinition | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const { toast } = useToast();

  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('workflow_definitions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWorkflows(data || []);
    } catch (err) {
      console.error('Error fetching workflows:', err);
      toast({
        title: 'Error',
        description: 'Failed to fetch workflows',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

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
      user_role_change: 'Role Changes'
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
          fetchWorkflows();
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
          <p className="text-muted-foreground">
            Configure multi-stage approval workflows
          </p>
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
                      <div className="flex-1">
                        <CardTitle className="text-lg">{workflow.name}</CardTitle>
                        <CardDescription className="mt-1">
                          {getEntityTypeLabel(workflow.entity_type)}
                        </CardDescription>
                      </div>
                      {workflow.is_active && (
                        <Badge className="bg-green-500">Active</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Description */}
                      {workflow.description && (
                        <p className="text-sm text-muted-foreground">
                          {workflow.description}
                        </p>
                      )}

                      {/* Stages */}
                      <div className="flex items-center text-sm">
                        <GitBranch className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span>{workflow.stages.length} stages</span>
                      </div>

                      {/* Version */}
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Version {workflow.version}</span>
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
  selectedWorkflow 
}) => {
  const [instances, setInstances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInstances = async () => {
      try {
        setLoading(true);
        let query = supabase
          .from('workflow_instances')
          .select('*, workflow_definitions(name)')
          .eq('status', 'in_progress')
          .order('started_at', { ascending: false });

        if (selectedWorkflow) {
          query = query.eq('workflow_definition_id', selectedWorkflow.id);
        }

        const { data, error } = await query;
        if (error) throw error;
        setInstances(data || []);
      } catch (err) {
        console.error('Error fetching instances:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInstances();
  }, [selectedWorkflow]);

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
              <div>
                <CardTitle className="text-lg">
                  {(instance.workflow_definitions as any)?.name || 'Unknown Workflow'}
                </CardTitle>
                <CardDescription>
                  Entity: {instance.entity_type} • Stage {instance.current_stage}
                </CardDescription>
              </div>
              <Badge className="bg-blue-500">In Progress</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Started:</span>
                <span>{new Date(instance.started_at).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Entity ID:</span>
                <span className="font-mono text-xs">{instance.entity_id.slice(0, 8)}...</span>
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
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('workflow_instances')
          .select('*, workflow_definitions(name)')
          .in('status', ['completed', 'rejected', 'cancelled'])
          .order('completed_at', { ascending: false })
          .limit(20);

        if (error) throw error;
        setHistory(data || []);
      } catch (err) {
        console.error('Error fetching history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

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
                  {(item.workflow_definitions as any)?.name || 'Unknown Workflow'}
                </CardTitle>
                <CardDescription>
                  Entity: {item.entity_type}
                </CardDescription>
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
