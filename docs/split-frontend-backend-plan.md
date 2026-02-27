# Split Frontend/Backend Plan

## Goal
Split the RunningHub app into two deployable services while keeping full feature parity:
- Frontend: UI-only build, runs locally, calls backend over HTTP
- Backend: API-only build, runs on remote server in Docker

## Confirmed Requirements (Headless/Backend)
- Backend build output includes only `/api` routes
- No UI pages or web UI in backend build
- Backend includes all current functionality (not a reduced feature set)
- Backend runs in Docker on headless server
- Storage path is mounted at runtime via docker compose (switchable path)
- Build target selected via env switch (no runtime guard)
- Separate Docker image for backend build

## Confirmed Requirements (Frontend)
- Frontend build is UI-only
- Frontend calls backend using an API base URL env var
- Existing features remain intact

## Constraints
- Preserve all current features and behavior
- No runtime guard for headless/UI; use build target only
- Backend build must not emit any non-API routes
- Keep docs updated

## Open Questions
- None on scope/constraints; pending decisions listed below

## Plan Skeleton
1. Inventory current `src/app` routing and API usage to scope API-only build
2. Add build target switch (env: `RUNNINGHUB_BUILD_TARGET=backend|frontend`) in Next config and scripts
3. Backend target: emit only `/api` routes; ensure UI pages are excluded at build time (no runtime guard)
4. Frontend target: UI-only build; wire API base URL env to all API calls
5. Add backend Dockerfile + compose notes for volume mount and env vars
6. Document runbook, build targets, and environment variables
7. Verify backend build (API-only) and frontend build (UI-only)

## Risks
- Type errors in API route typing could block backend build
- UI references may leak into backend build output

## Decisions Needed
## Decisions
- Backend API base URL env var name: `BACKEND_API_GATEWAY`
- Backend build output mode: Docker image (package API-only build for container runtime)
