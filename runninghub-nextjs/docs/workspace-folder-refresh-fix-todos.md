- [x] Track folder changes and clear media list.
- [ ] Manual check: switching to subfolder shows only that folder contents.

---

## Folder State Refresh Fix (2026-02-17)

### Issue Summary
The folder state management has 3 bugs causing unnecessary API calls:
1. **F5 double load** - folder loaded twice on page mount
2. **Delete double processing** - store removal + SSE triggers redundant refresh
3. **Cascading refreshes** - batch delete causes N sequential full API calls

### Tasks

- [ ] **Fix F5 Double Load**: Remove redundant `loadFolderContents` call in either `onFolderLoaded` callback OR `useEffect[selectedFolder]` in `workspace/page.tsx`
- [ ] **Fix Delete Double Processing**: Remove `setTimeout(() => handleRefresh(), 100)` in SSE unlink handler at line ~855-857 in `workspace/page.tsx`
- [ ] **Fix Cascading Refreshes**: Implement debounced refresh or single refresh after batch operations complete
- [ ] **Test**: Verify page mount loads folder once, delete removes from store without extra API call, batch delete triggers only one refresh

### Files to Modify
- `runninghub-nextjs/src/app/workspace/page.tsx`
