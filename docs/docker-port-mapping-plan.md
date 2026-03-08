# Docker Port Mapping Plan

## Goal
Run the backend server on port 3000 inside the container and expose it as 49152 on the host.

## Scope
- `Dockerfile.backend`
- `docker-compose.yml`

## Approach
- Set `PORT=3000` and `EXPOSE 3000` in the backend image.
- Map `49152:3000` in docker-compose.

## Success Criteria
- Container listens on 3000 internally.
- Host can access API via `http://localhost:49152`.
