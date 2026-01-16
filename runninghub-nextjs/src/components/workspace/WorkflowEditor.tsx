/**
 * Workflow Editor Component
 * Form for creating and editing workflows
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { X, Plus, Trash2, GripVertical, Loader2, Lock, Key, Upload } from 'lucide-react';
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
import { toast } from 'sonner';
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
  const [runninghubWorkflowId, setRunninghubWorkflowId] = useState(workflow?.sourceWorkflowId || '');
  const [parameters, setParameters] = useState<WorkflowInputParameter[]>(
    workflow?.inputs || []
  );

  // Template loading state
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('');
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [templateLoaded, setTemplateLoaded] = useState(false);

  // Custom workflow ID state
  const [customWorkflowId, setCustomWorkflowId] = useState<string>('');
  const [isLoadingCustomId, setIsLoadingCustomId] = useState(false);

  // Local JSON import state
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [isImportingJson, setIsImportingJson] = useState(false);
  const [jsonContent, setJsonContent] = useState<string | null>(null); // Store JSON content for second call
  const [jsonFileName, setJsonFileName] = useState<string | null>(null); // Store file name for second call
  const [detectedNodes, setDetectedNodes] = useState<Array<{ id: string; name: string; inputCount: number; inputType: string; description: string }>>([]);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [showNodeSelection, setShowNodeSelection] = useState(false);

  // Execution type state
  const [executionType, setExecutionType] = useState<'ai-app' | 'workflow' | undefined>(
    workflow?.executionType
  );

  // Output configuration state
  const [outputType, setOutputType] = useState<'none' | 'text' | 'image' | 'mixed'>(
    workflow?.output?.type || 'none'
  );
  const [outputDescription, setOutputDescription] = useState(
    workflow?.output?.description || ''
  );

  // Sync state with workflow prop when it changes
  useEffect(() => {
    if (workflow) {
      setName(workflow.name);
      setDescription(workflow.description || '');
      setRunninghubWorkflowId(workflow.sourceWorkflowId || '');
      setParameters(workflow.inputs);
      setOutputType(workflow.output?.type || 'none');
      setOutputDescription(workflow.output?.description || '');
      setExecutionType(workflow.executionType);
      // Reset template state when editing existing workflow
      setSelectedWorkflowId('');
      setCustomWorkflowId('');
      setTemplateLoaded(false);
    } else {
      // Reset for new workflow - clear all previous workflow's memory
      setName('');
      setDescription('');
      setRunninghubWorkflowId('');
      setParameters([]);
      setOutputType('none');
      setOutputDescription('');
      setExecutionType(undefined);
      setSelectedWorkflowId('');
      setCustomWorkflowId('');
      setTemplateLoaded(false);
      // Reset JSON import state
      setJsonFile(null);
      setJsonContent(null);
      setJsonFileName(null);
      setDetectedNodes([]);
      setSelectedNodeIds(new Set());
      setShowNodeSelection(false);
    }
  }, [workflow]);

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

      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : { nodes: [] };
      } catch (e) {
        throw new Error(`Invalid JSON response: ${text.slice(0, 100)}`);
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch nodes');
      }

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
      setRunninghubWorkflowId(targetWorkflowId);
      setTemplateLoaded(true);
    } catch (error) {
      console.error('Failed to load template:', error);
      alert(error instanceof Error ? error.message : 'Failed to load template');
    } finally {
      setIsLoadingTemplate(false);
    }
  }, [selectedWorkflowId, name]);

  // Load custom workflow ID
  const handleLoadCustomWorkflowId = useCallback(async () => {
    if (!customWorkflowId.trim()) {
      toast.error('Please enter a workflow ID');
      return;
    }

    setIsLoadingCustomId(true);

    try {
      // Validate and fetch workflow nodes
      const response = await fetch('/api/workflow/validate-custom-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId: customWorkflowId.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Invalid workflow ID');
      }

      const data = await response.json();

      // Convert workflow inputs to parameters
      const newParameters: WorkflowInputParameter[] = (data.workflow.inputs || []).map((input: any, index: number) => {
        let paramType: WorkflowInputParameter['type'] = 'text';
        let mediaType: 'image' | 'video' | undefined;

        if (input.type === 'file') {
          paramType = 'file';
          mediaType = input.validation?.mediaType;
        } else if (input.type === 'number') {
          paramType = 'number';
        } else if (input.type === 'boolean') {
          paramType = 'boolean';
        }

        return {
          id: input.id || `param_${index}`,
          name: input.name,
          type: paramType,
          required: input.required || index === 0,
          description: input.description,
          validation: input.validation,
        };
      });

      setParameters(newParameters);

      // Set workflow name if not already set
      if (!name) {
        setName(`Custom Workflow ${customWorkflowId}`);
      }

      setDescription(`Workflow created from custom ID: ${customWorkflowId}`);
      setRunninghubWorkflowId(customWorkflowId);
      setSelectedWorkflowId(customWorkflowId);
      setTemplateLoaded(true);

      toast.success('Custom workflow loaded successfully!');
    } catch (error) {
      console.error('Failed to load custom workflow ID:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load custom workflow ID');
    } finally {
      setIsLoadingCustomId(false);
    }
  }, [customWorkflowId, name]);

  // Import local workflow JSON - Step 1: Detect nodes
  const handleImportJson = useCallback(async () => {
    if (!jsonFile) return;

    setIsImportingJson(true);

    try {
      // Read file content
      const text = await jsonFile.text();

      // Call import API to detect nodes (no selectedNodes provided)
      const response = await fetch('/api/workflow/import-json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonContent: text,
          workflowName: jsonFile.name.replace('.json', ''),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to import workflow JSON');
      }

      const data = await response.json();

      // Check if node selection is required
      if (data.requiresSelection && data.nodes && data.nodes.length > 0) {
        // Store JSON content and file name for second call
        setJsonContent(text);
        setJsonFileName(jsonFile.name.replace('.json', ''));
        // Show detected nodes for selection
        setDetectedNodes(data.nodes);
        setShowNodeSelection(true);
        // Pre-select all nodes by default
        setSelectedNodeIds(new Set(data.nodes.map((n: any) => n.id)));
        toast.success(`Detected ${data.nodes.length} node${data.nodes.length !== 1 ? 's' : ''} from JSON. Please select which to include.`);
      } else if (data.workflow) {
        // No selection needed (unlikely with new API), load directly
        setParameters(data.workflow.inputs);
        setName(data.workflow.name);
        setDescription(`Workflow imported from ${jsonFile.name}`);
        setSelectedWorkflowId(data.workflow.id);
        setExecutionType(data.workflow.executionType);
        setTemplateLoaded(true);
        toast.success('Workflow JSON imported successfully!');
      }
    } catch (error) {
      console.error('Failed to import workflow JSON:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to import workflow JSON');
    } finally {
      setIsImportingJson(false);
    }
  }, [jsonFile]);

  // Step 2: Confirm node selection and create workflow
  const handleConfirmNodeSelection = useCallback(async () => {
    if (!jsonContent || selectedNodeIds.size === 0) {
      toast.error('Please select at least one node');
      return;
    }

    setIsImportingJson(true);

    try {
      // Call import API with selected nodes
      const response = await fetch('/api/workflow/import-json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonContent,
          workflowName: jsonFileName || 'Imported Workflow',
          selectedNodes: Array.from(selectedNodeIds),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create workflow');
      }

      const data = await response.json();

      // Load the created workflow
      setParameters(data.workflow.inputs);
      setName(data.workflow.name);
      setDescription(data.workflow.description);
      setSelectedWorkflowId(data.workflow.id);
      setExecutionType(data.workflow.executionType);
      setTemplateLoaded(true);

      // Reset selection state
      setShowNodeSelection(false);
      setJsonContent(null);
      setJsonFileName(null);
      setDetectedNodes([]);
      setSelectedNodeIds(new Set());

      toast.success('Workflow created successfully!');
    } catch (error) {
      console.error('Failed to create workflow:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create workflow');
    } finally {
      setIsImportingJson(false);
      setJsonFile(null);
    }
  }, [jsonContent, selectedNodeIds]);

  // Cancel node selection
  const handleCancelNodeSelection = useCallback(() => {
    setShowNodeSelection(false);
    setJsonContent(null);
    setJsonFileName(null);
    setDetectedNodes([]);
    setSelectedNodeIds(new Set());
    setJsonFile(null);
  }, []);

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
      output: outputType !== 'none' ? {
        type: outputType,
        description: outputDescription.trim() || undefined,
      } : undefined,
      createdAt: workflow?.createdAt || Date.now(),
      updatedAt: Date.now(),
      sourceWorkflowId: runninghubWorkflowId.trim() || undefined,
      sourceType: templateLoaded ? 'template' : workflow?.sourceType || 'custom',
      executionType,
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
        const text = await response.text();
        let errorData;
        try {
          errorData = text ? JSON.parse(text) : { error: 'Unknown error' };
        } catch (e) {
          errorData = { error: `Server error: ${response.status}` };
        }
        throw new Error(errorData.error || 'Failed to save workflow');
      }
    } catch (error) {
      console.error('Failed to save workflow to file:', error);
      // Continue with save even if file save fails
    }

    onSave(workflowData);
  }, [name, description, runninghubWorkflowId, parameters, outputType, outputDescription, workflow, templateLoaded, onSave]);

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

            <div>
              <label htmlFor="runninghub-workflow-id" className="text-sm font-medium flex items-center gap-1">
                <Key className="h-4 w-4" />
                RunningHub Workflow ID
              </label>
              <Input
                id="runninghub-workflow-id"
                value={runninghubWorkflowId}
                onChange={(e) => setRunninghubWorkflowId(e.target.value)}
                placeholder="1980237776367083521"
                className="mt-1 font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">
                The numeric workflow ID from RunningHub URL (e.g., from https://www.runninghub.cn/workflow/1980237776367083521)
              </p>
            </div>
          </div>

          {/* Template selection (for new workflows only) */}
          {!isEditing && (
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-blue-900">Step 1: Select Workflow Template or Enter Custom ID</h3>
                  <p className="text-xs text-blue-700">Input fields will load automatically when you select a workflow</p>
                </div>

                {/* Option 1: Select from available templates */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-blue-800">Option 1: Select from templates</label>
                  <div className="flex items-center gap-2">
                    <Select
                      value={selectedWorkflowId}
                      onValueChange={(value) => {
                        setSelectedWorkflowId(value);
                        setCustomWorkflowId(''); // Clear custom ID when selecting template
                        handleLoadTemplate(value);
                      }}
                      disabled={isLoadingTemplate || isLoadingCustomId}
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
                </div>

                {/* Option 2: Enter custom workflow ID */}
                <div className="border-t border-blue-200 pt-3">
                  <label className="text-xs font-medium text-blue-800 flex items-center gap-1">
                    <Key className="h-3 w-3" />
                    Option 2: Enter custom workflow ID
                  </label>
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      value={customWorkflowId}
                      onChange={(e) => {
                        setCustomWorkflowId(e.target.value);
                        setSelectedWorkflowId(''); // Clear template selection when entering custom ID
                      }}
                      placeholder="Enter workflow ID from RunningHub..."
                      disabled={isLoadingCustomId || isLoadingTemplate}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleLoadCustomWorkflowId}
                      disabled={!customWorkflowId.trim() || isLoadingCustomId || isLoadingTemplate}
                      variant="outline"
                      className="shrink-0"
                    >
                      {isLoadingCustomId ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Load'
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
                    Enter a workflow ID from your RunningHub account to load its structure
                  </p>
                </div>

                {/* Option 3: Import local workflow JSON */}
                <div className="border-t border-blue-200 pt-3">
                  <label className="text-xs font-medium text-blue-800 flex items-center gap-1">
                    <Upload className="h-3 w-3" />
                    Option 3: Import workflow JSON file
                  </label>
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      type="file"
                      accept=".json"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setJsonFile(file);
                          setSelectedWorkflowId('');
                          setCustomWorkflowId('');
                        }
                      }}
                      disabled={isImportingJson || isLoadingTemplate || isLoadingCustomId}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleImportJson}
                      disabled={!jsonFile || isImportingJson || isLoadingTemplate || isLoadingCustomId}
                      variant="outline"
                      className="shrink-0"
                    >
                      {isImportingJson ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Import'
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
                    Import a workflow JSON file exported from your RunningHub workspace
                  </p>
                  {jsonFile && (
                    <div className="text-xs text-green-700 mt-1">
                      Selected: {jsonFile.name}
                    </div>
                  )}
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
            <div>
              <h3 className="text-sm font-medium">
                {templateLoaded ? 'Step 2: Configure Fields' : 'Input Parameters'}
              </h3>
              <p className="text-xs text-gray-500">
                {templateLoaded
                  ? 'Customize the loaded fields below'
                  : 'Define the inputs this workflow accepts'}
              </p>
            </div>

            {parameters.length === 0 ? (
              <Card className="p-8 text-center text-gray-500">
                <p className="text-sm">No parameters defined yet.</p>
                <p className="text-xs mt-1">Select a workflow template above to load parameters.</p>
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

          {/* Output Configuration */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium">
                {templateLoaded ? 'Step 3: Configure Outputs' : 'Output Configuration'}
              </h3>
              <p className="text-xs text-gray-500">
                Define what this workflow outputs
              </p>
            </div>

            <Card className="p-4">
              <div className="space-y-4">
                {/* Output Type Selector */}
                <div>
                  <label htmlFor="output-type" className="text-sm font-medium">
                    Output Type
                  </label>
                  <Select
                    value={outputType}
                    onValueChange={(value: 'none' | 'text' | 'image' | 'mixed') => setOutputType(value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select output type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No outputs</SelectItem>
                      <SelectItem value="text">Text files (.txt)</SelectItem>
                      <SelectItem value="image">Image files (.jpg, .png, etc.)</SelectItem>
                      <SelectItem value="mixed">Mixed (text + images)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Description (shown only when output type is not "none") */}
                {outputType !== 'none' && (
                  <div>
                    <label htmlFor="output-description" className="text-sm font-medium">
                      Output Description
                    </label>
                    <Textarea
                      id="output-description"
                      value={outputDescription}
                      onChange={(e) => setOutputDescription(e.target.value)}
                      placeholder="Describe what this workflow outputs..."
                      rows={2}
                      className="mt-1"
                    />
                  </div>
                )}
              </div>
            </Card>
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

      {/* Node Selection Dialog */}
      {showNodeSelection && (
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Nodes to Import</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Select which nodes from the JSON to include in your workflow:
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedNodeIds(new Set(detectedNodes.map(n => n.id)))}
                  disabled={isImportingJson}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedNodeIds(new Set())}
                  disabled={isImportingJson}
                >
                  Clear All
                </Button>
              </div>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {detectedNodes.map((node) => (
                <div
                  key={node.id}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Checkbox
                    id={`node-${node.id}`}
                    checked={selectedNodeIds.has(node.id)}
                    onCheckedChange={(checked) => {
                      const newSelected = new Set(selectedNodeIds);
                      if (checked) {
                        newSelected.add(node.id);
                      } else {
                        newSelected.delete(node.id);
                      }
                      setSelectedNodeIds(newSelected);
                    }}
                    disabled={isImportingJson}
                  />
                  <div className="flex-1">
                    <label
                      htmlFor={`node-${node.id}`}
                      className="text-sm font-medium cursor-pointer flex items-center gap-2"
                    >
                      <span className="font-mono text-xs">{node.id}</span>
                      <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
                        {node.inputType}
                      </span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1">{node.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
              Selected: {selectedNodeIds.size} node{selectedNodeIds.size !== 1 ? 's' : ''}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancelNodeSelection}
              disabled={isImportingJson}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmNodeSelection}
              disabled={selectedNodeIds.size === 0 || isImportingJson}
            >
              {isImportingJson ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  Create Workflow with {selectedNodeIds.size} Node{selectedNodeIds.size !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
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

          {/* Default Value (for text, number, boolean types) */}
          {parameter.type !== 'file' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600 font-medium">Default:</span>
              {parameter.type === 'boolean' ? (
                <Select
                  value={parameter.defaultValue?.toString() || ''}
                  onValueChange={(value) => onUpdate({ defaultValue: value === 'true' })}
                >
                  <SelectTrigger className="w-24 h-8">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">True</SelectItem>
                    <SelectItem value="false">False</SelectItem>
                  </SelectContent>
                </Select>
              ) : parameter.type === 'number' ? (
                <Input
                  type="number"
                  value={typeof parameter.defaultValue === 'number' ? parameter.defaultValue : ''}
                  onChange={(e) => onUpdate({ defaultValue: e.target.value ? parseFloat(e.target.value) : undefined })}
                  placeholder="Default number"
                  className="flex-1 h-8"
                  step="any"
                />
              ) : (
                <Input
                  type="text"
                  value={parameter.defaultValue?.toString() ?? ''}
                  onChange={(e) => onUpdate({ defaultValue: e.target.value || undefined })}
                  placeholder="Default text"
                  className="flex-1 h-8"
                />
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onUpdate({ defaultValue: undefined })}
                title="Clear default value"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
