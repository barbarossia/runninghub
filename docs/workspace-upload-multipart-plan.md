# Workspace Upload Multipart Plan

## Goal
Support multipart uploads to `/api/workspace/upload` for large files while keeping the existing base64 JSON flow.

## Scope
- `runninghub-nextjs/src/app/api/workspace/upload/route.ts`
- `docs/backend-api-invocation.md`

## Approach
- Detect `multipart/form-data` and parse files from `request.formData()`.
- Keep current JSON `{ files: [{ name, data }] }` base64 path.
- Normalize both flows into the same file save + metadata pipeline.

## Success Criteria
- Multipart uploads return `workspacePath` for each file.
- Base64 JSON uploads remain supported and unchanged.
- Build passes.
