# Backend Docker Permissions Plan

## Goal
Ensure the backend container can import `runninghub_cli` without manual chmod/chown by fixing permissions in the Dockerfile build.

## Scope
- Backend image build steps in `Dockerfile.backend`.
- Read access for `runninghub_cli/__init__.py` and related modules.

## Approach
- Set readable permissions for the Python package files during image build.
- Prefer a directory-wide chmod to keep package files consistent and readable.
- Ensure `/data/runninghub-tasks` exists at container start when using a mounted volume.
- Ensure CLI workflow lookup resolves to `/data/workflows` inside Docker.

## Success Criteria
- `GET /api/workflow/nodes` no longer fails with `PermissionError`.
- `POST /api/workspace/execute` no longer fails due to missing `/data/runninghub-tasks`.
- `runninghub_cli` can load workflow JSON from the mounted workspace.

## Notes
- No manual container changes; fix must be in Dockerfile.
