# Workspace-Only Entry Deprecation Plan

## Overview
Deprecate legacy pages and APIs so the application entry is workspace-only. Remove the standalone image gallery page, video page, and home page UI, and remove the YouTube tab in workspace. Clean up any unused components, routes, constants, and stores.

## Goals
- Remove `/gallery` page and its legacy API routes.
- Remove `/videos` page and its legacy API routes.
- Make workspace the only entry point (root route behavior clarified below).
- Remove the YouTube tab from the workspace UI and related components/APIs.
- Keep workspace functionality intact and update references if APIs are removed or moved.

## Non-Goals
- Reworking workspace feature behavior beyond necessary API/path updates.
- Major redesigns of workspace UI.

## Open Questions / Decisions Needed
1. Root route behavior: should `/` redirect to `/workspace`, or should workspace move to `/` with `/workspace` removed?
2. Video/image API removal scope: workspace currently depends on `/api/videos/*` (clip/crop/rename/delete/serve) and `/api/images/serve` for previews. Should these endpoints be kept for workspace usage, or migrated to new workspace-prefixed endpoints before removing `/api/videos/*` and `/api/images/*`?
3. YouTube downloader API routes (`/api/youtube/*`): remove entirely or keep for future use without UI?

## Decisions
- `/` redirects to `/workspace`.
- Keep `/api/videos/*` and `/api/images/*` endpoints for workspace usage.
- Keep `/api/youtube/*` endpoints without UI.

## Current State Summary
- Pages:
  - `/` (home) in `src/app/page.tsx`
  - `/gallery` in `src/app/gallery/page.tsx`
  - `/videos` in `src/app/videos/page.tsx`
  - `/workspace` in `src/app/workspace/page.tsx`
- APIs:
  - `/api/images/*` (process/export/delete/serve)
  - `/api/videos/*` (convert/crop/clip/split/delete/rename/serve)
  - `/api/youtube/*` (download/clear-cookies)
- Workspace uses video/image serve endpoints for previews and some video actions.

## Target State
- Only workspace is exposed to users.
- Legacy pages and their UI entry points are removed.
- YouTube tab is removed from workspace UI.
- Legacy API endpoints are removed or replaced if no longer needed by workspace.

## Implementation Approach
1. Decide root route behavior and API migration scope (see open questions).
2. Remove legacy page files and references (navigation, links).
3. Remove or migrate legacy API routes; update workspace references if migrated.
4. Remove YouTube tab UI and related components/constants; remove API routes if no longer used.
5. Clean up unused stores, components, and constants.
6. Ensure workspace still builds and runs.

## Testing Plan
- `npm run build` in `runninghub-nextjs/`.
- Manual: open workspace, verify tabs (no YouTube), media gallery, and job views still render.
