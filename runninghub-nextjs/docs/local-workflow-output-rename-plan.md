# Local Workflow Output Rename Plan

## Overview
Add a local-workflow feature that lets users provide a **string input** which becomes the output file name (including extension). The output should inherit the **previous step’s input extension** when applicable. Provide a dedicated **Rename Output** local operation for this behavior.

## Goals
- Allow users to specify an output filename via a string input.
- Use the previous step’s input file extension when building the final output name.
- Keep the feature scoped to local workflows and their existing builder UI.

## Non-Goals
- No changes to cloud workflows.
- No auto-refresh or background polling changes.

## UX / Behavior
- Local Workflow builder adds a new field: **Output File Name** (string).
- Example: input `1.mp4` → output file named `1.mp4`.
- Extension rule: default to the **previous step’s input extension** if the user’s string does not include one.

## Technical Approach
1. **Local Operation**
   - Add a `rename-output` operation with a single `Output File Name` input.
2. **Local Operation Config**
   - Store `outputFileName` inside the local operation `config` object.
3. **UI (Local Workflow Builder/Dialog)**
   - Add a text input for `Output File Name` in the local workflow config section.
   - Provide helper text explaining extension behavior.
4. **Execution Mapping (Local Workflow → Workflow)**
   - When executing a local workflow, pass `outputFileName` through to the local execution config.
5. **Output Name Resolution**
   - On the server-side local workflow execution path, derive the final output name:
     - If input includes an extension, use it as-is.
     - Else, append the previous input file’s extension.

## Open Questions
- If the step produces **multiple outputs**, should they all use the same name with suffixes?

## Confirmed Assumptions
- Workflows use a single input file (no multi-input file selection).

## Files to Inspect
- `runninghub-nextjs/src/components/workspace/LocalWorkflowDialog.tsx`
- `runninghub-nextjs/src/types/workspace.ts`
- `runninghub-nextjs/src/app/api/workspace/execute/route.ts`
- Any local workflow execution helper (local workflow mapper / runner)

## Validation
- Create a local workflow with `Output File Name = 1.mp4`.
- Run the workflow on a file named `videoA.mov`.
- Confirm output is `1.mp4` (or `1.mov` if extension auto-appended when input lacks extension).
- Confirm no folder switching or stale folder content issues.
