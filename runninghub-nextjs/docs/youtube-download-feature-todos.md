# YouTube Download Feature - TODO List

## Phase 1: Frontend Components

### Create YoutubeDownloader Component
**File**: `runninghub-nextjs/src/components/workspace/YoutubeDownloader.tsx`

- [ ] Component structure and state management
- [ ] URL input field with validation
- [ ] Cookie input tabs (paste vs file path)
- [ ] Textarea for pasting cookie content
- [ ] File path input for cookies.txt
- [ ] Download button with loading state
- [ ] Show current download location
- [ ] localStorage integration for cookie persistence
- [ ] Clear cookies button
- [ ] Error handling and toast notifications
- [ ] Callback props for download start/complete

### Update Workspace Page
**File**: `runninghub-nextjs/src/app/workspace/page.tsx`

- [ ] Update `activeTab` type to include `'youtube'`
- [ ] Import `YoutubeDownloader` component
- [ ] Import `Youtube` icon from lucide-react
- [ ] Add 5th tab to `TabsList` (YouTube tab)
- [ ] Add `TabsContent` for youtube tab
- [ ] Wire up callbacks for download start/complete
- [ ] Wire up callback to refresh media gallery after download

## Phase 2: Backend API Implementation

### Create YouTube Download API Endpoint
**File**: `runninghub-nextjs/src/app/api/youtube/download/route.ts`

- [ ] Set up POST endpoint
- [ ] Validate request parameters
- [ ] Check yt-dlp availability
- [ ] Initialize background task
- [ ] Implement `downloadVideoInBackground` function
- [ ] Persistent cookie storage:
  - [ ] Create `.cache/` directory if needed
  - [ ] Save pasted cookies to `.cache/youtube_cookies.txt`
  - [ ] Reuse existing cookies if available
  - [ ] Log "Using cached cookies" or "Updated cached cookies"
- [ ] Build yt-dlp command with extractor args
- [ ] Spawn yt-dlp process
- [ ] Parse progress from stdout
- [ ] Extract output filename
- [ ] Implement MP4 conversion fallback (FFmpeg)
- [ ] Add comprehensive logging with `writeLog()`
- [ ] Handle errors and timeouts

### Create Clear Cookies API Endpoint
**File**: `runninghub-nextjs/src/app/api/youtube/clear-cookies/route.ts`

- [ ] Set up POST endpoint
- [ ] Delete `.cache/youtube_cookies.txt` if exists
- [ ] Handle ENOENT (file not found) gracefully
- [ ] Return success/error response

### Update API Endpoints Constant
**File**: `runninghub-nextjs/src/constants/index.ts`

- [ ] Add `YOUTUBE_DOWNLOAD: '/api/youtube/download'`
- [ ] Add `YOUTUBE_CLEAR_COOKIES: '/api/youtube/clear-cookies'`

## Phase 4: Integration & Polish

### Add URL Validation Utilities
**File**: `runninghub-nextjs/src/utils/validation.ts`

- [ ] Implement `isValidYouTubeUrl(url: string): boolean`
- [ ] Implement `extractYouTubeVideoId(url: string): string | null`
- [ ] Support regular YouTube URLs
- [ ] Support youtu.be short URLs
- [ ] Support YouTube Shorts URLs

### Error Handling Enhancement

- [ ] Cookie authentication failed error message
- [ ] Private/unavailable video error message
- [ ] Region restriction error message
- [ ] Network timeout error message
- [ ] Invalid URL format validation
- [ ] No folder selected error message

## Phase 5: Testing & Build Verification

### Test Scenarios

**Basic Functionality**:
- [ ] Download public YouTube video (no cookies)
- [ ] Download private video with pasted cookies
- [ ] Download private video with file path cookies
- [ ] Download YouTube Shorts
- [ ] MP4 conversion for non-MP4 videos

**Cookie Persistence**:
- [ ] Cookies persist across page refresh (paste mode)
- [ ] Cookies persist across page refresh (file path mode)
- [ ] Cookies persist across multiple downloads
- [ ] Clear cookies button removes all stored cookies
- [ ] New cookies override old cached cookies

**Error Handling**:
- [ ] Invalid URL validation
- [ ] No folder selected error
- [ ] Missing cookies for private video
- [ ] Network timeout handling

**Integration**:
- [ ] Download progress shown in ConsoleViewer
- [ ] Downloaded videos appear in media gallery
- [ ] Media gallery refreshes after download
- [ ] Task tracking works correctly

### Build Verification
- [ ] Run `npm run build` in runninghub-nextjs
- [ ] Fix any TypeScript errors
- [ ] Fix any build failures
- [ ] Verify no console errors in dev mode

### Documentation
- [ ] Plan document created ✅
- [ ] TODO list created ✅
- [ ] Update `runninghub-nextjs/CLAUDE.md` with YouTube download feature

## Optional: Python CLI Enhancement

### Add Download Command to CLI
**File**: `runninghub-cli/cli.py`

- [ ] Add `download` command
- [ ] Arguments: url, --output-dir, --cookies, --convert-mp4
- [ ] Integrate with video_utils

### Add Download Utilities
**File**: `runninghub-cli/video_utils.py`

- [ ] Implement `download_youtube_video()` function
- [ ] Build yt-dlp command
- [ ] Handle subprocess execution
- [ ] Extract downloaded filename
- [ ] Integrate MP4 conversion
- [ ] Return success/error tuple

---

**Created**: 2025-01-03
**Status**: Implementation in progress
