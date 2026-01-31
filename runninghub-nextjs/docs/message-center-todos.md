# Message Center - Implementation TODOs

## Phase 1: Store + Base UI
- [x] Create `src/store/message-center-store.ts` with UI state + read/dismiss tracking.
- [x] Add types for message status and job metadata mapping.
- [x] Build `MessageCenter` component (list, empty state, controls, collapsed toggle).

## Phase 2: Global Layout Integration
- [x] Mount Message Center in `src/app/layout.tsx` next to `AspectRatioTool`.
- [x] Implement docked (top-right) vs floating layout styles.
- [x] Add open/close toggle and dock mode switch.

## Phase 3: Job Status Integration
- [x] Identify existing job/task status update points.
- [x] Derive running/completed/failed messages from workspace jobs.
- [x] Sync message read/unread when status changes.

## Validation
- [ ] Verify Message Center appears on every page.
- [ ] Verify floating mode does not block core UI.
- [ ] Verify docked mode respects layout and scroll.
- [ ] Verify message add/update/clear workflows.
