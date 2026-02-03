## Overview
Add a manual "refresh from disk" action for Job History and Job Detail so jobs stuck in running/pending can be reloaded from local `job.json`, even when a RunningHub task ID is missing.

## Current State
- Job History shows a per-job re-query button only when `runninghubTaskId` exists or the job failed.
- Job Detail shows a re-query button only when `runninghubTaskId` exists or the job failed.
- Jobs without `runninghubTaskId` cannot be manually refreshed, so a stale "running" status stays visible.

## Target State
- Job History provides a manual refresh action that reloads a job from disk when `runninghubTaskId` is missing.
- Job Detail provides a manual refresh action that reloads the job from disk regardless of RunningHub task ID.
- Refreshing updates status/outputs from `job.json` and gives user feedback without adding auto-refresh polling.

## Requirements
- Keep existing RunningHub re-query behavior unchanged when `runninghubTaskId` exists.
- No auto-refresh intervals; manual actions only.
- Use existing API `GET /api/workspace/jobs/[jobId]` to reload job data.
- Provide clear UI affordance and loading state for the manual refresh.

## Implementation Approach
1. Job Detail: extract the existing disk-fetch logic into a reusable callback and wire it to a new "Refresh" button.
2. Job History: add a per-job "Refresh from disk" action for jobs missing `runninghubTaskId`, reusing the same API.
3. Update store state with the refreshed job data and show toast feedback.

## Validation
- Open a job without `runninghubTaskId` that shows running; click refresh and confirm status updates from `job.json`.
- Verify the existing re-query button still works for jobs with `runninghubTaskId`.
- Confirm no new auto-refresh behavior was introduced.
