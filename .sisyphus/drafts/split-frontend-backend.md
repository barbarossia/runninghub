# Draft: Split Frontend/Backend

## Requirements (confirmed)
- Split current app into frontend and backend services
- Backend must include all existing functionality (not limited to workflow run/upload)
- Backend deploys in Docker on remote server
- Frontend deploys locally
- Keep full feature set

## Technical Decisions
- Separate services: backend (API + jobs + storage), frontend (UI only)
- Backend exposes all current API routes
- Frontend consumes backend API base URL

## Research Findings
- Pending: map all API routes and shared libs
- Pending: build and docker adjustments

## Open Questions
- None stated

## Scope Boundaries
- INCLUDE: full API surface and UI parity
- EXCLUDE: removing features
