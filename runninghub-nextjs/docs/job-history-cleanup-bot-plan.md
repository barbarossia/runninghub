# Job History Cleanup Bot Plan

## Overview
Add a Bot Center tool that cleans up job history by age in days. The bot deletes job records and associated output folders on disk (e.g., `~/Downloads/workspace/job_*`) so storage is reclaimed without manual deletion.

## Current State
- Job history can only be deleted manually.
- Job outputs accumulate on disk, increasing storage usage.
- Bot Center has existing job status and auto-save/decode bots.

## Target State
- A new "Job Cleanup" bot appears in Bot Center.
- Users configure an age threshold (days).
- Running the bot deletes jobs older than the threshold, including job history records and output folders.
- Results show how many jobs were deleted and any failures.

## Requirements
- Bot Center tab integration (manual run only for now).
- Age-based cleanup (days).
- Delete both job record and output files on disk.
- Use existing job storage location and batch delete API where possible.
- No auto-refresh intervals.

## Approach
1. Add a new bot type and config (`job-cleanup`, `ageDays`).
2. Implement cleanup logic that filters jobs by age and calls batch delete API.
3. Update Bot Center and Bot Builder UI to support the new bot.
4. Show cleanup summary results in Bot Center.

## Success Criteria
- Bot deletes jobs older than X days.
- Deleted jobs disappear from job history after refresh.
- Summary reports deleted and failed job IDs.
