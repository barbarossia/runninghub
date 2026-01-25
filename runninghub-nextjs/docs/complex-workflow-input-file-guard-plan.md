# Complex Workflow Input File Guard Plan

## Overview
Prevent workflow execution from being marked completed when required input files are missing. Validate file existence before launching the background job.

## Goals
- Fail fast when input files do not exist on disk.
- Mark the job and task as failed with a clear error.
- Avoid starting background processing when inputs are missing.

## Current Behavior
- The execute API creates a job and starts processing even if input files are missing.
- The CLI returns exit code 0 on missing files, so jobs can be marked completed incorrectly.

## Target Behavior
- Execute API checks all `fileInputs` paths and aborts if any are missing.
- Job status is set to `failed` with a descriptive error.

## Approach
- Add a file existence check in `POST /api/workspace/execute` before calling `processWorkflowInBackground`.
- If missing files are found, update task/job status and return a 400 error.

## Files Likely Touched
- `runninghub-nextjs/src/app/api/workspace/execute/route.ts`

## Testing
- Submit a job with missing input files and verify the API returns an error and job status is failed.
- Run `npm run build`.
