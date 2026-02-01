# Workspace-Only Entry Deprecation TODOs

- [x] Confirm root route behavior (`/` redirect vs. workspace moved to `/`).
- [x] Confirm API removal scope for `/api/videos/*` and `/api/images/*` (keep/migrate/remove).
- [x] Remove `/gallery` page and any navigation links to it.
- [x] Remove `/videos` page and any navigation links to it.
- [x] Update root route per decision (redirect or move workspace page).
- [x] Remove YouTube tab from workspace UI and its component usage.
- [x] Keep YouTube API routes without UI (per decision).
- [x] Keep legacy image/video API routes per scope decision.
- [x] Delete unused components/stores/constants after removals.
- [ ] Run `npm run build` in `runninghub-nextjs/`.
