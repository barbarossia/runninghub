## Overview
Add a global toggle to enable/disable UI toast notifications, located to the right of the light/dark theme button in the shared page header. The preference should persist across sessions.

## Current State
- Toasts are emitted via `sonner` and rendered through `Toaster` in `src/app/layout.tsx`.
- Many components import `toast` from `sonner` or use `logger` helpers.
- No global preference exists to disable toast UI.

## Target State
- Users can toggle toast notifications on/off globally.
- Toggle is visible in the PageHeader (right of theme button).
- Preference is persisted (localStorage) and applied on subsequent loads.
- When disabled, toast UI does not render anywhere.

## Requirements
1. Add a global toggle UI next to the theme button in `PageHeader`.
2. Persist preference across sessions.
3. Disabling toasts prevents any toast UI from rendering.
4. Keep existing toast calls intact; no mass refactor.

## Technical Approach
- Create a small Zustand store (persisted) for UI preferences with a `toastsEnabled` boolean.
- Add a `ToastToggle` client component that reads/writes the preference.
- Wrap the Sonner `Toaster` in a `ToastGate` client component that renders only when enabled.
- Replace `Toaster` usage in `layout.tsx` with `ToastGate`.

## UI/UX Notes
- Use a compact ghost icon button for the toggle.
- Use bell icons to indicate enabled/disabled state.
- Provide accessible `aria-label`.

## Implementation Phases
1. Add UI preference store and toggle component.
2. Gate `Toaster` rendering based on preference.
3. Wire toggle into `PageHeader`.
4. Verify persistence and behavior.
