# Workspace Gallery Toolbar Fix - Implementation Plan

## Overview

Add missing toolbar features to the workspace MediaGallery component to match the functionality of the ImageGallery component. The MediaGallery currently has basic filtering but is missing key toolbar features for effective file management.

---

## Problem Statement

The workspace `MediaGallery` component is missing toolbar features compared to the `ImageGallery` component:

1. **File extension filter** - Dynamic buttons showing unique file extensions (.JPG, .PNG, .MP4, etc.)
2. **Large view mode** - Third view mode option for larger thumbnails
3. **File count display** - Detailed count showing filter information

---

## Requirements

### 1. File Extension Filter
- Display dynamic buttons for each unique file extension found in media files
- Show "All" button to clear extension filter
- Limit to first 5 extensions if there are many (to prevent overflow)
- Persist selected extension in store
- Filter files by selected extension

### 2. Large View Mode
- Add "Large" view mode as third option (alongside Grid and List)
- Display larger thumbnails with more detail
- Update grid layout to accommodate larger cells
- Persist view mode selection in store

### 3. File Count Display
- Show detailed count information below toolbar
- Format: `{count} file{plural} {extension info} {search info}`
- Example: "24 files (.JPG) matching 'sunset'"
- Example: "24 files"
- Example: "24 files (.PNG)"

---

## Implementation Plan

### Phase 1: Store Updates
**File**: `src/store/workspace-store.ts`

**Changes**:
1. Update `viewMode` type from `'grid' | 'list'` to `'grid' | 'list' | 'large'`
2. Add `selectedExtension: string | null` state
3. Add `setSelectedExtension(extension: string | null) => void` action
4. Update `setViewMode` signature to accept `'large'`
5. Persist `selectedExtension` in localStorage

### Phase 2: MediaGallery Component Updates
**File**: `src/components/workspace/MediaGallery.tsx`

**Changes**:
1. Import `Maximize2` icon from lucide-react
2. Read `selectedExtension` and `setSelectedExtension` from store
3. Remove local `typeFilter` state (use `selectedExtension` from store)
4. Add `useMemo` to get unique extensions from `mediaFiles`
5. Update `filteredFiles` to filter by `selectedExtension` instead of `typeFilter`
6. Update toolbar to replace static type filter with dynamic extension filter
7. Add Large view mode button to view mode switcher
8. Add file count display below toolbar
9. Update `gridCols` calculation to support large view mode

### Phase 3: Build & Test
1. Run `npm run build` to verify TypeScript compilation
2. Test extension filter functionality
3. Test view mode switching (Grid, List, Large)
4. Verify file count display updates correctly
5. Test localStorage persistence

### Phase 4: Folder Selection Persistence
**Files**:
- `src/app/api/folder/validate/route.ts` (new)
- `src/app/workspace/page.tsx`
- `src/app/gallery/page.tsx`
- `src/app/pages/page.tsx`
- `src/store/folder-store.ts`

**Changes**:

1. **Create Folder Validation API Endpoint**
   - Create `src/app/api/folder/validate/route.ts`
   - Accept `path` query parameter
   - Return `{ exists: boolean }`
   - Handle errors gracefully

2. **Update Folder Store**
   - Ensure `selectedFolder` is persisted in localStorage
   - Add `validateFolder` action if needed

3. **Update Workspace Page**
   - Add `useEffect` to auto-restore last folder on load
   - Validate folder existence before restoring
   - Show loading state during validation
   - Fallback to folder selection screen if folder doesn't exist

4. **Update Gallery Page**
   - Add `useEffect` to auto-restore last folder on load
   - Validate folder existence before restoring
   - Show loading state during validation
   - Fallback to folder selection screen if folder doesn't exist

5. **Update Pages Page**
   - Add `useEffect` to auto-restore last folder on load
   - Validate folder existence before restoring
   - Show loading state during validation
   - Fallback to folder selection screen if folder doesn't exist

**Implementation Pattern**:
```typescript
useEffect(() => {
  const loadLastFolder = async () => {
    const lastFolder = useFolderStore.getState().selectedFolder;

    if (lastFolder) {
      setLoading(true);
      try {
        const response = await fetch(`/api/folder/validate?path=${encodeURIComponent(lastFolder.folder_path)}`);
        const data = await response.json();

        if (data.exists) {
          await loadFolderContents(lastFolder.folder_path, lastFolder.session_id, true);
        } else {
          setSelectedFolder(null);
          toast.info('Previously selected folder no longer exists');
        }
      } catch (error) {
        console.error('Folder validation failed:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  loadLastFolder();
}, []);
```

---

### Phase 5: MediaGallery File Operations (Rename, Delete, Preview, Details)

**Trigger**: User feedback - "toolbar still missing, check image gallery, it missing the rename, delete operation and i need add the preview, detail information is missing also"

**File**: `src/components/workspace/MediaGallery.tsx`

**Changes**:

1. **Add 3-Dot Menu to Each File Card**
   - Import required icons: `MoreVertical`, `Pencil`, `Trash2`, `Eye`, `Info`
   - Import `DropdownMenu` and `Dialog` components
   - Add menu button in top-right corner of each file card
   - Menu appears on hover or when file is selected
   - Menu items: Preview, Rename, Delete

2. **Implement Rename Functionality**
   - Add `onRename?: (file: MediaFile, newName: string) => Promise<void>` to `MediaGalleryProps`
   - Add rename dialog state: `renameDialogFile`, `newFileName`
   - Create rename dialog with input field
   - Preserve file extension when renaming
   - Support Enter key to confirm

3. **Implement Delete Functionality**
   - Add `onDelete?: (file: MediaFile) => Promise<void>` to `MediaGalleryProps`
   - Add delete dialog state: `deleteDialogFile`
   - Create delete confirmation dialog
   - Show warning about permanent deletion

4. **Implement Preview Functionality**
   - Add `onPreview?: (file: MediaFile) => void` to `MediaGalleryProps`
   - Add preview dialog state: `previewFile`
   - Create preview dialog with:
     - Image preview with full-size display
     - Video preview with playback controls
     - File metadata display:
       - Type (image/video)
       - Extension
       - Dimensions (width × height)
       - Size in KB
       - Duration (for videos)
       - FPS (for videos)

5. **Update Workspace Page**
   - Implement `handleRename` callback
   - Implement `handleDelete` callback
   - Implement `handlePreview` callback
   - Pass callbacks to `MediaGallery` component

**UI Pattern**:
```tsx
{/* More menu */}
<div className="absolute top-2 right-2">
  <DropdownMenu>
    <DropdownMenuTrigger>
      <Button variant="ghost" size="icon">
        <MoreVertical />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuItem onClick={() => onPreview(file)}>
        <Eye /> Preview
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setRenameDialogOpen(file)}>
        <Pencil /> Rename
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setDeleteDialogOpen(file)}>
        <Trash2 /> Delete
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</div>
```

---

## Technical Details

### Extension Filter Logic

```typescript
// Get unique extensions
const uniqueExtensions = useMemo(() => {
  const extensions = new Set<string>();
  mediaFiles.forEach((file) => {
    if (file.extension) {
      extensions.add(file.extension);
    }
  });
  return Array.from(extensions).sort();
}, [mediaFiles]);

// Filter files by extension
const filteredFiles = useMemo(() => {
  return mediaFiles.filter((file) => {
    // Extension filter
    if (selectedExtension && file.extension !== selectedExtension) return false;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        file.name.toLowerCase().includes(query) ||
        file.path.toLowerCase().includes(query)
      );
    }

    return true;
  });
}, [mediaFiles, searchQuery, selectedExtension]);
```

### Grid Layout for View Modes

```typescript
const gridCols = useMemo(() => {
  switch (viewMode) {
    case 'grid':
      return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6';
    case 'large':
      return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
    case 'list':
      return 'grid-cols-1';
    default:
      return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5';
  }
}, [viewMode]);
```

### Toolbar UI Structure

```tsx
<div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
  {/* Left: Search and filter */}
  <div className="flex-1 flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
    {/* Search */}
    <div className="relative flex-1 sm:max-w-xs">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      <Input
        type="text"
        placeholder="Search files..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="pl-10"
      />
    </div>

    {/* Extension filter */}
    <div className="flex gap-1" role="group" aria-label="Filter by file extension">
      <Button
        variant={selectedExtension === null ? 'default' : 'outline'}
        size="sm"
        onClick={() => setSelectedExtension(null)}
      >
        All
      </Button>
      {uniqueExtensions.slice(0, 5).map((ext) => (
        <Button
          key={ext}
          variant={selectedExtension === ext ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedExtension(ext)}
        >
          {ext.replace('.', '').toUpperCase()}
        </Button>
      ))}
    </div>
  </div>

  {/* Right: View mode and select all */}
  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
    {/* Select all checkbox */}
    {/* View mode buttons */}
  </div>
</div>
```

### File Count Display

```tsx
<div className="text-sm text-gray-600">
  {filteredFiles.length} file{filteredFiles.length !== 1 ? 's' : ''}
  {selectedExtension && ` (${selectedExtension.replace('.', '').toUpperCase()})`}
  {searchQuery && ` matching "${searchQuery}"`}
</div>
```

---

## Files to Modify

1. `src/store/workspace-store.ts` - Add extension filter state and large view mode
2. `src/components/workspace/MediaGallery.tsx` - Update toolbar with new features
3. `src/app/api/folder/validate/route.ts` - Create folder validation endpoint (new)
4. `src/app/workspace/page.tsx` - Add folder auto-restore
5. `src/app/gallery/page.tsx` - Add folder auto-restore
6. `src/app/pages/page.tsx` - Add folder auto-restore
7. `src/store/folder-store.ts` - Ensure folder persistence

---

## Testing Checklist

### Phase 1-3: Toolbar Features
- [x] Extension filter buttons appear for each unique file extension
- [x] Clicking extension button filters files to show only that extension
- [x] "All" button clears extension filter and shows all files
- [x] Large view mode button appears in view mode switcher
- [x] Large view mode displays larger thumbnails correctly
- [x] File count display shows correct information
- [x] File count updates when filters change
- [x] Selected extension persists after page refresh
- [x] View mode persists after page refresh
- [x] Build succeeds without TypeScript errors

### Phase 4: Folder Selection Persistence
- [x] Folder validation API endpoint responds correctly
- [x] Workspace page auto-restore last folder on load
- [x] Gallery page auto-restore last folder on load
- [ ] Pages page folder persistence (page doesn't exist yet)
- [x] Loading state shown during folder validation
- [ ] Fallback to selection screen if folder doesn't exist
- [x] User can manually change folder after restore
- [x] Folder selection persists in localStorage
- [x] Build succeeds without TypeScript errors

### Phase 5: File Operations (Rename, Delete, Preview, Details)
- [x] 3-dot menu appears on each file card (on hover/selection)
- [x] Preview dialog opens for images
- [x] Preview dialog opens for videos with controls
- [x] Preview shows file metadata (dimensions, size, type, etc.)
- [x] Rename dialog appears with current file name
- [x] Delete confirmation dialog appears
- [ ] Rename operation actually renames files
- [ ] Delete operation actually deletes files
- [ ] File list updates after rename/delete
- [ ] Build succeeds without TypeScript errors

---

## Design Notes

### Why Extension Filter Instead of Type Filter?

The original MediaGallery had a static type filter (All, Images, Videos). However, this is less useful than an extension filter because:

1. **Granularity**: Users often want to filter by specific format (e.g., .JPG vs .PNG)
2. **Dynamic**: Extension filter automatically adapts to available files
3. **Consistency**: Matches the ImageGallery component's behavior
4. **Flexibility**: Can filter video formats (.MP4, .MOV) or image formats (.JPG, .PNG) separately

### Large View Mode Use Cases

Large view mode is useful for:
- Previewing image details
- Checking video thumbnails
- Accessibility (larger visual elements)
- Touch devices (easier to tap)

---

## References

- **ImageGallery Component**: `src/components/images/ImageGallery.tsx` - Reference implementation
- **MediaGallery Component**: `src/components/workspace/MediaGallery.tsx` - Component to modify
- **Workspace Store**: `src/store/workspace-store.ts` - State management
- **Folder Store**: `src/store/folder-store.ts` - Folder selection state
- **Project Rules**: `/Users/barbarossia/ai_coding/runninghub/CLAUDE.md` - Git workflow and documentation rules, includes RULE 4 for folder selection persistence
- **Frontend Rules**: `runninghub-nextjs/CLAUDE.md` - Next.js-specific development rules

---

**Created**: 2025-12-25
**Branch**: `fix/workspace`
**Status**: Implementation in progress
**Updated**: 2025-12-25 - Added Phase 5: File Operations (Rename, Delete, Preview, Details)
