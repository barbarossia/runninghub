## Overview
Add video speed controls to the Convert tab so users can slow down or speed up videos during conversion. Speed changes should work alongside existing FPS conversion, quality, encoding preset, and resize options.

## Current State
- Convert tab supports FPS changes, quality presets, encoding speed, and optional resize.
- No speed controls are available.

## Target State
- Convert tab includes a "Video Speed" section with:
  - Toggle to enable/disable speed changes
  - Preset speed buttons (e.g., 0.5x, 1x, 1.5x, 2x)
  - Custom speed input
- Speed changes apply during conversion via FFmpeg.
- Speed validation range is 0.1x to 10x.

## Requirements
1. Add speed controls in `VideoConvertConfiguration`.
2. Persist speed settings in `useVideoConvertStore`.
3. Support preset values and custom input (0.1x - 10x).
4. Apply speed in conversion using FFmpeg video `setpts` and audio `atempo` chaining.
5. Default speed is 1x when disabled.

## Technical Approach
- UI:
  - Add a speed section in `VideoConvertConfiguration` with toggle, presets, and custom input.
  - Display speed in the configuration summary and conversion details.
- State:
  - Add `speedEnabled`, `speedValue`, and `customSpeed` to `useVideoConvertStore`.
- API:
  - Extend `/api/workspace/fps-convert` to accept speed options.
  - Apply `setpts` for video and chained `atempo` filters for audio.
- Workspace:
  - Include speed settings in conversion request and validate input.

## Presets
- Slow: 0.25x, 0.5x, 0.75x
- Normal: 1x
- Fast: 1.25x, 1.5x, 2x
- Custom: 0.1x - 10x

## Implementation Phases
1. Update store and UI controls.
2. Update conversion API to apply speed filters.
3. Wire request parameters and verify behavior.
