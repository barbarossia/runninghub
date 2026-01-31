# Message Center - Implementation Plan

## Overview
Create a global Message Center UI that manages job-related status messages (running, completed, failed, etc.) and can either float or dock within the page. The Message Center should be visible across the app, independent of the current page, and support consistent status presentation for background tasks/jobs.

## Goals
- Provide a centralized, global place to view job messages and statuses.
- Support two display modes: floating (overlay) and docked (inline panel).
- Make the Message Center persistent across pages and navigations.
- Keep the design consistent with existing UI (Tailwind + existing components).

## Non-Goals (initial scope)
- Full historical log export.
- Server-side persistence (can be added later if required).
- Replacing existing ConsoleViewer (initially can coexist).

## Current State
- Job/task feedback is distributed across pages (e.g., ConsoleViewer, toasts, page-specific panels).
- There is no global, centralized Message Center component.

## Target State
- A global Message Center component mounted in `runninghub-nextjs/src/app/layout.tsx`.
- Backed by a store for UI state and message read/dismiss tracking.
- Supports toggling between floating and docked modes (default: docked).
- Docked placement is top-right next to the Aspect Ratio Tool.
- Handles common statuses: queued/pending, running, completed, failed.

## UX Requirements
- Always accessible (global visibility), but unobtrusive.
- Toggle between float/dock via a control.
- Clear indicator for unread/new messages.
- Each message shows:
  - status (icon + color),
  - job/task name or label,
  - timestamp,
  - optional metadata (e.g., taskId).
- Ability to dismiss messages or collapse the panel.

## Technical Approach
1. **Store**: Add a `message-center-store.ts` in `src/store/` with:
   - UI state (open/closed, dock mode), read/dismissed job tracking.
   - actions: toggleOpen, toggleDockMode, dismissJob, markRead, markAllRead.
2. **Components**:
   - `MessageCenter` component that renders panel + collapsed toggle.
3. **Global Mount**:
   - Mount in `src/app/layout.tsx` alongside `AspectRatioTool` in a fixed top-right dock.
4. **Integration**:
   - Derive messages from workspace job status changes and sync into the Message Center UI.

## Implementation Phases
### Phase 1: Store + UI Shell
- Create store with message schema and actions.
- Build Message Center UI with empty state + demo entries (if needed).

### Phase 2: Global Integration
- Mount Message Center in `layout.tsx`.
- Add toggle control and docking mode switch.

### Phase 3: Wire to Job Events
- Identify existing job/task lifecycle hooks and push messages accordingly.
- Ensure messages update on completion/failure.

## Confirmed Decisions
- New component; does not replace ConsoleViewer.
- Docked by default, top-right next to the Aspect Ratio Tool.
- Global visibility across pages.

## Success Criteria
- Message Center visible on all pages.
- Clicking blank areas does not interfere with existing UI.
- Messages show status and update on job completion.
- Floating/docked mode switch works without layout issues.
