# Workspace SSE Rename Replace Fix Plan

## Overview
When a processed/decoded file keeps the original filename, SSE updates can leave the removed file visible. The workspace should **replace** the old item when a new file with the same name arrives.

## Goals
- Ensure SSE updates replace the old entry if a new file shares the same basename.
- Prevent stale items from persisting after rename/replace operations.

## Non-Goals
- No server-side SSE protocol changes.
- No change to polling behavior.

## UX / Behavior
- If an SSE update arrives with a filename that matches an existing item (different path), the old item is removed and replaced by the new one.

## Technical Approach
1. **Workspace SSE handler**
   - On `update` event, detect same-basename conflicts.
   - Remove existing media file(s) that match the basename but have a different path.
   - Then upsert the new file.

## Open Questions
- Should replacement apply to both images and videos? (Assume yes.)

## Files to Inspect
- `runninghub-nextjs/src/app/workspace/page.tsx`

## Validation
- Process/decode a file that reuses the original name.
- Confirm the old file entry is replaced (no duplicate/stale item).
