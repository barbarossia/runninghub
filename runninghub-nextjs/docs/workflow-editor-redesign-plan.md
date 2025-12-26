# Workflow Create/Edit Page Redesign Plan

## Overview

Redesign the workflow create/edit page to support:
1. **Workflow template selection** from available workflow IDs in .env.local
2. **Dynamic field generation** by invoking CLI to fetch node information
3. **Enhanced file type support** with image/video selection
4. **Persistent storage** in workspace folder for future editing

## User Requirements

1. Add dropdown list of available workflow IDs from .env.local
   - Current: `RUNNINGHUB_WORKFLOW_ID=2002570902468476929`
   - Add: `RUNNINGHUB_S_ID=2004098019010199554`
   - Add: `RUNNINGHUB_D_ID=2004104127166726146`

2. When workflow ID is selected:
   - Invoke CLI command: `runninghub nodes --workflow <workflow_id>`
   - Parse node information to extract input fields
   - Auto-populate form with retrieved fields

3. Field configuration:
   - Keep required/optional checkbox
   - Allow partial editing (users can modify certain properties)
   - File type inputs support image/video selection

4. Storage solution:
   - Save workflows as JSON files in workspace folder
   - Enable loading saved workflows for editing

## Current Implementation Analysis

### Files to Modify

1. **`src/components/workspace/WorkflowEditor.tsx`**
   - Current: Manual parameter entry
   - Target: Template-based creation + manual editing

2. **`src/types/workspace.ts`**
   - Add: `WorkflowTemplate` type
   - Extend: `Workflow` type with `sourceWorkflowId` and `sourceType`

3. **`.env.local`**
   - Add: `RUNNINGHUB_S_ID` and `RUNNINGHUB_D_ID`

4. **`src/constants/index.ts`**
   - Add: Helper to read multiple workflow IDs

5. **API Route**: Create `/api/workflow/nodes` endpoint
   - Fetches node info from CLI
   - Returns parsed input field definitions

### CLI Integration

**CLI Command**:
```bash
RUNNINGHUB_API_KEY=<key> RUNNINGHUB_WORKFLOW_ID=<workflow_id> runninghub nodes
```

**Output Format**:
```
✓ Found 4 nodes:
1. LoadImage (203)
   Type: Unknown
   Description: image

2. Text (231)
   Type: Unknown
   Description: text

3. Int (235)
   Type: Unknown
   Description: value

4. Int (236)
   Type: Unknown
   Description: value
```

## Implementation Plan

### Phase 1: Type Definitions and Constants

**File**: `src/types/workspace.ts`

Add new types:

```typescript
/**
 * Node information from CLI
 */
export interface CliNode {
  id: number;
  name: string;
  type: string;
  description: string;
  inputType?: 'image' | 'video' | 'text' | 'number' | 'boolean';
}

/**
 * Workflow template configuration
 */
export interface WorkflowTemplate {
  workflowId: string;
  workflowName: string;
  nodes: CliNode[];
  fetchedAt: number;
}

/**
 * Extended Workflow type with source tracking
 */
export interface WorkflowV2 extends Workflow {
  sourceWorkflowId?: string; // Original workflow ID from .env.local
  sourceType?: 'template' | 'custom'; // How this workflow was created
}
```

**File**: `src/constants/workflows.ts` (new file)

```typescript
export const AVAILABLE_WORKFLOWS = [
  {
    id: '2002570902468476929',
    name: 'Main Workflow',
    envKey: 'NEXT_PUBLIC_RUNNINGHUB_WORKFLOW_ID',
  },
  {
    id: '2004098019010199554',
    name: 'S Workflow',
    envKey: 'NEXT_PUBLIC_RUNNINGHUB_S_ID',
  },
  {
    id: '2004104127166726146',
    name: 'D Workflow',
    envKey: 'NEXT_PUBLIC_RUNNINGHUB_D_ID',
  },
];
```

### Phase 2: API Endpoint for CLI Nodes

**File**: `src/app/api/workflow/nodes/route.ts` (new file)

Create API endpoint to fetch node information from CLI.

### Phase 3: Workflow Storage API

**File**: `src/app/api/workflow/save/route.ts` (new file)
**File**: `src/app/api/workflow/list/route.ts` (new file)

Create endpoints to save and list workflows in workspace folder.

### Phase 4: Update WorkflowEditor Component

**File**: `src/components/workspace/WorkflowEditor.tsx`

Major changes:
1. Add workflow template selection (for new workflows)
2. Fetch and populate fields from CLI
3. Enhanced file type selection (image/video)
4. Partial editing support with locked fields
5. Save to workspace folder

### Phase 5: Update ParameterEditor Component

Enhance to support:
1. `lockedFields` prop
2. Image/video file type selector
3. Visual indicators for locked fields

### Phase 6: Environment Configuration

Add new workflow IDs to `.env.local`.

## User Experience Flow

**Creating New Workflow**:
1. User clicks "Create Workflow"
2. Dialog shows "Step 1: Select Template"
3. User selects workflow ID from dropdown
4. User clicks "Load Template"
5. System fetches nodes from CLI
6. Dialog shows "Step 2: Configure Fields"
7. Fields are pre-populated with CLI data
8. User can modify certain properties (required, description, validation)
9. User selects image/video for file inputs
10. User clicks "Save"
11. Workflow saved to workspace folder

**Editing Existing Workflow**:
1. User clicks workflow to edit
2. Dialog shows current configuration
3. If created from template, show source workflow ID (read-only)
4. User can modify unlocked fields
5. Save updates file in workspace folder

## Critical Files to Modify

1. `src/types/workspace.ts` - Add new types
2. `src/constants/workflows.ts` - NEW: Workflow ID constants
3. `src/app/api/workflow/nodes/route.ts` - NEW: CLI nodes endpoint
4. `src/app/api/workflow/save/route.ts` - NEW: Save workflow endpoint
5. `src/app/api/workflow/list/route.ts` - NEW: List workflows endpoint
6. `src/components/workspace/WorkflowEditor.tsx` - Major redesign
7. `.env.local` - Add new workflow IDs

## Design Considerations

### Backward Compatibility

- Existing workflows in localStorage should continue to work
- Add migration path to save localStorage workflows to workspace folder
- Maintain current `Workflow` type with new optional fields

### Error Handling

- Handle CLI command failures
- Handle missing environment variables
- Handle network errors when fetching nodes
- Validate workflow data before saving
- Show user-friendly error messages
