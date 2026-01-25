# Plan: Complex Workflow Runner Text Output Enhancement

## Goal
Enable full text output display with translation and editing capabilities in `ComplexWorkflowRunner`, matching the behavior of `JobDetail`. This includes split-pane view, language swapping, real-time translation on edit, and saving changes.

## Analysis
Current `ComplexWorkflowRunner` has a read-only text output display. `JobDetail` has a fully interactive one.
We need to port the interactive features from `JobDetail` to `ComplexWorkflowRunner`.

### Missing Features in ComplexWorkflowRunner
1.  **State Management**: `editedText`, `translating`, `debouncedTimers`, `isSaving`.
2.  **Actions**: `handleTextEdit` (with translation logic), `handleSaveText`.
3.  **UI Elements**:
    *   Editable `Textarea` (currently `readOnly`).
    *   Save button in pane headers.
    *   Loading indicators for translation.

## Implementation Steps

1.  **State Setup**:
    *   Add `editedText`, `translating`, `debouncedTimers`, `isSaving` states to `ComplexWorkflowRunner`.
    *   Initialize `editedText` when `currentStepOutput` changes.

2.  **Logic Porting**:
    *   Copy `handleTextEdit` logic (including the debounce and API calls to `/api/translate`).
    *   Copy `handleSaveText` logic (calling `API_ENDPOINTS.WORKSPACE_UPDATE_CONTENT`).
    *   Ensure `updateJob` or local state update happens so the UI reflects the save.

3.  **UI Updates**:
    *   Update the "Translation Result" section in `ComplexWorkflowRunner`.
    *   Add "Save" button next to "Copy" button in both panes.
    *   Remove `readOnly` from `Textarea`.
    *   Bind `onChange` to `handleTextEdit`.
    *   Show translation spinners.

4.  **Verification**:
    *   Check if text outputs are displayed.
    *   Check if editing works.
    *   Check if translation triggers on edit.
    *   Check if saving works.

## Files to Modify
*   `runninghub-nextjs/src/components/workspace/ComplexWorkflowRunner.tsx`

## Risks
*   `ComplexWorkflowRunner` is a large component. Adding more state might make it messier.
*   Ensure `currentStepOutput` is correctly updated after save.
