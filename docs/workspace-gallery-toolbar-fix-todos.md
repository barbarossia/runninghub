# Workspace Gallery Toolbar Fix - TODO List

> **Plan Document**: See [workspace-gallery-toolbar-fix.md](./workspace-gallery-toolbar-fix.md) for detailed implementation plan.

---

## Progress Summary

- **Branch**: `fix/workspace`
- **Created**: 2025-12-25
- **Status**: 🟡 In Progress

---

## Phase 1: Store Updates

**File**: `src/store/workspace-store.ts`

- [x] Update `viewMode` type from `'grid' | 'list'` to `'grid' | 'list' | 'large'`
- [x] Add `selectedExtension: string | null` to state interface
- [x] Add `setSelectedExtension(extension: string | null) => void` to actions interface
- [x] Update `setViewMode` signature to accept `'large'`
- [x] Initialize `selectedExtension: null` in initial state
- [x] Implement `setSelectedExtension` action in store
- [x] Add `selectedExtension` to persist partialize function

---

## Phase 2: MediaGallery Component Updates

**File**: `src/components/workspace/MediaGallery.tsx`

- [x] Import `Maximize2` icon from lucide-react
- [x] Read `selectedExtension` from `useWorkspaceStore()`
- [x] Read `setSelectedExtension` from `useWorkspaceStore()`
- [x] Read `setViewMode` from `useWorkspaceStore()`
- [x] Remove local `typeFilter` state
- [x] Add `useMemo` hook to compute `uniqueExtensions` from `mediaFiles`
- [x] Update `filteredFiles` filter logic to use `selectedExtension`
- [x] Update toolbar - replace static type filter with dynamic extension filter
- [x] Add "Large" view mode button to view mode switcher
- [x] Update `gridCols` calculation to support `'large'` view mode
- [x] Add file count display below toolbar
- [x] Update empty state to use `selectedExtension` instead of `typeFilter`

---

## Phase 3: Build & Test

- [x] Run `npm run build` - verify TypeScript compilation
- [ ] Test extension filter buttons appear
- [ ] Test clicking extension button filters files
- [ ] Test "All" button clears filter
- [ ] Test Large view mode displays correctly
- [ ] Test file count display shows correct info
- [ ] Test selected extension persists after refresh
- [ ] Test view mode persists after refresh
- [ ] Fix any build errors or test failures

---

## Detailed Implementation Notes

### Extension Filter Logic

```typescript
// Add to MediaGallery component after searchQuery state
const uniqueExtensions = useMemo(() => {
  const extensions = new Set<string>();
  mediaFiles.forEach((file) => {
    if (file.extension) {
      extensions.add(file.extension);
    }
  });
  return Array.from(extensions).sort();
}, [mediaFiles]);
```

### Filter Logic Update

Replace the existing `filteredFiles` useMemo:

```typescript
// OLD - uses typeFilter
if (typeFilter === 'image' && file.type !== 'image') return false;
if (typeFilter === 'video' && file.type !== 'video') return false;

// NEW - uses selectedExtension
if (selectedExtension && file.extension !== selectedExtension) return false;
```

### Grid Layout Update

Update `gridCols` useMemo:

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

### Toolbar Extension Filter

Replace the static type filter buttons section with:

```tsx
{/* Extension filter */}
<div className="flex gap-1" role="group" aria-label="Filter by file extension">
  <Button
    variant={selectedExtension === null ? 'default' : 'outline'}
    size="sm"
    onClick={() => setSelectedExtension(null)}
    aria-label="Show all files"
    aria-pressed={selectedExtension === null}
  >
    All
  </Button>
  {uniqueExtensions.slice(0, 5).map((ext) => (
    <Button
      key={ext}
      variant={selectedExtension === ext ? 'default' : 'outline'}
      size="sm"
      onClick={() => setSelectedExtension(ext)}
      aria-label={`Filter by ${ext} files`}
      aria-pressed={selectedExtension === ext}
    >
      {ext.replace('.', '').toUpperCase()}
    </Button>
  ))}
</div>
```

### View Mode Buttons

Add Large view mode button:

```tsx
<Button
  variant={viewMode === 'large' ? 'default' : 'outline'}
  size="sm"
  onClick={() => setViewMode('large')}
  aria-label="Large grid view"
  aria-pressed={viewMode === 'large'}
>
  <Maximize2 className="h-4 w-4" />
</Button>
```

### File Count Display

Add below toolbar, before file grid:

```tsx
{/* File count */}
<div className="text-sm text-gray-600">
  {filteredFiles.length} file{filteredFiles.length !== 1 ? 's' : ''}
  {selectedExtension && ` (${selectedExtension.replace('.', '').toUpperCase()})`}
  {searchQuery && ` matching "${searchQuery}"`}
</div>
```

---

## Issues & Resolutions

### Issue 1: TypeScript Build Errors
**Status**: 🟡 Pending

### Issue 2: Extension Filter Not Working
**Status**: 🟡 Pending

### Issue 3: Large View Mode Layout Issues
**Status**: 🟡 Pending

---

## Completion Criteria

- [x] Fix plan document created
- [x] TODO list created
- [ ] All Phase 1 tasks complete
- [ ] All Phase 2 tasks complete
- [ ] All Phase 3 tests passing
- [ ] Build succeeds without errors
- [ ] Changes committed to git
- [ ] Pull request created

---

## Next Steps

1. ✅ Create fix plan document
2. ✅ Create TODO list
3. ⏳ Complete Phase 2 - MediaGallery component updates
4. ⏳ Run build and fix any errors
5. ⏳ Test all functionality
6. ⏳ Commit changes
7. ⏳ Create pull request

---

**Last Updated**: 2025-12-25
