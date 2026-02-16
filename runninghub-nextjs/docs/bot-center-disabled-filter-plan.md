# Bot Center Disabled Bot Filtering Plan

## Overview
When a bot is disabled in the Bot Builder (e.g., Auto Save + Decode), it still appears in the Bot Center picker. The Bot Center should only list enabled bots so disabled bots do not show as selectable launchers.

## Goals
- Hide disabled bots from the Bot Center picker.
- Keep Bot Builder unchanged (still shows all bots and allows enabling/disabling).
- Ensure the Bot Center remains stable if the selected bot becomes disabled.

## Non-Goals
- No changes to bot execution logic or backend APIs.
- No changes to Bot Builder UI or bot definitions.

## Current State
- Bot Center uses `bots` from `useBotCenterStore` and renders all entries in the Select list.
- Disabled bots can still appear in the Bot Center list (but fail to run with a warning).

## Target State
- Bot Center Select list only includes bots with `enabled: true`.
- If the currently selected bot becomes disabled, Bot Center auto-selects the first enabled bot.
- If no bots are enabled, Bot Center shows a helper message and disables Run.

## Implementation Approach
1. In `BotCenter`, derive `enabledBots` from store `bots`.
2. Update the Select list to render `enabledBots` only.
3. Add a small effect to ensure the selected bot is an enabled bot; fallback to first enabled bot.
4. When there are no enabled bots, show a short message and disable the run button.

## Risks
- If all bots are disabled, Bot Center must avoid calling `runBot` on `undefined` selection.

## Success Criteria
- Disabled bots are not shown in the Bot Center dropdown.
- Selecting and running bots works normally for enabled bots.
- If all bots are disabled, the Bot Center explains why there is no selection.
