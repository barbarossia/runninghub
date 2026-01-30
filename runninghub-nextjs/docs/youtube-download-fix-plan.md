# YouTube Download Fix Plan

## Issue
Users are experiencing failures when downloading YouTube videos using `yt-dlp`, specifically receiving "HTTP Error 403: Forbidden". This is due to YouTube blocking the default client/user-agent used by `yt-dlp` for anonymous (no-cookie) requests.

## Analysis
- Tested `yt-dlp` with various clients (`web`, `web_safari`, `ios`, `android`, `tv`, etc.).
- Found that `player_client=android` is the only one currently working without cookies or PO Token, though it is limited to 360p resolution.
- `android_music` also works but is unsupported and might be unstable.
- Default client fails with 403.

## Solution
Implement a retry mechanism in the download API:
1. Attempt download with default arguments (best quality).
2. If it fails with HTTP 403 (or generic failure without cookies), retry with fallback arguments: `--extractor-args "youtube:player_client=android"`.
3. Log the retry attempt to inform the user.

## Implementation
- Modify `runninghub-nextjs/src/app/api/youtube/download/route.ts`.
- Refactor `downloadVideoInBackground` to use a helper `runYtDlpCommand` for cleaner retry logic.
- Detect 403 errors in stderr/stdout.
- Retain existing cookie logic (if cookies are provided, default client usually works for HD).

## Status
- [x] Verified `yt-dlp` behavior in shell.
- [x] Implemented retry logic in `route.ts`.
