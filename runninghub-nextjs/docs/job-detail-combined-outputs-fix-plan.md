# Job Detail Combined Outputs Fix - Implementation Plan

## Overview
Jobs that return both text outputs and media outputs should show both sections in Job Detail. The current UI only renders text outputs when they exist, hiding images/videos for mixed-output workflows.

## Goals
- Display text outputs and file outputs together when both are present.
- Preserve existing translation editor and file output actions.
- Keep the empty state accurate when no outputs exist.

## Non-Goals
- Change output generation or API behavior.
- Redesign the Job Detail layout beyond showing both sections.

## Current Behavior
- `JobDetail` renders the text output section when `results.textOutputs` exists.
- The file outputs section is skipped due to an `else` branch.

## Target Behavior
- Render text outputs when `results.textOutputs` is non-empty.
- Render file outputs when `results.outputs` is non-empty, even if text outputs exist.
- Show "No outputs generated" only when both sections are empty and the job is completed.

## Implementation Plan
1. Add `hasTextOutputs` and `hasFileOutputs` helpers in `JobDetail`.
2. Render text outputs and file outputs as separate sections when present.
3. Update the empty-state condition to check both.
4. Validate with a mixed-output job and run the build.

## Files
- `runninghub-nextjs/src/components/workspace/JobDetail.tsx`

## Testing
- Open job detail for `job_1769350219636_dcd3e466` and confirm image + text outputs.
- Verify text-only and file-only jobs render correctly.
- Run `npm run build`.
