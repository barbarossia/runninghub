# Workspace Toolbar Button Sizing Plan

## Overview
Increase the horizontal size of workspace toolbar buttons and include the selected file count in tooltip captions.

## Goals
- Make toolbar buttons wider for easier targeting.
- Include "X selected" in tooltip captions for context.

## Non-Goals
- No changes to toolbar actions or behavior.
- No changes to selection logic.

## Implementation Plan
1) Update `MediaSelectionToolbar.tsx` to use wider button widths in both expanded and floating modes.
2) Update tooltip labels to include selected count (e.g., "Run · 3 selected").

## Testing Checklist
- [ ] Buttons are wider in both toolbar modes.
- [ ] Tooltips show action + selected count.
- [ ] Build passes (`npm run build`).
