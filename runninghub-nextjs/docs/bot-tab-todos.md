# Workspace Bot Tab + Bot Builder Tab - TODOs

## Phase 1: Planning + Structure
- [x] Review workspace tab structure in `src/app/workspace/page.tsx`.
- [x] Define Bot + Bot Builder layout requirements.

## Phase 2: Workspace Tabs
- [x] Add Bot tab to workspace navigation.
- [x] Add Bot Builder tab to workspace navigation.

## Phase 3: Bot Tab UI
- [x] Create `src/components/workspace/BotTab.tsx`.
- [x] Build layout sections: controls, summary, job details.
- [x] Add recent count input (default 50).
- [x] Add workflow filter dropdown.
- [x] Add status multi-select filters.
- [x] Add Run button with loading state.

## Phase 4: Bot Builder Tab UI
- [x] Create `src/components/workspace/BotBuilderTab.tsx`.
- [x] Render bot list with edit controls.
- [x] Add create bot flow (select type, defaults).
- [x] Add enable/disable + reset defaults.

## Phase 5: Bot Center Cleanup
- [x] Remove inline builder from Bot Center UI.
- [x] Keep quick run and selection.

## Validation
- [ ] Bot + Bot Builder tabs visible in workspace.
- [ ] Bot tab filters + Run refresh results correctly.
- [ ] Bot Builder edits persist in store.
- [ ] Bot Center no longer shows builder.
