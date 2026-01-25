# Complex Workflow Step Output Alias Plan

## Overview
Users expect `x-output` to represent Step X's output, not the Xth output of a step. Align dynamic mapping to treat `${sourceStepNumber}-output` as the step output alias.

## Goals
- Resolve Step 3 mapping when `sourceOutputName` is `2-output` and Step 2 has a single output.
- Preserve existing index-based keys while adding a step-based alias.

## Current Behavior
- `buildOutputMap` creates `1-output`, `2-output` based on output index.
- Mapping uses `sourceParameterId` / `sourceOutputName` directly.
- If `2-output` is used for Step 2 and Step 2 only has one output, mapping fails.

## Target Behavior
- If `sourceOutputName` equals `${sourceStepNumber}-output` and no direct match exists, fall back to the first output of that step.

## Approach
- Add a fallback in `mapOutputsToInputs` to resolve step-based aliases.
- Mirror the fallback in ComplexWorkflowRunner input prefill logic.

## Files Likely Touched
- `runninghub-nextjs/src/lib/complex-workflow-utils.ts`
- `runninghub-nextjs/src/components/workspace/ComplexWorkflowRunner.tsx`

## Testing
- Configure Step 3 dynamic mapping with `2-output`.
- Verify Step 3 input is populated from Step 2 output.
- Run `npm run build`.
