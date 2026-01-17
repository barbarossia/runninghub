# Media Gallery "Stuck" Issue Analysis

## Issue Description
Users reported a "stuck" feeling when performing actions like deleting or decoding files from the Media Gallery toolbar. The UI would appear unresponsive or the dialog would hang before the gallery refreshed.

## Investigation

### 1. API Performance Check
We investigated `api/workspace/delete/route.ts` and `api/folder/list/route.ts`.
- **Delete API:** Standard `fs.unlink` operations. Very fast.
- **List API:** Scans directory contents.
    - **Benchmark:** Scanned `~/Downloads` (161 items).
    - **Result:** JSON payload size ~20KB, generation time ~1.5ms.
- **Conclusion:** The backend API performance is optimal and NOT the cause of the delay.

### 2. Frontend State & Component Lifecycle
The issue was traced to the interaction between the asynchronous refresh cycle and component unmounting in `MediaSelectionToolbar.tsx` and `page.tsx`.

**The Problem Flow:**
1.  User clicks "Delete" -> Dialog opens.
2.  User confirms -> `handleDelete` starts.
3.  `handleDelete` awaits the API call AND the subsequent `handleRefresh`.
4.  `handleRefresh` fetches new data and updates `mediaFiles`.
5.  **Critical Step:** The update resets `selected: false` for all files.
6.  `selectedFiles.length` becomes 0.
7.  `MediaSelectionToolbar` (parent of the Dialog) unmounts immediately.

**The "Stuck" Sensation:**
The user sees the dialog persist (or freeze) while waiting for the full refresh cycle (network round trip + React reconciliation). The toolbar then vanishes abruptly. This lack of immediate feedback and the dependency on the full refresh cycle created the unresponsive feeling.

## Resolution
The fix implemented involved:
1.  **Immediate Feedback:** Updated `MediaSelectionToolbar.tsx` to close the Dialogs (Delete/Decode) **immediately** upon confirmation, *before* awaiting the async operations.
2.  **Concurrency Fix:** Corrected a bug in `MediaGallery` where selecting a single image triggered validation for the *entire* gallery, causing massive main-thread blocking.
3.  **Validation Optimization:** Added checks to skip redundant validation for files already pending.

## Status
Fixed and verified. The UI is now responsive, and the "stuck" sensation is resolved.
