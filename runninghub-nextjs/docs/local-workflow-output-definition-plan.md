# Local Workflow Output Definition Plan

## Objective
Enable users to define the output type (e.g., Video, Image, Text) for local workflows in the Create/Edit dialog, similar to cloud workflows. This enhances the metadata for local workflows and aligns them with the cloud workflow structure.

## Changes

1.  **Type Definitions** (`src/types/workspace.ts`):
    *   Update `WorkflowOutput` type to include `"video"`.
    *   Update `LocalWorkflow` type to include `output?: WorkflowOutput`.

2.  **UI Implementation** (`src/components/workspace/LocalWorkflowDialog.tsx`):
    *   Add a new section in the dialog to configure "Output".
    *   Provide a dropdown to select Output Type: `None`, `Image`, `Video`, `Text`, `Mixed`.
    *   (Optional) Add a description field for the output.
    *   Update `createEmptyWorkflow` to initialize with a default output (e.g., `type: 'none'` or based on operation).

3.  **Backend Mapping** (`src/app/api/workspace/execute/route.ts`):
    *   Update `getWorkflowById` to map the `localWorkflow.output` to the constructed `Workflow` object.

## Verification
-   Open Local Workflow Dialog.
-   Create/Edit a workflow.
-   Select "Video" as output type.
-   Save.
-   Verify `local-workflows/{id}.json` contains the `output` field.
-   Run the workflow and verify the execution context receives the correct output configuration (though execution logic mostly relies on auto-detection, this metadata is useful for future UI enhancements like "expected output").
