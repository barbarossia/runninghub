'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Play, Loader2, FileText, Zap, Clock, CheckCircle2, AlertCircle, ChevronRight, RefreshCw } from 'lucide-react';
import { useWorkspaceStore } from '@/store/workspace-store';
import { useWorkspaceFolder } from '@/store/folder-store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WorkflowInputBuilder } from '@/components/workspace/WorkflowInputBuilder';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { ComplexWorkflow, FileInputAssignment, ComplexWorkflowExecution, JobResult } from '@/types/workspace';

import { ConsoleViewer } from '@/components/ui/ConsoleViewer';

// Poll interval for execution status
const POLL_INTERVAL = 2000;

export default function ComplexWorkflowExecutePage() {
  const params = useParams();
  const router = useRouter();
  const { workflows, setWorkflows } = useWorkspaceStore();
  const { selectedFolder } = useWorkspaceFolder();
  
  const [complexWorkflow, setComplexWorkflow] = useState<ComplexWorkflow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [textInputs, setTextInputs] = useState<Record<string, string>>({});
  const [fileInputs, setFileInputs] = useState<FileInputAssignment[]>([]);
  const [deleteSourceFiles, setDeleteSourceFiles] = useState(false);
  const [workflowDetails, setWorkflowDetails] = useState<Record<string, { name: string; description?: string }>>({});
  const [activeConsoleTaskId, setActiveConsoleTaskId] = useState<string | null>(null);
  const [isConsoleVisible, setIsConsoleVisible] = useState(true);
  
  // Execution state
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [executionData, setExecutionData] = useState<ComplexWorkflowExecution | null>(null);
  const [stepOutputs, setStepOutputs] = useState<Record<number, JobResult>>({});

  const workflowId = params.id as string;
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load basic data
  const loadWorkflows = async () => {
    try {
      const response = await fetch('/api/workflow/list');
      const data = await response.json();
      if (data.success && data.workflows) {
        setWorkflows(data.workflows);
      }
    } catch (error) {
      console.error('Failed to load workflows:', error);
    }
  };

  const loadWorkflow = useCallback(async () => {
    if (!workflowId) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/workspace/complex-workflow/${workflowId}`);
      const data = await response.json();

      if (data.success && data.workflow) {
        setComplexWorkflow(data.workflow);
      } else {
        toast.error(data.error || 'Failed to load complex workflow');
        router.back();
      }
    } catch (error) {
      console.error('Failed to load complex workflow:', error);
      toast.error('Failed to load complex workflow');
      router.back();
    } finally {
      setIsLoading(false);
    }
  }, [workflowId, router]);

  useEffect(() => {
    loadWorkflows();
    loadWorkflow();
  }, [loadWorkflow]);

  // Derived state for current step
  const currentStep = useMemo(() => {
    if (!complexWorkflow) return null;
    return complexWorkflow.steps.find(s => s.stepNumber === currentStepIndex + 1);
  }, [complexWorkflow, currentStepIndex]);

  const currentWorkflowTemplate = useMemo(() => {
    if (!currentStep) return null;
    return workflows.find(w => w.id === currentStep.workflowId);
  }, [currentStep, workflows]);

  const displayWorkflow = useMemo(() => {
    if (!currentWorkflowTemplate) return undefined;
    return {
      ...currentWorkflowTemplate,
      inputs: currentWorkflowTemplate.inputs.map(input => ({
        ...input,
        // Swap name and description
        name: input.description || input.name,
        description: input.description ? input.name : undefined
      }))
    };
  }, [currentWorkflowTemplate]);

  // Load workflow details map
  useEffect(() => {
    if (!complexWorkflow || workflows.length === 0) return;

    const details: Record<string, { name: string; description?: string }> = {};
    
    for (const step of complexWorkflow.steps) {
      const workflow = workflows.find(w => w.id === step.workflowId);
      if (workflow) {
        details[step.workflowId] = {
          name: workflow.name,
          description: workflow.description,
        };
      }
    }
    
    setWorkflowDetails(details);
  }, [complexWorkflow, workflows.length, workflows]);

  // Execute Step Logic
  const handleStepRun = async (data?: {
    fileInputs: FileInputAssignment[];
    textInputs: Record<string, string>;
    deleteSourceFiles?: boolean;
  }) => {
    if (!complexWorkflow || !currentStep || !data) return;

    const { fileInputs, textInputs, deleteSourceFiles } = data;

    if (fileInputs.length === 0 && Object.keys(textInputs).length === 0) {
      toast.error('Please provide at least one file or text input');
      return;
    }

    setIsExecuting(true);

    try {
      let response;
      
      // First step: Start execution
      if (currentStepIndex === 0) {
        response = await fetch('/api/workspace/complex-workflow/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            complexWorkflowId: complexWorkflow.id,
            initialParameters: {
              fileInputs,
              textInputs,
              deleteSourceFiles,
            },
          }),
        });
      } else {
        // Subsequent steps: Continue execution
        if (!executionId) {
          throw new Error('No execution ID found for continuation');
        }
        
        response = await fetch('/api/workspace/complex-workflow/continue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            executionId,
            stepNumber: currentStepIndex + 1,
            parameters: {
              fileInputs,
              textInputs,
              deleteSourceFiles
            },
          }),
        });
      }

      const resData = await response.json();

      if (resData.success) {
        if (resData.executionId) setExecutionId(resData.executionId);
        
        // Find task ID from response if available (backend should ideally return it)
        // Since the backend might not return taskId directly in execute/continue response for complex workflows
        // we rely on polling to update status. However, if the step creates a job, we want to track it.
        // For now, we will rely on polling `pollStatus` which updates `executionData`.
        // If we want real-time logs, we need the job's taskId. 
        // Let's assume the response might contain it or we get it from execution details.
        
        // Refresh status immediately
        await pollStatus();
        toast.success(`Step ${currentStepIndex + 1} started`);
      } else {
        toast.error(resData.error || 'Failed to execute step');
        setIsExecuting(false);
      }
    } catch (error) {
      console.error('Execution error:', error);
      toast.error('Failed to execute step');
      setIsExecuting(false);
    }
  };

  const handleNextStep = () => {
    if (currentStepIndex < (complexWorkflow?.steps.length || 0) - 1) {
      setCurrentStepIndex(prev => prev + 1);
      // Reset outputs for new step view
      setFileInputs([]);
      setTextInputs({});
      // Clear console task when moving to next step
      setActiveConsoleTaskId(null);
    } else {
      toast.success('Workflow completed!');
      router.push('/workspace?tab=jobs');
    }
  };

  // Poll status update to also check for active job/task ID
  const pollStatus = useCallback(async () => {
    if (!executionId) return;

    try {
      const response = await fetch(`/api/workspace/complex-workflow/execution/${executionId}`);
      const data = await response.json();

      if (data.success && data.execution) {
        setExecutionData(data.execution);
        
        const executionStep = data.execution.steps.find((s: any) => s.stepNumber === currentStepIndex + 1);
        
        // If we have a job ID for the current running step, try to get its task ID for logs
        if (executionStep?.jobId && executionStep.status === 'running' && !activeConsoleTaskId) {
           // Fetch job details to get taskId
           try {
             const jobRes = await fetch(`/api/workspace/jobs/${executionStep.jobId}`);
             const jobData = await jobRes.json();
             if (jobData.success && jobData.job?.taskId) {
               setActiveConsoleTaskId(jobData.job.taskId);
             }
           } catch (err) {
             console.error("Failed to fetch job details for task ID", err);
           }
        }

        // Update outputs if step completed
        if (executionStep?.status === 'completed' && executionStep.outputs) {
          setStepOutputs(prev => ({
            ...prev,
            [currentStepIndex + 1]: executionStep.outputs
          }));
          setIsExecuting(false);
        } else if (executionStep?.status === 'failed') {
          setIsExecuting(false);
          toast.error(`Step ${currentStepIndex + 1} failed`);
        }
      }
    } catch (error) {
      console.error('Failed to poll status:', error);
    }
  }, [executionId, currentStepIndex, activeConsoleTaskId]);

  useEffect(() => {
    if (isExecuting && executionId) {
      pollIntervalRef.current = setInterval(pollStatus, POLL_INTERVAL);
    }
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [isExecuting, executionId, pollStatus]);

  const handleInputChange = (data?: {
    fileInputs: FileInputAssignment[];
    textInputs: Record<string, string>;
    deleteSourceFiles?: boolean;
  }) => {
    if (!data) return;
    setFileInputs(data.fileInputs);
    setTextInputs(data.textInputs);
    if (data.deleteSourceFiles !== undefined) {
      setDeleteSourceFiles(data.deleteSourceFiles);
    }
  };

  const handleRefresh = async () => {
    // Optional: Refresh logic if needed by console
  };

  // Status helpers
  const getStepStatus = (stepNumber: number) => {
    if (!executionData) return stepNumber === 1 ? 'pending' : 'waiting';
    const step = executionData.steps.find(s => s.stepNumber === stepNumber);
    if (step) return step.status;
    return stepNumber === currentStepIndex + 1 ? 'pending' : 'waiting';
  };

  const isStepCompleted = getStepStatus(currentStepIndex + 1) === 'completed';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!complexWorkflow || !displayWorkflow) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900">Workflow not found</h3>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                Execute: {complexWorkflow.name}
              </h1>
              <Badge className="bg-purple-100 text-purple-800">
                {complexWorkflow.steps.length} steps
              </Badge>
            </div>
            {complexWorkflow.description && (
              <p className="text-sm text-gray-600">{complexWorkflow.description}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-6 min-h-0">
        {/* Left Panel: Step List */}
        <div className="w-80 shrink-0 space-y-4">
          <Card className="p-4 h-full overflow-y-auto">
            <h3 className="font-semibold text-gray-900 mb-4">Workflow Steps</h3>
            <div className="space-y-3 relative">
              {complexWorkflow.steps.map((step, index) => {
                const isActive = index === currentStepIndex;
                const status = getStepStatus(step.stepNumber);
                const isCompleted = status === 'completed';
                
                return (
                  <div
                    key={step.stepNumber}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-lg border transition-all relative z-10',
                      isActive
                        ? 'bg-purple-50 border-purple-200 shadow-sm'
                        : 'bg-white border-gray-200 opacity-80'
                    )}
                  >
                    <div
                      className={cn(
                        'h-6 w-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5',
                        isActive ? 'bg-purple-600 text-white' : 
                        isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                      )}
                    >
                      {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : step.stepNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate">
                        {workflowDetails[step.workflowId]?.description || workflowDetails[step.workflowId]?.name}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 flex justify-between items-center">
                        <span>{workflowDetails[step.workflowId]?.name}</span>
                        {status !== 'waiting' && status !== 'pending' && (
                          <Badge variant="outline" className={cn(
                            "text-[10px] px-1 h-4",
                            status === 'running' && "bg-blue-50 text-blue-700 border-blue-200",
                            status === 'completed' && "bg-green-50 text-green-700 border-green-200",
                            status === 'failed' && "bg-red-50 text-red-700 border-red-200"
                          )}>
                            {status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {/* Connector line could be added here if needed */}
            </div>
          </Card>
        </div>

        {/* Right Panel: Input & Execution */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          <Card className="p-6 h-full flex flex-col">
            {/* Step Header */}
            <div className="flex items-center gap-3 mb-6 pb-4 border-b">
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Play className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-500">Step {currentStepIndex + 1}:</span>
                  <h3 className="font-semibold text-lg text-gray-900">
                    {workflowDetails[currentStep?.workflowId || '']?.description || currentStep?.workflowName}
                  </h3>
                </div>
                <p className="text-sm text-gray-600">
                  {isStepCompleted 
                    ? "Step completed successfully. You can proceed to the next step or re-run this step." 
                    : "Configure inputs and run this step."}
                </p>
              </div>
            </div>

            {/* Input Builder */}
            <div className="flex-1 overflow-y-auto mb-6">
              <WorkflowInputBuilder
                workflow={displayWorkflow}
                onRunJob={handleStepRun}
                runLabel={isStepCompleted ? "Re-run Step" : "Run Step"}
                isExecuting={isExecuting}
                extraActions={
                  <Button 
                    onClick={handleNextStep} 
                    disabled={!isStepCompleted}
                    variant={isStepCompleted ? "default" : "secondary"}
                    className={cn(isStepCompleted && "bg-green-600 hover:bg-green-700")}
                  >
                    Next Step
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                }
              />
            </div>

            {/* Output Display */}
            {isStepCompleted && stepOutputs[currentStepIndex + 1] && (
              <div className="mt-6 pt-6 border-t">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Step Output
                </h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {stepOutputs[currentStepIndex + 1].outputs?.map((output, idx) => (
                      <div key={idx} className="group relative aspect-square bg-white rounded-md border overflow-hidden">
                        {output.fileType === 'image' ? (
                          <img 
                            src={`/api/images/serve?path=${encodeURIComponent(output.path || '')}`} 
                            alt="Output" 
                            className="w-full h-full object-contain"
                          />
                        ) : output.fileType === 'video' ? (
                          <div className="w-full h-full flex items-center justify-center bg-black">
                            <Play className="h-8 w-8 text-white opacity-70" />
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <FileText className="h-8 w-8" />
                          </div>
                        )}
                        <a 
                          href={`/api/workspace/serve/${encodeURIComponent(output.path || '')}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity text-white text-sm font-medium"
                        >
                          View
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
      
      {/* Console Viewer */}
      <ConsoleViewer
        onRefresh={handleRefresh}
        taskId={activeConsoleTaskId}
        defaultVisible={false}
      />
    </div>
  );
}