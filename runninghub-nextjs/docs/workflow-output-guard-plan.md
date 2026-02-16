# Workflow Output Guard Plan

## Overview
Add a guard for remote workflow jobs so they are only marked completed when required outputs are present. If outputs are required but missing, re-query RunningHub for outputs. If the re-query still yields no outputs, mark the job as failed with a clear error. This prevents complex workflow steps from advancing with empty outputs.

## Problem Statement
Remote workflow jobs can be marked `completed` even when no outputs are saved to `job.json`. This happens when the CLI exits with code 0 but the stdout does not include output metadata (or outputs are not ready yet). Downstream complex workflow steps then receive no inputs and fail (e.g., duck-decode step).

## Goals
- Prevent `completed` status when required outputs are missing.
- Re-query RunningHub outputs if initial output processing yields none.
- Mark job as failed if re-query still has no outputs for workflows that require outputs.
- Keep local workflow behavior unchanged.

## Non-Goals
- UI changes.
- Changes to RunningHub CLI behavior.
- Long-polling or background retries beyond a single re-query.

## Requirements
1. Detect whether a workflow requires outputs (based on workflow output config).
2. If a remote workflow completes but outputs are empty, re-query RunningHub outputs using the taskId.
3. If outputs are still empty after re-query, mark job as failed with a specific error message.
4. Ensure complex workflow executions reflect the failure status.

## Approach
- Extend `processJobOutputs` to return a result describing whether outputs were saved.
- Add a helper to re-query RunningHub outputs via `https://{apiHost}/task/openapi/outputs` using `runninghubTaskId`.
- Update the completion path in `processWorkflowInBackground`:
  - If outputs required and none saved, attempt re-query.
  - If still none, update job status to failed and update complex execution status.
- Preserve existing behavior for workflows with output type `none` and for local workflows.

## Implementation Steps
1. Add a helper `fetchRunningHubOutputs` to call the RunningHub API and map to the same output format used by `processJobOutputs`.
2. Update `processJobOutputs` to return `{ saved: boolean, reason?: string }`.
3. In the non-local completion block, if output is required and `saved === false`, perform re-query and attempt to save outputs.
4. If re-query still yields no outputs, mark job failed (and update complex workflow execution status).
5. Add clear `writeLog` messages for each decision branch.

## Risks
- If RunningHub outputs are delayed, a single re-query may still be too early; this will fail jobs that might finish shortly after. This is a known trade-off for deterministic behavior and should be evaluated.

## Validation
- Run a remote workflow with outputs and confirm they are saved and job completes.
- Simulate a job with missing outputs and confirm re-query and failure behavior.
- Ensure complex workflow step is marked failed when outputs are missing.
