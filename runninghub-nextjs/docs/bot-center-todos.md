# Bot Center + Bot Builder - TODOs

## Phase 1: Planning + Types
- [x] Review existing Message Center + Job History actions for reuse.
- [x] Define bot types + config schemas in `src/types/bot.ts`.
- [x] Create `src/store/bot-center-store.ts` (persisted) with UI state + default bots.

## Phase 2: Bot Center UI
- [x] Create `src/components/ui/BotCenter.tsx` with minimized picker + expanded panel.
- [x] Add dock/float toggle and minimize control (mirror Message Center patterns).
- [x] Show bot list, selected bot details, and Run button.

## Phase 3: Bot Builder
- [x] Add Bot Builder panel (inline or modal) to edit bot name + config.
- [x] Support reset to defaults.
- [x] Persist changes via store.

## Phase 4: Bot Execution
- [x] Add `src/utils/bots.ts` with `runJobStatusBot` + `runAutoSaveDecodeBot`.
- [x] Implement Job Status bot summary output (counts + recent list).
- [x] Implement Auto Save + Decode bot using existing API endpoints.

## Phase 5: Integration
- [x] Mount `BotCenter` in `src/app/layout.tsx` alongside Message Center.
- [x] Wire to `useWorkspaceStore` jobs and workspace folder.
- [x] Add toasts for success/failure.

## Validation
- [ ] Bot Center renders globally and can be minimized.
- [ ] Bot picker appears when collapsed.
- [ ] Job Status bot shows correct counts and recent jobs.
- [ ] Auto Save + Decode bot copies and decodes outputs into workspace folder.
