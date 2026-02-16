# Workspace Toolbar Normalize Tabs Plan

## Overview
Normalize workspace tab toolbars (Clip and Convert) to match the Media toolbar: left-aligned, icon-only, wider buttons, and tooltip captions with selected counts. Exclude Gallery/Videos pages.

## Goals
- Remove helper text labels from Clip/Convert toolbars.
- Use icon-only buttons with tooltips containing action + "X selected".
- Widen buttons horizontally for consistency.

## Non-Goals
- No changes to Gallery/Videos pages.
- No behavior changes to toolbar actions.

## Implementation Plan
1) Update `VideoClipSelectionToolbar.tsx`:
   - Remove expanded helper text.
   - Convert buttons to icon-only with tooltips.
   - Widen buttons to match workspace toolbar sizing.
   - Include selected count in tooltip captions.

## Testing Checklist
- [ ] Clip tab toolbar matches workspace toolbar style.
- [ ] Convert tab toolbar matches workspace toolbar style.
- [ ] Tooltips show short labels with selected count.
- [ ] Build passes (`npm run build`).
