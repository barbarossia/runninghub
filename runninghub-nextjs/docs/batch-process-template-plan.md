# Batch Process Template Plan

## Overview
Add a new "Batch Process Template" feature that chains local operations (convert/clip/crop/resize/duck decode/caption) with workflow execution. The template supports configurable step order, static values, and input/output mappings similar to Complex Workflow. Users trigger it from the Workspace Media Gallery toolbar, and it runs in single mode when one file is selected or batch mode when multiple files are selected. Outputs are taken from the last step in the chain.

## Goals
- Provide a reusable template that combines local operations + workflow steps.
- Allow configurable order of steps (local-first or workflow-first, multi-step).
- Support single-file and batch-file execution based on selection count.
- Expose a toolbar entry on Workspace Media Gallery for quick access.
- Persist templates so users can reuse them across sessions.

## Requirements
1. Template definition supports steps of two types:
   - `local`: operations (convert, clip, crop, resize, duck decode, caption)
   - `workflow`: RunningHub workflow execution
2. Steps can be reordered; template defines input mapping, output mapping, and static values.
3. Execution mode:
   - 1 selected file = single execution
   - N selected files = batch execution (same template applied per file)
4. Add a new button to the Workspace Media Gallery toolbar.
5. Final outputs are determined by the last step output.
6. Stop execution on first failure (no per-file continuation).
7. Log progress to ConsoleViewer using `writeLog` with a taskId.

## Non-Goals
- Editing existing Complex Workflow templates.
- Adding auto-refresh intervals; refresh only on add/remove completion.
- Changing global workflow execution behavior.

## UX Flow
1. User selects media in Workspace Media Gallery.
2. User clicks new toolbar button: "Batch Process".
3. Dialog opens:
   - Select existing Batch Process Template or create new.
   - Configure template steps, mappings, and static values.
   - Show summary of single vs batch mode.
4. User confirms run.
5. UI logs progress in ConsoleViewer; results appear in gallery after completion.

## Data Model
Create a new template type (separate from Complex Workflow):
- File location: `~/Downloads/workspace/batch-process-templates/{id}.json`
- Example shape:

```ts
export type BatchProcessTemplate = {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  steps: BatchProcessStep[];
};

export type BatchProcessStep = {
  id: string;
  type: 'local' | 'workflow';
  name: string;
  order: number;
  localOperation?: LocalOperationConfig;
  workflowConfig?: WorkflowStepConfig;
  inputMapping: StepInputMapping[];
  outputMapping: StepOutputMapping[];
  staticValues?: Record<string, string | number | boolean>;
};
```

- `LocalOperationConfig` supports: convert, clip, crop, resize, duck decode, caption.
- `WorkflowStepConfig` reuses existing workflow definitions in workspace store.
- Input/output mapping supports:
  - `source: 'selected' | 'previous-output' | 'static'`
  - `targetField` for local operation or workflow input

## Architecture / API
### New API Routes
- `POST /api/workspace/batch-process-template/save`
- `GET /api/workspace/batch-process-template/list`
- `GET /api/workspace/batch-process-template/[templateId]`
- `DELETE /api/workspace/batch-process-template/[templateId]`
- `POST /api/workspace/batch-process-template/execute`

### Execution Orchestration
- For each selected file:
  1. Build step inputs from mapping + static values.
  2. Execute step in order (local op or workflow).
  3. Capture outputs; pass to next step via output mapping.
- Stop the run on the first error; emit failure log and return error response.
- Final outputs come from last step; save results where the existing operation does.
- Use `writeLog(message, level, taskId)` for progress and errors.

### Local Operations Integration
- Convert: reuse video convert API or existing helpers.
- Clip/Crop: reuse video clip/crop API routes.
- Resize: reuse image resize API or existing helpers.
- Duck decode: reuse `/api/workspace/duck-decode`.
- Caption: reuse caption API and save captions alongside media.

## UI Changes
- Add "Batch Process" button to `MediaSelectionToolbar` (Workspace only).
- New dialog component (similar to `QuickRunWorkflowDialog`) for:
  - Template selection
  - Template creation/editing (step list, mappings, static values)
  - Confirmation and execution
- Store templates in a new Zustand store or extend workspace store with `batchProcessTemplates`.

## Phases
1. Data model + API routes for template CRUD.
2. Execution API route to orchestrate steps and logging.
3. UI: toolbar button + dialog + template builder.
4. Integrate selection count and run mode display.
5. Refresh media gallery after execution completes.

## Risks
- Mapping complexity across local operations and workflow inputs.
- Large batch sizes impacting execution time; log progress per file.
- Different output shapes for local operations (file vs text).

## Testing
- Single file run with local->workflow.
- Batch run (3+ files) with workflow->local.
- Static value mapping applied correctly.
- Failure mid-batch halts immediately; verify logs and UI messaging.
