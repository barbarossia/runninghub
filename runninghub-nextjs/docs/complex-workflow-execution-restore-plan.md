# Complex Workflow Execution Restore Plan

## Overview
When opening a previous complex workflow execution, the UI should restore the last known
inputs and outputs for each step. Today, execution state does not persist file inputs,
text inputs, or text outputs, so the runner appears blank. We also need a toggle to
hide/show the left history panel for more workspace on smaller screens.

## Goals
- Restore file inputs and text inputs for prior executions when viewing history.
- Show outputs for completed steps, including text outputs (not just images/videos).
- Add a toggle to collapse/expand the left history panel in the Complex Workflow Runner.
- Preserve execution metadata (`id`, `createdAt`) on all execution state writes.
- Auto-apply complex workflow parameter mappings (static, dynamic, previous-input) when moving to the next step.

## Non-Goals
- No changes to workflow execution logic or job scheduling.
- No redesign of the runner layout beyond a simple show/hide toggle.
- No new background polling intervals beyond existing behavior.

## Current Behavior (Problem)
- Execution JSON overwrites omit `id`/`createdAt`.
- Execution steps store only `inputs` as text key/value; file inputs are lost.
- UI only renders visual outputs; text outputs are not shown.
- History panel is always visible and cannot be collapsed.

## Target Behavior
- Selecting a history item restores file inputs, text inputs, and outputs for the
  current step and any completed steps.
- Text outputs appear with a preview and a link to open the file.
- A toggle button collapses/expands the history panel while keeping the runner usable.
- Clicking Next applies the complex workflow mappings:
  - Previous-inputs use prior step inputs (e.g., 首帧/尾帧).
  - Static values populate width/height and other fixed params.
  - Dynamic values map from prior step outputs (e.g., 提示词).

## Technical Approach

### Data Persistence & Backfill
- Update `/api/workspace/complex-workflow/execute` to store full step inputs:
  `{ fileInputs, textInputs, deleteSourceFiles }`.
- Update `/api/workspace/complex-workflow/continue` to preserve `id`/`createdAt`
  and store full step inputs on each write.
- Update `/api/workspace/complex-workflow/execution/[executionId]` to backfill
  missing `inputs` and `outputs` from `job.json` when available, then write the
  corrected execution file.
- Add a small helper in `src/lib/complex-workflow-utils.ts` to enforce identity
  fields (`id`, `createdAt`) and normalize inputs/outputs before persisting.
- Expand output mapping to recognize `1-output` style keys and textOutputs content
  when dynamic mapping targets text results.

### UI Restore Logic
- Extend `WorkflowInputBuilder` with optional props for prefilled inputs:
  `initialFileInputs`, `initialTextInputs`, `initialDeleteSourceFiles`.
- In `ComplexWorkflowRunner`, when an execution is loaded or the step changes,
  populate store `jobFiles` from the step inputs and pass text defaults to the
  input builder.
- When a step has no saved inputs, build inputs from the complex workflow step
  parameter mappings (previous-input, dynamic, static).
- Render text outputs by reading `job.results.textOutputs` (or equivalent) and
  showing a small preview plus a link.

### History Panel Toggle
- Add a collapse/expand button near the History header.
- When collapsed, hide the left panel and let the runner content fill the width.
- Keep toggle state in local component state (no persistence required).

## Risks & Edge Cases
- Older executions may have partial data; backfill should be defensive and not
  throw if `job.json` is missing.
- Large text outputs should be truncated for preview to avoid heavy DOM rendering.
- Ensure input restoration does not overwrite user edits after they start changing
  inputs (only prefill on step/execution change).

## Testing Plan
- Execute a multi-step workflow, complete step 1, refresh page, and verify:
  - History selection shows step 1 inputs and text output.
  - "Next Step" uses restored inputs correctly.
- Verify step outputs show for image/video and text-only jobs.
- Toggle history panel open/closed on desktop and small widths.

## Files Likely Touched
- `runninghub-nextjs/src/app/api/workspace/complex-workflow/execute/route.ts`
- `runninghub-nextjs/src/app/api/workspace/complex-workflow/continue/route.ts`
- `runninghub-nextjs/src/app/api/workspace/complex-workflow/execution/[executionId]/route.ts`
- `runninghub-nextjs/src/lib/complex-workflow-utils.ts`
- `runninghub-nextjs/src/components/workspace/WorkflowInputBuilder.tsx`
- `runninghub-nextjs/src/components/workspace/ComplexWorkflowRunner.tsx`
- `runninghub-nextjs/src/app/workspace/complex-workflow/execute/[id]/page.tsx` (if needed)

## Implementation Summary
- Restored step input prefill in the runner, including mapping dynamic/static/previous-input values when saved inputs are missing.
- Expanded output mapping to include `parameterId`, `output_{index}`, `1-output`, and text output content for dynamic mappings.
- Ensured continuation uses per-step outputs for dynamic mapping and splits file vs text inputs before invoking execute.
- Adjusted media type inference for mapped files (treat `.gif` as image).
- Added execution list API for history panel and verified `npm run build` passes.
