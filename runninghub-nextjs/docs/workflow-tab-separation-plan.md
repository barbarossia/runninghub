# Workflow Tab Separation Plan

## Overview

Separate the "Select Files & Run Workflow" functionality from the Media Gallery tab into its own dedicated tab in the workspace page.

## Current State

The workspace page (`src/app/workspace/page.tsx`) currently has 3 tabs:
1. **Media Gallery** - Contains:
   - "Select Files & Run Workflow" section (workflow selector + input builder)
   - Media selection toolbar
   - Media gallery grid
2. **Workflows** - Workflow management (list, create, edit, delete)
3. **Job History** - Job tracking and details

### Problem

The "Select Files & Run Workflow" functionality is mixed within the Media Gallery tab, causing:
- **Cluttered interface**: Too much functionality in one tab
- **Unclear workflow**: Users must navigate through workflow configuration to get to media files
- **Mixed concerns**: Media browsing and workflow execution are separate tasks but share the same tab
- **Poor discoverability**: The media gallery is hidden below workflow configuration

## Target State

Reorganize the workspace into 4 tabs:

### 1. Media Gallery Tab
**Focus**: Browse and manage media files
- Media selection toolbar (when files are selected)
- Media gallery grid
- Preview dialog
- File management (rename, delete)

**Removed**: Workflow selector and input builder

### 2. Run Workflow Tab (NEW)
**Focus**: Configure and execute workflows
- Workflow selector
- Workflow input builder (file/text parameters)
- File assignment interface
- Run job button
- Post-processing options

**Moved from**: Media Gallery tab

### 3. Workflows Tab
**Focus**: Manage workflow definitions
- No changes to existing functionality

### 4. Job History Tab
**Focus**: Track and review jobs
- No changes to existing functionality

## User Requirements

1. **Separation of concerns**: Media browsing and workflow execution should be in separate tabs
2. **Clear navigation**: Each tab should have a single, clear purpose
3. **Workflow execution flow**: Users should select files in Media Gallery tab, then switch to Run Workflow tab to assign files and execute
4. **File selection state**: Selected files should persist when switching between tabs

## Technical Approach

### Files to Modify

1. **`src/app/workspace/page.tsx`**
   - Update `activeTab` type to include 'run-workflow'
   - Reorganize tab structure
   - Move workflow-related components to new tab
   - Update tab triggers to show 4 tabs instead of 3

### Component Reorganization

**Current Media Gallery Tab Content:**
```tsx
<TabsContent value="media">
  <h3>Select Files & Run Workflow</h3>
  <WorkflowSelector />           // MOVE to new tab
  <WorkflowInputBuilder />       // MOVE to new tab
  <MediaSelectionToolbar />      // STAY
  <MediaGallery />               // STAY
</TabsContent>
```

**New Structure:**
```tsx
<!-- Media Gallery Tab -->
<TabsContent value="media">
  <MediaSelectionToolbar />      // When files selected
  <MediaGallery />
</TabsContent>

<!-- Run Workflow Tab (NEW) -->
<TabsContent value="run-workflow">
  <WorkflowSelector />
  <WorkflowInputBuilder />
</TabsContent>
```

### Tab Icons

Use Lucide React icons:
- **Media Gallery**: `<FolderOpen />` (existing)
- **Run Workflow**: `<Play />` or `<Zap />` (new)
- **Workflows**: `<Workflow />` (existing)
- **Job History**: `<Clock />` (existing)

### Tab Layout

```tsx
<TabsList className="grid w-full grid-cols-4">
  <TabsTrigger value="media">
    <FolderOpen className="h-4 w-4" />
    Media Gallery
  </TabsTrigger>
  <TabsTrigger value="run-workflow">
    <Play className="h-4 w-4" />
    Run Workflow
  </TabsTrigger>
  <TabsTrigger value="workflows">
    <WorkflowIcon className="h-4 w-4" />
    Workflows
  </TabsTrigger>
  <TabsTrigger value="jobs">
    <Clock className="h-4 w-4" />
    Job History
  </TabsTrigger>
</TabsList>
```

### State Management

**No changes needed to store**:
- `selectedFolder` - Folder selection persists
- `mediaFiles` - Media files persist
- `jobFiles` - File assignments persist
- `jobInputs` - Text inputs persist
- `selectedWorkflowId` - Workflow selection persists

The Zustand store already maintains this state globally, so it will persist across tab switches automatically.

## User Flow

### Before (Current):
1. User opens workspace
2. User selects folder → redirected to Media Gallery tab
3. User must scroll past workflow configuration to see media files
4. User configures workflow and assigns files in the same tab
5. User runs job

### After (Proposed):
1. User opens workspace
2. User selects folder → redirected to Media Gallery tab
3. User browses and selects files in Media Gallery tab
4. User switches to Run Workflow tab
5. User selects workflow and assigns files
6. User runs job

### Key Improvement:
- **Step 3-4 separation**: Clear distinction between file selection and workflow configuration
- **Focused experience**: Each tab has a single purpose
- **Better mobile experience**: Less content per tab = less scrolling

## Implementation Steps

### Phase 1: Type and State Updates
- [ ] Update `activeTab` type to include `'run-workflow'`
- [ ] Update tab list layout to 4 columns
- [ ] Add new tab trigger

### Phase 2: Tab Content Reorganization
- [ ] Move workflow selector and input builder to new tab
- [ ] Clean up Media Gallery tab (remove workflow sections)
- [ ] Update Run Workflow tab header

### Phase 3: Styling and Polish
- [ ] Update tab icons (add Play/Zap for Run Workflow)
- [ ] Verify responsive layout (mobile, tablet, desktop)
- [ ] Test tab switching behavior

### Phase 4: Testing
- [ ] Test file selection persists across tabs
- [ ] Test workflow assignment works from new tab
- [ ] Test job execution still works correctly
- [ ] Test all 4 tabs render properly
- [ ] Build verification: `npm run build`

## Edge Cases

### Case 1: No files selected when switching to Run Workflow tab
**Expected**: Show empty state in input builder, allow file upload or assign from gallery (but no files selected)

**Solution**: WorkflowInputBuilder already handles empty assignments - shows upload/browse UI

### Case 2: Workflow selected but no files assigned
**Expected**: Validation error when trying to run

**Solution**: Existing validation logic in `WorkflowInputBuilder` prevents running without required inputs

### Case 3: User switches between tabs while job is running
**Expected**: Console continues to track job, job appears in Job History tab

**Solution**: Console is global component, unaffected by tab switching

## Benefits

1. **Improved UX**: Clear separation of concerns
2. **Better mobile experience**: Less scrolling per tab
3. **Easier maintenance**: Each tab has focused responsibility
4. **Future-proof**: Easy to add more workflow-related features to Run Workflow tab
5. **Consistent with workspace pattern**: Each tab = one major feature area

## Risks and Mitigations

### Risk: User confusion about new tab structure
**Mitigation**: Tab names are clear and descriptive. Default tab (Media Gallery) is where users land after folder selection, which is the most common use case.

### Risk: Users might not find Run Workflow tab
**Mitigation**: Icon (Play/Zap) and name ("Run Workflow") make it discoverable. Consider adding a tooltip or hint in first iteration if needed.

### Risk: Breaking existing user workflows
**Mitigation**: This is a UI reorganization only. No backend changes, no store changes, no API changes. Functionality remains the same, just better organized.

## Success Criteria

- [ ] All 4 tabs render correctly
- [ ] File selection persists across tab switches
- [ ] Workflow execution works from new Run Workflow tab
- [ ] No TypeScript errors
- [ ] Build succeeds (`npm run build`)
- [ ] No visual regressions
- [ ] Mobile layout works (4 tabs on small screens)

## Related Documentation

- **Workspace redesign**: `workspace-redesign-plan.md`
- **Gallery toolbar fix**: `workspace-gallery-toolbar-fix.md`
- **Frontend rules**: `runninghub-nextjs/CLAUDE.md`

---

**Created**: 2025-12-26
**Status**: Planning
**Priority**: Medium (UI/UX improvement)
