# Folder State Management

This document describes the folder state management system in RunningHub.

## Architecture Overview

The folder state management is built on **Zustand** with **localStorage persistence**. Only the workspace page is active — it uses the `workspace` page type for its folder state. The `clip` and `crop` tabs within workspace also have their own folder state slots but currently share the workspace folder.

### Core Files

| File | Purpose |
|------|---------|
| `runninghub-nextjs/src/store/folder-store.ts` | Main Zustand store |
| `runninghub-nextjs/src/hooks/useFolderSelection.ts` | Handle folder selection |
| `runninghub-nextjs/src/hooks/useAutoLoadFolder.ts` | Auto-load last folder on mount |

### Active vs Deprecated Page Types

| PageType | Status | Notes |
|----------|--------|-------|
| `workspace` | **Active** | Main workspace page (`/workspace`) |
| `clip` | **Active** | Clip tab within workspace |
| `crop` | **Active** | Crop/Convert tab within workspace |
| `images` | **DEPRECATED** | No page exists. Dead code in store, hooks, and localStorage persistence. |
| `videos` | **DEPRECATED** | No page exists. Dead code in store, hooks, and localStorage persistence. |

#### Dead Code Locations (to be cleaned up)

| File | Dead Code |
|------|-----------|
| `folder-store.ts` | `images` and `videos` in `PageType`, initial state, `useImageFolder()`, `useVideoFolder()`, `partialize` |
| `useFolderSelection.ts` | `folderType === "images"` and `folderType === "videos"` branches (lines 62-88), `FolderType` includes `"images" \| "videos"` |
| `useAutoLoadFolder.ts` | `FolderType` includes `"images" \| "videos"`, `folderTypeToPageType` mapping |

---

## State Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Zustand Store: useFolderStore                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                         │
│  │  workspace  │  │    clip     │  │    crop     │  (active pages)        │
│  │   (Page)    │  │   (Page)    │  │   (Page)    │                         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                         │
│         │                │                │                                 │
│         ▼                ▼                ▼                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    PageFolderState (per page)                       │   │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐     │   │
│  │  │selectedFolder   │ │folderContents   │ │currentPath      │     │   │
│  │  │ (FolderResponse │ │ (FileSystem    │ │ (string)        │     │   │
│  │  │  | null)        │ │  Contents|null)│ │                 │     │   │
│  │  └─────────────────┘ └─────────────────┘ └─────────────────┘     │   │
│  │  ┌─────────────────┐ ┌─────────────────┐                          │   │
│  │  │isLoadingFolder  │ │isLoadingContents│                          │   │
│  │  │ (boolean)       │ │ (boolean)       │                          │   │
│  │  └─────────────────┘ └─────────────────┘                          │   │
│  │  ┌─────────────────┐                                                │   │
│  │  │error (string   │                                                │   │
│  │  │ | null)        │                                                │   │
│  │  └─────────────────┘                                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Shared State                                      │   │
│  │  ┌─────────────────┐ ┌─────────────────────────────────────────┐  │   │
│  │  │activePage       │ │recentFolders[]                           │  │   │
│  │  │ (PageType)      │ │ (last 5 folders)                        │  │   │
│  │  └─────────────────┘ └─────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                    │
                    │ persisted to localStorage
                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    localStorage: "runninghub-folder-storage"              │
│    • recentFolders[]                                                      │
│    • Per-page folder state (workspace, clip, crop)                       │
│    • ⚠️  images/videos keys persist in localStorage but are dead code    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Folder Selection Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         FOLDER SELECTION FLOW                                │
└──────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────┐      ┌─────────────────────┐      ┌──────────────────────┐
  │   User      │      │  FolderSelection     │      │   API Validation    │
  │  Action     │ ──▶ │     Layout           │ ──▶ │   (POST /folder/list)│
  └─────────────┘      └─────────────────────┘      └──────────────────────┘
                              │                              │
                              ▼                              ▼
                     ┌─────────────────────┐      ┌──────────────────────┐
                     │ FileSystem Access   │      │ Response Processing  │
                     │ OR Manual Input     │      │ (images + videos)    │
                     └─────────────────────┘      └──────────────────────┘
                                                          │
                                                          ▼
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                        useFolderSelection Hook                              │
  ├─────────────────────────────────────────────────────────────────────────────┤
  │  1. setSelectedFolder(pageType, folderResponse)                          │
  │  2. addRecentFolder({name, path, source})                               │
  │  3. setFolderContents(pageType, contents)                               │
  │  4. onFolderLoaded callback                                              │
  └─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                          Zustand Store Update                              │
  ├─────────────────────────────────────────────────────────────────────────────┤
  │  • selectedFolder = FolderResponse                                        │
  │  • folderContents = FileSystemContents                                   │
  │  • currentPath = folder_path                                             │
  │  • isLoadingFolder = false                                               │
  │  • error = null                                                          │
  │  • recentFolders = [newFolder, ...oldFolders].slice(0,5)               │
  └─────────────────────────────────────────────────────────────────────────────┘
```

---

## Auto-Load Flow (Page Mount)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                       AUTO-LOAD FOLDER ON MOUNT                             │
└──────────────────────────────────────────────────────────────────────────────┘

                          ┌─────────────────────┐
                          │   Page Component    │
                          │   Mounts           │
                          └─────────┬───────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │    useAutoLoadFolder Hook     │
                    │    (enabled = true)          │
                    └─────────────┬────────────────┘
                                  │
                                  ▼
                    ┌───────────────────────────────┐
                    │ getSelectedFolder(pageType)   │
                    │ from localStorage             │
                    └─────────────┬────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
           ┌──────────────┐            ┌──────────────────┐
           │ Folder      │            │ No Folder       │
           │ exists?     │            │ in Storage      │
           └──────┬───────┘            └────────┬─────────┘
                  │                              │
                  ▼                              ▼
    ┌─────────────────────────┐    ┌──────────────────────────┐
    │ POST /folder/list       │    │ Show FolderSelection     │
    │ Validate folder         │    │ Layout                   │
    └───────────┬─────────────┘    └──────────────────────────┘
                │
                ▼
    ┌─────────────────────────┐
    │ Success?                │
    └───────────┬─────────────┘
                │
       ┌────────┴────────┐
       │                 │
       ▼                 ▼
┌─────────────┐    ┌────────────────┐
│ setSelected │    │ clearPageFolder│
│ Folder      │    │ (invalid)      │
│ + onFolder  │    │ + Toast msg    │
│ Loaded()    │    └────────────────┘
└─────────────┘
```

---

## State Machine (Per Page)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     FOLDER STATE MACHINE (per page)                         │
└─────────────────────────────────────────────────────────────────────────────┘

                            ┌─────────────────┐
         ┌──────────────────│   Initial       │◄─────────────────────────┐
         │                  │   (no folder)   │                          │
         │                  └────────┬────────┘                          │
         │                           │                                    │
         │                           │ User selects folder               │
         │                           ▼                                    │
         │                  ┌─────────────────┐                          │
         │                  │  Loading        │                          │
         │                  │  (validating)   │                          │
         │                  └────────┬────────┘                          │
         │                           │                                    │
         │              ┌────────────┴────────────┐                      │
         │              │                         │                      │
         │              ▼                         ▼                      │
         │     ┌────────────────┐      ┌──────────────────┐             │
         │     │   Success      │      │     Error        │             │
         │     │   (loaded)     │─────▶│   (failed)       │             │
         │     └────────┬───────┘      └────────┬─────────┘             │
         │              │                       │                         │
         │              │                       │ User retries             │
         │              │                       │ or selects new          │
         │              │                       │                         │
         │              │                       └───────────┬─────────────┘
         │              │                                   │
         │              │ User clicks "Change Folder"       │
         │              │ or folder becomes inaccessible    │
         │              │                                   │
         │              └──────────────┬────────────────────┘
         │                             │
         │                             ▼
         │                  ┌─────────────────┐
         └─────────────────│   Cleared      │ (goes back to Initial)
                            │   (reset)      │
                            └─────────────────┘


  STATE VARIABLES:
  ─────────────────────────────────────────────────
  • selectedFolder: FolderSelectionResponse | null
  • folderContents: FileSystemContents | null  
  • currentPath: string
  • isLoadingFolder: boolean
  • isLoadingContents: boolean
  • error: string | null
```

---

## Data Types

```typescript
// From folder-store.ts

type PageType = "images" | "videos" | "workspace" | "clip" | "crop";
// ⚠️ "images" and "videos" are DEPRECATED — no pages use them. Dead code.

interface PageFolderState {
  selectedFolder: FolderSelectionResponse | null;
  folderContents: FileSystemContents | null;
  currentPath: string;
  isLoadingFolder: boolean;
  isLoadingContents: boolean;
  error: string | null;
}

interface RecentFolder {
  path: string;
  name: string;
  timestamp: number;
  source: "filesystem_api" | "manual_input";
}

interface FolderSelectionResponse {
  success: boolean;
  folder_name: string;
  folder_path: string;
  session_id: string;
  is_virtual: boolean;
  message: string;
}

interface FileSystemContents {
  current_path: string;
  parent_path: string | undefined;
  images: ImageFile[];
  videos: VideoFile[];
  folders: {name: string; path: string; is_virtual: boolean; type: "folder"}[];
  is_direct_access: boolean;
}
```

---

## Convenience Hooks

```typescript
// Per-page hooks (derived from useFolderStore)
useWorkspaceFolder() // → state.workspace  (ACTIVE)
useClipFolder()     // → state.clip        (ACTIVE)
useCropFolder()     // → state.crop        (ACTIVE)
useImageFolder()    // → state.images      ⚠️ DEPRECATED — unused, no page references this
useVideoFolder()    // → state.videos      ⚠️ DEPRECATED — unused, no page references this

// Selection with auto-load
const { selectedFolder } = useWorkspaceFolder()
const { handleFolderSelected } = useFolderSelection({ 
  folderType: 'workspace',
  onFolderLoaded: () => { /* folder loaded */ }
})

// Auto-load on mount
useAutoLoadFolder({ 
  folderType: 'workspace',
  onFolderLoaded: (folder, contents) => { /* folder and contents */ }
})
```

---

## Persistence

The folder store uses Zustand's `persist` middleware with `localStorage`:

```typescript
persist(
  (set, get) => ({ ... }),
  {
    name: "runninghub-folder-storage",  // localStorage key
    storage: createJSONStorage(() => localStorage),
    partialize: (state) => ({
      recentFolders: state.recentFolders,
      images: state.images,    // ⚠️ DEPRECATED — persisted but never read
      videos: state.videos,    // ⚠️ DEPRECATED — persisted but never read
      workspace: state.workspace,
      clip: state.clip,
      crop: state.crop,
    }),
  }
)
```

**Persisted:**
- `recentFolders` - Last 5 selected folders
- Per-page folder state (workspace, clip, crop — active; images, videos — deprecated dead code)

**NOT Persisted:**
- `activePage` - Current active tab
- Loading states - Reset on page load
- Error states - Reset on page load

---

## Key Behaviors

1. **Per-page isolation**: Each active page (workspace, clip, crop) maintains independent folder state
2. **Auto-restore**: Last folder is automatically loaded when page mounts
3. **Validation**: Folder existence is validated before restoring
4. **Graceful fallback**: If folder is inaccessible, shows selection screen
5. **Recent folders**: Last 5 folders are remembered (persisted)
6. **Dual selection**: Supports both FileSystem Access API and manual path input
7. **⚠️ Dead code**: `images` and `videos` page types, hooks (`useImageFolder`, `useVideoFolder`), and state slots exist in code and localStorage but are never used — safe to remove

---

## Folder State Refresh Triggers

There are **4 independent refresh mechanisms**, each serving a different scenario.

### Mechanism 1: Manual Refresh Button → `handleRefresh(silent)`

```
User clicks Refresh button
        │
        ▼
handleRefresh(false)                    ← workspace/page.tsx:666
        │
        ├── loadFolderContents()         ← useFileSystem.ts:131  (POST /api/folder/list)
        │       │
        │       └── setFolderContents()  ← Updates Zustand store
        │
        └── processFolderContents(result, path, "replace")  ← Full replace mediaFiles
```

**Trigger locations (5 places):**

| Location | Call | silent? |
|----------|------|---------|
| Gallery tab Refresh button | `onClick={() => handleRefresh(false)}` (line 2825) | ❌ Shows loading |
| PageHeader folder summary | `onRefresh: () => handleRefresh(false)` (line 2654) | ❌ |
| MediaGallery component | `onRefresh={() => handleRefresh(true)}` (line 2882) | ✅ Silent |
| VideoGallery (Clip/Convert) | `onRefresh={() => handleRefresh(true)}` (line 2918/2944) | ✅ Silent |
| ConsoleViewer | `onRefresh={handleRefresh}` (line 3255) | Depends on caller |

**Effect**: Full `POST /api/folder/list`, fetches latest file list, **completely replaces** `mediaFiles` in the store.

---

### Mechanism 2: Hard Refresh (F5 / Page Reload) → `useAutoLoadFolder` + `useEffect`

```
Browser F5
    │
    ▼
React remounts workspace/page.tsx
    │
    ├── 1. Zustand persist rehydrates selectedFolder from localStorage  ← automatic
    │
    ├── 2. useAutoLoadFolder() runs                    ← page.tsx:1003
    │       │
    │       ├── getSelectedFolder("workspace")         ← from localStorage
    │       ├── POST /api/folder/list to validate folder exists  ← useAutoLoadFolder.ts:61
    │       │       │
    │       │       ├── Exists → setSelectedFolder() + onFolderLoaded()
    │       │       └── Missing → clearPageFolder() + toast notification
    │       │
    │       └── onFolderLoaded = handleFolderLoaded()   ← page.tsx:990
    │               └── processFolderContents(contents, path, "replace")
    │
    ├── 3. useEffect [selectedFolder] fires              ← page.tsx:1009
    │       └── loadFolderContents() → processFolderContents("replace")
    │
    └── 4. useEffect [selectedFolder] SSE subscription   ← page.tsx:1037
            └── startMediaSubscription(folder_path)
```

**Key behaviors**:
- On F5, Zustand persist auto-rehydrates `selectedFolder` from `localStorage`
- `useAutoLoadFolder` validates the folder still exists (makes API request)
- ⚠️ **`onFolderLoaded` and `useEffect[selectedFolder]` each trigger `loadFolderContents`** — one redundant call
- SSE subscription is also re-established

---

### Mechanism 3: File System Live Monitoring (SSE) → `chokidar` + `EventSource`

This is **automatic incremental update**, no user action needed:

```
File system change (external program adds/modifies/deletes file)
        │
        ▼
chokidar file watcher                          ← subscribe/route.ts:201
  ┌─────┼─────────────────┐
  │     │                 │
  add   change           unlink
  │     │                 │
  ▼     ▼                 ▼
handleChange()       handleRemove()
  │                      │
  ▼                      ▼
SSE "update" event   SSE "remove" event
  │                      │
  ▼                      ▼
Frontend listener    Frontend listener
(page.tsx:738)       (page.tsx:835)
  │                      │
  ▼                      ▼
upsertMediaFile()    removeMediaFileByPath()  ← Directly modifies workspace store
                         │
                         └── setTimeout 100ms → handleRefresh()  ← Full refresh after remove
```

**Event handling summary:**

| Event | Handling | Full API refresh? |
|-------|----------|-------------------|
| `add` (new file) | `upsertMediaFile()` — incremental insert | ❌ Inserts single file |
| `change` (file modified) | `upsertMediaFile()` — incremental update | ❌ Updates single file |
| `unlink` (file deleted) | `removeMediaFileByPath()` + `handleRefresh()` | ✅ Full refresh after 100ms |
| `caption` (.txt changed) | `updateMediaFile()` — updates caption field | ❌ Updates caption only |

**Note**: Only monitors **top-level files in current folder** (`relativeParts.length > 1` ignores subdirectories), non-recursive.

---

### Mechanism 4: In-App Operations

| Operation | Function | Refresh Method | Full API call? |
|-----------|----------|----------------|----------------|
| **Delete file** (Gallery) | `handleDeleteFile` (line 1732) | `removeMediaFileByPath()` — store-only removal | ❌ Store only |
| **Delete video** (Clip/Convert) | `handleDeleteVideo` (line 2058) | `removeMediaFileByPath()` | ❌ Store only |
| **Delete videos batch** | `handleDeleteVideosByPath` (line 2083) | Loop `removeMediaFileByPath()` | ❌ Store only |
| **Convert task complete** | `handleTaskComplete` (line 947) | `handleRefresh(false)` | ✅ Full refresh |
| **Change folder** | `handleBackToSelection` (line 1133) | `clearPageFolder()` + `setMediaFiles([])` | N/A (back to selection) |
| **Select new folder** | `handleFolderSelected` → `useEffect` | `loadFolderContents()` → `processFolderContents("replace")` | ✅ Full refresh |

**⚠️ Important**: Since SSE subscription is active, in-app deletes trigger **double processing**:
1. Immediate store removal (fast user feedback)
2. 100ms later SSE `remove` event → another `removeMediaFileByPath()` + `handleRefresh()` full API call

---

### Summary Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                   FOLDER STATE REFRESH TRIGGERS                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  1. MANUAL REFRESH BUTTON                                            │
│     └─→ handleRefresh(silent)                                        │
│         └─→ POST /api/folder/list → processFolderContents(REPLACE)  │
│                                                                       │
│  2. HARD REFRESH (F5)                                                │
│     └─→ Zustand rehydrate from localStorage                         │
│         └─→ useAutoLoadFolder validates via POST /api/folder/list   │
│             └─→ processFolderContents(REPLACE)                       │
│         └─→ useEffect[selectedFolder] also loads → REPLACE           │
│         └─→ SSE subscription re-established                         │
│                                                                       │
│  3. FILE SYSTEM CHANGES (via SSE/chokidar)                           │
│     ├─ add/change → upsertMediaFile()     [incremental, no API call] │
│     └─ unlink     → removeMediaFileByPath()                          │
│                     + handleRefresh() 100ms later [full API call]     │
│                                                                       │
│  4. IN-APP OPERATIONS                                                │
│     ├─ Delete    → removeMediaFileByPath() [store only]              │
│     │              + SSE also detects → double processing            │
│     ├─ Convert✓  → handleRefresh(false) [full API call]              │
│     └─ New folder→ loadFolderContents() [full API call]              │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Known Issues

1. **F5 double load**: `useAutoLoadFolder.onFolderLoaded` and `useEffect[selectedFolder]` each call `loadFolderContents` → same folder loaded twice on page mount
2. **Delete double processing**: In-app file delete → store removal + SSE 100ms later triggers `handleRefresh()` full API call — wasted resources
3. **SSE remove cascading refreshes**: Each file deletion triggers a full `handleRefresh()`. Batch deleting N files → N full API refreshes

---

### Why SSE `add`/`change` Don't Trigger Full Refresh but `unlink` Does

**`add`/`change` — incremental is sufficient:**

The server-side `buildMediaPayload()` (`subscribe/route.ts:45`) reads the file's **complete metadata** (size, width, height, fps, duration, codec, caption, etc.) before emitting the SSE event. The frontend receives a fully-formed payload and calls `upsertMediaFile()` to insert/update the store directly. No API call is needed because the SSE payload already contains everything the UI needs.

**`unlink` — defensive full refresh:**

The full `handleRefresh()` after `removeMediaFileByPath()` is purely **defensive programming** against race conditions. The code comment (`workspace/page.tsx:855-857`) explains:

> *Force a store refresh to ensure UI reflects current file system state. This helps prevent stale UI state where files appear to still exist but were already removed by a race condition or earlier operation*

The concern: when in-app delete and SSE events arrive in unpredictable order, the store might retain stale references to already-deleted files. The 100ms-delayed `handleRefresh()` acts as a safety net to resync with the actual filesystem.

**Assessment**: `removeMediaFileByPath()` alone is sufficient to remove the file from the store. The extra `handleRefresh()` is over-defensive and causes the cascading refresh problem described in Known Issue #3. A debounced refresh or removing the full refresh entirely would be a better approach.

---

## Top-Level-Only Audit

All file change monitoring and file listing code must only check the **top-level folder** (non-recursive, no subdirectory content).

### ✅ Confirmed Top-Level Only

| File | Mechanism | Enforcement |
|------|-----------|-------------|
| `api/folder/list/route.ts:105` | `fs.readdir(folder)` | No `{ recursive: true }` = top-level only by default. Then `stat` each item, push to `images`/`videos`/`folders`. |
| `api/workspace/subscribe/route.ts:201-210` | `chokidar.watch(folderPath)` | `ignored` callback: `relativeParts.length > 1` filters out anything in subdirectories. `ignoreInitial: true`. |
| `api/dataset/files/route.ts:57` | `readdir(datasetPath, { withFileTypes: true })` | Top-level only, `entry.isFile()` guard. |
| `api/workspace/job-results/route.ts:44` | `fs.readdir(resultDir)` | Top-level only, `stat.isFile()` guard. |
| `api/workspace/jobs/route.ts:21` | `fs.readdir(workspaceDir, { withFileTypes: true })` | Lists job directories only, not media files. |
| `api/dataset/list/route.ts:50,66` | Two `readdir` calls | First lists subdirs of parent, second peeks inside each subdir to check if it has files — dataset discovery, not media listing. |

### ⚠️ Items Noted (Not Violations)

**1. `api/folder/process-direct/route.ts:67-104` — `findFolderInDirectory()`**

Recursive folder search up to `maxDepth`. **Not a violation** — this is only for *locating* a folder by name under a prefix path (FileSystem Access API flow). Once found, it returns the path and `folder/list` handles the actual file listing (top-level only).

**2. `workspace/page.tsx:703-708` — `isPathInFolder()` frontend filter**

Uses `filePath.startsWith(normalizedFolder)` which would theoretically match subdirectory files (e.g., `/A/B/file.jpg` would pass the filter for folder `/A`). **Currently harmless** because the server-side chokidar filter (`relativeParts.length > 1`) prevents subdirectory events from ever reaching the frontend. This is a defense-in-depth gap but has no practical impact.

### Nested Folder Scenario

**Question**: If `/A/B` and `/A` are two separate workspaces, does a file change in `/A/B` affect `/A`?

**Answer**: No. They are completely independent.

| Operation | `/A/B` workspace | `/A` workspace |
|-----------|:-:|:-:|
| Add/delete file in `/A/B` | ✅ receives event | ❌ not affected |
| Add/delete file in `/A` | ❌ not affected | ✅ receives event |

**Why**: When `/A`'s chokidar watcher sees `/A/B/file.jpg`:
```
relativePath = path.relative('/A', '/A/B/file.jpg') → 'B/file.jpg'
relativeParts = ['B', 'file.jpg']
relativeParts.length > 1 → true → IGNORED by server
```
The event is never emitted to the SSE stream. The frontend never receives it.

### Audit Verdict

All file listing and monitoring code is top-level only. No violations found. The `isPathInFolder` `startsWith` permissiveness is a minor defense-in-depth gap with zero practical impact.
