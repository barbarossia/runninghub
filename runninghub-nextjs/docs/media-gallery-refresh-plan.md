# Media Gallery Refresh Refactor - Implementation Plan

**Status**: Planning Phase
**Created**: 2026-01-18
**Priority**: High

---

## Overview

Reduce Media Gallery refresh latency and selection resets by replacing full-folder refreshes with filesystem subscription + incremental updates. Preserve user selection and avoid UI blocking during toolbar actions.

---

## Current State

- Media Gallery refresh uses `handleRefresh` in `src/app/workspace/page.tsx`.
- `handleRefresh` calls `loadFolderContents` and `processFolderContents`, rebuilding the entire media list and clearing selection state.
- Media Gallery tab switch triggers automatic refresh with a short delay.
- Toolbar actions (remove/decode/etc.) await full refresh, causing perceived UI stalls.

---

## Goals

1. **Incremental Updates**: Apply add/change/remove updates without rebuilding the entire list.
2. **Stable Selection**: Preserve `selected` state for unchanged files.
3. **Responsive UI**: Avoid blocking toolbars on long refresh operations.
4. **Real-Time Updates**: Subscribe to filesystem events for the active folder.
5. **Safe Cleanup**: Close subscriptions when changing tabs or folders.

---

## Non-Goals

- No global auto-refresh polling.
- No UI redesign of the Media Gallery.
- No changes to Gallery filtering/search logic beyond state preservation.

---

## Proposed Architecture

### 1) Filesystem Subscription (SSE)
- Add API route: `src/app/api/workspace/subscribe/route.ts`.
- Use `chokidar` to watch current folder:
  - Events: `add`, `change`, `unlink`.
  - Ignore: `.git`, `node_modules`, temp files.
- Stream events via `text/event-stream` (SSE).
- Debounce per file to avoid flooding UI.

### 2) Incremental Store Updates
- Extend workspace store with helper actions:
  - `upsertMediaFile(file: MediaFile)`
  - `removeMediaFileByPath(path: string)`
  - `mergeMediaFiles(files: MediaFile[])` (preserve selection)
- Preserve selection and transient flags (`isDuckEncoded`, `duckValidationPending`) when files still exist.

### 3) Workspace Page Integration
- On Media Gallery tab activation and folder selection:
  - Establish SSE subscription for that folder.
  - Stop subscription when leaving tab or changing folder.
- Remove tab-switch `handleRefresh` usage; use subscription for updates.
- Keep manual refresh action for explicit user refresh.

---

## UX Considerations

- No selection resets unless file is removed.
- New files appear as soon as filesystem event arrives.
- Toolbar actions update UI immediately, then rely on subscription for consistency.

---

## Risks & Mitigations

- **Watcher leaks**: Ensure teardown on unmount or tab change.
- **High event volume**: Debounce + batch updates.
- **Large folders**: Initial load still required, but only once per folder.

---

## Rollout Plan

1. Implement SSE endpoint with watcher.
2. Add store helpers and merge logic.
3. Wire subscription into workspace page.
4. Remove auto-refresh on tab switch.
5. Validate toolbar actions with incremental updates.

---

## Success Criteria

- Switching to Media Gallery does not clear selection.
- New files appear without manual refresh.
- Toolbar actions respond immediately with no visible UI stall.
- Build passes (`npm run build`).
