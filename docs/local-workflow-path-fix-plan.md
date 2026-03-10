# Local Workflow Path Fix Plan

## Goal
Ensure local workflow JSON files are loaded from `${WORKSPACE_PATH}/local-workflows` in Docker instead of `~/Downloads/workspace`.

## Scope
- `runninghub-nextjs/src/lib/local-workflow-utils.ts`
- `runninghub-nextjs/src/lib/complex-workflow-utils.ts`
- `runninghub-nextjs/src/app/api/workspace/complex-workflow/execute/route.ts`
- `runninghub-nextjs/src/app/api/workspace/complex-workflow/continue/route.ts`

## Approach
- Replace home-directory paths with `getWorkspaceDir("local-workflows")` and `getWorkspaceDir("workflows")`.
- Keep path logic centralized on `WORKSPACE_PATH`.

## Success Criteria
- Complex workflow execute/continue can load local workflow JSON from `/data/local-workflows`.
- Local workflow save/list/load/delete uses `${WORKSPACE_PATH}/local-workflows`.
