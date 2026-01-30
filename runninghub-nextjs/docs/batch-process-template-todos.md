# Local Workflow TODOs

## Planning
- [x] Confirm Local Workflow is separate from RunningHub workflows.
- [x] Confirm editor is full-page (not a toolbar modal).
- [x] Confirm create flow uses existing “Create New” button.

## Data + API
- [x] Add `LocalWorkflow` types in `src/types/`.
- [x] Add storage helpers for local workflow CRUD in `src/lib/`.
- [x] Implement `POST /api/workspace/local-workflow/save`.
- [x] Implement `GET /api/workspace/local-workflow/list`.
- [x] Implement `GET /api/workspace/local-workflow/[workflowId]`.
- [x] Implement `DELETE /api/workspace/local-workflow/[workflowId]`.
- [x] Refactor LocalWorkflow JSON structure (steps -> inputs, remove mapping) to match standard sample.
- [ ] Implement `POST /api/workspace/local-workflow/execute` orchestration.
- [ ] Add structured logging with `writeLog` and taskId.

## UI (Create/Edit)
- [x] Add Local Workflow entry in Workflows tab (Create New → type chooser).
- [x] Merge Local + RunningHub list with badges.
- [x] Build Local Workflow editor for a single operation (no step list UI).
- [x] Use LocalNodeConfigurator for dynamic operation configuration.
- [x] Default input behavior (selected files) without explicit mapping UI.
- [x] Render local editor as full-page content in Workflows tab.
- [x] Show Local workflows in the Quick Run workflow picker.

## Future Execution
- [ ] Wire execute action to call API and set active console taskId.
- [ ] Stop run on first failure.
- [ ] Refresh media gallery after completion (no auto-refresh intervals).

## Auto-Run (Future)
- [ ] Detect multi-selection and workflow assignment in quick-run/complex-run flows.
- [ ] Auto-assign inputs per file using existing compatibility logic.
- [ ] Trigger workflow execution automatically when multiple files are selected.
- [ ] Trigger complex workflow execution automatically when multiple files are selected.
- [ ] Log progress and surface failures in ConsoleViewer.

## QA
- [ ] Create/edit Local Workflow and confirm persistence.
- [ ] Convert workflow saves correct config.
- [ ] Workflows list shows Local vs RunningHub badges.

## Build
- [ ] Run `cd runninghub-nextjs && npm run build` after each phase.
