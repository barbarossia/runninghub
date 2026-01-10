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
