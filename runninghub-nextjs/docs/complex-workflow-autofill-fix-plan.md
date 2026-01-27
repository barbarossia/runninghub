## Overview
Ensure selected media files are prefilled into step 1 inputs when launching a complex workflow from the selection toolbar.

## Current State
- Navigation to the execute page works, but step 1 inputs remain empty.

## Target State
- Selected files are mapped to step 1 user-input parameters before navigation.
- The execute page shows prefilled inputs immediately.

## Requirements
- Keep the existing confirm dialog flow.
- Block navigation if no files are selected.
- Use step 1 parameter order for mapping.

## Implementation Phases
1. Add prefill logic in ComplexWorkflowRunDialog.
2. Navigate to the execute page with prefilled assignments in store.
3. Manual verify with selected media.
