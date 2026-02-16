# Disable Translation Plan

## Overview
Disable all Google/automatic translation in the workspace outputs UI. This removes auto-translation on job completion and hides any manual translate buttons/tabs in text outputs.

## Current State
- Text outputs auto-translate via `useOutputTranslation` hook.
- UI includes translation controls/tabs in text output components.
- Translation requests are routed through `/api/translate`.

## Target State
- No auto-translation runs for text outputs.
- Translation UI controls (buttons/tabs) are removed/hidden.
- Text outputs show original content only.

## Requirements
- Disable auto-translation hook usage in workspace job detail/output views.
- Remove or hide translation UI controls and translated tabs/fields.
- Keep existing text output copy/edit behavior intact.

## Approach
1. Identify translation hook usage and text output components.
2. Remove auto-translation hook wiring.
3. Remove translation UI controls and translated tabs/fields.
4. Ensure text outputs render and copy normally without translation.

## Success Criteria
- No translation requests are made.
- No translation UI is visible.
- Text outputs remain functional (view/copy/edit).
