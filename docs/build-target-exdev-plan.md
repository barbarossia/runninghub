# Build Target EXDEV Plan

## Goal
Prevent build failures when `build-target.mjs` moves the app directory across filesystems during backend builds.

## Non-Goals
- Changing the build output behavior.
- Modifying Next.js build configuration.

## Scope
- Update `runninghub-nextjs/scripts/build-target.mjs` to use an EXDEV-safe move.
- Keep behavior identical for same-filesystem moves.

## Approach
- Add a helper that attempts `rename` first and falls back to `cp` + `rm` on EXDEV.

## Output
- Updated `runninghub-nextjs/scripts/build-target.mjs`.
