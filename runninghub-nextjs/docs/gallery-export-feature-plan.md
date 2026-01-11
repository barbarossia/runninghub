# Gallery Export Feature Plan

## Overview

Add export functionality to the media gallery that allows users to copy selected images and videos to a folder of their choice using the browser's File System Access API.

## Requirements

- **Scope**: Export selected images/videos from gallery to user-selected destination folder
- **Folder Selection**: Use browser's native folder picker (`showDirectoryPicker()`)
- **File Structure**: Flatten all exported files (no subfolder preservation)
- **Feedback**: Show progress and success/error messages
- **Compatibility**: Modern browsers with File System Access API support

## User Flow

1. User selects one or more images/videos in the gallery
2. User clicks "Export" button in the selection toolbar
3. Browser folder picker dialog appears
4. User selects destination folder
5. Files are copied with progress indication
6. Success message shows count of exported files

## Technical Architecture

### Frontend Components

**1. Selection Toolbar** (`src/components/selection/SelectionToolbar.tsx`)
- Add "Export" button after Process/Delete buttons
- Icon: `Download` or `Export`
- Tooltip: "Export to folder"
- Enabled when images are selected

**2. Gallery Page** (`src/app/gallery/page.tsx`)
- Add `handleExport` callback
- Integrate with export utility

**3. Export Utility** (`src/lib/export-images.ts` - NEW)
- Use File System Access API (`window.showDirectoryPicker()`)
- Handle file copying with permission requests
- Support both real file paths and virtual files (blob URLs)
- Return progress updates

### API Route

**4. Export Endpoint** (`src/app/api/images/export/route.ts` - NEW)
- Receive selected image paths
- Serve file contents for copying
- Handle virtual files from File System Access API
- Validate file permissions

### State Management

**5. Task Store** (extend existing)
- Track export operation progress
- Export task ID for ConsoleViewer integration

## Implementation Approach

### Phase 1: API Route
- Create `/api/images/export` endpoint
- Serve file contents for client-side download
- Handle both file paths and blob URLs

### Phase 2: Export Utility
- Create `exportImages` function using File System Access API
- Handle folder picker and file permissions
- Copy files to destination with progress tracking

### Phase 3: UI Integration
- Add Export button to SelectionToolbar
- Connect handleExport in gallery page
- Add progress tracking to ConsoleViewer

### Phase 4: Error Handling & Polish
- Handle permission denied errors
- Show meaningful error messages
- Add retry capability for failed files
- Test with various file types and sizes

## File System Access API Details

```typescript
// Folder picker
const dirHandle = await window.showDirectoryPicker();

// Create file in destination
const fileHandle = await dirHandle.getFileHandle(filename, { create: true });

// Write file content
const writable = await fileHandle.createWritable();
await writable.write(blob);
await writable.close();
```

## Security Considerations

1. **File Access**: Use existing `/api/images/serve` endpoint for file content
2. **Validation**: Verify file paths are within allowed directories
3. **Permissions**: Handle permission request failures gracefully
4. **Fallback**: Show message for browsers without File System Access API

## Browser Compatibility

- Chrome/Edge 86+
- Opera 72+
- Firefox: Not supported (needs polyfill or alternative)
- Safari: Not supported (needs alternative approach)

**Fallback for unsupported browsers**: Show message indicating browser doesn't support folder export, suggest using Chrome/Edge.

## Testing Checklist

- [ ] Export single image
- [ ] Export multiple images
- [ ] Export videos (mp4, mov, etc.)
- [ ] Export mixed (images + videos)
- [ ] Export from virtual folder (File System Access API)
- [ ] Export from real folder path
- [ ] Handle permission denied
- [ ] Handle folder picker cancellation
- [ ] Show proper error messages
- [ ] Verify all files copied successfully
- [ ] Test with large files
- [ ] Test on Chrome/Edge

## Summary of Changes

| File | Change | Type |
|------|--------|------|
| `src/components/selection/SelectionToolbar.tsx` | Add Export button | Modify |
| `src/app/gallery/page.tsx` | Add handleExport callback | Modify |
| `src/lib/export-images.ts` | Create export utility | New |
| `src/app/api/images/export/route.ts` | Create export API | New |
| `src/types/gallery.ts` | Add export types if needed | Modify |

**Estimated**: ~200-250 lines of code
