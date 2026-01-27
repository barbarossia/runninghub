## Overview
Add a global floating aspect-ratio calculator tool that appears on all pages and can compute missing width/height from an original image/video size.

## Current State
- No global utility for aspect ratio calculations.
- Width/height calculations are manual.

## Target State
- A floating tool in the top-right on all pages.
- Accepts original width/height and a target width or height.
- Computes the missing dimension with integer results.
- Automatically pre-fills original width/height when a media item is selected (image/video).

## Requirements
- Global visibility on all pages.
- Supports both modes: compute height from target width, or compute width from target height.
- Results are integers (rounded).
- Auto-read original dimensions from current selection (image/video).
- Minimal visual impact; floating panel with collapse option.

## Technical Approach
- Create a client component `AspectRatioTool` under `src/components/ui/`.
- Mount globally via `src/app/layout.tsx` (client wrapper if needed).
- Track original dimensions by subscribing to stores:
  - Workspace selections (`useWorkspaceStore` → selected media).
  - Gallery image selection store.
  - Videos selection store.
- Tool state:
  - `originalWidth`, `originalHeight`, `targetWidth`, `targetHeight`.
  - Mode toggle: width→height or height→width.
  - Auto-fill original dimensions when selection changes.
- Calculation:
  - When target width entered: `height = Math.round(targetWidth * originalHeight / originalWidth)`.
  - When target height entered: `width = Math.round(targetHeight * originalWidth / originalHeight)`.

## UX Notes
- Top-right floating card; uses z-index to avoid overlap.
- Shows computed field as read-only, editable target field.
- Provide a small reset button to clear inputs.

## Risks / Edge Cases
- Selection may not include dimensions (missing metadata); handle gracefully and allow manual input.
- Multiple selections; use the first selected item.

## Implementation Phases
1. Add `AspectRatioTool` component and calculation logic.
2. Wire auto-fill from selection stores.
3. Add global mount in layout.
4. Manual verify on workspace/gallery/videos pages.
