## Overview
Route the Run Complex Workflow action to the complex workflow execution page and auto-fill step 1 inputs with the selected media files.

## Current State
- Run Complex Workflow opens a dialog and navigates to `/workspace/run-complex-workflow`.
- Step 1 inputs are not auto-filled from the media selection on the execution page.

## Target State
- Run Complex Workflow navigates to `/workspace/complex-workflow/execute/:id`.
- Step 1 inputs auto-assign selected media files (like simple workflow).
- Remove the unused `/workspace/run-complex-workflow` page.

## Requirements
- Preserve the existing confirm dialog.
- Only auto-assign on step 1 and only when no assignments exist.
- Keep run-complex-workflow tab intact.

## Implementation Phases
1. Update ComplexWorkflowRunDialog navigation.
2. Auto-assign selected files to step 1 inputs on the execute page.
3. Remove the old run-complex-workflow page.
4. Manual verify with selected media.
