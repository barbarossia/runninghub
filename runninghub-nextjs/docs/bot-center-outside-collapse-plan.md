# Bot Center Outside Click Collapse - Plan

## Overview
Enhance the Bot Center so it can be collapsed by clicking outside the panel (blank page area), not only by clicking the minimize button. The outside click should not interfere with interactions inside the Bot Center or its dropdown/portal content.

## Goals
- Clicking anywhere outside the Bot Center panel collapses it.
- Interactions inside the Bot Center panel do **not** collapse it.
- Interactions inside Bot Center portal content (e.g., Select dropdown) do **not** collapse it.
- Works in both dock and float modes.

## Non-Goals
- No changes to Bot Center styling, layout, or bot logic.
- No new keyboard shortcuts or auto-close timers.
- No changes to Message Center behavior.

## Current State
- Bot Center opens from PageHeader and only collapses via the minimize button.
- No outside-click handling is implemented.

## Target State
- When Bot Center is open, clicking outside the panel collapses it.
- Clicking inside the panel or inside related portal content keeps it open.

## Technical Approach
1. Add a `ref` to the Bot Center card container.
2. Add a document-level `pointerdown` (or `mousedown`) listener when Bot Center is open.
3. On click, if the target is outside the panel **and** not within elements marked to ignore outside clicks (e.g., SelectContent), call `setOpen(false)`.
4. Add a `data-bot-center-ignore-outside` attribute to portal content that should not trigger close (SelectContent).

## UX Notes
- The outside click should still allow the original click target to receive the event (no overlay blocking).
- Collapsing should feel instant and consistent with the minimize button behavior.

## Risks / Considerations
- Radix UI portals render outside the panel DOM tree; they must be opted out from outside-click detection.
- Ensure the listener is cleaned up to avoid memory leaks.

## Success Criteria
- Bot Center closes on any click outside of its panel.
- Bot Center remains open when interacting with its own controls, including the bot Select dropdown.
- No regression in dock/float mode behavior.
