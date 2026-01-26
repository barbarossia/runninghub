## Overview
Add reliable job history deletion by wiring UI actions to the jobs API, and introduce batch delete for selected jobs in the Job History list.

## Current State
- Job deletion in the UI only removes the item from local state (`deleteJob` in store) without deleting the job folder on disk.
- The API supports single-job delete (`DELETE /api/workspace/jobs/[jobId]`), but the UI does not call it.
- No batch delete UI or API exists.

## Target State
- Job delete from Job List and Job Detail calls the API, removes job folder, and refreshes store state.
- Job List supports multi-select with a batch delete action and confirmation.
- A batch delete API endpoint deletes multiple job folders and returns success/failure details.

## Requirements
- Use existing logging/toast standards for success/error feedback.
- Keep UI changes localized to Job History list and detail views.
- No auto-refresh intervals; refresh only after deletes.
- Use single quotes in TS/TSX and follow import ordering.

## Technical Approach
- Add a new API route for batch delete (e.g. `POST /api/workspace/jobs/batch-delete`) that:
  - Validates a list of job IDs.
  - Deletes each job directory with `fs.rm`.
  - Returns counts and per-id results.
- Update `useWorkspaceStore` with:
  - `deleteJob` to call API and update state.
  - New `deleteJobs` for batch delete with API call and state update.
- Update `JobList` to:
  - Track selected job IDs (checkboxes).
  - Provide a batch delete button with confirmation.
  - Use API-backed delete for single job.
- Update `JobDetail` to:
  - Call the API-backed delete.
  - Navigate back on success.

## Risks / Edge Cases
- Job folders missing on disk; API should treat missing folders as deleted (best effort).
- Partial failures in batch delete; UI should surface error message and remove successes.

## Implementation Phases
1. API: add batch delete endpoint.
2. Store: add API-backed delete actions.
3. UI: add selection + batch delete in JobList and update delete in JobDetail.
4. Verify: ensure deletes reflect in job list and detail.
