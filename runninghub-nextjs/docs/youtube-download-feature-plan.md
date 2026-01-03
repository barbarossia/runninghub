# YouTube Download Feature - Implementation Plan

## Overview
Add a YouTube video download feature to the RunningHub workspace that allows users to download videos (including shorts) from YouTube URLs directly to their workspace folder, with automatic MP4 conversion and integration with the existing media gallery.

## Requirements
1. **User Interface**: New YouTube download tab with URL input, cookie input (textarea OR file path), and download button
2. **Functionality**: Use yt-dlp with specific parameters, download to current workspace folder, convert to MP4 if needed
3. **Integration**: Use existing folder store, refresh media gallery after download, follow existing video API patterns

## Command to Use
```bash
yt-dlp --cookies cookies.txt https://www.youtube.com/shorts/4fHzfri1j8M\?feature\=share --extractor-args "youtube:player_client=default,web_safari;player_js_version=actual"
```

## Implementation Phases

### Phase 1: Frontend Components (3-4 hours)
- [ ] Create YoutubeDownloader component with persistent cookie storage
- [ ] Update workspace page to add YouTube tab
- [ ] Test UI rendering

### Phase 2: Backend API (4-5 hours)
- [ ] Create download API endpoint with persistent cookie caching
- [ ] Create clear cookies API endpoint
- [ ] Update API endpoints constant
- [ ] Implement yt-dlp integration
- [ ] Add cookie handling (paste + file)
- [ ] Implement MP4 conversion
- [ ] Add logging
- [ ] Test API

### Phase 3: Python CLI (2-3 hours, Optional)
- [ ] Add download command
- [ ] Implement download utility
- [ ] Test CLI

### Phase 4: Integration (2-3 hours)
- [ ] Add validation utilities
- [ ] Enhance error handling
- [ ] Test media refresh
- [ ] Test console integration

### Phase 5: Testing & Docs (2-3 hours)
- [ ] Run all test scenarios
- [ ] Create documentation
- [ ] Verify build

## Cookie Persistence Mechanism

**How cookies persist across downloads:**

### Frontend (Browser Storage)
1. **localStorage persistence**:
   - When user pastes cookie content, save to `localStorage.getItem('youtube_cookies_content')`
   - On component mount, load from localStorage and populate textarea
   - Add "Clear Cookies" button to remove from localStorage and server cache

2. **Cookie file path persistence**:
   - Save file path to `localStorage.getItem('youtube_cookies_file_path')`
   - On component mount, load and populate file path input

3. **Cookie mode persistence**:
   - Save selected mode (`'paste'` or `'file'`) to `localStorage.getItem('youtube_cookie_mode')`
   - Restore last used mode on component mount

### Backend (Server Cache)
1. **Persistent cache directory**:
   - Store cookie file at: `runninghub-nextjs/.cache/youtube_cookies.txt`
   - Create `.cache/` directory if it doesn't exist
   - **Never auto-delete** this file - only replace when user provides new cookies

2. **Cookie lifecycle**:
   - User pastes cookies → Write to `.cache/youtube_cookies.txt` (overwrite if exists)
   - User provides file path → Use directly, don't copy
   - User clicks "Clear Cookies" → Delete `.cache/youtube_cookies.txt` if exists
   - Subsequent downloads → Reuse existing `.cache/youtube_cookies.txt`

## Critical Files

### Files to Modify:
1. **runninghub-nextjs/src/app/workspace/page.tsx**
   - Add YouTube tab (line ~690 for TabsList, line ~723 for TabsContent)

2. **runninghub-nextjs/src/constants/index.ts**
   - Add YOUTUBE_DOWNLOAD endpoint (line ~94)

### New Files to Create:
1. **runninghub-nextjs/src/components/workspace/YoutubeDownloader.tsx**
2. **runninghub-nextjs/src/app/api/youtube/download/route.ts**
3. **runninghub-nextjs/src/app/api/youtube/clear-cookies/route.ts**
4. **runninghub-nextjs/src/utils/validation.ts**

## Success Criteria

✅ YouTube download tab accessible from workspace
✅ URL input validates YouTube URLs (regular + shorts)
✅ Cookie input supports paste AND file path modes
✅ **Cookies persist across downloads** (no need to re-enter)
✅ **Cookies persist across page refreshes** (localStorage + server cache)
✅ **Clear cookies button** removes all stored cookies
✅ **Cookie refresh works** (new cookies override old ones)
✅ Download progress shown in ConsoleViewer
✅ Downloaded videos appear in media gallery
✅ Non-MP4 videos automatically converted
✅ Error handling covers common scenarios
✅ Build passes without errors

---

**Created**: 2025-01-03
**Status**: Implementation in progress
