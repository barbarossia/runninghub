/**
 * Workflow Editor Component
 * Form for creating and editing workflows
 */

'use client';

import { useState, useCallback } from 'react';
import { X, Plus, Trash2, GripVertical } from 'lucide-react';
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
import type { Workflow, WorkflowInputParameter } from '@/types/workspace';

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

  // Handle save
  const handleSave = useCallback(() => {
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
    };

    onSave(workflowData);
  }, [name, description, parameters, workflow, onSave]);

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

          {/* Parameters */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">Input Parameters</h3>
                <p className="text-xs text-gray-500">Define the inputs this workflow accepts</p>
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
}

function ParameterEditor({ parameter, index, onUpdate, onRemove, canRemove }: ParameterEditorProps) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <GripVertical className="h-5 w-5 text-gray-400 mt-1 cursor-move" />

        <div className="flex-1 space-y-3">
          {/* Header: Name and Type */}
          <div className="flex items-center gap-3">
            <Input
              value={parameter.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              placeholder="Parameter name"
              className="flex-1"
            />

            <Select
              value={parameter.type}
              onValueChange={(value: any) => onUpdate({ type: value })}
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
            <div className="flex gap-2">
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
