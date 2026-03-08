# Complex Workflow API Usage Plan

## Goal
Create a usage-focused document covering all Complex Workflow API endpoints, with request/response examples and execution lifecycle notes.

## Scope
- `runninghub-nextjs/src/app/api/workspace/complex-workflow/**`
- `runninghub-nextjs/src/types/workspace.ts`
- New doc: `docs/complex-workflow-api-usage.md`

## Approach
- Extract endpoint paths, methods, and payload shapes from route handlers.
- Include example requests/responses with real field names.
- Document execution lifecycle and required IDs.

## Success Criteria
- Each complex workflow endpoint has a request + response example.
- Execution flow (save → execute → poll → continue/stop) is clear.
