## Overview
Force a workspace refresh after video conversion completes so new output files appear without manual refresh.

## Current State
- Convert actions start a background task and rely on SSE updates.
- No guaranteed refresh when the conversion task completes.

## Target State
- When a convert task completes, the workspace refreshes once.

## Requirements
- Keep existing task handling behavior intact.
- Refresh only when conversion completes (no auto-refresh intervals).

## Implementation Phases
1. Detect conversion task completion in task completion handler.
2. Trigger a workspace refresh after completion.
3. Manual verify in Convert tab.
