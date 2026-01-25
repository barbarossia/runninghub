/**
 * Continue Complex Workflow Execution API
 * Executes the next step in a complex workflow
 */

import { NextRequest, NextResponse } from 'next/server';
import { loadComplexWorkflowExecution, loadComplexWorkflow, mapOutputsToInputs, validateStepParameter } from '@/lib/complex-workflow-utils';
import type {
  ContinueComplexWorkflowRequest,
  ContinueComplexWorkflowResponse,
  ComplexWorkflow,
  WorkflowStep,
  StepParameterConfig,
} from '@/types/workspace';

const EXECUTION_DIR = process.env.HOME
  ? `${process.env.HOME}/Downloads/workspace/complex-executions`
  : '~/Downloads/workspace/complex-executions';

export async function POST(request: NextRequest) {
  try {
    const body: ContinueComplexWorkflowRequest = await request.json();

    // Validate request
    if (!body.executionId || !body.stepNumber) {
      return NextResponse.json({
        success: false,
        error: 'Execution ID and step number are required',
      } as ContinueComplexWorkflowResponse, { status: 400 });
    }

    // Load execution state
    const execution = await loadComplexWorkflowExecution(body.executionId);

    if (!execution) {
      return NextResponse.json({
        success: false,
        error: `Execution ${body.executionId} not found`,
      } as ContinueComplexWorkflowResponse, { status: 404 });
    }

    // Load workflow definition to get parameters
    const workflow = await loadComplexWorkflow(execution.complexWorkflowId);
    if (!workflow) {
      return NextResponse.json({
        success: false,
        error: `Complex workflow ${execution.complexWorkflowId} not found`,
      } as ContinueComplexWorkflowResponse, { status: 404 });
    }

    // Find current and next steps
    const currentStep = execution.steps.find(s => s.stepNumber === body.stepNumber);
    const nextStep = execution.steps.find(s => s.stepNumber === body.stepNumber + 1);
    const nextStepDef = workflow.steps.find(s => s.stepNumber === body.stepNumber + 1);

    if (!nextStep || !nextStepDef) {
      return NextResponse.json({
        success: false,
        error: `Step ${body.stepNumber + 1} not found in complex workflow`,
      } as ContinueComplexWorkflowResponse, { status: 400 });
    }

    if (!currentStep) {
      return NextResponse.json({
        success: false,
        error: `Step ${body.stepNumber} not found in complex workflow`,
      } as ContinueComplexWorkflowResponse, { status: 400 });
    }

    // Validate current step is completed
    if (currentStep.status !== 'completed') {
      return NextResponse.json({
        success: false,
        error: `Step ${body.stepNumber} is not completed (status: ${currentStep.status})`,
      } as ContinueComplexWorkflowResponse, { status: 400 });
    }

    // Get previous step outputs (if any)
    let previousJobResult: any = null;
    if (body.stepNumber > 1) {
      const prevStep = execution.steps.find(s => s.stepNumber === body.stepNumber - 1);
      if (prevStep?.jobId) {
        const fs = await import('fs/promises');
        const path = await import('path');
        const executionDir = path.join(EXECUTION_DIR, body.executionId);
        const jobFile = path.join(executionDir, prevStep.jobId, 'job.json');
        
        try {
          const jobContent = await fs.readFile(jobFile, 'utf-8');
          previousJobResult = JSON.parse(jobContent);
        } catch (e) {
          console.error('Failed to read previous job result:', e);
        }
      }
    }

    // Prepare next step inputs
    const inputs = mapOutputsToInputs(previousJobResult, nextStepDef.parameters);

    // Validate user-provided parameters
    if (body.parameters) {
      // Merge user-provided parameters with mapped inputs
      Object.assign(inputs, body.parameters);
    }

    // Validate all parameters
    for (const param of nextStepDef.parameters) {
      const validation = validateStepParameter(nextStepDef.stepNumber, param);
      if (!validation.valid) {
        return NextResponse.json({
          success: false,
          error: validation.error,
        } as ContinueComplexWorkflowResponse, { status: 400 });
      }
    }

    // Execute next step via existing execute API
    const executeResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/workspace/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workflowId: nextStepDef.workflowId,
        sourceWorkflowId: execution.complexWorkflowId,
        workflowName: nextStepDef.workflowName,
        fileInputs: [], // Will be filled by API from file paths
        textInputs: inputs,
        folderPath: '',
        deleteSourceFiles: false,
      }),
    });

    const executeData = await executeResponse.json();

    if (!executeData.success) {
      return NextResponse.json({
        success: false,
        error: executeData.error || 'Failed to execute next step',
      } as ContinueComplexWorkflowResponse, { status: 500 });
    }

    // Update execution state
    const fs = await import('fs/promises');
    const path = await import('path');

    const executionDir = path.join(EXECUTION_DIR, body.executionId);
    const executionFile = path.join(executionDir, 'execution.json');

    const updatedSteps = execution.steps.map(step => {
      if (step.stepNumber === body.stepNumber) {
        return {
          ...step,
          jobId: executeData.jobId,
          status: 'running',
          inputs,
          startedAt: Date.now(),
        };
      }
      return step;
    });

    const updatedExecution = {
      ...execution,
      currentStep: body.stepNumber + 1,
      steps: updatedSteps,
    };

    await fs.writeFile(executionFile, JSON.stringify(updatedExecution, null, 2));

    return NextResponse.json({
      success: true,
      jobId: executeData.jobId,
      message: `Step ${body.stepNumber + 1} started`,
    } as ContinueComplexWorkflowResponse);
  } catch (error) {
    console.error('Continue complex workflow error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to continue complex workflow',
    } as ContinueComplexWorkflowResponse, { status: 500 });
  }
}
