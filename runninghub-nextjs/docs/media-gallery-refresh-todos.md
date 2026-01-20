# Media Gallery Refresh Refactor - TODO List

## Overview

Track implementation tasks for filesystem subscription and incremental refresh logic in Media Gallery.

---

## Phase 1: Planning & Baseline
- [ ] Step 1.1: Confirm existing refresh flow and selection reset locations
- [ ] Step 1.2: Identify required store changes for incremental updates

## Phase 2: Backend Subscription (SSE)
- [ ] Step 2.1: Add `/api/workspace/subscribe` SSE endpoint
- [ ] Step 2.2: Use chokidar to watch the active folder
- [ ] Step 2.3: Emit add/change/remove events with minimal metadata
- [ ] Step 2.4: Ensure watcher cleanup on client disconnect

## Phase 3: Frontend Incremental Updates
- [ ] Step 3.1: Add store helpers to upsert/remove media files
- [ ] Step 3.2: Merge new data while preserving selection/flags
- [ ] Step 3.3: Subscribe/unsubscribe on tab or folder changes
- [ ] Step 3.4: Remove auto-refresh on media tab switch

## Phase 4: UX Verification
- [ ] Step 4.1: Verify selection remains stable during updates
- [ ] Step 4.2: Verify new files appear without manual refresh
- [ ] Step 4.3: Verify toolbar actions respond immediately

## Phase 5: Build Verification
- [ ] Step 5.1: Run `npm run build`
- [ ] Step 5.2: Fix any build/type errors

---

## Notes

- Avoid global polling; only subscribe to active folder.
- Keep manual refresh for fallback.

**Status**: In Progress
