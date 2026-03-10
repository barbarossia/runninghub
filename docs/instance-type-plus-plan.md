# Instance Type Plus - CLI Plan

**Status**: Planning
**Created**: 2026-03-10
**Priority**: High

---

## Overview

Extend the CLI to accept `instanceType` and forward it to RunningHub task creation. When `instanceType` is set to `plus`, the API should include the field; otherwise it should be omitted.

## Requirements

1. CLI supports an `--instance-type` option for workflow runs and ai-app runs.
2. `instanceType` is forwarded to RunningHub API payloads when set to `plus`.
3. Default behavior remains standard (no instanceType field).

## API Reference

`instanceType` is an optional request parameter; allowed value is `"plus"`.

## Implementation Approach

- Add optional `instance_type` parameter in `RunningHubClient` submit methods.
- Update CLI commands to accept and pass through `--instance-type`.
- Ensure JSON output and logging remain unchanged.

## Implementation Steps

1. Update client payloads to include `instanceType` when provided.
2. Add CLI options for instance type on relevant commands.
3. Wire the option through to client calls.

---

## Risks

- Ensure optional parameter does not break existing CLI commands.
