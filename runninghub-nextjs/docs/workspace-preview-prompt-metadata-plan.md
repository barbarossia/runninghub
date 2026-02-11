# Workspace Preview Prompt Metadata Plan

## Overview
Show embedded prompt/comment metadata (JSON) from image/video files in the Workspace Media Gallery preview. If a file contains a prompt/comment tag, display it in the preview details panel.

## Current State
- Preview shows basic metadata (dimensions, duration, fps, codec, etc.).
- Embedded prompt/comment metadata (e.g., ffprobe tag `comment`) is not surfaced.

## Target State
- Preview details include a “Prompt” (or “Comment”) field for images/videos when present.
- Prompt JSON is readable and copyable from the preview panel.

## Requirements
- Extract embedded comment/prompt metadata using ffprobe (video) and metadata reader (image if available).
- Include prompt data in `/api/folder/list` response for workspace files.
- Render prompt field in preview details, with copy-to-clipboard support.
- Keep UI consistent with existing preview details styling.

## Approach
1. Verify how the prompt is stored in sample video (`~/Downloads/116094697.mp4`) via ffprobe.
2. Extend metadata extraction to include format tags (comment/prompt) for videos.
3. Pass prompt metadata through folder list API and workspace mapping.
4. Add a Prompt field in preview details, with truncation + copy button.

## Success Criteria
- Preview shows embedded prompt JSON when present.
- Sample file’s prompt matches ffprobe output.
- No regression to existing metadata display.
