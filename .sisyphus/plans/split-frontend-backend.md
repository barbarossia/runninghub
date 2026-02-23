# Split Frontend/Backend Plan

## TL;DR
> Split the app into separate frontend (UI-only) and backend (API-only) services while preserving all current functionality. Backend runs in Docker on remote server; frontend runs locally and points to backend base URL.
>
> **Deliverables**:
> - Backend service with full API surface
> - Frontend service consuming backend API
> - Docker setup for backend
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: API surface inventory → backend packaging → frontend API base URL

---

## Context

### Original Request
Split runninghub application into frontend and backend. Backend must include all existing functionality. Backend deploys on Docker remote server. Frontend deploys locally. Keep all features.

### Interview Summary
- Backend contains full functionality (all current API routes)
- Frontend is UI only
- Backend deployed on remote Docker
- Frontend runs locally and calls backend

---

## Work Objectives

### Core Objective
Create a backend-only service that exposes the full current API surface and a frontend-only service that consumes it, without feature loss.

### Concrete Deliverables
- Backend build output (API-only)
- Frontend build output (UI-only)
- API base URL config for frontend
- Dockerfile/compose for backend

### Definition of Done
- [ ] All existing features work via frontend + backend split
- [ ] Backend runs in Docker and serves all API routes
- [ ] Frontend runs locally and calls backend successfully

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (Next.js build)
- **Automated tests**: None (manual + curl)

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (Inventory + API surface):
- Task 1: Inventory all API routes and backend dependencies
- Task 2: Identify UI-only routes and shared code
- Task 3: Define frontend API base URL config

Wave 2 (Backend service):
- Task 4: Create backend build output (API-only) without UI routes
- Task 5: Add backend Dockerfile + runtime env
- Task 6: Wire storage paths and filesystem access for backend

Wave 3 (Frontend service):
- Task 7: Create frontend build output (UI-only)
- Task 8: Ensure frontend uses backend base URL for all API calls
- Task 9: Validate full feature parity end-to-end

---

## TODOs

- [ ] 1. Inventory backend API surface (Backend)

  **What to do**:
  - Enumerate all API routes under `runninghub-nextjs/src/app/api`.
  - Identify internal libs used by API routes.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: none

- [ ] 2. Classify UI-only routes and shared modules (Frontend/Backend)

  **What to do**:
  - Identify `src/app` UI routes and shared utilities.
  - Decide which shared modules stay in backend vs frontend.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: none

- [ ] 3. Add frontend API base URL config (Frontend)

  **What to do**:
  - Add env-based API base URL to frontend.
  - Ensure all fetch calls use the backend base URL.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `frontend-ui-ux`

- [ ] 4. Build backend-only output (Backend)

  **What to do**:
  - Create build output that includes only `/api` routes.
  - Ensure all backend dependencies are included.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: none

- [ ] 5. Backend Dockerfile + runtime env (Backend)

  **What to do**:
  - Add Dockerfile for backend service.
  - Configure env vars for RunningHub API and storage paths.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: none

- [ ] 6. Storage and filesystem for backend (Backend)

  **What to do**:
  - Ensure backend uses mounted volumes for workspace paths.
  - Validate file operations for all API routes.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: none

- [ ] 7. Build frontend-only output (Frontend)

  **What to do**:
  - Create UI-only build output that excludes API routes.
  - Ensure pages remain unchanged.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `frontend-ui-ux`

- [ ] 8. Wire frontend to backend (Frontend)

  **What to do**:
  - Route all API calls to backend base URL.
  - Verify CORS if backend is remote.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: none

- [ ] 9. End-to-end verification (Frontend + Backend)

  **What to do**:
  - Run representative workflows from frontend.
  - Validate all key features.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: none

---

## Final Verification Wave
- Run API smoke tests via curl on backend
- Validate frontend features with backend API

---

## Commit Strategy
- Backend split changes (1 commit)
- Frontend API base URL changes (1 commit)
- Docker setup (1 commit)

---

## Success Criteria
- Backend Docker runs and serves all API endpoints
- Frontend runs locally and all features work via backend
- No feature loss from split
