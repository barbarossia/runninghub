## Overview
Enable inline editing for Complex Workflows in the Workflows tab, matching the Simple Workflow edit flow. Users can edit all fields (name, description, steps, parameter mappings), and changes overwrite the existing workflow. Editing is allowed regardless of prior executions.

## Current State
- Complex workflows can be created via `ComplexWorkflowBuilder` and listed in `ComplexWorkflowList`.
- Complex workflows can be executed or deleted; no edit action is available.
- Saving complex workflows only creates new IDs via `/api/workspace/complex-workflow/save`.
- Storage is file-based in `~/Downloads/workspace/complex-workflows/{id}.json`.

## Target State
- Complex workflows list includes an Edit action.
- Edit opens the same inline builder used for creation, pre-filled with workflow data.
- Saving in edit mode updates the existing workflow (same ID) and `updatedAt`.
- Editing does not block even if executions exist.

## Requirements
1. Add Edit action for complex workflows in the Workflows tab list.
2. Reuse `ComplexWorkflowBuilder` for edit mode with pre-filled fields.
3. Allow editing all fields: name, description, steps, and parameter mappings.
4. Persist edits by overwriting the existing workflow JSON (same ID).
5. Update `updatedAt` on save; preserve `createdAt`.
6. Keep UI/UX consistent with Simple Workflow edit flow.

## Technical Approach
- UI:
  - Extend `ComplexWorkflowList` to expose an Edit button and notify parent.
  - Update `workspace/page.tsx` to track editing state for complex workflows and show `ComplexWorkflowBuilder` pre-filled.
  - Update `ComplexWorkflowBuilder` to accept an optional `workflow` prop and an `onSave` callback that can carry updated workflow info.
- API:
  - Add update support in `/api/workspace/complex-workflow/[workflowId]` (e.g., `PUT`) to overwrite a workflow file.
  - Add `updateComplexWorkflow` helper in `src/lib/complex-workflow-utils.ts` to write updated data with the same ID.
- Data:
  - Builder should load initial state from the workflow prop on mount and when it changes.
  - Ensure parameter mappings are preserved for each step.

## UI/UX Notes
- Edit button should appear alongside Execute/Delete in the complex workflow list.
- Builder header should reflect edit mode (e.g., "Edit Complex Workflow").
- Cancel in edit mode should return to list view without saving.

## Implementation Phases
1. Planning + TODOs.
2. UI/state changes for edit mode and list action.
3. API + storage update for overwrite.
4. Wire builder save to update flow.
5. Smoke test and doc updates.
