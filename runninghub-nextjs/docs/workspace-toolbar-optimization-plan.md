# Workspace Toolbar Optimization Plan

## Overview
Streamline the Workspace media selection toolbar by consolidating workflow actions, simplifying batch labeling, and removing the single-file rename action from the toolbar (rename remains available via the file context menu).

## Goals
- Reduce toolbar clutter and improve action discoverability.
- Merge the current "Run Workflow" and "Run Complex Workflow" actions into one entry point.
- Rename "Batch Process" to "Batch" for clarity and brevity.
- Remove the toolbar rename action since it only applies to single files.

## Non-Goals
- No backend workflow execution changes.
- No changes to the Workflows tabs or workflow editor pages.
- No removal of rename functionality from MediaGallery context menus.

## Current State
- Toolbar shows separate buttons for Run Workflow and Run Complex Workflow.
- "Batch Process" label is inconsistent with floating mode "Batch".
- Toolbar includes Rename, but it only applies to single selection and duplicates MediaGallery rename.

## Target State
- Single "Run Workflow" button with a dropdown menu:
  - "Quick Run" (existing QuickRunWorkflowDialog)
  - "Complex" (existing ComplexWorkflowRunDialog)
- "Batch Process" button label becomes "Batch" in expanded mode; dialog copy updated accordingly.
- Rename button and dialog removed from toolbar (expanded and floating modes).

## Implementation Plan

### 1) Toolbar UI Consolidation
**File**: `src/components/workspace/MediaSelectionToolbar.tsx`
- Replace the two workflow buttons with a single dropdown button.
- Dropdown items:
  - Quick Run (opens QuickRunWorkflowDialog)
  - Complex (opens ComplexWorkflowRunDialog)
- Keep disabled logic consistent with existing toolbarDisabled state.

### 2) Batch Label Simplification
**File**: `src/components/workspace/MediaSelectionToolbar.tsx`
- Change "Batch Process" button label to "Batch" in expanded mode.
- Update dialog title/description text to remove "Process" where appropriate.

### 3) Remove Rename from Toolbar
**File**: `src/components/workspace/MediaSelectionToolbar.tsx`
- Remove Rename button in expanded and floating modes.
- Remove rename dialog state/handlers used only by the toolbar.
- Update `MediaSelectionToolbar` props and workspace usage to remove `onRename`.

## Testing Checklist
- [ ] Toolbar shows a single Run Workflow button with dropdown menu.
- [ ] Quick Run item opens QuickRunWorkflowDialog.
- [ ] Complex item opens ComplexWorkflowRunDialog.
- [ ] Batch button label reads "Batch" in both modes.
- [ ] Batch confirm dialog copy updated.
- [ ] Rename button no longer appears in the toolbar.
- [ ] MediaGallery rename still works via context menu.
- [ ] Build passes (`npm run build`).

## Notes
- Use existing UI components (`DropdownMenu`, `Button`) to match styling.
- Maintain toolbar accessibility (aria labels, titles).

