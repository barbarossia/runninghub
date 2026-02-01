# Workspace Bot Tab + Bot Builder Tab - Implementation Plan

## Overview
Add two dedicated tabs inside Workspace: **Bot** (large results/detail view) and **Bot Builder** (full-screen bot configuration). Bot Center remains a quick launcher but no longer hosts the builder UI. The Bot tab focuses on detailed job insights with configurable bot actions. The Bot Builder tab manages any bots (add/edit/disable/reset).

## Goals
- Add a **Bot** tab in Workspace with a large, effective layout for detailed job insights.
- Add a **Bot Builder** tab in Workspace for full bot configuration (any bots).
- Support multi-select status filtering in the Bot tab.
- Keep Bot Center for quick access; remove inline builder from it.

## Non-Goals
- Replacing Bot Center.
- Chat-style bots or background polling.

## Current State
- Bot Center exists globally with two bots and inline builder.
- Workspace has tabs for Gallery, Run Workflow, Workflows, Job History.

## Target State
- Workspace tabs include **Bot** and **Bot Builder**.
- Bot tab offers controls (recent count, workflow filter, status multi-select) and detailed job cards.
- Bot Builder tab offers full bot management (list, create, edit, enable/disable, reset defaults).
- Bot Center is just a launcher (no builder inside it).

## UX Requirements
- Simple, clear layout with large detail area.
- Controls grouped and easy to scan.
- Multi-select status filters (queued/pending/running/completed/failed).
- Builder supports any number of bots.

## Bot Action Customization (Bot tab)
- **Recent Count**: default 50.
- **Workflow Filter**: dropdown of workflow names from jobs (multi-select optional).
- **Status Filter**: multi-select (all statuses supported).
- **Run** button to execute action.

## Bot Builder Requirements
- Full-screen tab with:
  - Bot list (name, type, enabled, description).
  - Create new bot (select type, defaults).
  - Edit bot fields and config per type.
  - Enable/disable toggle.
  - Reset to defaults.

## Technical Approach
1. **Workspace Tabs**: Add Bot + Bot Builder tabs in `runninghub-nextjs/src/app/workspace/page.tsx`.
2. **Bot Tab Component**: Create `src/components/workspace/BotTab.tsx`.
3. **Bot Builder Component**: Create `src/components/workspace/BotBuilderTab.tsx`.
4. **Bot Center**: Remove inline builder UI; keep only quick launch + run.
5. **Filters**: Implement multi-select status filter (checkboxes or multi-select UI).
6. **Data**: Use `useWorkspaceStore` jobs; use `runJobStatusBot` for summary; custom filters for detail list.

## Data Flow
- Jobs come from `useWorkspaceStore` and `fetchJobs()`.
- Bot tab filters apply client-side.
- Bot Builder updates `useBotCenterStore` bots and configs.

## Open Questions / Decisions Needed
- Should workflow filter be single or multi-select? **Decision: multi-select.**

## Success Criteria
- Bot + Bot Builder tabs appear in Workspace.
- Bot Center no longer shows builder UI.
- Bot tab supports multi-select status filters and shows detailed job cards.
- Bot Builder tab can add/edit/disable any bots.
