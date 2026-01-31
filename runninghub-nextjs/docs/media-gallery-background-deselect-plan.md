# Media Gallery Background Deselect - Implementation Plan

## Overview
- Users currently have to tap the toolbar "Clear selection" button after selecting media in the gallery before they can interact with other content. That feels unnatural compared to common multi-select UIs where clicking outside the selection clears it.
- The goal is to let users click any blank space in the media gallery area (images, videos, and workspace tabs) to clear the selection in place of the toolbar button.

## Current State
- Image and video galleries rely on the selection hooks and only offer a dedicated button/toolbar to clear the selection.
- The workspace media gallery also reuses workspace store selection state and exposes a similar clear button, but there is no blank-area handler.
- Clicking outside of a selected card either keeps the selection or triggers other actions, forcing reliance on the explicit cancel action.

## Desired Behavior
- When the gallery has one or more selected items, clicking a blank portion of the grid/list (gaps between cards or any empty area within the gallery viewport) should call the respective `deselectAll*` action.
- The blank-area click should ignore clicks on cards, buttons, or overlays and should not bubble through when the user is already interacting with the toolbar.
- The same affordance should be available in the `ImageGallery`, `VideoGallery`, and workspace `MediaGallery` so that every media tab provides consistent behavior.

## Implementation Approach
1. Attach a background click handler to each gallery's grid container (`motion.div`) that checks whether the click target is the container itself. If so, call the existing `deselectAll` helper (for images/videos) or `deselectAllMediaFiles`/`deselectAllDatasetFiles` for the workspace variant.
2. Guard the handler so it only runs when there are active selections to avoid unnecessary state updates.
3. Keep existing stopPropagation calls on cards/buttons intact so background clicks only fire when genuinely in the blank space.
4. Perform a quick manual smoke test for each tab (image gallery, video gallery, and workspace media gallery) to ensure the new interaction does not interfere with keyboard shortcuts or other click handlers.
