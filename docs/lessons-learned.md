# Recent Fixes & Lessons Learned

This document captures recent bug fixes and lessons learned to prevent similar issues in the future.

---

## Fix #1: Missing Task ID in job.json

**Date**: 2026-01-24
**Commit**: `c85d893`

### Problem
The RunningHub task ID was not being saved locally because the CLI output was suppressed in JSON mode. This caused jobs to be submitted successfully but without tracking the task ID for later queries.

### Root Cause
- CLI `--json` flag was suppressing standard output, including the "Task submitted successfully! Task ID: {id}" message
- Backend parser only expected human-readable output format
- When backend invoked CLI with `--json`, no task ID was available to parse

### Solution Implemented

#### 1. CLI Changes (`runninghub_cli/cli.py`)
```python
# After submitting task, output in JSON format when --json is set
task_id = client.submit_task(active_workflow_id, node_configs)
if output_json:
    print(json.dumps({"taskId": task_id, "status": "submitted"}))
else:
    print_success(f"Task submitted successfully! Task ID: {task_id}")
```

Applied to all CLI commands that submit tasks:
- `process`
- `process-multiple`
- `run-workflow`
- `run-text-workflow`

#### 2. Backend Parser Changes (`runninghub-nextjs/src/app/api/workspace/execute/route.ts`)
```typescript
function parseRunningHubTaskId(stdout: string): string | null {
  const patterns = [
    /Task ID:\s*(\d+)/i,           // Human-readable format
    /task.*?id[:\s]+(\d+)/i,
    /taskid:\s*(\d+)/i,
    /"taskId"\s*:\s*"(\d+)"/i,      // JSON format
    /"taskId"\s*:\s*(\d+)/i,       // JSON format without quotes
  ];

  for (const pattern of patterns) {
    const match = stdout.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}
```

#### 3. UI Improvements (`runninghub-nextjs/src/components/workspace/JobDetail.tsx`)
- Added re-query button for failed jobs
- Improved error messages when task ID is missing
- Disabled re-query button when no task ID is available

### Lessons Learned

1. **JSON Mode Should Not Suppress Critical Data**: When implementing JSON output modes, ensure critical identifiers (like task IDs, file IDs, etc.) are still available in the output, either:
   - As part of the JSON response
   - As a separate log line (if using `--json --verbose`)

2. **Parse Multiple Output Formats**: Backend parsers should support both human-readable and machine-readable formats. Add comprehensive regex patterns that cover:
   - Standard CLI output: `"Task ID: 12345"`
   - JSON output: `"taskId": "12345"` or `"taskId": 12345`

3. **Test All CLI Modes**: When adding a `--json` flag to a CLI command, verify that:
   - All critical information is preserved in JSON output
   - The JSON structure is parseable
   - Backend integration works with the new format

4. **Graceful Degradation**: When task ID is missing (e.g., failed submission), the UI should:
   - Show clear error messages
   - Provide actionable alternatives (e.g., re-query button for tasks that might have succeeded)
   - Disable actions that require the missing data

---

## Fix #2: Incorrect frame_count Parameter in Video Clip

**Date**: 2026-01-22
**Commit**: `3adce73`

### Problem
The video clip tool was passing `frame_count` parameter for all extraction modes, causing issues with `last_frame` and `first_frame` modes which don't use this parameter.

### Root Cause
- The config generation always included `frame_count` regardless of the mode
- The underlying video-clip tool expected `frame_count` to be `None` or omitted for single-frame modes

### Solution Implemented (`runninghub_cli/video_utils.py`)

```python
"extraction": {
    "mode": clip_config.get("mode", "last_frame"),
    "frame_count": clip_config.get("frameCount", 5)
    if clip_config.get("mode") == "last_frames"
    else None,
    "interval_seconds": clip_config.get("intervalSeconds", 10)
    if clip_config.get("mode") == "interval"
    else None,
    "interval_frames": clip_config.get("intervalFrames", 1)
    if clip_config.get("mode") == "frame_interval"
    else None,
    "organize_by_video": clip_config.get("organizeByVideo", True),
}
```

### Lessons Learned

1. **Conditional Parameter Passing**: When integrating with external tools, parameters should only be passed when they are relevant to the current mode/context:
   - Use conditional expressions or None values for unused parameters
   - Check external tool documentation for which parameters are required vs optional

2. **Mode-Specific Configuration**: For tools with multiple modes (e.g., `last_frame`, `last_frames`, `interval`), ensure configuration generation handles each mode's requirements:
   - Only pass parameters that make sense for the mode
   - Use explicit conditionals for each mode-specific parameter
   - Document which parameters are required for each mode

3. **Test All Modes**: When adding or modifying modes, test:
   - Each mode independently
   - All mode-specific parameter combinations
   - Edge cases (e.g., default values, None values)

---

## General Best Practices

### CLI Design

1. **Structured Output**: When supporting both human-readable and JSON output:
   - JSON should be parseable and contain all critical data
   - Human-readable output should be clear and informative
   - Use a `--verbose` flag to show both

2. **Idempotency**: CLI commands should produce consistent output regardless of when they are run:
   - Task IDs should be deterministic or clearly labeled
   - File paths should be absolute or relative to a known base
   - Output format should be consistent

3. **Error Codes**: Use standardized exit codes:
   - `0`: Success
   - `1`: General error
   - `2`: Invalid input
   - `3`: Network/API error

### Backend Integration

1. **Flexible Parsing**: Backend parsers should:
   - Support multiple output formats (JSON, plain text, mixed)
   - Use comprehensive regex patterns
   - Log unparsable output for debugging
   - Provide clear error messages when parsing fails

2. **Task Tracking**: For long-running tasks:
   - Always capture and store task IDs
   - Provide status query endpoints
   - Implement re-query capabilities for manual recovery
   - Handle task submission failures gracefully

### Configuration Management

1. **Mode-Aware Configuration**: When dealing with multi-mode tools:
   - Generate configuration based on active mode
   - Only include relevant parameters
   - Use `None` or omit optional parameters
   - Document parameter requirements for each mode

2. **Validation**: Validate configuration before use:
   - Check required parameters for the current mode
   - Validate parameter ranges and types
   - Provide clear error messages for invalid config

---

## Testing Checklist

Before deploying changes to CLI or backend integration:

- [ ] CLI with `--json` flag outputs parseable JSON with all critical data
- [ ] CLI without `--json` flag outputs human-readable messages
- [ ] Backend parser handles all expected output formats
- [ ] Task IDs are captured and stored correctly
- [ ] All modes of multi-mode tools are tested
- [ ] Mode-specific parameters are only passed when relevant
- [ ] Error messages are clear and actionable
- [ ] UI handles missing data gracefully (disabled buttons, error messages)
- [ ] Re-query functionality works for failed tasks
