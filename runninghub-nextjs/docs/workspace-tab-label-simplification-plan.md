# Workspace Tab Label Simplification Plan

## Goal
Simplify workspace tab labels for quicker scanning and less visual noise.

## Scope
- Update tab trigger labels only in the Workspace tabs UI.
- No changes to tab values, routing, or functionality.

## Non-Goals
- Renaming internal tab values (e.g., `run-workflow`).
- Changing other UI copy outside the tab triggers.

## Proposed Labels
- "Media Gallery" → "Gallery"
- "Run Workflow" → "Workflow"
- "Run Complex Workflow" → "Complex Workflow"

## Implementation Notes
- Update text nodes in `src/app/workspace/page.tsx` where tab triggers render.
- Keep icons and layout unchanged.

## Validation
- Open Workspace page and verify the three tab labels render as intended.
- Ensure tab switching still works normally.
