## Overview
Fix FFmpeg scale expression errors when using longest/shortest side resize modes by escaping commas inside `if()` expressions.

## Current State
- Resize modes use `scale=if(...)` expressions.
- FFmpeg fails with exit code 8 (invalid argument) due to unescaped commas in filter expressions.

## Target State
- Longest/shortest side resize works without FFmpeg errors.
- Filter strings are properly escaped for FFmpeg parsing.

## Requirements
1. Escape commas inside `if()` expressions in scale filters.
2. Preserve existing behavior for fit/pad modes.

## Technical Approach
- Update scale expression strings in `fps-convert` API route to use `\\,` for commas.
- Keep filter chain structure intact.

## Implementation Phases
1. Update filter expressions.
2. Verify conversion succeeds with longest/shortest side modes.
