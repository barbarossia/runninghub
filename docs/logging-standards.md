# RunningHub Logging & Messaging Standards

This document summarizes the logging and messaging patterns used across the RunningHub project to ensure consistency between the frontend, API, and CLI.

## 1. Frontend (Next.js UI)

**Library:** `sonner` (via `toast` utility)
**Usage:** User-facing notifications for immediate feedback.

| Level | Method | Purpose |
| :--- | :--- | :--- |
| Info | `toast.info(msg)` | Neutral information, tips, or status updates. |
| Success | `toast.success(msg)` | Confirmation of successful operations (save, delete, etc.). |
| Warning | `toast.warning(msg)` | Non-critical alerts or potential issues. |
| Error | `toast.error(msg)` | Critical failures or validation errors. |

**Standard Console:**
- `console.log()`: Debugging and flow tracking.
- `console.error()`: Logging caught exceptions before showing user feedback.
- `console.warn()`: Deprecation or non-critical runtime issues.

---

## 2. API Routes (Next.js Backend)

**Utility:** `writeLog(message, level, taskId)` in `src/lib/logger.ts`
**Persistence:** Appends JSON objects to `.next/cache/runninghub-logs/process.log`.
**Usage:** Background tasks, long-running processes, and audit trails shown in `ConsoleViewer`.

| Level | Argument | Color in UI |
| :--- | :--- | :--- |
| Info | `'info'` | Blue |
| Success | `'success'` | Green |
| Warning | `'warning'` | Yellow |
| Error | `'error'` | Red |

**Task Tracking:**
Always include `taskId` when logging within background processes (like video conversion or workflow execution) to allow filtering in the UI.

---

## 3. CLI (Python)

**Utility:** `print_success`, `print_error`, `print_info`, `print_warning` in `runninghub_cli/utils.py`
**Output:** Colorized terminal output using `colorama`.

| Level | Method | Symbol | Color |
| :--- | :--- | :--- | :--- |
| Info | `print_info(msg)` | ℹ | Blue |
| Success | `print_success(msg)` | ✓ | Green |
| Warning | `print_warning(msg)` | ⚠ | Yellow |
| Error | `print_error(msg)` | ✗ | Red |

---

## 4. Consistency Guidelines

1.  **Error Handling:**
    - Always `console.error` the raw error in API routes.
    - Use `writeLog` with level `'error'` for background task failures.
    - Return a clean error message in the JSON response for the frontend to show via `toast.error`.

2.  **Success Feedback:**
    - For instant actions (e.g., renaming a file), use `toast.success`.
    - For batch actions (e.g., processing 10 images), use `writeLog` for each item and `toast.success` once the entire batch is submitted or completed.

3.  **Request/Response Logging:**
    - API routes should log significant actions (starts, ends, external CLI calls) using `writeLog` if they belong to a task.
    - CLI commands should use `--json` flag when called by the API to facilitate structured error parsing.

## 5. File Locations & Usage Examples

### 5.1 Frontend UI (`toast`)
- `src/app/gallery/page.tsx`: Deletion success/error, folder selection errors.
- `src/app/workspace/page.tsx`: Workflow save/delete, job start/completion, duck decoding status.
- `src/app/videos/clip/page.tsx`: Clipping success/failure, renaming, deletion.
- `src/app/videos/crop/page.tsx`: Crop configuration validation, success/failure.
- `src/app/videos/page.tsx`: Conversion status, renaming, deletion.

### 5.2 Background Tasks (`writeLog`)
- `src/app/api/images/delete/route.ts`: Audit of deleted images.
- `src/app/api/images/process/route.ts`: Detailed steps of image processing batches.
- `src/app/api/workspace/execute/route.ts`: Workflow execution lifecycle (upload, copy, CLI execution, output processing).
- `src/app/api/videos/clip/route.ts`: Video clipping steps and ffmpeg results.
- `src/app/api/videos/crop/route.ts`: Video cropping progress.
- `src/app/api/videos/convert/route.ts`: Video conversion progress.

### 5.3 CLI Output (`print_...`)
- `runninghub_cli/cli.py`: Main entry point for all commands (config, nodes, upload, process, etc.).
- `runninghub_cli/video_utils.py`: FFmpeg-based operations (clip, crop, rename).
- `runninghub_cli/duck_utils.py`: Duck decoding operations.

### 5.4 Logging Infrastructure
- `src/lib/logger.ts`: The `writeLog` implementation (Node.js).
- `runninghub_cli/utils.py`: The `print_...` implementations (Python).
- `src/components/ui/ConsoleViewer.tsx`: The UI component that consumes background logs.
- `src/app/api/logs/route.ts`: API endpoint for fetching and clearing logs.
