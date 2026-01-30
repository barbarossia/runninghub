# Batch Process Plan

## Overview
Add a Batch Process action to the Media Gallery selection toolbar that runs a complex workflow in the background for each selected file. The batch action uses the currently selected complex workflow (last chosen in the complex workflow UI) and runs one execution per file in parallel without navigating to the execution page.

## Goals
- Add a Batch Process button on the Media Gallery toolbar.
- Execute the selected complex workflow once per file in parallel.
- Use step 1 user-input file parameters to assign each file.
- Pass static parameters from the complex workflow step.
- Keep current job history behavior (no special batching UI changes).

## Non-Goals
- Changing complex workflow execution logic on the backend.
- Adding batch progress dashboards or auto-refresh behavior.
- Supporting multi-file inputs within a single complex execution.

## Approach
- Track the currently selected complex workflow ID in workspace store.
- Set the selected complex workflow when users start complex workflows from UI.
- Add a `onBatchProcess` handler to MediaSelectionToolbar.
- Implement a batch runner in the Workspace page that:
  - Loads the complex workflow definition.
  - Determines step 1 file inputs from the workflow definition.
  - Builds initial parameters per file (static text + file assignment).
  - Calls `/api/workspace/complex-workflow/execute` in parallel.

## Testing
- Select multiple media files, click Batch Process, confirm multiple executions start.
- Verify step 1 inputs are assigned per file.
- Confirm job history shows all started executions.
