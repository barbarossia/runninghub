# Complex Workflow Execution Restore TODOs

- [x] Review execution JSON and job.json structure for inputs/outputs.
- [x] Add helper to ensure execution `id`/`createdAt` and normalize step inputs/outputs.
- [x] Persist full step inputs in `execute` API (fileInputs + textInputs + deleteSourceFiles).
- [x] Persist full step inputs in `continue` API and preserve identity fields.
- [x] Backfill missing inputs/outputs in execution GET using job.json when present.
- [x] Extend `WorkflowInputBuilder` to accept prefilled inputs and deleteSourceFiles.
- [x] Update `ComplexWorkflowRunner` to hydrate inputs per step and pass text defaults.
- [x] Render text outputs in step output display (preview + open link).
- [x] Add history panel toggle in `ComplexWorkflowRunner` layout.
- [x] Apply complex workflow parameter mappings when step inputs are missing (previous-input, static, dynamic).
- [ ] Manual test: resume execution, verify inputs and outputs display, toggle panel.

## Status Notes
- `npm run build` passes.
