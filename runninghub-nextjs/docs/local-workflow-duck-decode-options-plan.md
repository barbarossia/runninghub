# Local Workflow Duck Decode Options Plan

## Overview
Enhance the local `duck-decode` operation with options to:
1) Save decoded output to the **current workspace folder**, and
2) Rename the decoded output using the **original name** found in the complex workflow `execution.json`.

## Goals
- Provide two new config options for local `duck-decode` workflows.
- Keep behavior limited to local workflows (no cloud changes).
- Ensure decoded output is moved into the current workspace folder when enabled.
- Optionally rename decoded output based on original name from complex workflow context.

## Non-Goals
- No changes to non-local workflows.
- No changes to unrelated media operations.

## UX / Behavior
- Local Workflow builder adds two toggles under `duck-decode`:
  - **Save decoded output to current workspace** (boolean)
  - **Rename decoded output to original name** (boolean)
- When enabled, decoded output is moved into the selected workspace folder.
- If rename is enabled and an original name exists in `execution.json`, the output file is renamed accordingly.

## Technical Approach
1. **Local Operation Config**
   - Add `saveToWorkspace` and `renameToOriginal` to `duck-decode` config.
2. **UI**
   - Expose the two toggles in Local Workflow config for `duck-decode`.
3. **Execution Context**
   - During local execution, detect if this job belongs to a complex workflow (`seriesId` + `execution.json`).
   - Read `execution.json` for the original filename from `steps[0].inputs.fileInputs[0].filePath`.
4. **Output Handling**
   - After local decode completes, if `saveToWorkspace` is enabled, move the decoded output from job result folder to the active workspace folder.
   - If `renameToOriginal` is enabled, rename the decoded output to match the original name derived from `execution.json`.
   - If target file exists, skip or warn (no overwrite).
5. **Complex Continue Fallback**
   - If the next step is local `duck-decode` and no inputs were mapped, use the previous step’s first output as the input file.

## Open Questions
- Behavior when original name is missing or rename fails.

## Files to Inspect
- `runninghub-nextjs/src/constants/local-ops.ts`
- `runninghub-nextjs/src/app/api/workspace/execute/route.ts`
- `runninghub-nextjs/src/app/workspace/page.tsx` (for active workspace folder context if needed)
- `~/Downloads/workspace/complex-executions/{seriesId}/execution.json`

## Validation
- Run a complex workflow with `duck-decode` local step.
- Enable **save to workspace** and confirm decoded file appears in the current workspace folder.
- Enable **rename to original** and confirm name matches the original source name from `execution.json`.
