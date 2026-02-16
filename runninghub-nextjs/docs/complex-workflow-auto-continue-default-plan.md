# Complex Workflow Auto-Continue Default Plan

## Overview
Complex workflow executions currently default to `autoContinue: false` when the frontend does not explicitly set it. This causes the execution status to switch to `paused` after each step completion, requiring a manual Continue action that isn’t always visible in the UI. We will make auto-continue the default behavior for complex workflow execution starts and ensure the frontend explicitly opts in.

## Current State
- `POST /api/workspace/complex-workflow/execute` sets `autoContinue` to `false` when not provided.
- Frontend complex workflow execution calls do not pass `autoContinue`.
- Backend sets execution status to `paused` after a step completes when `autoContinue` is false.

## Target State
- Complex workflow executions started from the UI auto-continue by default.
- Backend defaults `autoContinue` to `true` when omitted.
- Frontend explicitly passes `autoContinue: true` to avoid ambiguity.
- Auto-continue uses the correct base URL even when the app is not running on port 3000.

## Requirements
- Default auto-continue for complex workflows without requiring a Continue button.
- Preserve manual control if future UI explicitly sets `autoContinue: false`.
- No change to single-step/manual continue flow if `autoContinue` is intentionally disabled.

## Technical Approach
1. Update backend execute API to default `autoContinue` to `true` when not provided.
2. Update frontend complex workflow execute calls to send `autoContinue: true` explicitly.
3. Persist the request base URL on execution creation and use it for auto-continue calls.
4. Verify auto-continue still respects the existing continue endpoint when `autoContinue` is false.

## Files to Update
- `runninghub-nextjs/src/app/api/workspace/complex-workflow/execute/route.ts`
- `runninghub-nextjs/src/app/api/workspace/execute/route.ts`
- `runninghub-nextjs/src/app/workspace/complex-workflow/execute/[id]/page.tsx`
- `runninghub-nextjs/src/components/workspace/ComplexWorkflowRunner.tsx`
- (Optional) other callers of `/api/workspace/complex-workflow/execute` if found.

## Risks / Notes
- Existing behavior for workflows relying on manual step confirmation must remain possible by explicitly sending `autoContinue: false`.
- Ensure no UI relies on `paused` status as a default state.
