# Complex Workflow Local Steps Fix Plan

## Overview
Allow complex workflows to execute steps that reference local workflows. The current complex workflow execute/continue endpoints assume every step is a cloud workflow stored under `Downloads/workspace/workflows`. This plan adds local workflow detection and proper loading so mixed local + cloud steps can run.

## Goals
- Support local workflow steps in complex workflow execution and continuation.
- Load local workflow definitions from `Downloads/workspace/local-workflows` when needed.
- Keep existing cloud workflow behavior unchanged.

## Non-Goals
- Redesign complex workflow UI or step builder.
- Change local workflow execution behavior outside complex workflows.

## Approach
- Add a helper in the complex workflow API routes to load workflow definitions by ID.
- Detect `local_` workflow IDs and load the local JSON file, mapping to a `Workflow` shape for input metadata.
- Skip `sourceWorkflowId` resolution for local steps.
- Ensure mixed local → cloud and cloud → local transitions work.

## Testing
- Execute a complex workflow with a local step first, followed by a cloud step.
- Execute a complex workflow with a cloud step first, followed by a local step.
- Verify dynamic mapping (`1-output`) passes outputs into the next step.
