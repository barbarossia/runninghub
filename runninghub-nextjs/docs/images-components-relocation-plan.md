# Images Components Relocation Plan

## Overview
Move remaining components from `src/components/images/` into more appropriate folders and remove the `images` folder entirely.

## Goals
- Relocate `MediaSortControls` to a workspace-focused location.
- Relocate `DuckDecodeDialog` to the selection components area.
- Update imports to new paths.
- Delete `src/components/images/` folder.

## Non-Goals
- Functional changes to the components.

## Implementation Approach
1. Decide target locations:
   - `MediaSortControls` -> `src/components/workspace/MediaSortControls.tsx`
   - `DuckDecodeDialog` -> `src/components/selection/DuckDecodeDialog.tsx`
2. Move files and update imports.
3. Remove `src/components/images/index.ts` and delete `src/components/images/` folder.
4. Verify no remaining references to the old paths.

## Testing Plan
- `npm run build` in `runninghub-nextjs/`.
