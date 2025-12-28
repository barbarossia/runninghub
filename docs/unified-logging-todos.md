# Unified Logging Implementation TODOs

## Phase 1: Core Infrastructure (API)
- [ ] **Update `src/lib/logger.ts`**:
    - [ ] Update `LogEntry` interface to include `source` and `metadata`.
    - [ ] Update `writeLog` to accept `source` (default to 'api').
- [ ] **Update `src/app/api/logs/route.ts`**:
    - [ ] Implement `POST` method to allow the frontend to record logs.
    - [ ] Add basic validation for the log body.

## Phase 2: Frontend Bridge
- [ ] **Create `src/utils/logger.ts`**:
    - [ ] Implement `logger.info`, `logger.success`, `logger.warning`, `logger.error`.
    - [ ] Add logic to conditionally show `toast` and always send to API.
- [ ] **Audit UI Components**:
    - [ ] Replace direct `toast.xxx` calls with `logger.xxx` where persistence in the console is desired.
    - [ ] Focus on: `WorkspacePage`, `Gallery`, and `Video` pages.

## Phase 3: Console UI Enhancements
- [ ] **Update `src/components/ui/ConsoleViewer.tsx`**:
    - [ ] Add visual indicators for `source` (UI/API/CLI).
    - [ ] Add a filter toggle to show/hide logs from specific sources.
    - [ ] Improve search/filtering by `taskId`.

## Phase 4: CLI Integration
- [ ] **Standardize CLI Output Capture**:
    - [ ] Update `processWorkflowInBackground` (in `execute` and `process` routes) to better parse CLI levels.
    - [ ] Ensure all CLI-originated logs have `source: 'cli'`.

## Phase 5: Verification
- [ ] Verify that a `toast` on the frontend correctly creates a persistent entry in the Log Console.
- [ ] Verify that CLI errors are correctly colorized as 'error' in the Log Console.
- [ ] Verify that manual `Refresh` still works and doesn't duplicate logs.
