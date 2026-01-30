# Complex Workflow Restore Previous Input

## Problem
When a complex workflow step (e.g., Step 2) is configured to use inputs from a previous step (e.g., Step 1 inputs) via `previous-input` mapping, the execution often failed if the original source file (in `uploads/`) had been deleted or moved.
Previously, the runner only handled `dynamic` mapping (outputs -> inputs) and ignored `previous-input` mapping entirely in `continue/route.ts`.

Even with recovery logic, the frontend was sending the *old, broken* path in the request body, which overrode the server's calculated recovery path. Additionally, `os.homedir()` assumptions could fail if the workspace was located in a custom directory.

## Solution
1.  **Implemented `mapPreviousInputsToInputs`**:
    -   Created a new utility function in `runninghub-nextjs/src/lib/complex-workflow-utils.ts`.
    -   It iterates through step parameters looking for `valueType: "previous-input"`.
    -   It retrieves the input value/file from the source step's recorded execution state (`execution.steps`).

2.  **Added Fallback File Recovery**:
    -   **Strategy 1 (Standard):** Constructs a fallback path using `os.homedir()`: `~/Downloads/workspace/{sourceStep.jobId}/{fileName}`.
    -   **Strategy 2 (Path Deduction):** If the file path contains `/uploads/`, it attempts to deduce the workspace root from the path itself, handling custom workspace locations (e.g., replacing `/uploads/` with `/{jobId}/`).
    -   If the file exists at either fallback path, it updates the input to point to the valid copy.

3.  **Updated Runner Logic (`continue/route.ts`)**:
    -   Added logic to **validate user inputs**:
        -   Iterates through files sent by the frontend.
        -   Checks if they exist on disk.
        -   If a user file is missing, it checks if a valid recovery path exists in `previousInputs`.
        -   **Override**: If a recovered file is found, it replaces the broken user input.
    -   Merged the results with user inputs and dynamic mappings.

## Impact
-   **Robustness**: Complex workflows can now successfully continue even if original upload files are deleted, as long as the file exists in the previous step's job folder (which is guaranteed by the execution flow).
-   **Self-Healing**: If the frontend has stale data (old paths), the server detects the missing file and automatically swaps it with the correct backup path.
-   **Flexibility**: The system now supports custom workspace locations by deducing the path structure from the original input paths.