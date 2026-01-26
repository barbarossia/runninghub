## Overview
Add pagination to the existing Job History tab so the list displays jobs page-by-page instead of loading the full list at once.

## Current State
- Job History tab renders the entire filtered job list in `JobList`.
- Filters exist for status and workflow, but there is no pagination.

## Target State
- Job History list is paginated with a fixed page size.
- Pagination respects existing filters and updates when filters change.
- UI includes page controls (prev/next and page indicator).

## Requirements
- Keep the current Job History tab layout and detail view behavior.
- Filters remain (status + workflow name).
- No auto-refresh intervals; refresh only on actions.
- Use existing UI components and styles.

## Technical Approach
- Add pagination state (`page`, `pageSize`) in `JobList`.
- Slice `filteredJobs` to `pagedJobs`.
- Reset/clamp page when filters or job count change.
- Add pagination controls near the list (prev/next, page indicator).

## Risks / Edge Cases
- Filter changes could leave page out of range; clamp to last page.
- Empty list should show the existing empty state.

## Implementation Phases
1. Add pagination state and computed `pagedJobs` in `JobList`.
2. Add page controls and page indicator.
3. Reset/clamp page on filter changes and list size changes.
4. Manual verify behavior with filters and deletes.
