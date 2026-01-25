/**
 * Complex Workflow Utilities
 * Manages complex workflow storage and operations
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

import type {
  ComplexWorkflow,
  WorkflowStep,
  StepParameterConfig,
  ComplexWorkflowExecution,
  ExecutionStep,
} from '@/types/workspace';

const COMPLEX_WORKFLOW_DIR = join(
  process.env.HOME || '~',
  'Downloads',
  'workspace',
  'complex-workflows'
);

const COMPLEX_EXECUTION_DIR = join(
  process.env.HOME || '~',
  'Downloads',
  'workspace',
  'complex-executions'
);

/**
 * Generate unique ID for complex workflow
 */
export function generateComplexWorkflowId(): string {
  return `complex_${Date.now()}_${randomUUID().substring(0, 8)}`;
}

/**
 * Generate unique ID for complex workflow execution
 */
export function generateComplexExecutionId(): string {
  return `exec_${Date.now()}_${randomUUID().substring(0, 8)}`;
}

/**
 * Save complex workflow to file
 */
export async function saveComplexWorkflow(
  workflow: Omit<ComplexWorkflow, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const id = generateComplexWorkflowId();
  const now = Date.now();

  const fullWorkflow: ComplexWorkflow = {
    ...workflow,
    id,
    createdAt: now,
    updatedAt: now,
  };

  const filePath = join(COMPLEX_WORKFLOW_DIR, `${id}.json`);

  await fs.mkdir(COMPLEX_WORKFLOW_DIR, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(fullWorkflow, null, 2));

  return id;
}

/**
 * Load complex workflow from file
 */
export async function loadComplexWorkflow(
  workflowId: string
): Promise<ComplexWorkflow | null> {
  try {
    const filePath = join(COMPLEX_WORKFLOW_DIR, `${workflowId}.json`);
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as ComplexWorkflow;
  } catch (error) {
    console.error(`Failed to load complex workflow ${workflowId}:`, error);
    return null;
  }
}

/**
 * List all complex workflows
 */
export async function listComplexWorkflows(): Promise<ComplexWorkflow[]> {
  try {
    await fs.mkdir(COMPLEX_WORKFLOW_DIR, { recursive: true });
    const files = await fs.readdir(COMPLEX_WORKFLOW_DIR);
    const workflows: ComplexWorkflow[] = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      try {
        const filePath = join(COMPLEX_WORKFLOW_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        workflows.push(JSON.parse(content) as ComplexWorkflow);
      } catch (error) {
        console.error(`Failed to read ${file}:`, error);
      }
    }

    return workflows.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (error) {
    console.error('Failed to list complex workflows:', error);
    return [];
  }
}

/**
 * Delete complex workflow
 */
export async function deleteComplexWorkflow(workflowId: string): Promise<boolean> {
  try {
    const filePath = join(COMPLEX_WORKFLOW_DIR, `${workflowId}.json`);
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    console.error(`Failed to delete complex workflow ${workflowId}:`, error);
    return false;
  }
}

/**
 * Save complex workflow execution state
 */
export async function saveComplexWorkflowExecution(
  execution: Omit<ComplexWorkflowExecution, 'id' | 'createdAt'>
): Promise<string> {
  const id = generateComplexExecutionId();
  const now = Date.now();

  const fullExecution: ComplexWorkflowExecution = {
    ...execution,
    id,
    createdAt: now,
  };

  const executionDir = join(COMPLEX_EXECUTION_DIR, id);
  await fs.mkdir(executionDir, { recursive: true });

  const executionFilePath = join(executionDir, 'execution.json');
  await fs.writeFile(executionFilePath, JSON.stringify(fullExecution, null, 2));

  return id;
}

/**
 * Load complex workflow execution state
 */
export async function loadComplexWorkflowExecution(
  executionId: string
): Promise<ComplexWorkflowExecution | null> {
  try {
    const executionFilePath = join(
      COMPLEX_EXECUTION_DIR,
      executionId,
      'execution.json'
    );
    const content = await fs.readFile(executionFilePath, 'utf-8');
    return JSON.parse(content) as ComplexWorkflowExecution;
  } catch (error) {
    console.error(`Failed to load execution ${executionId}:`, error);
    return null;
  }
}

/**
 * Map previous step outputs to next step inputs
 */
export function mapOutputsToInputs(
  previousJobResult: any,
  nextStepParameters: StepParameterConfig[]
): Record<string, any> {
  const inputs: Record<string, any> = {};

  if (!previousJobResult || !previousJobResult.outputs) {
    return inputs;
  }

  const outputs = previousJobResult.outputs || [];
  const outputMap = new Map<string, any>();

  // Build output map by parameter ID
  for (const output of outputs) {
    if (output.parameterId) {
      outputMap.set(output.parameterId, output);
    }
    // Also support by output index for flexibility
    if (typeof output.index === 'number') {
      outputMap.set(`output_${output.index}`, output);
    }
  }

  // Map dynamic parameters to outputs
  for (const param of nextStepParameters) {
    if (param.valueType === 'dynamic' && param.dynamicMapping) {
      const { sourceStepNumber, sourceParameterId, sourceOutputName } = param.dynamicMapping;
      
      // Find the output from previous step
      const output = outputMap.get(sourceParameterId) || outputMap.get(sourceOutputName);
      
      if (output) {
        inputs[param.parameterId] = {
          type: output.type === 'text' ? 'text' : 'file',
          value: output.type === 'text' ? output.content : output.path,
          fileName: output.fileName,
        };
      }
    } else if (param.valueType === 'static' && param.staticValue !== undefined) {
      inputs[param.parameterId] = param.staticValue;
    }
  }

  return inputs;
}

/**
 * Validate step parameter config
 */
export function validateStepParameter(
  stepNumber: number,
  parameter: StepParameterConfig
): { valid: boolean; error?: string } {
  // First step cannot use dynamic mapping
  if (stepNumber === 1 && parameter.valueType === 'dynamic') {
    return {
      valid: false,
      error: `Step ${stepNumber} cannot use dynamic mapping (no previous output available)`,
    };
  }

  // Dynamic mapping must have all required fields
  if (parameter.valueType === 'dynamic') {
    if (!parameter.dynamicMapping) {
      return {
        valid: false,
        error: `Dynamic mapping missing for parameter ${parameter.parameterId}`,
      };
    }

    const { sourceStepNumber, sourceParameterId, sourceOutputName } = parameter.dynamicMapping;
    
    // Validate source step number
    if (sourceStepNumber >= stepNumber) {
      return {
        valid: false,
        error: `Step ${stepNumber} parameter cannot map to current or future step (step ${sourceStepNumber})`,
      };
    }

    if (!sourceParameterId) {
      return {
        valid: false,
        error: `Dynamic mapping missing sourceParameterId for ${parameter.parameterId}`,
      };
    }

    if (!sourceOutputName) {
      return {
        valid: false,
        error: `Dynamic mapping missing sourceOutputName for ${parameter.parameterId}`,
      };
    }
  }

  return { valid: true };
}
