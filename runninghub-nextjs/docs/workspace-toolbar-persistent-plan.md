## Overview
Make the workspace selection toolbar always visible, full width, and adaptive to selection state.

## Current State
- Toolbar only appears when files are selected.
- Width is capped and centered.
- Some actions disappear when selection/type doesn’t match.

## Target State
- Toolbar is always visible in workspace.
- Full-width toolbar matching page width.
- Buttons are disabled when selection is empty or incompatible (e.g., decode only enabled for encoded images).
- Still supports switching between fixed and floating modes.

## Requirements
- No layout regressions in other pages.
- Use existing BaseSelectionToolbar behavior.
- Keep actions functional when enabled.

## Implementation Phases
1. Add `alwaysVisible` and `fullWidth` options to BaseSelectionToolbar.
2. Render MediaSelectionToolbar even when no selection.
3. Disable decode button unless encoded images are selected.
4. Manual verify fixed/floating modes and button states.
