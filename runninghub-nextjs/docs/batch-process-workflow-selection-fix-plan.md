# Batch Process Workflow Selection Fix Plan

## Overview
Allow users to select an existing complex workflow for batch processing directly from the batch confirmation dialog in the media selection toolbar.

## Goals
- Expose a complex workflow selector in the batch process confirmation dialog.
- Persist selection via `selectedComplexWorkflowId` in the workspace store.
- Keep current batch process behavior unchanged once a workflow is selected.

## Non-Goals
- Changing batch execution semantics or workflow execution logic.
- Modifying complex workflow storage paths or list API.

## Current State
- Batch process requires `selectedComplexWorkflowId` set from the Run Complex Workflow tab.
- Media selection toolbar shows "Not selected" with no way to choose a workflow.

## Target State
- Batch confirm dialog lists complex workflows and lets the user select one.
- Selection updates `selectedComplexWorkflowId` so batch execution can proceed.

## Implementation Approach
1. Fetch complex workflow list when the batch confirm dialog opens.
2. Add a `Select` control for workflow choice in the dialog.
3. Update workspace store with the chosen workflow ID.
4. Use a local name fallback if `batchWorkflowName` hasn’t been refreshed yet.

## Validation
- Open batch process dialog and verify workflows appear in the selector.
- Choose `complex_1769696706074_9dd6bb99` and confirm it displays.
- Run batch process and ensure it proceeds without the "Not selected" error.

