# Complex Workflow Input Persistence Fix

## Problem
In complex workflows, Step 2 (and subsequent steps) often reuse input files from Step 1 ("previous-input" mapping).
However, the `execute` API was aggressively deleting files from the `uploads/` directory after they were copied to the job folder to keep the workspace clean.
Since Step 1's inputs in the `execution.json` still pointed to the original `uploads/` paths, when Step 2 attempted to reuse them, it failed with "Missing input file(s)" because Step 1 had already deleted them.

## Solution
Modified the execution pipeline to preserve `uploads/` files when a job is part of a complex workflow execution.

1.  **Updated `execute` API**:
    -   Modified `runninghub-nextjs/src/app/api/workspace/execute/route.ts` to accept `seriesId`.
    -   Updated `processWorkflowInBackground` to check if `seriesId` starts with `exec_` (indicating a complex workflow).
    -   If it is a complex execution, the automatic cleanup of `uploads/` files is **skipped**.

2.  **Updated Complex Workflow Runner**:
    -   Modified `runninghub-nextjs/src/app/api/workspace/complex-workflow/execute/route.ts` (start) to pass `seriesId: executionId`.
    -   Modified `runninghub-nextjs/src/app/api/workspace/complex-workflow/continue/route.ts` (next step) to pass `seriesId: body.executionId`.

## Impact
-   **Complex Workflows**: Files uploaded for the first step are preserved in `uploads/` throughout the execution, allowing subsequent steps to reuse them via "previous-input" mapping without error.
-   **Regular Jobs**: Standard single-job executions still clean up `uploads/` automatically to prevent disk clutter.
