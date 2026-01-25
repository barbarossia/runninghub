# Complex Workflow Mapping Job Results Plan

## Overview
Step mapping in the runner should use the latest job.json outputs so decoded files (video) are used instead of stale encoded outputs stored on the execution step.

## Goals
- Ensure Step 3 input mapping uses decoded output from Step 2 after duck decode.
- Avoid relying on stale `execution.steps[].outputs` when a job.json is available.

## Current Behavior
- Runner mapping uses `execution.steps[].outputs` or cached outputs.
- Job results are loaded into the store but not used for mapping.
- Decoded outputs update job.json but mapping still sees old image outputs.

## Target Behavior
- Mapping prefers `getJobById(step.jobId)?.results` when available.
- Fallback to cached outputs or execution outputs if job results are missing.

## Approach
- Update `getStepOutputMap` in ComplexWorkflowRunner to use job results first.
- Keep existing decode override logic as a fallback.

## Files Likely Touched
- `runninghub-nextjs/src/components/workspace/ComplexWorkflowRunner.tsx`

## Testing
- Decode Step 2 output and proceed to Step 3.
- Confirm Step 3 input uses decoded video.
- Run `npm run build`.
