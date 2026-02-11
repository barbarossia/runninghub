# Job Detail Decoded Output Actions Wrap Plan

## Overview
Fix the decoded output action row in JobDetail so long filenames and action buttons wrap without overlapping the card border. This applies only to decoded image outputs.

## Current State
- Decoded output panel uses a single `flex` row with `justify-between`.
- Long decoded filenames + action buttons can overflow and overlap card borders on smaller widths.

## Target State
- Decoded output header wraps cleanly, keeping filename readable and buttons visible.
- Buttons do not overlap card border; layout remains consistent with existing styling.

## Scope
- Frontend only: `runninghub-nextjs/src/components/workspace/JobDetail.tsx`.
- Only decoded image output panel (the green decoded info box).

## Approach
- Adjust decoded output header container to allow wrapping (`flex-wrap`, `gap`).
- Ensure the filename area can wrap/ellipsis without breaking layout (`min-w-0`, `break-all` or `break-words`).
- Keep action buttons grouped with `flex-wrap` to avoid overflow.

## Risks
- Minor layout shift on wide screens; ensure spacing remains tidy.

## Validation
- View a decoded image output with a long filename on narrow width.
- Confirm action buttons wrap to a new line and do not overlap card border.

