# Complex Workflow Output Preview UX Plan

## Overview
The output preview in ComplexWorkflowRunner is too small and the hover overlay blocks video playback. Update the layout to show larger previews and avoid overlaying video controls.

## Goals
- Increase preview size for output thumbnails.
- Remove hover overlay that blocks video play controls.
- Keep a clear view action without interfering with video playback.

## Current Behavior
- Output grid uses small square previews.
- A hover overlay covers the preview and blocks video controls.

## Target Behavior
- Use larger, wide previews (video aspect ratio).
- Only show a "View" link where it will not block video controls.

## Approach
- Switch output grid to fewer columns and use `aspect-video` for previews.
- Replace overlay link with a button below the preview.

## Files Likely Touched
- `runninghub-nextjs/src/components/workspace/ComplexWorkflowRunner.tsx`

## Testing
- Verify image and video previews are larger and readable.
- Hover over videos and confirm play controls are clickable.
- Run `npm run build`.
