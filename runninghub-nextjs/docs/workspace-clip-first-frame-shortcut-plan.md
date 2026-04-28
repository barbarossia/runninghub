# Workspace Clip First Frame Shortcut Plan

## Overview
Add a workspace shortcut that clips the first frame from selected video files without using the Video Clipping tab configuration.

## Requirements
- Use latest `main` and implement on a new feature branch.
- Add the shortcut to video context menus.
- Add the shortcut to the media selection toolbar.
- Ignore existing clip configuration settings.
- Support clipping multiple selected videos.

## Current State
- The workspace has a configurable video clip flow through `VideoClipConfiguration`.
- `handleClipVideos` reads `useVideoClipStore`, so toolbar or clip-tab actions use the current clip settings.
- `MediaGallery` has per-file context-menu actions but no first-frame shortcut.

## Target State
- Video context menus include a `Clip First Frame` action.
- The workspace selection toolbar includes a `First Frame` action when selected media contains videos.
- The new shortcut sends a fixed `first_frame` clip request for all selected videos.
- Output is saved to the current workspace folder so users can refresh and see generated images.

## Technical Approach
1. Add a fixed first-frame clip config in the workspace page.
2. Add a `handleClipFirstFrameVideos` handler that accepts multiple `MediaFile`s, filters videos, posts to `/api/videos/clip`, and sets the active console task.
3. Add `onClipFirstFrame` props to `MediaSelectionToolbar` and `MediaGallery`.
4. Render toolbar and context-menu controls only for video selections/files.
5. Keep the existing configurable clip tab and generic clip action unchanged.

## Validation
- Run `npm run build` in `runninghub-nextjs`.
- Confirm TypeScript compiles for new props and fixed config.
