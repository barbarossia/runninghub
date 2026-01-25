# Complex Workflow Output Decode Controls Plan

## Overview
Complex workflow runner outputs can include encoded images. The runner should expose decode and save-to-workspace controls consistent with JobDetail.

## Goals
- Provide a decode button for image outputs in the ComplexWorkflowRunner output section.
- Provide a save-to-workspace button for output files (original and decoded).
- Reuse existing decode and save logic from JobDetail without changing APIs.

## Current Behavior
- ComplexWorkflowRunner shows output previews only.
- No decode button for encoded images.
- No save-to-workspace action for outputs.

## Target Behavior
- Image outputs include a decode action using DuckDecodeButton.
- Outputs include a save-to-workspace action aligned with JobDetail behavior.
- Decoded outputs are previewed if available and can also be saved.

## Approach
- Add decode state (`decodedFiles`, `imageVersion`) in ComplexWorkflowRunner.
- Add save-to-workspace handler using `/api/workspace/copy-to-folder`.
- Update output rendering to show actions and decoded preview when available.

## Files Likely Touched
- `runninghub-nextjs/src/components/workspace/ComplexWorkflowRunner.tsx`

## Testing
- Run a complex workflow that produces an encoded image.
- Click Decode and verify the preview switches to decoded output.
- Click Save and confirm file is copied to the selected workspace folder.
- Run `npm run build`.
