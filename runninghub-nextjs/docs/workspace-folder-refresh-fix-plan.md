## Overview
Ensure workspace media list refreshes only the selected folder, not previous folders.

## Current State
- Media list merges new folder contents with existing media files.
- After switching folders, old folder files can remain visible.

## Target State
- When the workspace folder changes, media files and selections reset to the new folder only.

## Requirements
- Preserve current refresh and SSE behavior.
- Reset media files only on folder change (not on every refresh).

## Implementation Phases
1. Track previous folder path in workspace page.
2. Clear media files and selections when folder path changes.
3. Manual verify with nested folder selection.
