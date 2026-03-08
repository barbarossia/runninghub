# Backend Docker Permissions TODOs

- [ ] Update `Dockerfile.backend` to ensure `runninghub_cli` files are readable by the runtime user
- [ ] Ensure `/data/runninghub-tasks` exists at container startup for mounted volumes
- [ ] Ensure CLI workflow lookup points at `/data/workflows` in Docker
- [ ] Rebuild backend image and restart container
- [ ] Re-run backend API tests for `/api/workflow/nodes` and `/api/workspace/execute`
