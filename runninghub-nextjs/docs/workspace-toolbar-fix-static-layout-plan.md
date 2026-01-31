# Workspace Media Gallery Toolbar Static Layout Fix Plan

## Problem
The toolbar in the Workspace Media Gallery is dynamic, showing/hiding buttons based on the type of selected files (e.g., "Clip" only shows for videos). This causes the toolbar layout to shift and change size as the user selects different files.

## Goal
Make the toolbar static:
- Display all available action buttons regardless of selection content.
- Disable buttons that are not applicable to the current selection (e.g., disable "Clip" if no videos are selected).
- Maintain a consistent button count and toolbar size.
- Ensure buttons are visible even when no files are selected (but disabled).

## Implementation Details

### 1. MediaSelectionToolbar Component (`src/components/workspace/MediaSelectionToolbar.tsx`)

-   **Unconditional Rendering**: Remove `selectedFiles.some(...)` checks from the conditional rendering logic of buttons.
-   **Disabled State**: Move the file type checks to the `disabled` prop of the buttons.
-   **Affected Buttons**:
    -   Preview (Image/Video)
    -   Clip (Video)
    -   Add Caption (Manual)
    -   Caption (AI)
    -   Export
    -   Convert FPS (Video)
    -   Rename (Single file)
    -   Export to Dataset

### 2. Modes
-   Apply changes to both `expanded-actions` mode (Desktop/Top) and `floating` mode (Bottom/Compact).

## Verification
-   Select 0 files: Toolbar visible, all action buttons visible but disabled.
-   Select 1 image: "Clip" button visible but disabled. "Preview" enabled.
-   Select 1 video: "Clip" enabled.
-   Select mixed: Applicable buttons enabled if at least one valid file is selected.
