## Overview
Update the Convert tab selection toolbar to label the crop action as "Crop" instead of "Clip" for clarity.

## Current State
- Convert tab reuses `VideoClipSelectionToolbar`, which defaults the primary action label to "Clip".
- In Convert tab, that action triggers crop operations, so the label is misleading.

## Target State
- Convert tab toolbar shows "Crop" for the primary crop action.
- Other pages that rely on clip behavior remain unchanged.

## Requirements
1. Update Convert tab usage of `VideoClipSelectionToolbar` to pass a crop-specific label.
2. Do not alter the default label for other contexts.

## Technical Approach
- Set `clipButtonText="Crop"` in the Convert tab toolbar configuration in `workspace/page.tsx`.

## Implementation Phases
1. Update toolbar prop in Convert tab.
2. Verify UI label.
