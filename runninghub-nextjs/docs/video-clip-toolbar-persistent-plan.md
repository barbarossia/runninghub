## Overview
Make the clip/convert selection toolbar always visible and full width on the workspace clip/convert tabs.

## Current State
- Clip/convert toolbars only render when videos are selected.
- Expanded toolbar width is capped and centered.

## Target State
- Clip/convert toolbars render at all times.
- Expanded toolbar spans the page width.
- Button states remain disabled when no selection.
- Floating/expanded modes still work.

## Requirements
- Keep existing clip/convert actions and labels.
- Avoid layout regressions in other tabs.
- Reuse BaseSelectionToolbar options.

## Implementation Steps
1. Pass `alwaysVisible` and `fullWidth` to `VideoClipSelectionToolbar`'s BaseSelectionToolbar.
2. Verify button disabled states remain tied to selection.
3. Sanity check clip/convert tabs in both expanded and floating modes.
