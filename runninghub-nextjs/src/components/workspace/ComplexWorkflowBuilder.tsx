/**
 * Complex Workflow Builder Component
 * Step-by-step wizard for creating complex workflows
 */

'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, AlertCircle, Settings2, GripVertical } from 'lucide-react';
import { Reorder } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import type {
  Workflow,
  WorkflowStep,
} from '@/types/workspace';

type BuilderStep = 1 | 2 | 3;

interface ComplexWorkflowBuilderProps {
  onSave?: () => void;
  onCancel?: () => void;
}

export function ComplexWorkflowBuilder({ onSave, onCancel }: ComplexWorkflowBuilderProps) {
  const [currentStep, setCurrentStep] = useState<BuilderStep>(1);
  const [isSaving, setIsSaving] = useState(false);
  
  // Workflow data
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [availableWorkflows, setAvailableWorkflows] = useState<Workflow[]>([]);
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(false);
  const [workflowsError, setWorkflowsError] = useState<string | null>(null);
  
  // Load available workflows on mount
  useEffect(() => {
    loadWorkflows();
  }, []);

  // Handle reorder with step number update
  const handleReorder = (newSteps: WorkflowStep[]) => {
    const updatedSteps = newSteps.map((step, index) => ({
      ...step,
      stepNumber: index + 1,
    }));
    setSteps(updatedSteps);
  };
  
  const loadWorkflows = async () => {
    setIsLoadingWorkflows(true);
    setWorkflowsError(null);
    
    try {
      console.log('[ComplexWorkflowBuilder] Fetching workflows from /api/workflow/list...');
      const response = await fetch('/api/workflow/list');
      console.log('[ComplexWorkflowBuilder] Response status:', response.status);
      
      const data = await response.json();
      console.log('[ComplexWorkflowBuilder] Response data:', data);
      
      if (data.success) {
        const workflows = data.workflows || [];
        console.log('[ComplexWorkflowBuilder] Loaded workflows:', workflows);
        setAvailableWorkflows(workflows);
        if (workflows.length === 0) {
          setWorkflowsError('No workflows found. Create a workflow first.');
        } else {
          setWorkflowsError(null);
        }
      } else {
        console.error('[ComplexWorkflowBuilder] API returned error:', data.error);
        setWorkflowsError(data.error || 'Failed to load workflows');
        toast.error(data.error || 'Failed to load workflows');
      }
    } catch (error) {
      console.error('[ComplexWorkflowBuilder] Failed to load workflows:', error);
      setWorkflowsError(error instanceof Error ? error.message : 'Failed to load workflows');
      toast.error('Failed to load workflows');
    } finally {
      setIsLoadingWorkflows(false);
    }
  };
  
  const handleAddWorkflow = (workflow: Workflow) => {
    const newStep: WorkflowStep = {
      id: `step_${Date.now()}`,
      stepNumber: steps.length + 1,
      workflowId: workflow.id,
      workflowName: workflow.name,
      parameters: workflow.inputs.map(param => ({
        parameterId: param.id,
        parameterName: param.name,
        valueType: 'static',
        staticValue: param.defaultValue,
        required: param.required,
        placeholder: param.placeholder,
      })),
    };
    
    setSteps([...steps, newStep]);
  };
  
  const handleRemoveStep = (stepNumber: number) => {
    const newSteps = steps.filter(s => s.stepNumber !== stepNumber);
    // Reorder remaining steps
    newSteps.forEach((step, idx) => {
      step.stepNumber = idx + 1;
    });
    setSteps(newSteps);
  };
  
  const updateParameterType = (stepId: string, paramId: string, valueType: 'static' | 'dynamic') => {
    setSteps(steps.map(step => {
      if (step.id === stepId) {
        return {
          ...step,
          parameters: step.parameters.map(param => {
            if (param.parameterId === paramId) {
              return {
                ...param,
                valueType,
                dynamicMapping: valueType === 'dynamic' ? param.dynamicMapping : undefined,
              };
            }
            return param;
          }),
        };
      }
      return step;
    }));
  };
  
  const updateStaticValue = (stepId: string, paramId: string, value: string) => {
    setSteps(steps.map(step => {
      if (step.id === stepId) {
        return {
          ...step,
          parameters: step.parameters.map(param => {
            if (param.parameterId === paramId) {
              return {
                ...param,
                staticValue: value,
              };
            }
            return param;
          }),
        };
      }
      return step;
    }));
  };
  
  const updateDynamicMapping = (stepId: string, paramId: string, sourceParameterId: string) => {
    setSteps(steps.map(step => {
      if (step.id === stepId) {
        return {
          ...step,
          parameters: step.parameters.map(param => {
            if (param.parameterId === paramId) {
              const match = sourceParameterId.match(/^(.+)-(.+)$/);
              const sourceStepNumber = match ? parseInt(match[1], 10) : 0;
              
              // Find source output name
              const sourceStep = steps.find(s => s.stepNumber === sourceStepNumber);
              const sourceWorkflow = availableWorkflows.find(w => w.id === sourceStep?.workflowId);
              // In reality we'd find the output definition, but here we assume outputs map to parameter IDs for now
              
              return {
                ...param,
                valueType: 'dynamic',
                dynamicMapping: {
                  sourceStepNumber,
                  sourceParameterId,
                  sourceOutputName: sourceParameterId,
                },
              };
            }
            return param;
          }),
        };
      }
      return step;
    }));
  };
  
  const handleSave = async () => {
    if (steps.length === 0) {
      toast.error('Add at least one workflow to the chain');
      return;
    }
    
    if (!name.trim()) {
      toast.error('Please enter a name for the complex workflow');
      return;
    }
    
    setIsSaving(true);
    
    try {
      const response = await fetch('/api/workspace/complex-workflow/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflow: {
            name,
            description,
            steps,
          },
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Complex workflow saved successfully');
        if (onSave) onSave();
      } else {
        toast.error(data.error || 'Failed to save complex workflow');
      }
    } catch (error) {
      console.error('Failed to save complex workflow:', error);
      toast.error('Failed to save complex workflow');
    } finally {
      setIsSaving(false);
    }
  };

  const getPreviousStepOutputs = (currentStepNumber: number) => {
    const outputs: { id: string; name: string; stepNumber: number; workflowName: string }[] = [];
    
    steps.filter(s => s.stepNumber < currentStepNumber).forEach(step => {
      const workflow = availableWorkflows.find(w => w.id === step.workflowId);
      // For now assuming all inputs can be outputs or just generic output
      // Ideally we should know the outputs of each workflow
      outputs.push({
        id: `${step.stepNumber}-output`,
        name: `Output`,
        stepNumber: step.stepNumber,
        workflowName: step.workflowName
      });
    });
    
    return outputs;
  };

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center space-x-4">
          <div className={cn("flex items-center justify-center w-8 h-8 rounded-full border-2", currentStep === 1 ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground text-muted-foreground")}>
            1
          </div>
          <div className="w-16 h-0.5 bg-border" />
          <div className={cn("flex items-center justify-center w-8 h-8 rounded-full border-2", currentStep === 2 ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground text-muted-foreground")}>
            2
          </div>
          <div className="w-16 h-0.5 bg-border" />
          <div className={cn("flex items-center justify-center w-8 h-8 rounded-full border-2", currentStep === 3 ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground text-muted-foreground")}>
            3
          </div>
        </div>
      </div>

      <Card className="min-h-[600px] flex flex-col">
        <CardHeader>
          <CardTitle>
            {currentStep === 1 && "Basic Information"}
            {currentStep === 2 && "Workflow Sequence"}
            {currentStep === 3 && "Parameter Configuration"}
          </CardTitle>
          <CardDescription>
            {currentStep === 1 && "Give your complex workflow a name and description."}
            {currentStep === 2 && "Add and arrange the workflows you want to chain together."}
            {currentStep === 3 && "Configure how data flows between steps."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-4 max-w-md mx-auto pt-8">
              <div className="space-y-2">
                <Label htmlFor="name">Workflow Name <span className="text-destructive">*</span></Label>
                <Input
                  id="name"
                  placeholder="e.g., Image Processing Pipeline"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what this workflow does..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}

          {/* Step 2: Workflow Sequence */}
          {currentStep === 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col h-[500px] border rounded-md overflow-hidden">
                <div className="bg-muted/50 p-3 border-b flex-shrink-0">
                  <h3 className="font-medium text-sm">Available Workflows</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
                  {isLoadingWorkflows ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : workflowsError ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-4">
                      <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
                      <p className="text-sm text-red-500">{workflowsError}</p>
                    </div>
                  ) : availableWorkflows.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center pt-8">No workflows available</p>
                  ) : (
                    availableWorkflows.map(workflow => (
                      <div 
                        key={workflow.id} 
                        className="flex items-center justify-between p-3 border rounded-md hover:bg-accent/50 transition-colors cursor-pointer group"
                        onClick={() => handleAddWorkflow(workflow)}
                      >
                        <div>
                          <p className="font-medium text-sm">{workflow.name}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">{workflow.description}</p>
                        </div>
                        <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex flex-col h-[500px] border rounded-md overflow-hidden">
                <div className="bg-muted/50 p-3 border-b flex justify-between items-center flex-shrink-0">
                  <h3 className="font-medium text-sm">Selected Sequence</h3>
                  <Badge variant="secondary">{steps.length} steps</Badge>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-muted/10 min-h-0">
                  {steps.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <Settings2 className="h-8 w-8 mb-2 opacity-50" />
                      <p className="text-sm">Add workflows from the left to build your chain</p>
                    </div>
                  ) : (
                    <Reorder.Group axis="y" values={steps} onReorder={handleReorder} className="space-y-2">
                      {steps.map((step, index) => (
                        <Reorder.Item key={step.id} value={step} className="flex items-center gap-3 p-3 bg-card border rounded-md shadow-sm cursor-grab active:cursor-grabbing hover:bg-accent/50 transition-colors">
                          <GripVertical className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          <Badge variant="outline" className="h-6 w-6 rounded-full p-0 flex items-center justify-center flex-shrink-0">
                            {index + 1}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{step.workflowName}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-[10px] px-1 h-5">Step {step.stepNumber}</Badge>
                              <span className="text-xs text-muted-foreground">{step.parameters.length} params</span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                            onClick={() => handleRemoveStep(step.stepNumber)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </Reorder.Item>
                      ))}
                    </Reorder.Group>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Parameter Configuration */}
          {currentStep === 3 && (
            <div className="space-y-6 max-w-3xl mx-auto">
              {steps.map((step) => {
                const selectedWorkflow = availableWorkflows.find(w => w.id === step.workflowId);
                return (
                  <div key={step.id} className="border rounded-md p-4 bg-card shadow-sm">
                    <div className="flex items-center gap-2 mb-4 border-b pb-2">
                      <Badge variant="outline">{step.stepNumber}</Badge>
                      <div className="flex-1">
                        <h3 className="font-medium">{step.workflowName}</h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <span>Type: {selectedWorkflow?.executionType || "workflow"}</span>
                          {selectedWorkflow?.description && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[300px]">{selectedWorkflow.description}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <Badge variant="secondary">
                        {step.parameters.length} params
                      </Badge>
                    </div>
                    
                    <div className="grid gap-4">
                      {step.parameters.map((param) => (
                        <div key={param.parameterId} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start bg-muted/20 p-3 rounded-md">
                          <div className="md:col-span-4">
                            <Label className="text-xs font-medium text-foreground">{param.parameterName}</Label>
                            {param.required && <span className="text-destructive ml-1">*</span>}
                            <p className="text-[10px] text-muted-foreground mt-1 truncate" title={param.parameterId}>
                              ID: {param.parameterId}
                            </p>
                          </div>
                          
                          <div className="md:col-span-3">
                            <Select 
                              value={param.valueType} 
                              onValueChange={(value: 'static' | 'dynamic') => updateParameterType(step.id, param.parameterId, value)}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="static">Static Value</SelectItem>
                                {step.stepNumber > 1 && <SelectItem value="dynamic">From Previous Step</SelectItem>}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="md:col-span-5">
                            {param.valueType === 'static' ? (
                              <Input
                                value={param.staticValue?.toString() || ''}
                                onChange={(e) => updateStaticValue(step.id, param.parameterId, e.target.value)}
                                placeholder={param.placeholder || 'Enter value'}
                                className="h-8"
                              />
                            ) : (
                              <Select
                                value={param.dynamicMapping?.sourceParameterId || ''}
                                onValueChange={(value) => updateDynamicMapping(step.id, param.parameterId, value)}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Select source output" />
                                </SelectTrigger>
                                <SelectContent>
                                  {getPreviousStepOutputs(step.stepNumber).map((output) => (
                                    <SelectItem key={output.id} value={output.id}>
                                      Step {output.stepNumber}: {output.workflowName} - Output
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between border-t p-6 bg-muted/10">
          <Button
            variant="outline"
            onClick={() => {
              if (currentStep === 1) {
                if (onCancel) onCancel();
              } else {
                setCurrentStep((prev) => (prev - 1) as BuilderStep);
              }
            }}
          >
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </Button>
          
          <Button
            onClick={() => {
              if (currentStep === 3) {
                handleSave();
              } else {
                if (currentStep === 1 && !name.trim()) {
                  toast.error('Please enter a workflow name');
                  return;
                }
                if (currentStep === 2 && steps.length === 0) {
                  toast.error('Please add at least one workflow step');
                  return;
                }
                setCurrentStep((prev) => (prev + 1) as BuilderStep);
              }
            }}
            disabled={isSaving}
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {currentStep === 3 ? 'Save Workflow' : 'Next'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
