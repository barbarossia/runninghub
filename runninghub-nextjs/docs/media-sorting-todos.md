# Media Gallery Sorting Feature - Implementation TODOs

## Phase 1: Data Model & Store (30 min)

### Update Type Definitions
- [ ] Add `created_at?: number` to ImageFile interface
- [ ] Add `modified_at?: number` to ImageFile interface
- [ ] Add `created_at?: number` to VideoFile interface
- [ ] Add `modified_at?: number` to VideoFile interface
- [ ] Update TypeScript compilation to verify no errors

### Update Image Store State
- [ ] Add `sortField` to ImageState interface
- [ ] Add `sortDirection` to ImageState interface
- [ ] Define SortField type: `'name' | 'date' | 'size' | 'type'`
- [ ] Define SortDirection type: `'asc' | 'desc'`
- [ ] Initialize state with defaults: `sortField: 'name'`, `sortDirection: 'asc'`

### Update Image Store Actions
- [ ] Add `setSortField(field: SortField) => void` action
- [ ] Add `setSortDirection(direction: SortDirection) => void` action
- [ ] Add `setSorting(field: SortField, direction: SortDirection) => void` convenience action
- [ ] Update store persist configuration to include sort state

### Test Phase 1
- [ ] Run `npm run build` - TypeScript should compile
- [ ] Verify store state persists in localStorage
- [ ] Verify no console errors on page load

---

## Phase 2: Sorting Logic (45 min)

### Implement Sort Helper
- [ ] Create `sortImages(images, field, direction)` helper function
- [ ] Implement name sorting (case-insensitive localeCompare)
- [ ] Implement date sorting (modified_at → created_at → 0 fallback)
- [ ] Implement size sorting (numeric comparison)
- [ ] Implement type/extension sorting (localeCompare)
- [ ] Handle ascending/descending direction

### Update applyFilters Action
- [ ] Call sortImages at the end of applyFilters
- [ ] Ensure order: filter by search → filter by extension → sort
- [ ] Update filteredImages with sorted results
- [ ] Add debug logging for troubleshooting

### Handle Edge Cases
- [ ] Handle missing modified_at/created_at (fallback to name sort)
- [ ] Handle undefined/null values in all sort fields
- [ ] Ensure stable sort (same input = same output order)

### Test Phase 2
- [ ] Test name sort (A-Z, Z-A)
- [ ] Test size sort (smallest-largest, largest-smallest)
- [ ] Test type sort (extension alphabetical)
- [ ] Test with files missing timestamps (should not crash)
- [ ] Test sort + search filter combination
- [ ] Test sort + extension filter combination

---

## Phase 3: UI Components (1 hour)

### Create MediaSortControls Component
- [ ] Create `src/components/images/MediaSortControls.tsx`
- [ ] Define MediaSortControlsProps interface
- [ ] Implement sort dropdown with options:
  - Name (A-Z)
  - Name (Z-A)
  - Date (Newest)
  - Date (Oldest)
  - Size (Largest)
  - Size (Smallest)
  - Type (A-Z)
- [ ] Add sort direction toggle button (↑/↓ icons)
- [ ] Show current selection with checkmark
- [ ] Style to match gallery design system
- [ ] Add tooltips for accessibility

### Integrate into Gallery Page
- [ ] Add MediaSortControls to SelectedFolderHeader or create new toolbar row
- [ ] Connect to image-store state
- [ ] Wire up onSortChange callback
- [ ] Ensure responsive layout (mobile friendly)

### Add Visual Feedback
- [ ] Show active sort field in UI
- [ ] Show active sort direction with arrow icon
- [ ] Add hover states
- [ ] Add focus states for keyboard navigation
- [ ] Add transitions for smooth UX

### Test Phase 3
- [ ] Verify dropdown opens and closes correctly
- [ ] Verify clicking sort option updates store
- [ ] Verify images reorder immediately
- [ ] Verify sort direction toggle works
- [ ] Test on mobile (responsive design)
- [ ] Test keyboard navigation (Tab, Enter, Arrow keys)

---

## Phase 4: Backend Integration (30 min)

### Update API Endpoint
- [ ] Identify which API endpoint returns image list
- [ ] Read current implementation to understand data flow
- [ ] Add file stat extraction (created, modified times)
- [ ] Update ImageFile response to include timestamps
- [ ] Handle virtual folders (File System Access API)
- [ ] Handle local folders (Node.js fs.stat)

### Update File System Utility
- [ ] Check if `src/utils/filesystem.ts` or similar exists
- [ ] Add `getFileStats(path)` function if needed
- [ ] Extract birthtime (created) and mtime (modified)
- [ ] Convert to Unix timestamp (milliseconds)
- [ ] Handle errors (file not found, permission denied)

### Test Phase 4
- [ ] Test API returns timestamps for local folders
- [ ] Test API returns timestamps for virtual folders
- [ ] Test with files that have no timestamp data
- [ ] Verify timestamp accuracy (check a few files manually)
- [ ] Test API response time (no significant slowdown)

---

## Phase 5: Testing & Polish (30 min)

### Manual Testing
- [ ] Sort by name - verify A-Z and Z-A
- [ ] Sort by date - verify newest and oldest
- [ ] Sort by size - verify largest and smallest
- [ ] Sort by type - verify extension order
- [ ] Combine with search filter - verify correct order
- [ ] Combine with extension filter - verify correct order
- [ ] Refresh page - verify sort preference persists
- [ ] Test with 100+ images - verify performance
- [ ] Test with 5 images - verify correct behavior

### Edge Case Testing
- [ ] Test with empty folder (no images)
- [ ] Test with single image
- [ ] Test with images missing timestamps
- [ ] Test with images having same name (different paths)
- [ ] Test with images having same timestamp
- [ ] Test rapid sort changes (click multiple options quickly)

### Cross-Browser Testing
- [ ] Test in Chrome
- [ ] Test in Firefox
- [ ] Test in Safari
- [ ] Test in Edge (if available)

### Accessibility Testing
- [ ] Test with screen reader (VoiceOver/NVDA)
- [ ] Test keyboard navigation
- [ ] Verify ARIA labels are correct
- [ ] Test with high contrast mode
- [ ] Verify color contrast ratios

### Performance Testing
- [ ] Test with 50 images - should be instant
- [ ] Test with 500 images - should be < 1 second
- [ ] Test with 1000 images - should be < 2 seconds
- [ ] Check for memory leaks (repeat sort 50 times)
- [ ] Verify no unnecessary re-renders (React DevTools)

### Build Verification
- [ ] Run `npm run build` - must succeed
- [ ] Check for TypeScript errors
- [ ] Check for ESLint warnings
- [ ] Verify production bundle size is reasonable
- [ ] Test production build locally

---

## Final Checklist

### Before Committing
- [ ] All phases completed (Phases 1-5)
- [ ] Build passes without errors (`npm run build`)
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] All tests pass
- [ ] Code follows project style guidelines
- [ ] Components use correct imports (see CLAUDE.md)
- [ ] UI follows gallery page template
- [ ] Dark mode works correctly (if applicable)

### Documentation
- [ ] Plan document created: `docs/media-sorting-plan.md` ✅
- [ ] TODO list created: `docs/media-sorting-todos.md` ✅
- [ ] TODO items checked off as work progresses
- [ ] Any new components documented in plan

### Git Commit
- [ ] Branch created from latest `main`
- [ ] Branch follows naming convention (`feature/media-sorting`)
- [ ] Commit message follows format guidelines
- [ ] PR description includes summary and testing notes

---

## Quick Reference

### Sort Options
| Field | Direction | Description |
|-------|-----------|-------------|
| name | asc | A to Z |
| name | desc | Z to A |
| date | asc | Oldest first |
| date | desc | Newest first |
| size | asc | Smallest first |
| size | desc | Largest first |
| type | asc | Extension A-Z |

### Files Modified
- `src/types/index.ts` - Add timestamps to interfaces
- `src/store/image-store.ts` - Add sort state and logic
- `src/components/images/MediaSortControls.tsx` - NEW
- `src/app/gallery/page.tsx` - Add sort controls
- API route (TBD) - Return file timestamps

### Files Created
- `docs/media-sorting-plan.md` - This plan
- `docs/media-sorting-todos.md` - This TODO list
- `src/components/images/MediaSortControls.tsx` - Sort UI component

---

**Created**: 2025-12-31
**Last Updated**: 2025-12-31
**Status**: Ready for Implementation
