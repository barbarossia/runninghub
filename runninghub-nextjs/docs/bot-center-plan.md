# Bot Center + Bot Builder - Implementation Plan

## Overview
Introduce a global Bot Center that behaves like a minimized Message Center but allows users to select and run bots. Bots are configurable via a Bot Builder UI. Initial release ships with two bots:
1) **Job Status Bot**: summarizes recent job status and categories.
2) **Auto Save + Decode Bot**: saves job outputs to the workspace folder, and auto-decodes duck-encoded outputs before saving.

## Goals
- Provide a global, minimized bot panel with quick selection (like Message Center).
- Allow bot customization via a Bot Builder panel (name, enabled actions, filters).
- Implement two default bots with defined behaviors.
- Keep refresh behavior user-initiated (no interval polling).

## Non-Goals
- Full conversational AI/chat bot.
- Server-side bot execution or scheduling.
- Auto-running bots in the background without user action.

## Current State
- **Message Center** exists and is globally mounted.
- **Job History** supports manual refresh and per-job re-query.
- **Save to workspace** and **duck decode** actions exist in Job History/Job Detail.
- No bot framework or bot customization UI exists.

## Target State
- A **Bot Center** component is mounted globally (next to Message Center) with a minimized “bot picker” dialog.
- A **Bot Builder** UI allows users to edit bot settings (name, enabled actions, filters) and persist them in a store.
- **Job Status Bot** runs on selection/trigger and displays summary results.
- **Auto Save + Decode Bot** runs on selection/trigger and saves outputs to the workspace folder (auto-decode if needed).

## UX Requirements
- Bot Center behaves like Message Center: dock/float and minimized states.
- When minimized, show a compact dialog to select a bot.
- Bot Builder should be accessible from Bot Center (e.g., gear button).
- Actions are user-triggered (no background polling).
- Respect workspace folder selection requirements (prompt if missing).

## Bot Definitions (Initial)
### 1) Job Status Bot
- **Trigger**: user selects bot and clicks “Run” (or auto-run on select).
- **Input**: current jobs in store; optionally re-fetch `/api/workspace/jobs` if user clicks “Refresh”.
- **Output**:
  - Summary counts by status (queued/pending/running/completed/failed).
  - Recent jobs list (N configurable, default 5) with workflow name, status, timestamp.
  - Optional grouping by workflow name.
- **Notes**: No polling; results are snapshots.

### 2) Auto Save + Decode Bot
- **Trigger**: user clicks “Run”.
- **Input**: completed jobs with outputs in job history.
- **Behavior**:
  - For each output: if encoded, run duck decode; then save to workspace folder.
  - Uses existing endpoints: `/api/workspace/duck-validate`, `/api/workspace/duck-decode`, `/api/workspace/copy-to-folder`.
  - Updates job `savedOutputPaths` in store, like Job History.
- **Options**:
  - Target scope: last N jobs, only selected workflow, only unsaved outputs.
  - Decode toggle (on by default).

## Bot Builder Requirements
- Create/edit bots in a local store (`bot-center-store.ts`), persisted with Zustand.
- Supported fields (v1):
  - `id`, `name`, `description`, `type` (job-status | auto-save-decode), `enabled`.
  - `config` by type (e.g., `recentLimit`, `groupByWorkflow`, `onlyUnsaved`, `decodeEnabled`).
- “Reset to defaults” for initial bots.

## Technical Approach
1. **Store**: Create `src/store/bot-center-store.ts` with bot definitions + UI state (open/minimized, dock/float, selected bot).
2. **Bot Center UI**: New component `src/components/ui/BotCenter.tsx` with minimized picker + expanded bot panel.
3. **Bot Builder UI**: Panel or modal in Bot Center to edit bot configs.
4. **Bot Execution**: Add `runBot` helpers in `src/utils/bots.ts` to coordinate job data + API calls.
5. **Integration**: Mount `BotCenter` in `src/app/layout.tsx` next to Message Center (global visibility).

## Data Flow
- Jobs data from `useWorkspaceStore`.
- Bot config from `useBotCenterStore`.
- Bot execution writes to UI state (results + progress) and uses toasts for feedback.

## Open Questions / Decisions Needed
1. Should Bot Center be global on all pages, or only in Workspace? **Decision: Global.**
2. When selecting a bot, should it auto-run or require a Run click? **Decision: Auto-run on select.**
3. Should the Auto Save bot include outputs from complex workflows, or only Job History outputs? **Decision: Job History outputs only.**
4. Should bot results appear as toasts, in-panel cards, or both? **Decision: In-panel only (toasts for errors ok).**

## Success Criteria
- Bot Center appears globally, minimized by default, with bot picker when collapsed.
- Bot Builder allows editing two default bots and persists settings.
- Job Status Bot summarizes current jobs accurately.
- Auto Save + Decode Bot saves outputs to workspace and decodes encoded media.
