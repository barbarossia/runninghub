# Backend API Invocation Plan

## Goal
Provide a concise, usage-only guide for invoking backend APIs, with a curl example that runs the workflow named "单图图像反推工作流_api" using the base URL `http://192.168.1.63:49152`.

## Non-Goals
- Explaining how the APIs work internally.
- Covering frontend usage or CLI usage.
- Detailing all backend endpoints beyond what is needed to invoke workflows.

## Scope
- Document base URL and required endpoints for usage.
- Include method + curl samples.
- Provide one primary example: invoke workflow "单图图像反推工作流_api" first.

## Sources
- `runninghub-nextjs/src/app/api/workspace/execute/route.ts`
- `runninghub-nextjs/src/types/workspace.ts`
- `runninghub-nextjs/src/app/api/workflow/list/route.ts`
- `runninghub-nextjs/src/app/api/workflow/nodes/route.ts`
- `runninghub-nextjs/src/app/api/workspace/jobs/route.ts`

## Output
- `docs/backend-api-invocation.md`
