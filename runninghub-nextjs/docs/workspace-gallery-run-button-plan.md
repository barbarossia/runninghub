# Workspace Gallery Run Button Fix - Plan

## Overview
Ensure the Workspace media gallery run button reliably opens the Quick Run dialog with workflows loaded, even when the user has not visited the Run Workflow tab.

## Problem Statement
The Quick Run dialog depends on workflows already loaded into the workspace store. If a user stays on the Media tab, the workflow list may be empty, making the run button appear non-functional.

## Plan
1. Load standard workflows when the Quick Run dialog opens and none are present.
2. Prevent local workflows from duplicating in the dialog list.
3. Validate the run flow still assigns files and switches to the workflow tab.

## Files to Update
- `src/components/workspace/MediaSelectionToolbar.tsx`
- `src/components/workspace/QuickRunWorkflowDialog.tsx`

## Verification
- Open Media tab, select files, click Run → Quick Run.
- Confirm workflows load without visiting Run Workflow tab.
- Confirm selection assigns files and switches to Run Workflow tab.
