# Job History Pagination Fix Plan

## Problem
When navigating from the Job History list to a Job Detail view and then returning to the list, the pagination state is lost (resets to page 1). This causes a poor user experience as the user loses their place in the list.

## Goal
Persist the Job History list pagination state (page number) and filters so they are restored when the user returns to the list.

## Solution
Move the pagination and filter state from the local component state (`JobList.tsx`) to the global Zustand store (`workspace-store.ts`) and enable persistence.

## Implementation Steps
1.  **Update `workspace-store.ts`**:
    -   Add `jobListPage`, `jobListStatusFilter`, and `jobListWorkflowFilter` to the store state.
    -   Add corresponding actions to update these values.
    -   Initialize these values in the store.
    -   Add these keys to the `persist` middleware configuration.

2.  **Update `JobList.tsx`**:
    -   Replace local `useState` hooks for `page`, `statusFilter`, and `workflowFilter` with the values and setters from `useWorkspaceStore`.
    -   Update `setPage` calls to use direct values (since store actions usually expect values, not updater functions, or update the action to support functional updates - deciding to use direct values in component for simplicity).

## Verification
-   Navigate to Job History.
-   Change page and filters.
-   Navigate to a Job Detail page.
-   Navigate back to Job History.
-   Verify that the page and filters are restored.
