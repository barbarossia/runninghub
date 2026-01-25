# Complex Workflow Continue Step Guard Fix Plan

## Overview
Complex workflow continuation currently fails when the runner sends the next step number to the continue API. The API expects the last completed step number to validate completion before starting the next step.

## Goals
- Allow the ComplexWorkflowRunner to continue from Step 1 to Step 2 without a "not completed" error.
- Align continue requests with API guard expectations across relevant pages.

## Current Behavior
- Runner sends `stepNumber = currentStepIndex + 1` when continuing.
- API validates `stepNumber` is completed and rejects Step 2 because it is still pending.

## Target Behavior
- Continue requests send the last completed step number (current execution step) so API validation passes and the next step starts.

## Approach
- Update continue requests in `ComplexWorkflowRunner` (and execute page if applicable) to use the last completed step number.
- Keep API guard logic unchanged.

## Files Likely Touched
- `runninghub-nextjs/src/components/workspace/ComplexWorkflowRunner.tsx`
- `runninghub-nextjs/src/app/workspace/complex-workflow/execute/[id]/page.tsx`

## Testing
- Run complex workflow in runner: complete Step 1, click Run Step 2, expect job to start.
- Run `npm run build`.
