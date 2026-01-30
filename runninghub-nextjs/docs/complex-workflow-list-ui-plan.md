## Overview
Refresh the Complex Workflows list card UI to align with the Simple Workflows list styling, improving consistency and visual polish in the Workflows tab.

## Current State
- `ComplexWorkflowList` renders basic cards with minimal hierarchy and simple action buttons.
- `WorkflowList` uses a richer layout with icon, badges, metadata, and hover states.

## Target State
- Complex workflow cards match the visual structure and interaction quality of the simple workflow list.
- Maintain existing actions (Edit/Execute/Delete) while improving layout and spacing.
- Keep overall Workflows tab layout unchanged.

## Requirements
1. Update complex workflow cards to use consistent spacing, typography, and hover styles.
2. Include a left icon/visual marker similar to `WorkflowList`.
3. Present description, step counts, and metadata in a tidy hierarchy.
4. Preserve existing actions and behavior (edit, execute, delete).

## Technical Approach
- Mirror card layout patterns from `WorkflowList` (icon block, info column, actions on right).
- Reuse existing Tailwind classes (hover/transition/ring) to keep consistent look.
- Avoid altering list data fetch or behavior.

## Scope Notes
- No new API or data changes.
- Only UI changes in `ComplexWorkflowList`.

## Implementation Phases
1. Update card layout/structure to mirror simple workflow list.
2. Adjust typography and badges for consistent hierarchy.
3. Verify actions and hover states remain functional.
