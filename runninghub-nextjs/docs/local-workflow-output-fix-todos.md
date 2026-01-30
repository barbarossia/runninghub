# Local Workflow Output Fix TODOs

- [x] Create plan `runninghub-nextjs/docs/local-workflow-output-fix-plan.md`.
- [x] implement `processLocalJobOutputs` in `src/app/api/workspace/execute/route.ts`.
- [x] Update `processWorkflowInBackground` to capture input mtimes.
- [x] Update `processWorkflowInBackground` to call `processLocalJobOutputs` for local execution type.
- [x] Verify build (`npm run build`).
