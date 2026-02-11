## Overview
Move the selected folder summary (name, path, item count, refresh action) into the global app header to reduce vertical UI usage on the Workspace page.

## Current State
- Workspace renders `SelectedFolderHeader` as a full-width card under the global header.
- Folder name, path, and item count appear on their own row, using extra vertical space.
- Refresh action lives inside the `SelectedFolderHeader` card.

## Target State
- Global header displays a compact folder summary (name, path, item count).
- Refresh action for the folder is accessible from the header.
- `SelectedFolderHeader` is removed from Workspace when a folder is selected.
- No auto-refresh added; only manual refresh action remains.

## Requirements
- Header shows: folder name, full path, and item count (e.g., `128 images`).
- Keep existing header layout (Home, Back to Selection, badge, right-side controls).
- Preserve refresh behavior by exposing a header refresh button.
- Avoid new auto-refresh intervals.

## Implementation Approach
1. Extend `PageHeader` with an optional folder summary block and optional refresh action.
2. Wire Workspace page to pass selected folder info into the header.
3. Remove `SelectedFolderHeader` from the Workspace layout when a folder is selected.

## Validation
- Select a folder and confirm header shows name, path, and item count.
- Confirm refresh action still works (manual refresh only).
- Verify header layout remains aligned at desktop and mobile widths.
