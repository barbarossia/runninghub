## Overview
Ensure jobs without a RunningHub task ID (`runninghubTaskId`) never display as `running`. They should display `pending` (or `queued` if queued) until a task ID exists.

## Current State
- Job UI displays `job.status` directly in multiple components.
- Jobs can be marked `running` before `runninghubTaskId` is assigned, resulting in misleading status.

## Target State
- Display status is derived from job metadata:
  - `failed` if `error` exists.
  - `completed` if `completedAt` exists.
  - `queued` if `queuedAt` exists.
  - `pending` if `runninghubTaskId` is missing and status is `running`.
  - Otherwise use `job.status`.

## Requirements
- Apply consistent display logic across Job List, Job Detail, Message Center, Bot Center, and Job Series Nav.
- Bot Center job-status sync should map missing `runninghubTaskId` to display status (pending/queued), not running.
- No auto-refresh added; minimal backend change to sync-status response only.

## Implementation Approach
1. Add a shared helper to derive display status from a Job record.
2. Replace direct `job.status` usage in UI components with the derived status for display.
3. Ensure filters and badges use the derived status.

## Validation
- A job with `status: running` and no `runninghubTaskId` displays as `pending`.
- Jobs with `queuedAt` display as `queued`.
- Existing completed/failed logic remains unchanged.
