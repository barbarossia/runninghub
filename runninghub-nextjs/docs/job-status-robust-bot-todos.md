# Job Status Bot Robust Sync TODOs

## Phase 1: API + Types
- [ ] Add `/api/workspace/jobs/sync-status` to reconcile job status with RunningHub.
- [ ] Extend `Job` with sync metadata fields (optional).

## Phase 2: Bot Integration
- [ ] Update Job Status Bot to call sync route and build summary from resolved statuses.
- [ ] Show unverified count / unknown statuses in bot UI.

## Phase 3: Manual Verification
- [ ] Run bot with a completed job and confirm status reflects RunningHub output.
- [ ] Simulate missing runninghubTaskId and confirm bot reports `unknown`.
- [ ] Restart backend mid-run and verify bot still reports final status after re-open.
