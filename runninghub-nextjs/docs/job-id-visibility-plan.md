# Job ID Visibility Plan

## Overview
Ensure users can see the complete job ID string (`job_1769782557979_289b77f2`) in both the Job History list and the Job Detail view so they can match history entries with backend tooling or share identifiers without guesswork.

## Goals
- Surface the full job ID on each card in the Job History list without overwhelming the layout.
- Replace the truncated ID in Job Detail with the complete string while keeping the header compact.
- Keep styling consistent with existing metadata rows and ensure long IDs wrap gracefully.

## Non-Goals
- No backend changes—the data already exists in the memoized job objects.
- No new copy-to-workspace behavior or API work.

## Current State
- Job History cards show workflow name, status badge, file counts, timestamp, and badges but no job ID.
- Job Detail shows `ID: {job.id.slice(0, 8)}` under the header, intentionally truncating the identifier.

## Target State
- Job History rows include a dedicated Job ID label/line that displays the full `job.id` and wraps without breaking the layout.
- Job Detail replaces the truncated label with `Job ID: {job.id}` (without slicing) and styles it to not overflow.

## Technical Approach
- Leverage existing `job` data in `JobList` to render a new metadata line for the ID, using utility classes like `break-all` and `text-xs` to handle length.
- Update `JobDetail`'s header metadata row to render the full ID string with accessible text and wrap support.
- Keep both additions lean—no new state or hooks required.

## Implementation Steps
1. Add a Job ID metadata row to each `JobList` card (likely below the timestamp) showcasing the full `job.id` string.
2. Update `JobDetail`'s header metadata row to remove the `slice` and show the full job ID, ensuring `break-all` or `break-words` is applied.
3. Run `npm run lint` and `npm run build` (required after frontend UI changes).

## Risks & Mitigations
- **Long IDs pushing layout**: apply `break-all` and `text-xs` so cards stay stable.
- **Duplicating status metadata**: keep new row visually separate from status/timestamp and match existing typography.

## Acceptance Criteria
- Each Job History card renders `Job ID: job_...` under its timestamp (and it wraps on small screens).
- Job Detail no longer slices the ID and shows the full identifier in the header metadata row.
- Lint and build pass after the change.
