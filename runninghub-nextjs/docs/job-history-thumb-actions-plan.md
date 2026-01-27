## Overview
Enhance Job History thumbnails with per-output actions: save to workspace, and decode for encoded images. Video thumbnails should be playable.

## Current State
- Thumbnails render inline with the job title.
- No per-output actions are available.
- Video previews are static.

## Target State
- Each image/video preview has a save-to-workspace action next to the thumbnail.
- Encoded images show a decode button (save button still present).
- Video previews are playable (inline controls).

## Requirements
- Preserve existing job list layout and actions.
- Keep previews compact and inline with the title row.
- Use existing API endpoints for save and decode.

## Technical Approach
- Track encoded status per image preview using `/api/workspace/duck-validate`.
- Render per-preview action buttons next to thumbnails.
- Use `/api/workspace/copy-to-folder` for save-to-workspace.
- Render `video` element with `controls`, `preload="metadata"`, `muted`.

## Risks / Edge Cases
- Missing `path` for outputs; only show actions when a path exists.
- No selected workspace folder; show a toast error.

## Implementation Phases
1. Add encoded status lookup for image previews.
2. Add save and decode actions next to thumbnails.
3. Make video preview playable.
4. Manual verify with text/image/video outputs.
