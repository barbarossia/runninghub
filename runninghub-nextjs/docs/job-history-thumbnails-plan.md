## Overview
Add output thumbnails to the Job History list so each job shows a quick visual preview of its outputs.

## Current State
- Job History list shows status, workflow name, and metadata only.
- No output previews are displayed.

## Target State
- Text outputs show a text icon.
- Image outputs show image thumbnails.
- Video outputs show video thumbnails (first frame, no playback controls).

## Requirements
- Keep current Job History list layout and actions.
- Limit previews to a small number per job to avoid layout overflow.
- Use existing serve endpoints for image/video previews.

## Technical Approach
- Derive preview items from `job.results.outputs` and `job.results.textOutputs`.
- For images: render `img` with `/api/images/serve`.
- For videos: render `video` with `/api/videos/serve`, `preload="metadata"`, no controls.
- For text: render a text icon card.
- Render up to 3 preview items per job.

## Risks / Edge Cases
- Outputs missing `path`; fall back to `workspacePath` if present.
- Missing results should render no previews.

## Implementation Phases
1. Add preview derivation in JobList.
2. Render preview thumbnails in the JobList cards.
3. Manual verify with text/image/video outputs.
