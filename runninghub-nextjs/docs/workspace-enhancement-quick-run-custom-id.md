# Workspace Enhancement - Quick Run & Custom Workflow IDs

## Overview

This document describes two new features added to the workspace page:
1. **Quick Run Workflow from Media Gallery** - Select files and run them through a workflow with confirmation dialog
2. **Custom Workflow ID Management** - Add workflow IDs manually via dropdown, persist to .env.local

**Status**: ✅ Completed
**Date**: 2025-12-26
**Branch**: `feature/workspace-enhancement`

---

## Feature 1: Quick Run Workflow from Media Gallery

### Purpose

Allow users to quickly assign selected files from the Media Gallery to a workflow and switch to the Run Workflow tab, streamlining the workflow execution process.

### User Flow

```
1. User selects files in Media Gallery
   ↓
2. "Run Workflow" button appears in MediaSelectionToolbar
   ↓
3. User clicks "Run Workflow"
   ↓
4. QuickRunWorkflowDialog appears:
   - Shows file count and preview thumbnails
   - Dropdown to select workflow
   - Shows compatibility stats (compatible/incompatible files)
   - Confirm/Cancel buttons
   ↓
5. User selects workflow and clicks Confirm
   ↓
6. System automatically:
   - Smart-assigns selected files to compatible workflow parameters
   - Switches to Run Workflow tab
   - Shows success toast
   ↓
7. User reviews assignments and runs job
```

### Smart Auto-Assignment Algorithm

The `autoAssignSelectedFilesToWorkflow` function in the workspace store implements intelligent file assignment:

```typescript
// For each workflow parameter (in order):
for (const param of workflow.inputs) {
  if (param.type !== 'file') continue;

  // Find compatible files (not yet assigned, passes validation)
  const compatibleFiles = selected.filter(file => {
    if (assignedFiles.has(file.path)) return false;
    const validation = validateFileForParameter(file, param);
    return validation.valid;
  });

  // Assign all compatible files to this parameter
  compatibleFiles.forEach(file => {
    assignments.push({ ... });
    assignedFiles.add(file.path);
  });
}
```

**Validation Rules:**
- File type matching (image/*, video/*)
- Extension filters (.jpg, .png, .mp4, etc.)
- Media type validation (image vs video)
- Respects required vs optional parameters

### Files Created/Modified

#### Created:
- `src/components/workspace/QuickRunWorkflowDialog.tsx`
  - Dialog with workflow selector dropdown
  - File preview thumbnails (shows first 5)
  - Compatibility statistics
  - Incompatibility warnings

#### Modified:
- `src/components/workspace/MediaSelectionToolbar.tsx`
  - Added "Run Workflow" button (both expanded and floating modes)
  - Integrated QuickRunWorkflowDialog
  - Added `onRunWorkflow` callback prop

- `src/store/workspace-store.ts`
  - Added `autoAssignSelectedFilesToWorkflow` action
  - Implements smart file-to-parameter assignment
  - Updates jobFiles and selectedWorkflowId

- `src/app/workspace/page.tsx`
  - Added `showQuickRunDialog` state
  - Added `handleQuickRunWorkflow` callback
  - Passed `onRunWorkflow` prop to MediaSelectionToolbar
  - Rendered QuickRunWorkflowDialog

---

## Feature 2: Custom Workflow ID Management

### Purpose

Allow users to manually add workflow IDs that aren't configured in `.env.local`, enabling them to use workflows from their RunningHub account without manually editing environment files.

### User Flow

```
1. User in Run Workflow tab
   ↓
2. Clicks WorkflowSelector dropdown
   ↓
3. Selects "Add Custom Workflow ID" option
   ↓
4. CustomWorkflowIdDialog appears:
   - Step 1: Enter Workflow ID
     - Input field for workflow ID
     - "Fetch Workflow" button
   - Step 2: Review and Save
     - Shows workflow details (parameter count)
     - Auto-generated workflow name (editable)
     - Auto-generated env key (NEXT_PUBLIC_RUNNINGHUB_CUSTOM_ID_<timestamp>)
     - Lists all parameters with required/optional badges
     - "Save to .env.local" button
   ↓
5. System validates and saves:
   - Validates workflow ID exists on RunningHub
   - Fetches workflow nodes via CLI
   - Saves to .env.local with auto-generated key
   - Saves workflow JSON file to workspace/workflows/
   - Reloads workflows list
   ↓
6. New workflow appears in dropdown
```

### Files Created/Modified

#### Created:
- `src/components/workspace/CustomWorkflowIdDialog.tsx`
  - Two-step dialog (enter ID → review & save)
  - Workflow validation via API
  - Auto-generates env key and workflow name
  - Shows workflow parameter details

- `src/app/api/workflow/validate-custom-id/route.ts`
  - POST endpoint to validate workflow IDs
  - Fetches workflow nodes from RunningHub CLI
  - Returns workflow inputs/outputs structure
  - Error handling for invalid IDs, network issues

- `src/app/api/workflow/add-custom-id/route.ts`
  - POST endpoint to save custom workflow IDs
  - Validates no duplicate env keys or workflow IDs
  - Appends to .env.local file
  - Saves workflow JSON file
  - Returns success response

#### Modified:
- `src/components/workspace/WorkflowSelector.tsx`
  - Added "Add Custom Workflow ID" option to dropdown
  - Added Key icon for the option
  - Integrated CustomWorkflowIdDialog
  - Reloads workflows after saving

---

## Implementation Details

### Smart File Assignment Algorithm

The auto-assignment feature uses intelligent matching:

1. **Parameter Processing**: Iterates through workflow parameters in order
2. **File Compatibility Check**: Uses `validateFileForParameter` from `workspace-validation.ts`
3. **Assignment Strategy**: Assigns all compatible files to each parameter
4. **Deduplication**: Tracks assigned files to prevent double-assignment
5. **Validation Feedback**: Shows count of assigned/unassigned files

### .env.local Management

The custom workflow ID feature handles `.env.local` safely:

1. **Read Current Content**: Reads existing `.env.local` file
2. **Duplicate Prevention**: Checks for duplicate env keys and workflow IDs
3. **Safe Appending**: Appends new entry with timestamp comment
4. **JSON Persistence**: Creates workflow JSON file alongside env entry
5. **Error Handling**: Returns 409 Conflict for duplicates, 500 for other errors

### API Endpoints

#### `POST /api/workflow/validate-custom-id`

**Request:**
```json
{
  "workflowId": "2002570902468476929"
}
```

**Response:**
```json
{
  "success": true,
  "workflow": {
    "id": "2002570902468476929",
    "inputs": [...],
    "outputs": {...}
  }
}
```

**Error Responses:**
- 400: Invalid workflow ID, timeout, network error, authentication error
- Includes specific error messages for different failure scenarios

#### `POST /api/workflow/add-custom-id`

**Request:**
```json
{
  "workflowId": "2002570902468476929",
  "workflowName": "Custom Workflow 10:30:45",
  "envKey": "NEXT_PUBLIC_RUNNINGHUB_CUSTOM_ID_1735215845123",
  "workflow": {...}
}
```

**Response:**
```json
{
  "success": true,
  "message": "Custom workflow ID saved successfully",
  "workflow": {...}
}
```

**Error Responses:**
- 400: Missing required fields
- 409: Duplicate env key or workflow ID
- 500: Server error during file operations

---

## Testing Checklist

### Feature 1: Quick Run Workflow

- [ ] Select files in Media Gallery → "Run Workflow" button appears
- [ ] Click button → Dialog appears with file previews
- [ ] Select workflow → Compatibility stats update
- [ ] Click Confirm → Files auto-assigned, tab switches
- [ ] Toast notification appears
- [ ] Files appear in Run Workflow tab parameters
- [ ] Test with incompatible files → Warning shows
- [ ] Test with no compatible files → Confirm button disabled
- [ ] Test with no workflows → "No workflows configured" message

### Feature 2: Custom Workflow ID

- [ ] Click dropdown → "Add Custom Workflow ID" option appears
- [ ] Click option → Dialog appears with empty input
- [ ] Enter valid workflow ID → Fetch succeeds
- [ ] Enter invalid workflow ID → Error toast appears
- [ ] Review step shows correct parameter count
- [ ] Save to .env.local → File updated correctly
- [ ] Workflow JSON file created in workspace/workflows/
- [ ] Workflow appears in dropdown after reload
- [ ] Try duplicate ID → 409 error returned
- [ ] Try duplicate env key → 409 error returned
- [ ] Test workflow execution with newly added workflow

---

## Build Verification

✅ **Build Status**: Passed
✅ **TypeScript Compilation**: No errors
✅ **API Routes**: Created and registered
- `/api/workflow/validate-custom-id`
- `/api/workflow/add-custom-id`

**Build Command:**
```bash
npm run build
```

**Result:**
- ✓ Compiled successfully in 8.2s
- ✓ Running TypeScript
- ✓ Collecting page data using 9 workers
- ✓ Generating static pages using 9 workers (39/39)
- ✓ All routes registered correctly

---

## Technical Considerations

### Security
- **.env.local writes**: Server-side only (API routes prevent client-side access)
- **Workflow validation**: Always validates before saving
- **File paths**: Uses `path.join()` to prevent injection
- **CLI execution**: Uses `execSync` with timeout to prevent hanging

### Performance
- **Smart assignment**: O(n*m) algorithm where n=files, m=params
- **CLI timeout**: 30-second timeout for workflow validation
- **File operations**: Async/await for all I/O operations
- **Store updates**: Batched updates to minimize re-renders

### User Experience
- **Clear feedback**: Toast notifications for all actions
- **Validation messages**: Specific error messages
- **Loading states**: Spinners during async operations
- **Previews**: File thumbnails in Quick Run dialog
- **Compatibility stats**: Shows which files can be assigned

### Edge Cases Handled

1. **No workflow selected**: Confirm button disabled
2. **No files selected**: "Run Workflow" button not shown
3. **All files incompatible**: Warning shown, confirm allowed
4. **Partial assignment**: Toast shows assigned/unassigned count
5. **.env.local missing**: File created if doesn't exist
6. **Duplicate workflow IDs**: Returns 409 Conflict
7. **Invalid workflow ID**: Specific error messages
8. **Network timeout**: User-friendly error message
9. **Authentication errors**: Clear API key error message

---

## Related Files

### Components
- `src/components/workspace/QuickRunWorkflowDialog.tsx` (NEW)
- `src/components/workspace/CustomWorkflowIdDialog.tsx` (NEW)
- `src/components/workspace/MediaSelectionToolbar.tsx` (MODIFIED)
- `src/components/workspace/WorkflowSelector.tsx` (MODIFIED)

### Store
- `src/store/workspace-store.ts` (MODIFIED)
  - Added `autoAssignSelectedFilesToWorkflow` action

### Pages
- `src/app/workspace/page.tsx` (MODIFIED)
  - Added quick run handler and dialog integration

### API Routes
- `src/app/api/workflow/validate-custom-id/route.ts` (NEW)
- `src/app/api/workflow/add-custom-id/route.ts` (NEW)

### Utils
- `src/utils/workspace-validation.ts` (EXISTING)
  - Uses `validateFileForParameter` for smart assignment

---

## Future Enhancements

### Potential Improvements
1. **Batch workflow assignment**: Assign multiple workflows to files at once
2. **Workflow templates**: Save custom workflow assignments as templates
3. **Assignment history**: Track which files were assigned to which workflows
4. **Conflict resolution**: UI for resolving file conflicts during assignment
5. **Bulk operations**: Add multiple custom workflow IDs at once

### Known Limitations
1. **.env.local reload**: Requires server restart to pick up new env vars in some cases
2. **Assignment conflicts**: If file matches multiple parameters, uses first match
3. **File type inference**: Relies on file extension for type detection

---

**Created**: 2025-12-26
**Last Updated**: 2025-12-26
**Author**: Development Team
**Status**: ✅ Implementation Complete
