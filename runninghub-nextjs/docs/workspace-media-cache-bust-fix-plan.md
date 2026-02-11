# Workspace Media Cache Bust Fix Plan

## Overview
When a processed/decoded file reuses the original path, the browser can show cached media. We should append a cache-busting query to media URLs so updated files render correctly.

## Goals
- Ensure gallery thumbnails/videos update when a file is replaced at the same path.
- Avoid stale cached media after decode/rename.

## Non-Goals
- No server-side cache headers changes.

## Technical Approach
1. Add a cache-buster query param to image/video URLs based on file timestamps.
2. For SSE updates where timestamps may be missing, use `Date.now()`.

## Files to Inspect
- `runninghub-nextjs/src/app/workspace/page.tsx`

## Validation
- Replace a file at the same path and refresh; confirm gallery shows updated media.
