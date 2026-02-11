# Workspace Batch Folder Jump Fix Plan

## Overview
Fix a bug where running batch process in Workspace causes the media list to show the parent folder contents while the header still shows the selected subfolder.

## Current State
- Workspace uses `selectedFolder.folder_path` for header display.
- Folder contents are loaded asynchronously and fed into `processFolderContents` without verifying the response path.
- If a stale or mismatched response arrives (race condition), `mediaFiles` can be updated with another folder’s contents.

## Target State
- Workspace only applies folder contents when the response path matches the current selected folder.
- No UI jump to the parent folder after batch processing.

## Scope
- Frontend only: `runninghub-nextjs/src/app/workspace/page.tsx`.

## Approach
- Normalize and compare `result.current_path` to `selectedFolder.folder_path`.
- Skip `processFolderContents` when the response path does not match the selected folder.
- Log a warning for mismatched responses to aid debugging.
- Guard against stale in-flight requests by comparing the response path with the
  latest selected folder path (ref) and the request’s intended path.

## Risks
- If API responses omit `current_path`, the guard should not block valid updates.

## Validation
- Select a subfolder (e.g., `~/Downloads/continue/y2KWeueE`).
- Run batch process; confirm media list stays within the subfolder.
- Confirm no regressions when switching folders.
