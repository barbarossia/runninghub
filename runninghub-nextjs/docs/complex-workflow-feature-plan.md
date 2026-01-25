# Complex Workflow Feature Plan

## Overview
Allow users to create, customize, and execute chains of multiple workflows where:
- Each workflow step uses outputs from previous steps as inputs
- Users can add/remove workflows dynamically
- Execution is step-by-step with manual review between steps
- All parameters are visible and customizable

## Requirements

### 1. Workflow Chain Management
- [ ] User can add workflows to a chain
- [ ] User can remove workflows from a chain
- [ ] Reorder workflow steps (drag-and-drop or up/down buttons)
- [ ] Save complex workflow as reusable template

### 2. Parameter Configuration
- [ ] Display all parameters for all workflow steps
- [ ] User can set static values for any parameter
- [ ] User can map parameter to previous workflow's output
- [ ] First workflow step cannot use previous output (only user input)
- [ ] Subsequent steps can use either user input OR previous output

### 3. Execution Flow
- [ ] Execute first workflow with user-provided inputs
- [ ] After completion, pause and show outputs
- [ ] User reviews outputs and clicks "Next" to continue
- [ ] Before next step, map outputs to next workflow's inputs
- [ ] User can edit parameters before next step execution
- [ ] Continue until all steps complete

### 4. Build UI (Wizard)
- [ ] Step-by-step wizard for building complex workflow
- [ ] Step 1: Select and add workflows to chain
- [ ] Step 2: Configure all parameters (expandable sections per workflow)
- [ ] Step 3: Review and save complex workflow

## Data Model

### ComplexWorkflow Interface

```typescript
export interface ComplexWorkflow {
  id: string;
  name: string;
  description?: string;
  steps: WorkflowStep[];
  createdAt: number;
  updatedAt: number;
}

export interface WorkflowStep {
  id: string;
  stepNumber: number;
  workflowId: string;
  workflowName: string;
  parameters: StepParameterConfig[];
}

export interface StepParameterConfig {
  parameterId: string;
  parameterName: string;
  valueType: 'static' | 'dynamic';
  staticValue?: string | number | boolean;
  dynamicMapping?: {
    sourceStepNumber: number;
    sourceParameterId: string;
    sourceOutputName: string;
  };
}
```

### Complex Workflow Execution State

```typescript
export interface ComplexWorkflowExecution {
  id: string;
  complexWorkflowId: string;
  name: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  currentStep: number;
  steps: ExecutionStep[];
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

export interface ExecutionStep {
  stepNumber: number;
  workflowId: string;
  jobId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  inputs: Record<string, any>;
  outputs?: JobResult;
  startedAt?: number;
  completedAt?: number;
}
```

## Backend API Changes

### New API Endpoints

#### 1. Create/Save Complex Workflow
`POST /api/workspace/complex-workflow/save`
- Request: `ComplexWorkflow`
- Response: `{ success: boolean, workflowId: string }`
- Storage: `~/Downloads/workspace/complex-workflows/{complexWorkflowId}.json`

#### 2. List Complex Workflows
`GET /api/workspace/complex-workflow/list`
- Response: `{ success: boolean, workflows: ComplexWorkflow[] }`
- Read from `~/Downloads/workspace/complex-workflows/`

#### 3. Get Complex Workflow
`GET /api/workspace/complex-workflow/[workflowId]`
- Response: `{ success: boolean, workflow: ComplexWorkflow }`

#### 4. Execute Complex Workflow
`POST /api/workspace/complex-workflow/execute`
- Request: `{ complexWorkflowId: string, steps: WorkflowStep[] }`
- Response: `{ success: boolean, executionId: string, message: string }`
- Creates execution state file
- Starts first step

#### 5. Continue Execution
`POST /api/workspace/complex-workflow/continue`
- Request: `{ executionId: string, stepNumber: number, parameters: Record<string, any> }`
- Response: `{ success: boolean, message: string, jobId: string }`
- Maps outputs from previous step to next step inputs
- Executes next workflow step

#### 6. Get Execution Status
`GET /api/workspace/complex-workflow/execution/[executionId]`
- Response: `{ success: boolean, execution: ComplexWorkflowExecution }`
- Read from execution state file

## Storage Structure

### Complex Workflow Files
```
~/Downloads/workspace/complex-workflows/
  ├── complex_1234567890_abc123.json
  ├── complex_0987654321_def456.json
  └── ...
```

### Complex Workflow Execution Files
```
~/Downloads/workspace/complex-executions/
  ├── exec_1234567890_xyz789/
  │   ├── execution.json
  │   ├── step_1_job_abc123.json
  │   ├── step_2_job_def456.json
  │   └── ...
```

## Frontend Components

### 1. ComplexWorkflowBuilder Component
**Location**: `runninghub-nextjs/src/components/workspace/ComplexWorkflowBuilder.tsx`

**Features**:
- List of added workflow steps
- Add workflow button (opens workflow selector dialog)
- Remove workflow button
- Reorder controls (drag handle or up/down arrows)
- Configure parameters button (opens parameter configuration dialog)
- Preview workflow chain visualization

### 2. StepParameterConfigDialog Component
**Location**: `runninghub-nextjs/src/components/workspace/StepParameterConfigDialog.tsx`

**Features**:
- Accordion for each workflow step
- List of all parameters per step
- Toggle between static value and dynamic mapping
- For dynamic mapping: dropdown to select previous step's output
- Preview of data flow: "Step 1 Output → Step 2 Input"

### 3. ComplexWorkflowExecutionMonitor Component
**Location**: `runninghub-nextjs/src/components/workspace/ComplexWorkflowExecutionMonitor.tsx`

**Features**:
- Display execution progress (current step / total steps)
- Show current step status (running, completed, failed)
- Display outputs of completed step
- "Continue" button (enabled after step completes)
- "Edit & Retry" button (if step fails)
- "Stop" button (cancel execution)

### 4. ComplexWorkflowList Component
**Location**: `runninghub-nextjs/src/components/workspace/ComplexWorkflowList.tsx`

**Features**:
- List of saved complex workflows
- Delete complex workflow
- Execute complex workflow
- Edit complex workflow

## Type Definitions

### Add to `runninghub-nextjs/src/types/workspace.ts`

```typescript
// ============================================================================
// COMPLEX WORKFLOW TYPES
// ============================================================================

export interface ComplexWorkflow {
  id: string;
  name: string;
  description?: string;
  steps: WorkflowStep[];
  createdAt: number;
  updatedAt: number;
}

export interface WorkflowStep {
  id: string;
  stepNumber: number;
  workflowId: string;
  workflowName: string;
  parameters: StepParameterConfig[];
}

export interface StepParameterConfig {
  parameterId: string;
  parameterName: string;
  valueType: 'static' | 'dynamic';
  staticValue?: string | number | boolean;
  dynamicMapping?: {
    sourceStepNumber: number;
    sourceParameterId: string;
    sourceOutputName: string;
  };
}

export interface ComplexWorkflowExecution {
  id: string;
  complexWorkflowId: string;
  name: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  currentStep: number;
  steps: ExecutionStep[];
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

export interface ExecutionStep {
  stepNumber: number;
  workflowId: string;
  jobId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  inputs: Record<string, any>;
  outputs?: JobResult;
  startedAt?: number;
  completedAt?: number;
}

// Request/Response types
export interface SaveComplexWorkflowRequest {
  workflow: ComplexWorkflow;
}

export interface SaveComplexWorkflowResponse {
  success: boolean;
  workflowId: string;
  error?: string;
}

export interface ExecuteComplexWorkflowRequest {
  complexWorkflowId: string;
  initialParameters?: Record<string, any>; // User-provided inputs for first step
}

export interface ExecuteComplexWorkflowResponse {
  success: boolean;
  executionId: string;
  message: string;
  error?: string;
}

export interface ContinueComplexWorkflowRequest {
  executionId: string;
  stepNumber: number;
  parameters: Record<string, any>;
}

export interface ContinueComplexWorkflowResponse {
  success: boolean;
  message: string;
  jobId: string;
  error?: string;
}

export interface GetExecutionStatusResponse {
  success: boolean;
  execution?: ComplexWorkflowExecution;
  error?: string;
}
```

## Implementation Phases

### Phase 1: Type Definitions & Storage (Day 1-2)
- [ ] Add complex workflow types to `workspace.ts`
- [ ] Create storage directory for complex workflows
- [ ] Create storage directory for complex executions
- [ ] Implement save/load complex workflow functions

### Phase 2: Backend API (Day 2-3)
- [ ] Implement `/api/workspace/complex-workflow/save`
- [ ] Implement `/api/workspace/complex-workflow/list`
- [ ] Implement `/api/workspace/complex-workflow/[workflowId]`
- [ ] Implement `/api/workspace/complex-workflow/execute`
- [ ] Implement `/api/workspace/complex-workflow/continue`
- [ ] Implement `/api/workspace/complex-workflow/execution/[executionId]`

### Phase 3: Build UI Components (Day 3-4)
- [ ] Create `ComplexWorkflowBuilder` component
- [ ] Create `StepParameterConfigDialog` component
- [ ] Create `ComplexWorkflowList` component
- [ ] Create `ComplexWorkflowExecutionMonitor` component

### Phase 4: Integration & Testing (Day 4-5)
- [ ] Add "Complex Workflows" tab to Workspace page
- [ ] Integrate complex workflow list with main UI
- [ ] Test end-to-end: create → configure → execute → continue → complete
- [ ] Test error handling: step failure, missing parameters, etc.

## UX Considerations

### Parameter Mapping UI
- Show clear visual connection between step outputs and next step inputs
- Use color coding: green for mapped, gray for static, red for missing required
- Prevent mapping cycles (e.g., Step 2 input from Step 3 output)

### Execution Control
- After each step completes, show outputs prominently
- Allow user to view/download outputs before continuing
- "Continue" button should be clearly visible
- If user edits parameters, show what changed from previous run

### Error Recovery
- If a step fails, allow user to:
  - Retry with same parameters
  - Edit parameters and retry
  - Skip step (if optional)
- Save execution history for debugging

## Open Questions

1. Should complex workflows be stored in separate directory or mixed with regular workflows?
   - Proposal: Separate `complex-workflows/` directory for clarity

2. What happens if a workflow in the chain is deleted?
   - Proposal: Mark complex workflow as "broken", show warning in UI

3. Should users be able to branch workflows (parallel execution)?
   - Proposal: Not in initial version (linear chain only)

4. How to handle output files between steps?
   - Proposal: Store in complex execution directory, accessible via execution monitor

---

## UPDATED: JobDetail Page Integration

Based on feedback, complex workflow execution will be integrated directly into **JobDetail page** instead of creating a separate page.

### Job Interface Extensions

```typescript
export interface Job {
  // ... existing fields
  
  // Complex workflow specific
  complexWorkflowId?: string;        // ID of parent complex workflow
  complexExecutionId?: string;       // ID of complex workflow execution
  stepNumber?: number;              // Position in chain (1, 2, 3, ...)
  totalSteps?: number;             // Total steps in complex workflow
  
  // For jobs created from complex workflow steps
  isComplexWorkflowStep?: boolean;  // True if this job was created by complex workflow
  stepStatus?: 'pending' | 'running' | 'completed' | 'failed';
}
```

### JobDetail UI Enhancements

#### 1. Complex Workflow Context Section
**Location**: After status header, before input editor

```typescript
// Add to JobDetail.tsx
const [complexWorkflow, setComplexWorkflow] = useState<ComplexWorkflow | null>(null);
const [complexExecution, setComplexExecution] = useState<ComplexWorkflowExecution | null>(null);
```

**When job has `complexWorkflowId`, show:**
- Complex workflow name and description
- Current step indicator: `Step {currentStep} of {totalSteps}`
- Visual step progress bar
- Each step's status (pending, running, completed, failed)

#### 2. Step Status Display
**Layout**: Expandable accordion for each workflow step

**Per step, show:**
- Workflow name and step number
- Status badge (pending/running/completed/failed)
- Input parameters used
- Output files from step
- "View outputs" button (opens modal with full outputs)

#### 3. Continue Execution Button
**Location**: In action buttons area (next to Re-run button)

**Behavior:**
- Only shown when:
  - Job is a complex workflow step
  - Status is 'completed' or 'paused'
  - NOT the final step
- On click:
  - Load next step's parameter configuration
  - Show mapping dialog (previous outputs → next inputs)
  - User can edit before continuing
  - Execute next step

#### 4. Edit Step Parameters Before Continue
**When clicking "Continue":**
- Open dialog showing:
  - Next step's parameters
  - Current static values
  - Mapped previous outputs (if any)
  - Allow user to:
    - Change static values
    - Re-map to different previous output
    - Skip optional parameters

### Complex Workflow Execution in JobDetail

```typescript
// New function in JobDetail
const handleContinueComplexWorkflow = async () => {
  if (!job.complexWorkflowId || !job.complexExecutionId) {
    return; // Not a complex workflow job
  }
  
  // Load complex workflow
  const cw = await loadComplexWorkflow(job.complexWorkflowId);
  
  // Find current step
  const currentStep = cw.steps.find(s => s.stepNumber === (job.stepNumber || 1));
  const nextStep = cw.steps.find(s => s.stepNumber === ((job.stepNumber || 1) + 1));
  
  if (!nextStep) {
    toast.success('Complex workflow completed!');
    return; // All steps done
  }
  
  // Map previous outputs to next step inputs
  const mappedInputs = mapOutputsToInputs(job.results, nextStep.parameters);
  
  // Execute next step
  const response = await fetch('/api/workspace/complex-workflow/continue', {
    method: 'POST',
    body: JSON.stringify({
      executionId: job.complexExecutionId,
      stepNumber: nextStep.stepNumber,
      parameters: mappedInputs,
    }),
  });
  
  // Update UI
  toast.success(`Started Step ${nextStep.stepNumber}`);
};
```

### JobDetail Layout Changes

```
┌─────────────────────────────────────────────────────────────────────┐
│ Header: Workflow Name | Status | Run #3                    │
├─────────────────────────────────────────────────────────────────────┤
│ [Re-query] [Edit & Run] [Re-run] [Delete]           │
├─────────────────────────────────────────────────────────────────────┤
│                                                              │
│ ╭ COMPLEX WORKFLOW CONTEXT (NEW) ╮                        │
│ │ Pipeline: Video Processing Chain     │                        │
│ │ Progress: Step 2 of 4 [█████░░]                         │
│ │                                                              │
│ │ ┌────────────────────────────────┐                            │
│ │ │ Step 1: Split Video      [✓ Completed]               │
│ │ │ Output: 5 video segments                               │
│ │ │                                                         │
│ │ ├────────────────────────────────┤                            │
│ │ │ Step 2: Generate Captions [● Running]               │
│ │ │ Input: 5 videos from Step 1                               │
│ │ │                                                         │
│ │ ├────────────────────────────────┤                            │
│ │ │ Step 3: Enhance [⏳ Pending]                        │
│ │ │ Input: Videos + Captions from Steps 1-2                │
│ │ │                                                         │
│ │ └────────────────────────────────┘                            │
│ │                                                             │
│ │ [Continue to Step 3] (Button)                              │
│ ╰─────────────────────────────────────────────────┘                       │
│                                                              │
│ ╭─ ORIGINAL INPUTS ╮                                          │
│ │ [Input images/files]                                           │
│ ╰──────────────────╯                                          │
│                                                              │
│ ╭─ OUTPUTS ╮                                                │
│ │ [Output files]                                               │
│ ╰────────────╯                                                │
└─────────────────────────────────────────────────────────────────────┘
```

### JobDetail State for Complex Workflows

```typescript
// Add to JobDetail component state
const [complexWorkflow, setComplexWorkflow] = useState<ComplexWorkflow | null>(null);
const [complexExecution, setComplexExecution] = useState<ComplexWorkflowExecution | null>(null);
const [showContinueDialog, setShowContinueDialog] = useState(false);

// Load complex workflow when job has complexWorkflowId
useEffect(() => {
  if (job?.complexWorkflowId) {
    loadComplexWorkflowDetails(job.complexWorkflowId);
  }
}, [job?.complexWorkflowId]);

const loadComplexWorkflowDetails = async (cwId: string) => {
  const response = await fetch(`/api/workspace/complex-workflow/${cwId}`);
  const data = await response.json();
  if (data.success) {
    setComplexWorkflow(data.workflow);
    // Load execution status to get current step
    loadComplexExecutionStatus(cwId);
  }
};

const loadComplexExecutionStatus = async (cwId: string) => {
  const response = await fetch(`/api/workspace/complex-workflow/execution/${cwId}`);
  const data = await response.json();
  if (data.success) {
    setComplexExecution(data.execution);
  }
};
```

### Continue Dialog Component

**Location**: `src/components/workspace/ComplexWorkflowContinueDialog.tsx`

**Features**:
- Show next step's workflow name
- List all parameters for next step
- For each parameter:
  - Show static value
  - OR show mapped previous output
  - Allow toggle between static/dynamic
  - Show value editor (input/text/checkbox)
- "Preview mapping" section showing data flow
- "Continue" button to execute next step
- "Cancel" button

```typescript
export interface ComplexWorkflowContinueDialogProps {
  open: boolean;
  onClose: () => void;
  onContinue: (parameters: Record<string, any>) => void;
  complexWorkflow: ComplexWorkflow;
  currentStep: WorkflowStep;
  previousOutputs: JobResult[];
}
```

## Updated Implementation Plan

### Phase 3 (Updated): Build UI Components
- [ ] `ComplexWorkflowList.tsx` - List saved complex workflows
- [ ] `ComplexWorkflowBuilder.tsx` - Wizard to build new complex workflow
- [ ] `ComplexWorkflowContinueDialog.tsx` - Dialog to continue to next step (NEW)
- [ ] `ComplexWorkflowContext.tsx` - Component showing step progress in JobDetail (NEW)

### Phase 4 (Updated): JobDetail Integration
- [ ] Extend Job type to include complex workflow fields
- [ ] Add `ComplexWorkflowContext` section to JobDetail (conditional render)
- [ ] Add step status display with expandable steps
- [ ] Add "Continue to next step" button
- [ ] Load complex workflow details when job has `complexWorkflowId`
- [ ] Subscribe to execution status updates for complex workflows

### Updated TODOs

See `complex-workflow-feature-todos.md` for updated list including JobDetail integration.


---

## JobDetail Visual Layout (Complex Workflow)

```
┌─────────────────────────────────────────────────────────────────────┐
│ Header: Workflow Name | Status | Run #3                    │
├─────────────────────────────────────────────────────────────────────┤
│ [Re-query] [Edit & Run] [Re-run] [Delete]           │
├─────────────────────────────────────────────────────────────────────┤
│                                                              │
│ ╭ COMPLEX WORKFLOW CONTEXT (NEW) ╮                        │
│ │ Pipeline: Video Processing Chain     │                        │
│ │ Progress: Step 2 of 4 [█████░░]                         │
│ │                                                              │
│ │ ┌────────────────────────────────┐                            │
│ │ │ Step 1: Split Video      [✓ Completed]               │
│ │ │ Output: 5 video segments                               │
│ │ │                                                         │
│ │ ├────────────────────────────────┤                            │
│ │ │ Step 2: Generate Captions [● Running]               │
│ │ │ Input: 5 videos from Step 1                               │
│ │ │                                                         │
│ │ ├────────────────────────────────┤                            │
│ │ │ Step 3: Enhance [⏳ Pending]                        │
│ │ │ Input: Videos + Captions from Steps 1-2                │
│ │ │                                                         │
│ │ └────────────────────────────────┘                            │
│ │                                                             │
│ │ [Continue to Step 3] (Button)                              │
│ ╰─────────────────────────────────────────┘                       │
│                                                              │
│ ╭─ ORIGINAL INPUTS ╮                                          │
│ │ [Input images/files]                                           │
│ ╰──────────────────╯                                          │
│                                                              │
│ ╭─ OUTPUTS ╮                                                │
│ │ [Output files]                                               │
│ ╰────────────╯                                                │
└─────────────────────────────────────────────────────────────────────┘
```

**Key Design Points:**
1. Complex Workflow Context is only shown when `job.complexWorkflowId` exists
2. Each step is expandable to show detailed input/output info
3. Progress bar shows current step / total steps
4. "Continue" button only appears between completed steps
5. Final step shows "Execution Complete" instead of "Continue"
