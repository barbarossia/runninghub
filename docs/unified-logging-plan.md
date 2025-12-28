# Unified Logging & Messaging Plan

## Goal
Unify all user-facing feedback mechanisms (`toast` in UI, `writeLog` in API, `print_xxx` in CLI) so that they all appear consistently in the **ConsoleViewer** (the global log console).

## 1. Unified Log Schema
All logs (Frontend, API, CLI) will follow this structure:
```typescript
interface LogEntry {
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error' | 'debug';
  source: 'ui' | 'api' | 'cli';
  message: string;
  taskId?: string; // Optional: links log to a specific job/task
  metadata?: Record<string, any>;
}
```

## 2. Global Logging Architecture

### A. Frontend (UI -> Console)
Currently, `toast` messages are only visible for a few seconds and don't persist.
- **New Utility:** `src/utils/logger.ts` (Client-side).
- **Behavior:** `logger.info("message", { toast: true })` will:
  1. Call `toast.info("message")`.
  2. Send `POST /api/logs` with the log entry to persist it.

### B. API (Server -> Console)
Currently, `writeLog` is used for background tasks.
- **Enhancement:** Ensure all API routes use `writeLog` for significant events (not just background tasks).
- **Consistency:** Map all caught errors to `writeLog(err.message, 'error')`.

### C. CLI (Terminal -> Console)
Currently, the API captures CLI output and logs it to `writeLog`.
- **Enhancement:** Standardize CLI output to use a `--json` or `--structured` flag.
- **Mapping:** The API will parse CLI lines:
  - `print_success` -> `writeLog(msg, 'success', taskId, 'cli')`
  - `print_error` -> `writeLog(msg, 'error', taskId, 'cli')`

## 3. Storage & Retrieval
- **Persistence:** All logs are stored in `.next/cache/runninghub-logs/process.log` (local file).
- **Viewing:** `ConsoleViewer` component polls `/api/logs` to show the combined stream.
- **Filtering:** Add a "Source" filter (UI/API/CLI) to the `ConsoleViewer`.

## 4. Key Component Updates
1. **`src/lib/logger.ts` (API):** Update `LogEntry` interface and `writeLog` to support the new schema.
2. **`src/app/api/logs/route.ts`:** Add `POST` handler to receive logs from the frontend.
3. **`src/utils/logger.ts` (NEW):** Create client-side bridge utility.
4. **`src/components/ui/ConsoleViewer.tsx`:** Update UI to handle and colorize logs based on `source`.
