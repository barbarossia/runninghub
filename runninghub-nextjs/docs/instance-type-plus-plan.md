# Instance Type Plus - Frontend Plan

**Status**: Planning
**Created**: 2026-03-10
**Priority**: High

---

## Overview

Add an instance type selector to workflow create/update so users can opt into RunningHub "plus" instances. The default remains standard (no instanceType sent). When "plus" is selected, the workflow execution should pass `instanceType: "plus"` to RunningHub via the CLI.

## Requirements

1. Workflow create/update includes an instance type option with default standard.
2. Workflow storage persists the instance type alongside other workflow fields.
3. Workflow execution passes `instanceType: "plus"` only when selected.
4. Backward compatibility for existing workflows with no instance type set.

## API Reference

RunningHub task creation supports optional `instanceType` with allowed value `"plus"`. When set, tasks route to 48GB VRAM machines.

## Implementation Approach

- Add `instanceType` to `Workflow` and request types.
- Update `WorkflowEditor` UI to allow selecting Standard vs Plus.
- Ensure saved workflows include `instanceType` and that execution uses it when invoking CLI.
- Default to standard by omitting `instanceType` in payload when not set to plus.

## Implementation Steps

1. Update `Workflow` type with an `instanceType` field.
2. Add instance type selector in `WorkflowEditor` with default standard.
3. Ensure workflow save/import/edit flows set instance type to standard when missing.
4. Pass instance type into `/api/workspace/execute` CLI invocation.
5. Run frontend build after changes.

---

## Risks

- Existing workflows without `instanceType` must continue to run as standard.
- CLI must ignore `instanceType` unless "plus" is selected.
