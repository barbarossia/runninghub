# Workspace Duck Filename Check Plan

## Context
Workspace gallery currently validates duck-encoded images by calling the duck-validate API, which is too frequent.

## Goal
Detect duck-encoded images using filename heuristics only in the workspace gallery flow.

## Non-Goals
- Changing duck-decode behavior or API endpoints.
- Modifying job history validation outside the workspace gallery flow.

## Approach
1. Add a filename-based helper to detect duck-encoded images.
2. Set duck-encoding flags when building workspace media files and on live updates.
3. Replace selection-time validation with filename-based flagging.
4. Keep password prompt available when detection is uncertain.

## Files
- `runninghub-nextjs/src/utils/duck.ts`
- `runninghub-nextjs/src/app/workspace/page.tsx`
- `runninghub-nextjs/src/components/workspace/MediaGallery.tsx`
- `runninghub-nextjs/src/components/workspace/MediaSelectionToolbar.tsx`
