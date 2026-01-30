# Job History Download Indicator Plan

## Overview
Add a clear visual indicator in the Job History list that shows when a job's image/video output files have been explicitly saved to the workspace via the "Save to workspace" action. This helps users quickly see which jobs they already saved without opening each job detail.

## Goals
- Show a concise status marker in the Job History list when a user saves image/video outputs.
- Persist saved output tracking in `job.json` (no extra API calls or new endpoints).
- Keep styling consistent with existing Job History badges.

## Non-Goals
- No new backend endpoints.
- No auto-refresh or polling changes.
- No change to download behavior in Job Detail.

## Current State
- `JobList` renders job status, file input counts, and output previews derived from `job.results.outputs`.
- "Save to workspace" copies files, but no saved state is tracked per job.

## Target State
- `JobList` shows a small badge (e.g., "Saved") when a job has saved image/video outputs.
- Indicator logic uses a new `job.savedOutputPaths` array recorded when users click "Save to workspace".

## Technical Approach
- Extend `Job` with `savedOutputPaths?: string[]`.
- Update `POST /api/workspace/copy-to-folder` to accept `jobId` + `jobOutputPath` and persist to `job.json`.
- Update "Save to workspace" actions (Job History previews + Job Detail) to pass `jobId` + `jobOutputPath`.
- Add a helper in `JobList` to determine `hasSavedMediaOutputs`:
  - Check `job.savedOutputPaths` against image/video outputs.
- Render a `Badge` next to file input count when `hasSavedMediaOutputs` is true.

## Implementation Steps
1. Add `savedOutputPaths` to `Job` type and persist updates in copy-to-folder API.
2. Update Job History preview save action and Job Detail save action to pass `jobId` + `jobOutputPath`.
3. Add `hasSavedMediaOutputs` helper in `JobList` and render a "Saved" badge.
4. Verify the list renders correctly for jobs with/without saved outputs.

## Risks & Mitigations
- **Legacy jobs**: missing `savedOutputPaths` handled by optional chaining.
- **Mismatch between saved path and outputs**: store original output path to ensure the indicator reflects image/video outputs.

## Acceptance Criteria
- Job History list shows a "Saved" indicator for jobs with saved image/video outputs.
- Indicator updates when users save outputs from Job History or Job Detail.
- No UI regressions in Job History list layout.
- No new API calls or background refresh logic.
