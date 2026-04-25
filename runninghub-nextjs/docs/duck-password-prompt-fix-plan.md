## Overview
Fix duck image decode UX so password dialog is not shown by default.

## Current State
- Decode actions treat unknown password state as password-required.
- `duckRequiresPassword !== false` causes dialog to open even when no password is needed.

## Target State
- Password dialog opens only when `duckRequiresPassword === true`.
- If password requirement is `false` or unknown, decode runs directly without prompting.

## Scope
- `runninghub-nextjs/src/components/workspace/MediaSelectionToolbar.tsx`
- `runninghub-nextjs/src/components/workspace/MediaGallery.tsx`

## Out of Scope
- Duck validation API behavior.
- Duck decoding backend/CLI flow.

## Implementation Phases
1. Replace prompt gating checks with explicit `=== true` logic.
2. Ensure direct decode path uses empty password by default.
3. Validate build and verify no TypeScript regressions.
