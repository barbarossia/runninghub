## Overview
Prevent SSE updates from previous folders from polluting the current workspace media list.

## Current State
- SSE updates are applied without validating they belong to the current folder.
- Old folder updates can appear after switching folders.

## Target State
- SSE update/remove/caption events are ignored unless they belong to the active folder.

## Requirements
- Keep existing SSE flow and refresh behavior.
- Only filter by current folder path on the client.

## Implementation Phases
1. Add path guard helper in workspace SSE handlers.
2. Apply guard for update/remove/caption events.
3. Manual verify switching folders and file changes.
