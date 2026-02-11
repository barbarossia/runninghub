# Job Status Bot Robust Sync Plan

## Goal
Make Job Status Bot return trusted, final-consistent status even after crashes/restarts by reconciling with RunningHub on-demand.

## Problem
The bot currently summarizes `jobs` from local state / job.json, which can be stale if the backend exits before writing final status. There is no trusted remote reconciliation when the bot runs.

## Target Behavior
- Bot run triggers a trusted sync against RunningHub for eligible jobs.
- Bot summary is computed from resolved (verified) statuses, not from local intermediate state.
- If a job cannot be verified (missing runninghubTaskId or remote error), the bot reports an `unknown` status and flags it as unverified.

## Approach
1) Add a server route to reconcile jobs with RunningHub (`/api/workspace/jobs/sync-status`).
2) The route decides local vs remote per job; for "trusted" mode it always queries remote when a runninghubTaskId exists.
3) Update job.json with sync metadata (`lastStatusSyncAt`, `lastStatusSource`, `lastRemoteCode`, `lastRemoteMessage`) when remote data is available.
4) Update Job Status Bot to call the sync route first, then build summary from resolved results (including `unknown` for unverifiable jobs).
5) Surface unverified counts in the bot UI summary.

## Non-Goals
- No background polling or intervals.
- No changes to Job History list refresh behavior.
- No automatic output downloads during bot sync (status-only).

## Success Criteria
- Clicking Job Status Bot always reflects the latest remote status when possible.
- Jobs without runninghubTaskId are explicitly reported as `unknown` in bot summary.
- After a crash/restart, bot run still produces accurate, trusted status.
