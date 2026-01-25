# Video Clip Configuration Fix Plan

## Problem
The `saveToWorkspace` and `organizeByVideo` options in the video clip configuration are intended to be mutually exclusive, but currently, they can both be enabled. This leads to conflicting behavior where files are saved with the `--organize` flag (creating subdirectories) even when "Save to workspace" is checked.
Additionally, the backend API does not correctly receive the workspace path, relying on a client-side store that is empty on the server.

## Goal
Ensure strict mutual exclusivity between these options in the UI/Store and ensure the backend receives the correct parameters to save files to the workspace without unwanted organization subdirectories.

## Implementation Details

### 1. Store Update (`src/store/video-clip-store.ts`)
- Modify `toggleSaveToWorkspace` action.
- When `saveToWorkspace` is toggled to `true`, automatically set `organizeByVideo` to `false`.
- When `saveToWorkspace` is toggled to `false`, leave `organizeByVideo` as is.

### 2. API Update (`src/app/api/videos/clip/route.ts`)
- Update `ClipRequest` interface to accept an optional `outputDir` string.
- Update `POST` handler to extract `outputDir` from the request body.
- Pass `outputDir` to `clipVideosInBackground` and `clipSingleVideo`.
- Inside `clipSingleVideo`, if `saveToWorkspace` is true AND `outputDir` is provided:
    - Use `outputDir` as the destination.
    - Force `organizeByVideo` to `false` (backend safety net).
- Remove the dead code that tried to use `useWorkspaceStore.getState()` on the server.

### 3. Client Usage Update (`src/app/workspace/page.tsx`)
- Update `handleClipVideos` to pass `outputDir` in the request body.
- Set `outputDir` to `selectedFolder?.folder_path` when `saveToWorkspace` is true.

## Verification
- Check "Save to workspace" -> "Organize by video name" unchecks.
- Verify API request payload contains `outputDir`.
- Verify files are saved to workspace root without video-name subdirectories.
