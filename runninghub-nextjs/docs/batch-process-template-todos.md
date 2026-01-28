# Batch Process Template TODOs

## Planning
- [ ] Confirm local operations supported (convert, clip, crop, resize, duck decode, caption).
- [x] Define batch failure policy (stop on first error).

## Data + API
- [ ] Add `BatchProcessTemplate` types in `src/types/`.
- [ ] Add storage helpers for template CRUD in `src/lib/`.
- [ ] Implement `POST /api/workspace/batch-process-template/save`.
- [ ] Implement `GET /api/workspace/batch-process-template/list`.
- [ ] Implement `GET /api/workspace/batch-process-template/[templateId]`.
- [ ] Implement `DELETE /api/workspace/batch-process-template/[templateId]`.
- [ ] Implement `POST /api/workspace/batch-process-template/execute` orchestration.
- [ ] Add structured logging with `writeLog` and taskId.

## Store
- [ ] Add `batchProcessTemplates` to workspace store or new store.
- [ ] Add actions: load/list/save/delete templates.

## UI
- [ ] Add "Batch Process" button to `MediaSelectionToolbar` (Workspace only).
- [ ] Create `BatchProcessDialog` component (template selection + builder).
- [ ] Add step editor for local/workflow steps with mappings and static values.
- [ ] Show single vs batch mode summary based on selection count.
- [ ] Wire execute action to call API and set active console taskId.

## Integration
- [ ] Use existing local operation APIs in execution route.
- [ ] Pass outputs from step to step; last step output defines result.
- [ ] Refresh media gallery after completion (no auto-refresh intervals).

## QA
- [ ] Single file: convert -> workflow.
- [ ] Batch files: workflow -> resize.
- [ ] Duck decode step with password and without password.
- [ ] Caption step writes txt alongside media.
- [ ] Error handling logs and user toast.

## Build
- [ ] Run `cd runninghub-nextjs && npm run build` after each phase.
