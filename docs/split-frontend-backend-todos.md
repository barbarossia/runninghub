# Split Frontend/Backend TODOs

## Wave 1: Build Target Infrastructure
- [X] Audit `src/app` routing to isolate `/api` routes
- [X] Add build target switch for `frontend` vs `backend`
- [X] Ensure backend build emits only `/api`
- [X] Verify build swap does not leak UI routes
- [X] Decide backend output mode (Docker image packaging) and document

## Wave 2: Backend Docker + Runtime Config
- [X] Add backend-only Dockerfile
- [X] Wire runtime storage mount path config
- [X] Update deployment docs for headless server
- [X] Add compose example for mount path and env vars

## Wave 3: Frontend API Wiring
- [X] Add API base URL env variable for frontend
- [X] Add frontend rewrite/proxy rules if needed
- [X] Validate UI still calls `/api` correctly
- [X] Align API base URL name (`BACKEND_API_GATEWAY`) with docs and env samples

## Wave 4: Verification
- [X] Run backend build and resolve type errors
- [X] Run frontend build
- [ ] Confirm backend output is API-only

## Wave 5: Documentation
- [ ] Update docs with build targets, env vars, and runbook
- [ ] Add example docker compose notes for mount path
