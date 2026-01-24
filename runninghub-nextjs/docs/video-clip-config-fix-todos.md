# Video Clip Configuration Fix TODOs

- [x] Modify `src/store/video-clip-store.ts` to enforce mutual exclusivity in `toggleSaveToWorkspace`.
- [x] Update `src/app/api/videos/clip/route.ts` to accept `outputDir` in request payload.
- [x] Refactor `clipSingleVideo` to use passed `outputDir` instead of accessing store.
- [x] Update `src/app/workspace/page.tsx` to pass `selectedFolder.folder_path` in the API request.
- [x] Verify build passes.
