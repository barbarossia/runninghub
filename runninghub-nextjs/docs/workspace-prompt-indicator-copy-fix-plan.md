# Workspace Prompt Indicator Copy Fix Plan

## Overview
Fix issue 69 for workspace media prompt metadata handling. Media items that already have prompt metadata need a visible context-menu indicator, and the prompt dialog copy action needs reliable clipboard behavior.

## Current State
- `MediaGallery` shows a generic `Prompt` context-menu item whenever the workspace page provides `onPrompt`.
- Files with prompt metadata are not visually distinguished from files without prompt metadata in the context menu.
- The workspace prompt dialog displays prompt content, but its copy button calls `navigator.clipboard.writeText` without awaiting success or handling fallback/error states.

## Target State
- The context-menu `Prompt` item clearly indicates when a file already has prompt metadata.
- Prompt content still opens from the context menu for both images and videos.
- The dialog copy button copies the currently displayed prompt content and reports success or failure accurately.

## Technical Approach
1. Add a small `hasPromptMetadata` check in `MediaGallery` based on `file.prompt`.
2. Render a visible badge/icon state on the context-menu `Prompt` item when prompt metadata is known.
3. Add a workspace page clipboard helper that awaits `navigator.clipboard.writeText`, falls back to a textarea copy for browsers where needed, and reports failures with `toast.error`.
4. Reuse the helper from the prompt dialog copy button.

## Validation
- Build the frontend with `npm run build`.
- Verify the changed context-menu markup and copy handler compile under strict TypeScript.
