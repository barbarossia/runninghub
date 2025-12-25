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

---

## Testing Checklist

- [ ] Extension filter buttons appear for each unique file extension
- [ ] Clicking extension button filters files to show only that extension
- [ ] "All" button clears extension filter and shows all files
- [ ] Large view mode button appears in view mode switcher
- [ ] Large view mode displays larger thumbnails correctly
- [ ] File count display shows correct information
- [ ] File count updates when filters change
- [ ] Selected extension persists after page refresh
- [ ] View mode persists after page refresh
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
- **Project Rules**: `/Users/barbarossia/ai_coding/runninghub/CLAUDE.md` - Git workflow and documentation rules

---

**Created**: 2025-12-25
**Branch**: `fix/workspace`
**Status**: Implementation in progress
