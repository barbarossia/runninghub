# Workspace Toolbar Icon-Only Plan

## Overview
Convert the workspace media selection toolbar to icon-only buttons with hover captions, remove the Preview action from the toolbar, and enforce consistent button sizing.

## Goals
- Remove Preview from the toolbar (Preview remains in context menu).
- Replace text labels on toolbar buttons with icon-only buttons.
- Provide hover captions via tooltips/title attributes.
- Ensure consistent button sizing across all toolbar actions.

## Non-Goals
- No changes to workflow execution logic or dialogs.
- No changes to MediaGallery context menu actions.

## Current State
- Toolbar buttons include text labels.
- Preview appears in toolbar.
- Button sizes vary by label length.

## Target State
- Toolbar buttons are icon-only, with hover captions.
- Preview is not shown in toolbar.
- Buttons in each toolbar mode share the same height/width.

## Implementation Plan

### 1) Remove Preview from Toolbar
**File**: `src/components/workspace/MediaSelectionToolbar.tsx`
- Remove Preview button in expanded-actions and floating modes.

### 2) Icon-Only Buttons + Tooltips
**File**: `src/components/workspace/MediaSelectionToolbar.tsx`
- Replace text labels with icon-only buttons (`size="icon"`).
- Add `title` (and `aria-label`) to each button for hover captions.
- Preserve icon color styling.

### 3) Consistent Button Size
**File**: `src/components/workspace/MediaSelectionToolbar.tsx`
- Apply uniform `h-9 w-9` in expanded-actions.
- Apply uniform `h-8 w-8` in floating mode.

## Testing Checklist
- [ ] Preview removed from toolbar.
- [ ] All toolbar buttons are icon-only.
- [ ] Hover shows captions for each button.
- [ ] Buttons are the same size within each mode.
- [ ] Build passes (`npm run build`).

