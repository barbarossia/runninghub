# Workspace Submit Queue Plan

## Overview
When job submission exceeds RunningHub's parallelism limit (error code 805), jobs should be queued instead of failing. The queue will submit jobs to RunningHub when capacity is available, based on a configured parallelism limit (currently 3 in `.env.local`).

## Goals
- Prevent jobs from failing with error code 805.
- Queue submissions when concurrent capacity is at limit.
- Submit queued jobs automatically as slots free up.
- Keep UI consistent and avoid auto-refresh changes.

## Non-Goals
- No changes to RunningHub backend behavior.
- No new frontend polling intervals.
- No redesign of Job History UI beyond necessary status messaging.

## Current State
- Submissions that exceed RunningHub parallelism can return error code 805.
- Jobs are marked failed on 805, which is incorrect for a recoverable capacity issue.

## Target State
- If capacity is full, jobs are queued locally and submitted later.
- If 805 occurs, the job transitions to queued instead of failed.
- Jobs move from queued to running when submitted.

## Technical Approach
- Add a server-side queue manager (module-level singleton) that persists to disk to track:
  - Active submissions count.
  - FIFO queue of pending job submissions.
- Use the existing `RUNNINGHUB_MAX_CONCURRENT_PROCESSES` value (currently 3 in `.env.local`) for the limit.
- Introduce a new `JobStatus` value: `queued`.
- Update the workspace execution route to:
  - If active >= limit, enqueue and return a queued response.
  - If 805 occurs, enqueue and return a queued response instead of failure.
  - When a submission completes or fails (non-805), decrement active count and drain the queue.
- Add job status metadata for queued state.
- Log queue events with `writeLog` for visibility in `ConsoleViewer`.

## Open Questions
- Should the UI show queue position or just a queued label?

## Implementation Steps
1. Add queue manager utility in `src/lib/` (persisted to disk).
2. Update `Job` type to reflect queued state/metadata.
3. Adjust `api/workspace/execute` to enqueue when capacity is full or 805 occurs.
4. Update job store and UI to reflect queued jobs if needed.
5. Log queue transitions.

## Risks & Mitigations
- **Server restarts**: persist queue to disk and reload on boot.
- **Race conditions**: guard active count updates in queue manager.

## Acceptance Criteria
- Submissions no longer fail with error code 805; they are queued.
- Queued jobs submit automatically once capacity is available.
- Job status reflects queued/pending appropriately.
