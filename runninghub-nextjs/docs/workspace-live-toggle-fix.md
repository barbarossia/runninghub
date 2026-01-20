# Workspace Live Toggle Fix

## Problem
The "Live/Offline" toggle button in the Workspace page was not working correctly.
- Clicking the button to stop subscription would momentarily stop it, but the existing `useEffect` (dependent on `activeTab`) would immediately restart it because the tab was still "live" (e.g. Media tab).
- Clicking to start subscription works, but stopping was fought by the auto-subscribe logic.

## Solution
Implemented a `manualLiveOverride` state to track user intent explicitly.
- `null`: Default/Auto behavior (Live on live tabs, Offline otherwise).
- `true`: Forced Live.
- `false`: Forced Offline.

The logic:
1.  Button toggles `manualLiveOverride` between `true` and `false` (or sets it from current state).
2.  A new `useEffect` resets `manualLiveOverride` to `null` when `activeTab` or `selectedFolder` changes, ensuring the manual preference is temporary (per session on that tab).
3.  The main subscription `useEffect` respects `manualLiveOverride` if it is not null.

## Implementation Details
- Modified `src/app/workspace/page.tsx`.
- Added `manualLiveOverride` state.
- Updated `useEffect` dependencies and logic.
- Updated button `onClick` handler.

## Verification
- Click "Live" -> Stops subscription.
- Click "Offline" -> Starts subscription.
- Switch Tabs -> Resets to Auto (Live).
