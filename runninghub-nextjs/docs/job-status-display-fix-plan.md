## Overview
Ensure Job History displays terminal statuses when job data includes completion/error fields, even if status is stale.

## Current State
- Job list renders `job.status` directly.
- If a stale status remains `running` but `error` or `completedAt` exists, UI shows running.

## Target State
- Display status derives from job data:
  - `failed` if `error` exists.
  - `completed` if `completedAt` exists and no error.
  - Otherwise use `job.status`.

## Requirements
- Use derived status for UI display and filters.
- Keep underlying job data unchanged.

## Implementation Phases
1. Add helper to compute display status in JobList.
2. Use display status for badges, icons, and filters.
3. Manual verify with a failed job.
