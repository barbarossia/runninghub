# Workspace Clip Refresh Fix TODOs

- [x] Locate Clip tab refresh handler in `src/app/workspace/page.tsx` and trace folder reload path.
- [x] Inspect SSE subscription setup and error handling for media updates.
- [x] Update refresh logic to force reload of latest folder contents for Clip tab.
- [x] Ensure SSE errors do not block manual refresh or leave state stale.
- [ ] Smoke check: add new file to folder, click Refresh, verify newest items appear.
- [ ] Run `npm run build`.
