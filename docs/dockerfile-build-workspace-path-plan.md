# Dockerfile Build WORKSPACE_PATH Plan

## Goal
Ensure `npm run build:backend` succeeds during Docker build by providing a safe build-time `WORKSPACE_PATH` in the builder stage.

## Non-Goals
- Changing runtime workspace defaults.
- Modifying application logic for workspace resolution.

## Scope
- Set a temporary build-time workspace path in `Dockerfile.backend` before running the backend build.
- Create the directory so Next.js build-time module evaluation succeeds.

## Output
- Updated `Dockerfile.backend` builder stage.
