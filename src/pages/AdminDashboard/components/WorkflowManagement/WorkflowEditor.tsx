/**
 * Workflow Editor
 * Visual editor for creating and modifying workflows
 * Version: v2.4.0
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Trash2, Save, GitBranch } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WorkflowStage {
  stage: number;
  name: string;
  description: string;
  required_role: string;
  required_approvals: number;
  auto_assign: boolean;
  timeout_hours: number;
  conditions: {
    amount_min?: number | null;
    amount_max?: number | null;
  };
}

interface WorkflowEditorProps {
  workflow: any | null;
  onClose: () => void;
}

const WorkflowEditor: React.FC<WorkflowEditorProps> = ({ workflow, onClose }) => {
  const [name, setName] = useState(workflow?.name || '');
  const [description, setDescription] = useState(workflow?.description || '');
  const [entityType, setEntityType] = useState(workflow?.entity_type || 'loan_application');
  const [stages, setStages] = useState<WorkflowStage[]>(
    workflow?.stages || [
      {
        stage: 1,
        name: 'Initial Review',
        description: '',
        required_role: 'loan_officer',
        required_approvals: 1,
        auto_assign: true,
        timeout_hours: 24,
        conditions: { amount_max: null }
      }
    ]
  );
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const addStage = () => {
    const newStage: WorkflowStage = {
      stage: stages.length + 1,
      name: `Stage ${stages.length + 1}`,
      description: '',
      required_role: 'loan_officer',
      required_approvals: 1,
      auto_assign: false,
      timeout_hours: 24,
      conditions: {}
    };
    setStages([...stages, newStage]);
  };

  const removeStage = (index: number) => {
    if (stages.length === 1) {
      toast({
        title: 'Cannot Remove',
        description: 'Workflow must have at least one stage',
        variant: 'destructive',
      });
      return;
    }
    const newStages = stages.filter((_, i) => i !== index);
    // Renumber stages
    newStages.forEach((stage, i) => {
      stage.stage = i + 1;
    });
    setStages(newStages);
  };

  const updateStage = (index: number, field: string, value: any) => {
    const newStages = [...stages];
    (newStages[index] as any)[field] = value;
    setStages(newStages);
  };

  const updateStageCondition = (index: number, field: string, value: any) => {
    const newStages = [...stages];
    newStages[index].conditions = {
      ...newStages[index].conditions,
      [field]: value === '' ? null : Number(value)
    };
    setStages(newStages);
  };

  const handleSave = async () => {
    // Validation
    if (!name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Workflow name is required',
        variant: 'destructive',
      });
      return;
    }

    if (stages.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Workflow must have at least one stage',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);

      if (workflow) {
        // Update existing workflow
        const { error } = await supabase
          .from('workflow_definitions')
          .update({
            name,
            description,
            entity_type: entityType,
            stages,
            updated_at: new Date().toISOString()
          })
          .eq('id', workflow.id);

        if (error) throw error;

        toast({
          title: 'Workflow Updated',
          description: 'Workflow has been updated successfully',
        });
      } else {
        // Create new workflow
        const { error } = await supabase
          .from('workflow_definitions')
          .insert({
            name,
            description,
            entity_type: entityType,
            stages,
            is_active: false // Start as inactive
          });

        if (error) throw error;

        toast({
          title: 'Workflow Created',
          description: 'New workflow has been created successfully',
        });
      }

      onClose();
    } catch (err: any) {
      console.error('Error saving workflow:', err);
      toast({
        title: 'Save Failed',
        description: err.message || 'Failed to save workflow',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold">
              {workflow ? 'Edit Workflow' : 'Create Workflow'}
            </h2>
            <p className="text-muted-foreground">
              Configure multi-stage approval process
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save Workflow'}
        </Button>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Workflow Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Standard Loan Approval"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="entity-type">Entity Type *</Label>
              <Select value={entityType} onValueChange={setEntityType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="loan_application">Loan Applications</SelectItem>
                  <SelectItem value="disbursement">Disbursements</SelectItem>
                  <SelectItem value="payment">Payments</SelectItem>
                  <SelectItem value="user_role_change">Role Changes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this workflow..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Stages */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Approval Stages</CardTitle>
            <Button onClick={addStage} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Stage
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {stages.map((stage, index) => (
            <Card key={index} className="border-2">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <GitBranch className="h-5 w-5 text-muted-foreground" />
                    <span className="font-semibold">Stage {stage.stage}</span>
                  </div>
                  {stages.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeStage(index)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Stage Name *</Label>
                    <Input
                      value={stage.name}
                      onChange={(e) => updateStage(index, 'name', e.target.value)}
                      placeholder="e.g., Initial Review"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Required Role *</Label>
                    <Select
                      value={stage.required_role}
                      onValueChange={(value) => updateStage(index, 'required_role', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="loan_officer">Loan Officer</SelectItem>
                        <SelectItem value="senior_officer">Senior Officer</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={stage.description}
                    onChange={(e) => updateStage(index, 'description', e.target.value)}
                    placeholder="Describe what happens in this stage..."
                    rows={2}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Timeout (hours)</Label>
                    <Input
                      type="number"
                      value={stage.timeout_hours}
                      onChange={(e) => updateStage(index, 'timeout_hours', Number(e.target.value))}
                      min="1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Min Amount (NAD)</Label>
                    <Input
                      type="number"
                      value={stage.conditions.amount_min || ''}
                      onChange={(e) => updateStageCondition(index, 'amount_min', e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Amount (NAD)</Label>
                    <Input
                      type="number"
                      value={stage.conditions.amount_max || ''}
                      onChange={(e) => updateStageCondition(index, 'amount_max', e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`auto-assign-${index}`}
                    checked={stage.auto_assign}
                    onChange={(e) => updateStage(index, 'auto_assign', e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor={`auto-assign-${index}`} className="cursor-pointer">
                    Auto-assign to available user with required role
                  </Label>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkflowEditor;
