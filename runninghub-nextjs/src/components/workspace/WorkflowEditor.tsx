/**
 * Workflow Editor Component
 * Form for creating and editing workflows
 */

'use client';

import { useState, useCallback } from 'react';
import { X, Plus, Trash2, GripVertical, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { AVAILABLE_WORKFLOWS } from '@/constants/workflows';
import type { Workflow, WorkflowInputParameter, CliNode } from '@/types/workspace';

export interface WorkflowEditorProps {
  workflow?: Workflow;
  onSave: (workflow: Workflow) => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
  open?: boolean;
}

export function WorkflowEditor({ workflow, onSave, onCancel, onDelete, open = true }: WorkflowEditorProps) {
  const isEditing = !!workflow;

  const [name, setName] = useState(workflow?.name || '');
  const [description, setDescription] = useState(workflow?.description || '');
  const [parameters, setParameters] = useState<WorkflowInputParameter[]>(
    workflow?.inputs || []
  );

  // Template loading state
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('');
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [templateLoaded, setTemplateLoaded] = useState(false);

  // Add new parameter
  const addParameter = useCallback(() => {
    const newParam: WorkflowInputParameter = {
      id: `param_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `Parameter ${parameters.length + 1}`,
      type: 'text',
      required: false,
    };
    setParameters([...parameters, newParam]);
  }, [parameters]);

  // Update parameter
  const updateParameter = useCallback((index: number, updates: Partial<WorkflowInputParameter>) => {
    const updated = [...parameters];
    updated[index] = { ...updated[index], ...updates };
    setParameters(updated);
  }, [parameters]);

  // Remove parameter
  const removeParameter = useCallback((index: number) => {
    setParameters(parameters.filter((_, i) => i !== index));
  }, [parameters]);

  // Load template from CLI
  const handleLoadTemplate = useCallback(async (workflowId?: string) => {
    const targetWorkflowId = workflowId || selectedWorkflowId;
    if (!targetWorkflowId) return;

    setIsLoadingTemplate(true);

    try {
      const response = await fetch(`/api/workflow/nodes?workflowId=${targetWorkflowId}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch nodes');
      }

      const data = await response.json();

      // Convert CLI nodes to workflow input parameters
      const newParameters: WorkflowInputParameter[] = data.nodes.map((node: CliNode, index: number) => {
        // Determine parameter type from inputType or description
        let paramType: WorkflowInputParameter['type'] = 'text';
        let mediaType: 'image' | 'video' | undefined;

        if (node.inputType === 'image') {
          paramType = 'file';
          mediaType = 'image';
        } else if (node.inputType === 'video') {
          paramType = 'file';
          mediaType = 'video';
        } else if (node.inputType === 'number') {
          paramType = 'number';
        } else if (node.inputType === 'boolean') {
          paramType = 'boolean';
        }

        return {
          id: `param_${node.id}`,
          name: node.name,
          type: paramType,
          required: index === 0, // First parameter is required by default
          description: node.description,
          validation: paramType === 'file' ? {
            mediaType,
            fileType: mediaType ? [`${mediaType}/*`] : undefined,
          } : undefined,
        };
      });

      setParameters(newParameters);

      // Set workflow name from template
      const workflowName = AVAILABLE_WORKFLOWS.find(wf => wf.id === targetWorkflowId)?.name;
      if (workflowName && !name) {
        setName(workflowName);
      }

      setDescription(`Workflow created from template ${targetWorkflowId}`);
      setTemplateLoaded(true);
    } catch (error) {
      console.error('Failed to load template:', error);
      alert(error instanceof Error ? error.message : 'Failed to load template');
    } finally {
      setIsLoadingTemplate(false);
    }
  }, [selectedWorkflowId, name]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      return;
    }

    const workflowData: Workflow = {
      id: workflow?.id || `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      description: description.trim() || undefined,
      inputs: parameters,
      createdAt: workflow?.createdAt || Date.now(),
      updatedAt: Date.now(),
      sourceWorkflowId: templateLoaded ? selectedWorkflowId : workflow?.sourceWorkflowId,
      sourceType: templateLoaded ? 'template' : workflow?.sourceType || 'custom',
    };

    // Save to workspace folder
    try {
      const response = await fetch('/api/workflow/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(workflowData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save workflow');
      }
    } catch (error) {
      console.error('Failed to save workflow to file:', error);
      // Continue with save even if file save fails
    }

    onSave(workflowData);
  }, [name, description, parameters, workflow, templateLoaded, selectedWorkflowId, onSave]);

  const isValid = name.trim() && parameters.length > 0;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Workflow' : 'Create New Workflow'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic info */}
          <div className="space-y-4">
            <div>
              <label htmlFor="workflow-name" className="text-sm font-medium">
                Workflow Name <span className="text-red-500">*</span>
              </label>
              <Input
                id="workflow-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Custom Workflow"
                className="mt-1"
              />
            </div>

            <div>
              <label htmlFor="workflow-description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="workflow-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this workflow does..."
                rows={2}
                className="mt-1"
              />
            </div>
          </div>

          {/* Template selection (for new workflows only) */}
          {!isEditing && (
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-medium text-blue-900">Step 1: Select Workflow Template</h3>
                  <p className="text-xs text-blue-700">Input fields will load automatically when you select a workflow</p>
                </div>

                <div className="flex items-center gap-2">
                  <Select
                    value={selectedWorkflowId}
                    onValueChange={(value) => {
                      setSelectedWorkflowId(value);
                      handleLoadTemplate(value);
                    }}
                    disabled={isLoadingTemplate}
                  >
                    <SelectTrigger className="flex-1">
                      {isLoadingTemplate ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Loading template...</span>
                        </div>
                      ) : (
                        <SelectValue placeholder="Select a workflow template..." />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_WORKFLOWS.map((wf) => (
                        <SelectItem key={wf.id} value={wf.id}>
                          {wf.name} ({wf.id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {templateLoaded && (
                  <div className="text-xs text-green-700 bg-green-50 p-2 rounded">
                    ✓ Template loaded successfully! You can now customize the fields below.
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Parameters */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">
                  {templateLoaded ? 'Step 2: Configure Fields' : 'Input Parameters'}
                </h3>
                <p className="text-xs text-gray-500">
                  {templateLoaded
                    ? 'Customize the loaded fields or add new ones'
                    : 'Define the inputs this workflow accepts'}
                </p>
              </div>
              <Button onClick={addParameter} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Add Parameter
              </Button>
            </div>

            {parameters.length === 0 ? (
              <Card className="p-8 text-center text-gray-500">
                <p className="text-sm">No parameters defined yet.</p>
                <p className="text-xs mt-1">Click "Add Parameter" to get started.</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {parameters.map((param, index) => (
                  <ParameterEditor
                    key={param.id}
                    parameter={param}
                    index={index}
                    onUpdate={(updates) => updateParameter(index, updates)}
                    onRemove={() => removeParameter(index)}
                    canRemove={parameters.length > 1}
                    lockedFields={templateLoaded ? ['id', 'name', 'type'] : []}
                    fromTemplate={templateLoaded}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <div className="flex-1">
            {isEditing && onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => onDelete(workflow.id)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            )}
          </div>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={!isValid}>
            {isEditing ? 'Save Changes' : 'Create Workflow'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ParameterEditorProps {
  parameter: WorkflowInputParameter;
  index: number;
  onUpdate: (updates: Partial<WorkflowInputParameter>) => void;
  onRemove: () => void;
  canRemove: boolean;
  lockedFields?: string[];
  fromTemplate?: boolean;
}

function ParameterEditor({ parameter, index, onUpdate, onRemove, canRemove, lockedFields = [], fromTemplate = false }: ParameterEditorProps) {
  const isFieldLocked = (field: string) => lockedFields.includes(field);

  const handleMediaTypeChange = (mediaType: 'image' | 'video') => {
    onUpdate({
      validation: {
        ...parameter.validation,
        mediaType,
        fileType: [`${mediaType}/*`],
      }
    });
  };

  return (
    <Card className={cn("p-4", fromTemplate && "border-blue-200 bg-blue-50/30")}>
      <div className="flex items-start gap-3">
        <GripVertical className="h-5 w-5 text-gray-400 mt-1 cursor-move" />

        <div className="flex-1 space-y-3">
          {/* Header: Name and Type */}
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2">
              {isFieldLocked('name') && <Lock className="h-3 w-3 text-gray-400" />}
              <Input
                value={parameter.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                placeholder="Parameter name"
                className="flex-1"
                disabled={isFieldLocked('name')}
              />
            </div>

            <div className="flex items-center gap-2">
              {isFieldLocked('type') && <Lock className="h-3 w-3 text-gray-400" />}
              <Select
                value={parameter.type}
                onValueChange={(value: any) => onUpdate({ type: value })}
                disabled={isFieldLocked('type')}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="file">File</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="boolean">Boolean</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Checkbox
              checked={parameter.required}
              onCheckedChange={(checked) => onUpdate({ required: checked === true })}
            />
            <span className="text-xs text-gray-600">Required</span>

            {canRemove && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onRemove}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Description */}
          <Input
            value={parameter.description || ''}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder="Description (optional)"
          />

          {/* Validation rules based on type */}
          {parameter.type === 'file' && (
            <div className="space-y-2">
              {/* Media Type Selector */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-600">Media Type:</span>
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="radio"
                    name={`media-type-${parameter.id}`}
                    checked={parameter.validation?.mediaType === 'image'}
                    onChange={() => handleMediaTypeChange('image')}
                    className="mr-1"
                  />
                  Image
                </label>
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="radio"
                    name={`media-type-${parameter.id}`}
                    checked={parameter.validation?.mediaType === 'video'}
                    onChange={() => handleMediaTypeChange('video')}
                    className="mr-1"
                  />
                  Video
                </label>
              </div>

              {/* Extensions */}
              <Input
                value={parameter.validation?.extensions?.join(', ') || ''}
                onChange={(e) => onUpdate({
                  validation: {
                    ...parameter.validation,
                    extensions: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  }
                })}
                placeholder="Extensions (e.g., .jpg,.png,.mp4)"
                className="flex-1"
              />
            </div>
          )}

          {parameter.type === 'text' && (
            <div className="flex gap-2">
              <Input
                type="number"
                value={parameter.validation?.min || ''}
                onChange={(e) => onUpdate({
                  validation: { ...parameter.validation, min: e.target.value ? parseInt(e.target.value) : undefined }
                })}
                placeholder="Min length"
                className="w-24"
              />
              <Input
                type="number"
                value={parameter.validation?.max || ''}
                onChange={(e) => onUpdate({
                  validation: { ...parameter.validation, max: e.target.value ? parseInt(e.target.value) : undefined }
                })}
                placeholder="Max length"
                className="w-24"
              />
            </div>
          )}

          {parameter.type === 'number' && (
            <div className="flex gap-2">
              <Input
                type="number"
                value={parameter.validation?.min || ''}
                onChange={(e) => onUpdate({
                  validation: { ...parameter.validation, min: e.target.value ? parseFloat(e.target.value) : undefined }
                })}
                placeholder="Min value"
                className="w-24"
              />
              <Input
                type="number"
                value={parameter.validation?.max || ''}
                onChange={(e) => onUpdate({
                  validation: { ...parameter.validation, max: e.target.value ? parseFloat(e.target.value) : undefined }
                })}
                placeholder="Max value"
                className="w-24"
              />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
