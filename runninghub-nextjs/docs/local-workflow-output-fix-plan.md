# Local Workflow Output Fix Plan

## Objective
Ensure local workflow executions (like `convert-video`) correctly persist and register output files, even if the input file is deleted or overwritten. This addresses the user requirement: "the local workflow still need output, for example, the video conversation should input a video, output a video of converted even the origin video is delete".

## Problem
Currently, `convert-video` and other local workflows run via CLI in the job directory.
1. They output files to the job directory root (e.g. `~/Downloads/workspace/{jobId}/`).
2. The `processJobOutputs` function expects CLI to output a JSON string with remote file URLs to download.
3. Local workflows (CLI) do not output this JSON.
4. Consequently, outputs are not detected, moved to `result/`, or registered in `job.json`.
5. If the input file is deleted (either by `deleteSourceFiles` or by the user/CLI), the job might appear to have no results.

## Solution
Implement a dedicated output processing strategy for local workflows (`processLocalJobOutputs`):
1.  **Capture Input State**: Before execution, record modification times (mtime) of all input files in the job directory.
2.  **Execute CLI**: Run the local command in the job directory.
3.  **Scan for Outputs**: After execution, scan the job directory.
    *   Identify "Output Files" as:
        *   Any file that is NOT in the input list.
        *   Any input file that has been modified (mtime > captured mtime).
4.  **Persist Outputs**:
    *   Move identified output files to `{jobId}/result/` directory (standard location for job outputs).
    *   Register them in `job.json` `results` section.

## Implementation Details
-   **File**: `src/app/api/workspace/execute/route.ts`
-   **Function**: `processLocalJobOutputs(taskId, jobId, inputs, inputMtimes)`
-   **Logic**:
    *   Creates `result/` directory.
    *   Iterates through job directory files.
    *   Skips `job.json` and `result/`.
    *   Moves outputs to `result/`.
    *   Updates `job.json`.

## Verification
-   Run `convert-video` local workflow.
-   Check `job.json` has populated `results`.
-   Check file exists in `{jobId}/result/`.
-   Verify UI displays the output.
