# Local Workflow Plan

## Overview
Add a Local Workflow feature for local operations (convert/clip/crop/resize/duck decode/caption) managed inside the Workflows tab. Local workflows are reusable templates for a **single local operation** (no step list) with configurable options. The JSON structure is aligned with standard workflows by using an `inputs` array for operation definitions, omitting complex mapping logic to keep it lightweight. Users create/edit them via the existing **Create New** button, choosing “Local Workflow” vs “RunningHub Workflow.” The Workflows list should **flag** each entry as Local or RunningHub.

This plan focuses on **create/edit and management UI** first. Execution, batch auto-run, and media-gallery integration are follow-up phases.

## Goals
- Provide a reusable Local Workflow template for local operations only.
- Create/edit Local Workflows in the Workflows tab using a full-page editor.
- Show Local vs RunningHub workflows in a unified list with badges.
- Capture convert configuration in the Local Workflow definition.

## Requirements
1. Local Workflow uses a single operation (no Step 1/Step 2 UI).
2. Operation selection drives default input mapping (video vs image).
3. Convert operations use the existing convert configuration UI.
4. Workflows list shows a badge indicating Local vs RunningHub.
5. Creation entry is the existing “Create New” button (type chooser).
6. No Media Gallery toolbar button for Local Workflow creation.

## Non-Goals (Phase 1)
- Local workflow execution orchestration.
- Auto-run batch workflow execution.
- Media Gallery toolbar changes.

## UX Flow (Phase 1)
1. User opens Workspace → Workflows tab.
2. User clicks “Create New.”
3. Chooses “Local Workflow.”
4. Full-page Local Workflow editor opens.
5. User selects operation, configures options, and saves.
6. Workflow list shows the new entry with a “Local” badge.

## Data Model
Local Workflow follows a structure similar to standard RunningHub workflows but specialized for local tasks.
- Fields: `id`, `name`, `description`, `createdAt`, `updatedAt`, `inputs` (list of local operation definitions).
- Input includes: `id`, `name`, `type` ("local"), `operation` (local operation type), `config` (specific parameters for that operation).
- Note: Mapping logic is handled implicitly (processing "selected" files) to keep the JSON clean.

## Architecture / API (Phase 1)
- `POST /api/workspace/local-workflow/save`
- `GET /api/workspace/local-workflow/list`
- `GET /api/workspace/local-workflow/[workflowId]`
- `DELETE /api/workspace/local-workflow/[workflowId]`

## UI Changes (Phase 1)
- Workflows list merges Local + RunningHub entries with badges.
- “Create New” opens type chooser (RunningHub or Local).
- Local Workflow editor renders as **full-page** content (no modal).
- Local editor shows single operation form (no step list UI).

## Future Phases
- Execution API route for Local Workflow runs (stop on first failure).
- Auto-run behavior for batch selection (multi-file runs).
- ConsoleViewer logging for batch runs.
- Media Gallery integration for selection and execution.

## Testing
- Create Local Workflow for video convert and ensure config is saved.
- Edit Local Workflow and verify persisted updates.
- List shows Local/RunningHub badges correctly.
