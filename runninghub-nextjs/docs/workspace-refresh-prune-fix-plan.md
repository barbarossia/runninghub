# Workspace Refresh Prune Fix Plan

## Overview
Manual refresh should replace the gallery contents with the latest folder listing, removing stale items that no longer exist.

## Current State
- `processFolderContents` merges fetched items into the store.
- Manual refresh keeps removed/renamed items because merge doesn’t prune missing files.

## Target State
- Manual refresh (and initial folder load) should replace the media list with the latest snapshot.
- Preserve selection/duck flags for files that still exist.

## Technical Approach
1. Add a `mode` flag to `processFolderContents` (`merge` vs `replace`).
2. For `replace`, map selection/duck flags from existing items, then call `setMediaFiles` with the new list.
3. Use `replace` for initial folder load and manual refresh.

## Validation
- Rename/replace a file on disk, click Refresh, confirm stale entry disappears.
- Verify selection/duck flags remain for unchanged files.
