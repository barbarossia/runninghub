# Complex Workflow Decoded Output Mapping Plan

## Overview
Step 3 requires the decoded output from Step 2 (dynamic mapping). The continue API should prefer fresh job.json outputs so decoded files are used instead of stale step outputs.

## Goals
- Use decoded output files for dynamic mappings when available.
- Ensure Step 3 input mapping for `param_22_video` uses Step 2 decoded output.

## Current Behavior
- Continue API uses cached step outputs in execution.json when present.
- Duck decode updates job.json outputs, but cached step outputs remain encoded.

## Target Behavior
- Continue API prefers job.json outputs for mapping when a jobId exists.
- Mapping uses decoded paths if job.json was updated by duck decode.

## Approach
- In `/api/workspace/complex-workflow/continue`, attempt to read job.json first.
- Fall back to execution step outputs only if job.json is missing or unreadable.

## Files Likely Touched
- `runninghub-nextjs/src/app/api/workspace/complex-workflow/continue/route.ts`

## Testing
- Decode Step 2 output.
- Continue to Step 3 and verify input uses decoded video.
- Run `npm run build` if frontend build is required by workflow.
