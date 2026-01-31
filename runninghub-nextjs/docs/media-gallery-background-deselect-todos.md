# Media Gallery Background Deselect - Implementation TODOs

## Core Tasks
- [ ] Add a container click handler to `ImageGallery` that checks `event.target === event.currentTarget` and calls `deselectAll` when there is an active selection.
- [ ] Mirror the same blank-area detection in `VideoGallery`, leveraging its own `deselectAll` action from `useVideoSelection`.
- [ ] Update the workspace `MediaGallery` to reuse the blank-area handler for whichever selection mode (`workspace` or `dataset`) is active (use the appropriate `deselectAll*` action).
- [ ] Verify that clicking between cards, in the grid margins, and on any empty area clears the selection without interfering with card-level actions or toolbar buttons.

## Validation
- [ ] Manually test the gallery, video tab, and workspace media views in the UI to confirm the new interaction works across tabs and view modes.
- [ ] Ensure there are no console errors or warnings after the change and that the existing keyboard shortcuts still function as before.
