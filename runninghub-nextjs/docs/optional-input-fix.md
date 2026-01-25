# Optional Input Fix & Ghost Input Filtering

## Problem
1. **Initial Issue**: Jobs were failing when "assigned" input files were missing, even if those files were not required by the workflow.
2. **Secondary Issue**: Jobs were saving and attempting to process "ghost inputs" (files assigned in the UI from previous sessions but not relevant to the current workflow), causing job failures or incorrect data being passed to the CLI.

## Solution
Modified `runninghub-nextjs/src/app/api/workspace/execute/route.ts` to implement **Strict Workflow Validation**:

1. **Load Workflow**: Attempt to load the workflow definition using `getWorkflowById`.
2. **Filter Ghost Inputs**:
   - If the workflow loads successfully, iterate through `fileInputs`.
   - Check if each input's `parameterId` exists in `workflow.inputs`.
   - If a parameter is **NOT** found in the workflow, it is flagged as a "ghost input".
   - Ghost inputs are logged as warnings and **excluded** from the job execution, regardless of whether the file exists or not.
3. **Validate Required Files**:
   - For valid parameters (found in workflow), check file existence.
   - If a file is missing AND `required: true`, the job fails with an error (safety check).
   - If a file is missing AND `required: false` (optional), it is skipped with a warning.
4. **Fallback Mode**:
   - If the workflow definition fails to load, the system falls back to the original safe behavior: if a file is missing, it is assumed to be required, causing the job to fail.

## Impact
- **Ghost Inputs Ignored**: Users can switch workflows without manually clearing irrelevant inputs; the system automatically filters them out.
- **Optional Files Supported**: Missing optional files no longer crash the job.
- **Safety Preserved**: Missing required files still stop execution.