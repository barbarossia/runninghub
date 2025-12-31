# Media Gallery Sorting Feature - Implementation Plan

## Overview

Add sorting functionality to the media gallery (images and videos) to allow users to order files by various criteria such as date, type, name, size, etc.

## Current State

### Existing Functionality
- Gallery displays images from selected folder
- Basic filtering by:
  - Search query (name/path)
  - File extension
- No sorting functionality currently exists

### Data Structure

**ImageFile Interface** (`src/types/index.ts`):
```typescript
interface ImageFile {
  name: string;
  path: string;
  size: number;
  type: 'image';
  extension: string;
  is_virtual?: boolean;
  file_handle_info?: FileHandleInfo;
  blob_url?: string;
}
```

**Current Store** (`src/store/image-store.ts`):
- `images: ImageFile[]` - Original image list
- `filteredImages: ImageFile[]` - Filtered (but not sorted) results
- `searchQuery: string` - Search filter
- `selectedExtension: string | null` - Extension filter

### Missing Features
1. **Timestamp fields**: No `created_at`, `modified_at`, or `lastModified` fields on ImageFile
2. **Sort state**: No tracking of current sort field or direction
3. **Sort UI**: No sort controls in the gallery interface
4. **Sort logic**: No sorting implementation in the store

## Target State

### User Requirements
Users should be able to sort media files by:
1. **Name** - Alphabetical (A-Z or Z-A)
2. **Date** - Creation or modification date (newest/oldest)
3. **Size** - File size (largest/smallest)
4. **Type** - File extension/type

### UI Requirements
- Sort dropdown or button group in the gallery toolbar
- Visual indicator of current sort field and direction
- Sort should persist across page refreshes (localStorage)
- Sort should work alongside existing filters (search, extension)

### Technical Requirements
1. Add timestamp fields to ImageFile/VideoFile interfaces
2. Add sort state to image-store
3. Implement sorting logic in applyFilters()
4. Create sort control UI component
5. Integrate sort controls into gallery page

## Implementation Approach

### Phase 1: Type Definitions & Store State (30 min)

**Tasks**:
1. Update `ImageFile` and `VideoFile` interfaces to include timestamp fields
2. Add sort state to `image-store.ts`:
   - `sortField: 'name' | 'date' | 'size' | 'type'`
   - `sortDirection: 'asc' | 'desc'`
3. Add sort actions:
   - `setSortField(field: SortField) => void`
   - `setSortDirection(direction: SortDirection) => void`
   - `setSorting(field: SortField, direction: SortDirection) => void`

**Files to Modify**:
- `src/types/index.ts` - Add timestamps to ImageFile/VideoFile
- `src/store/image-store.ts` - Add sort state and actions

### Phase 2: Sorting Logic (45 min)

**Tasks**:
1. Implement `sortImages()` helper function
2. Integrate sorting into `applyFilters()` action
3. Ensure sorting works after filtering (filter → sort order)
4. Handle missing timestamp data (graceful degradation)

**Sorting Logic**:
```typescript
// Sort function
const sortImages = (images: ImageFile[], field: SortField, direction: SortDirection) => {
  return [...images].sort((a, b) => {
    let comparison = 0;

    switch (field) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'date':
        // Use modifiedAt or createdAt if available
        const aDate = a.modifiedAt || a.createdAt || 0;
        const bDate = b.modifiedAt || b.createdAt || 0;
        comparison = aDate - bDate;
        break;
      case 'size':
        comparison = a.size - b.size;
        break;
      case 'type':
        comparison = a.extension.localeCompare(b.extension);
        break;
    }

    return direction === 'asc' ? comparison : -comparison;
  });
};
```

**Files to Modify**:
- `src/store/image-store.ts` - Update `applyFilters()` to include sorting

### Phase 3: UI Components (1 hour)

**Tasks**:
1. Create `MediaSortControls` component
2. Add sort dropdown/button group to gallery
3. Add sort direction toggle (asc/desc)
4. Show visual indicator of current sort
5. Persist sort preferences in localStorage

**Component Design**:
```tsx
interface MediaSortControlsProps {
  sortField: SortField;
  sortDirection: SortDirection;
  onSortChange: (field: SortField, direction: SortDirection) => void;
  className?: string;
}
```

**UI Mockup**:
```
┌─────────────────────────────────────────┐
│ [Sort by: Name ▼] [↑↓]                 │
└─────────────────────────────────────────┘
Dropdown options:
- Name (A-Z)
- Name (Z-A)
- Date (Newest)
- Date (Oldest)
- Size (Largest)
- Size (Smallest)
- Type (A-Z)
```

**Files to Create**:
- `src/components/images/MediaSortControls.tsx`

**Files to Modify**:
- `src/app/gallery/page.tsx` - Add sort controls
- `src/components/images/SelectedFolderHeader.tsx` - Possibly add sort button

### Phase 4: Backend Integration (30 min)

**Tasks**:
1. Update `/api/images/list` or `/api/folder/contents` to return timestamps
2. Extract file stats (created, modified) from filesystem
3. Handle cases where timestamps aren't available

**API Response Update**:
```typescript
interface ImageFile {
  name: string;
  path: string;
  size: number;
  type: 'image';
  extension: string;
  created_at?: number;  // NEW
  modified_at?: number; // NEW
  // ... other fields
}
```

**Files to Modify**:
- `src/app/api/images/list/route.ts` or similar
- Backend Python CLI if needed

### Phase 5: Testing & Polish (30 min)

**Tasks**:
1. Test all sort options (name, date, size, type)
2. Test sort direction toggle
3. Test sort + filter combinations
4. Test localStorage persistence
5. Test with missing timestamp data
6. Add loading states if needed
7. Verify responsive design on mobile

**Test Scenarios**:
- Sort by name → verify alphabetical order
- Sort by date → verify newest/oldest order
- Sort by size → verify largest/smallest order
- Sort by type → verify extension grouping
- Search + Sort → verify filter then sort order
- Extension filter + Sort → verify filter then sort order
- Page refresh → verify sort preference persists

## Design Decisions

### 1. Timestamp Data Source
**Question**: Where do we get file timestamps from?

**Options**:
- **Option A**: Backend API returns `stat` results (created, modified)
- **Option B**: Client-side filesystem API (if available)
- **Option C**: Hybrid - try backend, fallback to client

**Decision**: Option A - Backend API
- Works for both local and virtual folders
- Consistent data source
- More reliable than client-side APIs

### 2. Sort Persistence
**Question**: Where do we persist sort preferences?

**Options**:
- **Option A**: Zustand persist middleware (localStorage)
- **Option B**: URL query params
- **Option C**: Both

**Decision**: Option A - Zustand persist
- Simpler implementation
- Already used for other preferences (viewMode)
- No URL clutter

### 3. UI Component Placement
**Question**: Where do we place sort controls?

**Options**:
- **Option A**: In SelectedFolderHeader (next to refresh button)
- **Option B**: In SelectionToolbar (below header)
- **Option C**: Separate row between header and gallery

**Decision**: Option A - SelectedFolderHeader
- Keeps all controls together
- Standard pattern (sort controls near filter controls)
- Clean layout

### 4. Sort Direction UI
**Question**: How do users toggle sort direction?

**Options**:
- **Option A**: Separate asc/desc buttons
- **Option B**: Single button that toggles
- **Option C**: Included in sort dropdown (Name A-Z, Name Z-A)

**Decision**: Option C - Included in dropdown
- Fewer UI elements
- Clearer intention
- Industry standard (Photoshop, Lightroom, etc.)

## Implementation Phases

### Phase 1: Data Model & Store (30 min)
- [ ] Update ImageFile/VideoFile interfaces
- [ ] Add sort state to image-store
- [ ] Add sort actions to image-store

### Phase 2: Sorting Logic (45 min)
- [ ] Implement sortImages helper
- [ ] Update applyFilters to include sorting
- [ ] Handle missing timestamp data

### Phase 3: UI Components (1 hour)
- [ ] Create MediaSortControls component
- [ ] Integrate into gallery page
- [ ] Add localStorage persistence

### Phase 4: Backend Integration (30 min)
- [ ] Update API to return timestamps
- [ ] Extract file stats from filesystem

### Phase 5: Testing & Polish (30 min)
- [ ] Test all sort options
- [ ] Test sort + filter combinations
- [ ] Verify localStorage persistence
- [ ] Responsive design testing

**Total Estimated Time**: 3-3.5 hours

## Success Criteria

✅ Users can sort images by name, date, size, and type
✅ Sort direction can be toggled (ascending/descending)
✅ Sort preferences persist across page refreshes
✅ Sorting works alongside existing filters (search, extension)
✅ UI follows gallery page design standards
✅ No build errors or TypeScript errors
✅ Responsive design works on mobile devices

## Risks & Mitigation

### Risk 1: Missing Timestamp Data
**Risk**: Backend API might not return timestamps for all files
**Mitigation**: Graceful degradation - sort by name if timestamp unavailable, show tooltip

### Risk 2: Performance with Large Folders
**Risk**: Sorting 1000+ images might cause lag
**Mitigation**:
- Use efficient sorting algorithms (Array.prototype.sort is O(n log n))
- Consider virtualization if needed (already using grid layout)
- Show loading state during sort

### Risk 3: Cross-Page Consistency
**Risk**: Video page also needs sorting (separate store)
**Mitigation**: Create reusable sort logic or use shared base store

## Future Enhancements

- Multi-column sort (e.g., date then name)
- Custom sort order (drag and drop)
- Save favorite sort presets
- Sort by dimensions (width, height)
- Sort by aspect ratio
- Sort by EXIF data (camera, lens, etc.)

---

**Created**: 2025-12-31
**Author**: Development Team
**Status**: Planning
