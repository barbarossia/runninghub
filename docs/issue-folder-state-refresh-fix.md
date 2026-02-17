# Issue: Folder State Double-Loading and Cascading Refresh

## Summary

The folder state management system has several issues causing unnecessary API calls and performance problems.

## Issues

### 1. F5 Double Load (Bug)
**Location**: `runninghub-nextjs/src/app/workspace/page.tsx`

When the page mounts, both `useAutoLoadFolder.onFolderLoaded` and `useEffect[selectedFolder]` call `loadFolderContents` — causing the same folder to be loaded twice.

**Fix**: Remove redundant call from either `onFolderLoaded` callback or `useEffect[selectedFolder]`.

### 2. Delete Double Processing (Bug)
When deleting files in-app, the code does:
1. Immediate store removal via `removeMediaFileByPath()`
2. 100ms later SSE `unlink` event triggers `handleRefresh()` full API call

**Fix**: Remove the defensive `setTimeout(() => handleRefresh(), 100)` call after `removeMediaFileByPath()` in the SSE handler.

### 3. SSE Cascading Refreshes (Bug)
**Location**: `runninghub-nextjs/src/app/workspace/page.tsx:855-857`

Each file deletion triggers a full `handleRefresh()`. Batch deleting N files causes N sequential full API refreshes — extremely inefficient.

**Fix**: Implement debounced refresh or remove the full refresh entirely after file removal.

## Root Cause Analysis

See `docs/folder-state-management.md` for full analysis:
- The redundant `handleRefresh()` after `unlink` is defensive programming gone wrong
- The SSE handler fires both immediate store update AND delayed full refresh

## Expected Behavior

1. **Page mount**: Load folder contents only once
2. **File delete**: Remove from store only (SSE already reflects the change)
3. **Batch delete**: Single refresh after all deletions complete

## Related Documentation

- Documented in: `docs/folder-state-management.md`
- Related todos: `runninghub-nextjs/docs/workspace-folder-refresh-fix-todos.md`

---

**Created**: 2026-02-17
**Branch**: `fix/folder-state-refresh`
