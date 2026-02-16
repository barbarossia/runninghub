# Workspace Prompt Context Menu Update Plan

## Overview
Move the "Prompt" action from the workspace toolbar into the MediaGallery context menu and remove "Convert FPS" from that context menu.

## Goals
- Reduce toolbar clutter by removing the prompt action.
- Add a per-file "Prompt" action in the media item context menu.
- Remove "Convert FPS" from the media item context menu (still available via toolbar).

## Non-Goals
- No changes to workflow execution logic.
- No changes to prompt extraction logic or dialog layout.
- No removal of Convert FPS from the toolbar or other pages.

## Current State
- Toolbar shows a Prompt button (single-selection only).
- MediaGallery context menu includes Convert FPS for videos.
- Prompt dialog is driven by workspace page state via `handleViewPrompt`.

## Target State
- Toolbar no longer shows Prompt.
- MediaGallery context menu includes a Prompt item that opens the prompt dialog for that file.
- Convert FPS is removed from the MediaGallery context menu.

## Implementation Plan

### 1) Toolbar Cleanup
**File**: `src/components/workspace/MediaSelectionToolbar.tsx`
- Remove Prompt button in expanded and floating modes.
- Remove Prompt props from the toolbar interface.

### 2) MediaGallery Context Menu
**File**: `src/components/workspace/MediaGallery.tsx`
- Add `onPrompt?: (file: MediaFile) => void` prop.
- Add a "Prompt" menu item that calls `onPrompt(file)`.
- Remove the Convert FPS menu item and associated prop usage.

### 3) Workspace Page Wiring
**File**: `src/app/workspace/page.tsx`
- Remove Prompt props from `MediaSelectionToolbar` usage.
- Add `onPrompt` to `MediaGallery` with a new handler that opens the prompt dialog for the clicked file.
- Clean up prompt availability/loading state that is no longer used by the toolbar.

## Testing Checklist
- [ ] Toolbar no longer shows Prompt.
- [ ] Media item context menu shows Prompt and opens the prompt dialog.
- [ ] Convert FPS no longer appears in MediaGallery context menu.
- [ ] Prompt dialog still renders and can load/copy prompt metadata.
- [ ] Build passes (`npm run build`).

