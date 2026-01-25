# Complex Workflow Last Step Button Plan

## Overview
The last step in a complex workflow should not show or enable a Next Step action.

## Goals
- Hide the Next Step button on the final step.
- Keep the button visible and enabled only when a next step exists and current step is completed.

## Current Behavior
- The Next Step button is disabled on the final step but still visible.

## Target Behavior
- The Next Step button is not rendered on the final step.

## Approach
- Compute a `hasNextStep` flag and only render the Next Step button when true.

## Files Likely Touched
- `runninghub-nextjs/src/components/workspace/ComplexWorkflowRunner.tsx`

## Testing
- Navigate to the final step and confirm no Next Step button is shown.
- Run `npm run build`.
