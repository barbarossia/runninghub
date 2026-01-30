# Complex Workflow Delete Original Mapping Plan

## Overview
Fix complex workflow execution so that local `video-convert` steps treat the step parameter `deleteOriginal` as a request to delete the original source file, by mapping it to `deleteSourceFiles` when starting step 1 (and when auto-continuing local video-convert steps).

## Goals
- When a complex workflow step uses local `video-convert` and `deleteOriginal` is true, the original source file is deleted (via `deleteSourceFiles`).
- Preserve existing behavior for other operations and when `deleteOriginal` is false.

## Non-Goals
- Changing CLI behavior of `convert-video`.
- Changing delete behavior for non-local or non-video-convert steps.

## Current State
- Complex workflow step config stores `deleteOriginal` in text inputs.
- Complex execution passes `deleteSourceFiles` separately; default is false unless explicitly set.
- Local video conversion uses `deleteOriginal` for overwrite behavior on the job copy, not for deleting the original source file.

## Target State
- For complex workflow execution, if the step is local `video-convert` and `deleteOriginal` is true, `deleteSourceFiles` is set to true for that step execution.

## Implementation Approach
1. Detect local `video-convert` steps during complex workflow execution.
2. Derive a boolean `shouldDeleteSourceFiles` from the step text inputs (the `deleteOriginal` parameter).
3. Pass `deleteSourceFiles: shouldDeleteSourceFiles` into the `/api/workspace/execute` call for step 1.
4. For auto-continue, include the same mapping if a continued step is local `video-convert`.
5. Add logging to clarify behavior (optional, keep minimal).

## Risks / Edge Cases
- Avoid affecting non-local workflows or other local operations.
- Ensure the mapping uses the step input value (string "true"/"false").

## Validation
- Run a complex workflow with local `video-convert` step and `deleteOriginal=true`; confirm original source file is deleted.
- Run with `deleteOriginal=false`; confirm original source file remains.

