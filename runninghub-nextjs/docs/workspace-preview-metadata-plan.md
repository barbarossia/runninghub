# Workspace Preview Metadata Plan

## Overview
Add detailed image/video metadata to the Workspace Media Gallery preview details panel. The preview should show file metadata (e.g., dimensions, duration, fps, codec, size, timestamps) pulled from a reliable source and rendered alongside existing preview details.

## Current State
- Workspace Media Gallery preview shows limited details.
- Metadata is partially available from folder listing (width/height/fps/duration), but not fully surfaced in preview details.

## Target State
- Preview details show rich metadata for the selected image or video.
- Metadata retrieval is consistent and accurate for files in workspace folders.
- Video metadata can be verified using a known file (user-provided sample).

## Requirements
- Add metadata rows for images: dimensions, format/extension, file size, created/modified timestamps.
- Add metadata rows for videos: duration, fps, dimensions, codec/format (if available), file size, created/modified timestamps.
- Preview UI follows existing MediaGallery detail styling.
- No auto-refresh interval changes.

## Approach
1. Identify existing metadata fields already returned by `/api/folder/list`.
2. Decide whether to extend metadata at the API layer (if needed) for codec/bitrate/format.
3. Add metadata rendering to the Workspace Media Gallery preview details panel.
4. Verify metadata extraction against the provided sample file.

## Implementation Phases
1. **Investigation**: locate preview details UI and current metadata usage.
2. **Metadata source**: confirm/extend metadata fields from API or local extractor.
3. **UI update**: render metadata rows in preview details.
4. **Verification**: compare displayed metadata against sample file.

## Success Criteria
- Preview details display metadata for images and videos.
- Sample video metadata matches expected values.
- UI remains consistent with existing MediaGallery styles.
