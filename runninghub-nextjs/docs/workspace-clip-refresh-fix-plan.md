# Workspace Clip Refresh Fix Plan

## Overview
Fix the Workspace Clip tab so it reliably loads the newest folder contents when the user clicks Refresh or when the folder contents change. Address SSE subscription error handling so failed connections do not prevent manual refresh from updating the view.

## Current State
- Workspace Clip tab can show stale file lists.
- Clicking Refresh does not update to the latest folder contents.
- Console shows SSE connection errors from `startMediaSubscription` in `src/app/workspace/page.tsx`.

## Target State
- Refresh button always reloads the current folder’s latest contents in the Workspace Clip tab.
- SSE errors do not block manual refresh or leave the UI stuck on stale data.
- Clip tab behavior matches the data refresh policy (refresh only on add/remove or explicit refresh).

## Requirements
- Refresh must re-fetch contents for the currently selected folder and active media type.
- SSE errors should be logged but must not prevent manual refresh or leave subscriptions in a broken state.
- No auto-refresh intervals are introduced.
- Keep ConsoleViewer integration intact.

## Scope
- Workspace page clip tab logic, including refresh handler and SSE subscription lifecycle.
- Any related store refresh action used by the Workspace Clip tab.

## Out of Scope
- Changes to the `/videos/clip` standalone page.
- Any API behavior changes unrelated to fetching folder contents.

## Approach
1. Trace refresh handler in `src/app/workspace/page.tsx` and identify how it triggers list reload for Clip tab.
2. Inspect SSE subscription flow for media updates; ensure it does not prevent refresh when failing.
3. Ensure refresh path requests the latest folder contents (and does not reuse cached/stale data).
4. Add minimal guardrails/logging for SSE errors (keep console error, avoid blocking logic).

## Implementation Phases
1. **Investigation**: Locate refresh handler and Clip tab data-loading paths; map store usage.
2. **Fix**: Adjust refresh logic to reload folder contents for Clip tab; make SSE error handling non-blocking.
3. **Verification**: Confirm manual refresh updates newest files; SSE error no longer blocks updates.

## Success Criteria
- Clicking Refresh updates Clip tab with the newest folder contents.
- SSE connection error can occur without breaking manual refresh.
- No new auto-refresh behavior added.
