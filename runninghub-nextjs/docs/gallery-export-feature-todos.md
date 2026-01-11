# Gallery Export Feature TODO List

## Implementation Checklist

### Phase 1: API Route
- [x] Create `/src/app/api/images/export/route.ts` endpoint
- [x] Implement POST handler to receive selected image paths
- [x] Fetch and return file contents for client-side copying
- [x] Handle both real file paths and blob URLs
- [x] Add error handling and validation
- [x] Add logging with writeLog for debugging

### Phase 2: Export Utility
- [x] Create `/src/lib/export-images.ts` utility module
- [x] Implement `exportImagesToFolder()` function
- [x] Integrate `window.showDirectoryPicker()` for folder selection
- [x] Handle FileSystemFileHandle and FileSystemDirectoryHandle
- [x] Implement file permission requests
- [x] Add progress callback for tracking
- [x] Handle individual file failures gracefully

### Phase 3: UI Integration
- [x] Add Export button to SelectionToolbar component
- [x] Add Download/Export icon (use lucide-react)
- [x] Add tooltip "Export to folder"
- [x] Pass `onExport` callback through toolbar props
- [x] Implement `handleExport` in gallery page
- [x] Connect exportImagesToFolder utility
- [x] Show progress in ConsoleViewer
- [x] Display success toast with count

### Phase 4: Error Handling & Polish
- [x] Handle browser incompatibility (Firefox/Safari)
- [x] Show fallback message for unsupported browsers
- [x] Handle permission denied errors
- [x] Handle user cancellation of folder picker
- [x] Add retry capability for failed files
- [x] Test with various file types (jpg, png, mp4, etc.)
- [x] Add export type to TypeScript types if needed

## Testing
- [x] Test export single image
- [x] Test export multiple images
- [x] Test export videos
- [x] Test export mixed content
- [x] Test from virtual folder
- [x] Test from real folder path
- [x] Verify browser compatibility
- [x] Build passes with `npm run build`

## Status: Completed ✅

## Workspace Export Feature (Additional)

### Phase 5: Workspace Integration
- [x] Add ExportableFile type to export-images.ts for generic export support
- [x] Add onExport prop to MediaSelectionToolbar component
- [x] Add handleExport callback and isExporting state to toolbar
- [x] Add Export button (orange themed) to expanded and floating modes
- [x] Update workspace page to pass handleExport callback
- [x] Build and verify TypeScript compilation

### Workspace Export Testing
- [x] Build passes with `npm run build`
- [ ] Test export from workspace with selected images
- [ ] Test export from workspace with selected videos
- [ ] Test browser compatibility message on unsupported browsers

## Phase 6: Delete After Export Option

### Implementation (Updated - Fixed Configuration on Page)
- [x] Create export-config-store with Zustand for persistence
- [x] Create ExportConfiguration component (like VideoClipConfiguration)
- [x] Add ExportConfiguration card to Media Gallery tab (always visible)
- [x] Update handleExport in workspace page to use store value
- [x] Simplify MediaSelectionToolbar to just trigger export
- [x] Remove popup dialog - use fixed configuration instead
- [x] Build and verify TypeScript compilation

### Features
- **Fixed Configuration Panel**: Located in Media Gallery tab, always visible (expandable)
- **Checkbox Option**: "Delete original files after export" with descriptive label
- **Warning Alert**: Red warning appears when delete is enabled (inside config card)
- **Persistent Setting**: Choice is saved to localStorage via Zustand persist
- **Safe Deletion**: Only deletes files after successful export
- **Error Handling**: Shows error if export succeeds but deletion fails

### Architecture
- **ExportConfigStore**: Zustand store with persist middleware for settings
- **ExportConfiguration Component**: Fixed panel in Media Gallery tab
- **MediaSelectionToolbar**: Simple trigger - calls onExport callback
- **Workspace Page**: Uses store value when executing export

### Testing
- [ ] Test export without delete option
- [ ] Test export with delete option enabled
- [ ] Verify setting persists across page reloads
- [ ] Test delete with single file
- [ ] Test delete with multiple files
- [ ] Verify error handling when deletion fails after successful export
