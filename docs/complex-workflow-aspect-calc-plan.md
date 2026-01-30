## Overview
Add a local workflow operation that calculates aspect-preserving dimensions from a media file and exposes the results as outputs that can be mapped into later steps in Complex Workflows.

## Current State
- Complex workflows can only map to generic “step output” in the builder.
- Local workflows do not include an aspect-dimension calculator operation.
- Cloud steps require fixed width/height values; there is no automated calculation step.

## Target State
- A new local operation (Aspect Calc) computes width/height from a video file.
- The operation writes structured outputs (e.g., width/height text files) that can be selected in Complex Workflow dynamic mappings.
- Complex Workflow builder shows multiple output options for steps with known outputs.

## Requirements
- Input: video file (output from a prior step).
- Config: target width (or target height) and calculation mode.
- Output: width and height values, usable as text inputs in the next step.
- Complex Workflow mapping UI must allow selecting specific outputs (width vs height).
- Backward compatibility for existing complex workflows (legacy output mapping still works).

## Technical Approach
1. **CLI**
   - Add a new command to `runninghub_cli` that:
     - reads the input video dimensions (via ffprobe),
     - computes width/height based on the selected mode,
     - writes `aspect_width.txt` and `aspect_height.txt` to the job directory.

2. **Local Operation Definition**
   - Add `aspect-calc` to `LocalWorkflowOperationType` and `LOCAL_OPS_DEFINITIONS`.
   - Define inputs: mode (`from-width`/`from-height`), targetWidth/targetHeight, rounding.
   - Define outputs for UI mapping (width/height text outputs).

3. **Complex Workflow Builder UI**
   - Extend output selection to list multiple outputs for local ops with defined outputs.
   - Update dynamic mapping parsing to support output keys beyond the legacy `step-output` value.

4. **Execution Pipeline**
   - Handle the new local operation in `/api/workspace/execute` and route it to the CLI command.
   - Ensure output files are captured as text outputs for mapping.

## UX Notes
- The builder should show “Step X: … – width” and “Step X: … – height” in the output selection.
- Default output mapping remains available for legacy steps.

## Risks / Edge Cases
- ffprobe unavailable → surface a clear error.
- Invalid target values → validation in CLI and UI.
- Output mapping compatibility with existing complex workflows.

## Implementation Phases
1. Add CLI command + utility for dimension probing and output writing.
2. Add local operation definition + wiring in API execution.
3. Update Complex Workflow builder output mapping UI and parsing.
4. Manual verify end-to-end complex workflow mapping (resize → aspect-calc → cloud step).
