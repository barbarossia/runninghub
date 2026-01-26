## Overview
Add a video resize feature to the Convert tab that scales videos to a target size while preserving the original aspect ratio. The user can select from presets or enter custom width/height; the resize uses "fit within target" behavior with automatic dimension calculation and optional letterboxing (no crop).

## Current State
- Convert tab uses `VideoConvertConfiguration` for conversion settings.
- No resize controls are present for video conversion.

## Target State
- Convert tab includes a "Resize" section with:
  - Toggle to enable/disable resizing
  - Preset size selection (e.g., 720x1280)
  - Custom width/height inputs
  - Longest-side and shortest-side modes that derive the other dimension from the source aspect
  - Auto-calculated dimension to preserve aspect ratio
- Resizing is applied during conversion without cropping.

## Requirements
1. Add resize controls in `VideoConvertConfiguration`.
2. Preserve aspect ratio: scale to the closest side and auto-calculate the other dimension.
3. No crop; allow letterbox if needed.
4. Provide presets and allow custom width/height.
5. Add longest-side and shortest-side resize options that set only one dimension and auto-calculate the other.
6. Persist settings across sessions (store or localStorage).

## Technical Approach
- UI:
  - Extend `VideoConvertConfiguration` to include resize toggle and preset/custom inputs.
  - Provide guidance text: "Preserves aspect ratio; no crop."
- State:
  - Add fields to `useVideoConvertStore` for `resizeEnabled`, `resizeWidth`, `resizeHeight`, `resizePreset`.
- API/Processing:
  - Update video convert API route to pass resize params to CLI.
  - Update CLI invocation to use ffmpeg scale with `-vf scale=w:h:force_original_aspect_ratio=decrease` and `-vf pad` if letterbox is needed.
- If only one dimension is provided, set the other to `-2` to preserve aspect and enforce even dimensions.
- For longest-side/shortest-side modes, use conditional scale expressions to target the desired dimension.

## Presets
- Portrait: 720x1280, 1080x1920
- Landscape: 1280x720, 1920x1080
- Square: 1080x1080
- Custom: width + height inputs

## Implementation Phases
1. Update store and UI controls.
2. Wire API/CLI conversion params for resize.
3. Verify behavior with portrait/landscape inputs.
