# Build Target WORKSPACE_PATH Plan

## Goal
Ensure `npm run build:backend` succeeds even when `WORKSPACE_PATH` is not provided during Docker build.

## Non-Goals
- Changing runtime environment requirements.
- Modifying `WORKSPACE_PATH` semantics outside build.

## Scope
- Provide a build-time fallback workspace path inside `build-target.mjs`.
- Ensure the fallback directory exists before running the Next.js build.

## Approach
- If `WORKSPACE_PATH` is unset, set it to a temporary cache workspace under `.build-cache/workspace` for the build step only.

## Output
- Updated `runninghub-nextjs/scripts/build-target.mjs`.
