# Complex Workflow Feature - Implementation TODOs

## Phase 1: Type Definitions & Storage
[x] Add `ComplexWorkflow`, `WorkflowStep`, `StepParameterConfig` to `workspace.ts`
[x] Add `ComplexWorkflowExecution`, `ExecutionStep` to `workspace.ts`
[x] Add request/response types for complex workflow APIs
[x] Extend `Job` interface with complex workflow fields:
  [x] `complexWorkflowId?: string`
  [x] `complexExecutionId?: string`
  [x] `stepNumber?: number`
  [x] `totalSteps?: number`
  [x] `isComplexWorkflowStep?: boolean`
  [x] `stepStatus?: 'pending' | 'running' | 'completed' | 'failed'`
[x] Create `~/Downloads/workspace/complex-workflows/` directory (on init)
[x] Create `~/Downloads/workspace/complex-executions/` directory (on init)
[x] Implement `saveComplexWorkflow()` utility function
[x] Implement `loadComplexWorkflow()` utility function
[x] Implement `listComplexWorkflows()` utility function
[x] Implement `deleteComplexWorkflow()` utility function

## Phase 2: Backend API Routes
[x] `POST /api/workspace/complex-workflow/save` - Save complex workflow to file
[x] `GET /api/workspace/complex-workflow/list` - List all complex workflows
[x] `GET /api/workspace/complex-workflow/[workflowId]` - Get single complex workflow
[x] `DELETE /api/workspace/complex-workflow/[workflowId]` - Delete complex workflow
[x] `POST /api/workspace/complex-workflow/execute` - Start complex workflow execution
[x] `POST /api/workspace/complex-workflow/continue` - Continue to next step
[x] `GET /api/workspace/complex-workflow/execution/[executionId]` - Get execution status
[x] `POST /api/workspace/complex-workflow/execution/[executionId]/stop` - Stop execution

## Phase 3: Build UI Components
[x] Create `src/components/workspace/ComplexWorkflowList.tsx`
  [x] Card grid of saved complex workflows
  [x] Delete button per workflow
  [x] Execute button per workflow
  [x] Create new complex workflow button
[x] Create `src/components/workspace/ComplexWorkflowBuilder.tsx`
  [x] Workflow step list with add/remove controls
  [x] Reorder controls (drag handle or arrows)
  [x] Configure parameters button per step
  [x] Visual chain preview (simple step diagram)
[x] Create `src/components/workspace/ComplexWorkflowContext.tsx` (NEW - for JobDetail)
  [x] Display complex workflow name and description
  [x] Step progress bar (current / total)
  [x] Expandable accordion for each step
  [x] Per step: workflow name, status badge, input/output summary
  [x] View outputs button per step
[x] Create `src/components/workspace/ComplexWorkflowContinueDialog.tsx` (NEW)
  [x] Show next step's workflow name
  [x] List all parameters for next step
  [x] Static/dynamic toggle per parameter
  [x] Previous output mapping dropdown
  [x] Parameter value editor (input/text/number/checkbox)
  [x] Preview data flow visualization
  [x] "Continue" button to execute next step
  [x] "Cancel" button
[x] Create `src/components/workspace/WorkflowSelectorDialog.tsx`
  [x] Search/filter existing workflows
  [x] Preview workflow parameters before adding
  [x] Click to add to complex workflow

## Phase 4: JobDetail Integration (NEW - Updated)
[x] Add complex workflow state to `JobDetail.tsx`
  [x] `const [complexWorkflow, setComplexWorkflow] = useState<ComplexWorkflow | null>(null)`
  [x] `const [complexExecution, setComplexExecution] = useState<ComplexWorkflowExecution | null>(null)`
  [x] `const [showContinueDialog, setShowContinueDialog] = useState(false)`
[x] Add effect to load complex workflow when `job.complexWorkflowId` exists
  [x] Fetch complex workflow details from API
  [x] Fetch complex execution status from API
[x] Add `ComplexWorkflowContext` section to JobDetail JSX (conditional render)
  [x] After header, before input editor
  [x] Show only when `complexWorkflow` is loaded
[x] Add step status display with expandable accordions
  [x] Show workflow name, step number, status badge per step
  [x] Display input/output summary per step
  [x] Add "View outputs" button per completed step
[x] Add "Continue to next step" button in action buttons area
  [x] Show only when:
    [x] Job is complex workflow step
    [x] Status is 'completed' or 'paused'
    [x] Not the final step
  [x] On click: open `ComplexWorkflowContinueDialog`
[x] Implement `handleContinueComplexWorkflow` function in JobDetail
  [x] Map previous step outputs to next step inputs
  [x] Call `/api/workspace/complex-workflow/continue`
  [x] Handle execution response
  [x] Show success toast

## Phase 5: Complex Workflow Execution Logic
[x] Implement step execution wrapper function
  [x] Validate inputs before execution
  [x] Execute workflow step via existing `execute` API
  [x] Capture outputs from job result
  [x] Map outputs to next step's dynamic parameters
[x] Implement state transition logic
  [x] pending → running → completed/paused
  [x] paused → running (on continue)
  [x] failed → running (on retry)
[x] Handle step failure gracefully
  [x] Allow user to view error details
  [x] Provide retry option
  [x] Allow parameter edit before retry
[x] Implement `mapOutputsToInputs()` utility
  [x] Match dynamic mappings to previous step outputs
  [x] Validate parameter types match
  [x] Handle missing outputs gracefully

## Phase 6: Main Integration
[x] Add "Complex Workflows" tab to Workspace page (`src/app/workspace/page.tsx`)
[x] Switch between simple workflows and complex workflows tabs
[x] Integrate `ComplexWorkflowList` in complex workflows tab
[x] Integrate `ComplexWorkflowBuilder` for creating new complex workflow
[x] Add "Execute" action to `ComplexWorkflowList` that opens JobDetail with execution context

## Phase 7: Polish & Testing
[x] Add loading states for all async operations
[x] Add error boundaries for complex workflow components
[x] Add toast notifications for:
  [x] Complex workflow saved
  [x] Complex workflow execution started
  [x] Step N started
  [x] Step N completed
  [x] Step N failed
  [x] Execution continued to next step
  [x] Execution completed
[x] Test end-to-end: Create complex workflow → Execute all steps → Complete
[x] Test parameter mapping:
  [x] Static value input
  [x] Dynamic mapping from previous step
  [x] Mixed static and dynamic
[x] Test error scenarios:
  [x] Missing required parameters
  [x] Invalid parameter mapping
  [x] Workflow step fails
  [x] Workflow in chain deleted
[x] Test JobDetail integration:
  [x] Open job created from complex workflow → Show complex context
  [x] Continue to next step → See new job created
  [x] Step failure → See error and retry options
[x] Write unit tests for complex workflow utilities
[x] Update documentation for complex workflow feature

## Known Edge Cases to Handle
[x] First workflow step cannot use dynamic mapping (no previous output)
[x] Circular parameter mapping (prevent: Step 2 → Step 3 → Step 2)
[x] Type mismatch between output and input parameter
[x] Parameter not found in previous step's outputs
[x] User deletes a workflow that's used in a complex workflow
[x] User modifies workflow input parameters (breaks complex workflow)
[x] Execution timeout on individual steps
[x] Concurrent executions of same complex workflow
[x] JobDetail shows complex workflow context for normal jobs (should not happen)
[x] Continue button shows when complex workflow already completed
