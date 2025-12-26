# Workspace Feature Redesign - Implementation Plan

**Status**: Planning Phase
**Created**: 2025-12-25
**Priority**: High

---

## Overview

Redesign the workspace feature from a simple image upload + text editing interface to a comprehensive workflow execution environment.

### Current State
- Simple image upload functionality
- Single workflow ID configuration
- Text editors for bilingual content
- Basic processing through Python CLI
- File selection and status tracking

### Target State
- Folder selection (File System Access API + manual input)
- Media gallery display (images + videos) like image gallery
- Manual workflow configuration with input parameter definitions
- Job management and history with re-run capability
- File validation against workflow requirements (auto-filter)

---

## User Requirements

### Core Requirements
1. **Folder Selector**: Use the same folder selector pattern as image gallery (File System Access API + manual input fallback)
2. **Main Page Display**: Show all media files (images, videos) in gallery grid, not just text editors
3. **Media File Management**: View detailed file information, rename, and delete media files
   - **Images**: View width, height, file size (e.g., "1M"), rename, delete
   - **Videos**: View width, height, file size, FPS, playback preview, rename, delete
4. **Upload Button**: Keep upload functionality to allow users to add their own files to workspace
5. **Workflow Configuration**: Manual configuration only - users manually add workflow IDs with names and input parameter definitions
6. **File Validation**: When user selects files and workflow, auto-filter files that don't match workflow's input parameter requirements
7. **Workflow Input Fields**: When user selects a workflow, display all required input fields with drag-and-drop placeholders, validate file types
8. **Job System**: Generate jobs containing workflow ID, all inputs, and results - save to history for viewing
9. **Job Management**: Users can view and manage jobs (re-run previous jobs)
10. **Post-Processing Cleanup**: Option to automatically delete source files after successful workflow completion
11. **Text Output Viewing**: If workflow outputs contain txt files, view them in text areas with:
    - Translation support (EN ↔ Chinese using Chrome AI Translator API)
    - Edit capability
    - Copy button to copy text to other workflow text input fields for chaining workflows

### Confirmed Design Decisions
- **Folder Selection**: Same as gallery (FS API + manual)
- **Workflow List**: Manual configuration (no API fetching)
- **Job History**: Store basic info + results/outputs, allow re-running (no logs storage)
- **File Validation**: Auto-filter invalid files

---

## Architecture Design

### Type Definitions

#### WorkflowInputParameter
```typescript
export interface WorkflowInputParameter {
  id: string;
  name: string;
  type: 'text' | 'file' | 'number' | 'boolean';
  required: boolean;
  defaultValue?: string | number | boolean;
  placeholder?: string;
  validation?: {
    fileType?: string[];      // ['image/*', 'video/*']
    extensions?: string[];    // ['.jpg', '.png']
    min?: number;
    max?: number;
    pattern?: string;
  };
}
```

#### Workflow
```typescript
export interface Workflow {
  id: string;
  name: string;
  description?: string;
  inputs: WorkflowInputParameter[];
  output?: {
    type: 'files' | 'text' | 'mixed';
    description?: string;
  };
  createdAt: number;
  updatedAt: number;
}
```

#### FileInputAssignment
```typescript
export interface FileInputAssignment {
  parameterId: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  fileType: 'image' | 'video';
  valid: boolean;
  validationError?: string;
}
```

#### MediaFile (Enhanced)
```typescript
export interface MediaFile {
  id: string;
  name: string;
  path: string;
  type: 'image' | 'video';
  extension: string;
  size: number;                    // File size in bytes

  // Image-specific metadata
  width?: number;                  // Image width in pixels
  height?: number;                 // Image height in pixels
  format?: string;                 // Image format (JPEG, PNG, etc.)

  // Video-specific metadata
  duration?: number;               // Video duration in seconds
  fps?: number;                    // Frames per second
  bitrate?: number;                // Video bitrate
  codec?: string;                  // Video codec

  // Preview
  thumbnail?: string;              // Thumbnail URL
  blobUrl?: string;                // Blob URL for preview

  // Status
  selected?: boolean;
}
```

#### MediaFileDetail
```typescript
export interface MediaFileDetail {
  file: MediaFile;
  metadata: {
    // Common
    createdDate: string;
    modifiedDate: string;
    mimeType: string;

    // Image specific
    exif?: {
      cameraMake?: string;
      cameraModel?: string;
      iso?: number;
      aperture?: string;
      shutterSpeed?: string;
      focalLength?: string;
    };

    // Video specific
    audio?: {
      codec: string;
      sampleRate: number;
      channels: number;
    };
  };
}
```

#### Job
```typescript
export interface Job {
  id: string;
  workflowId: string;
  workflowName: string;
  fileInputs: FileInputAssignment[];
  textInputs: Record<string, string>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  taskId?: string;
  startedAt?: number;
  completedAt?: number;
  results?: JobResult;
  error?: string;
  createdAt: number;
  folderPath?: string;

  // Post-processing cleanup
  deleteSourceFiles: boolean;           // Whether to delete source files after completion
  deletedSourceFiles?: string[];        // List of deleted source file paths (after completion)
}
```

#### JobResult
```typescript
export interface JobResult {
  outputs: Array<{
    parameterId?: string;
    type: 'file' | 'text';
    path?: string;
    content?: string;
    metadata?: Record<string, any>;
  }>;
  summary?: string;

  // Source file cleanup tracking
  sourceFilesDeleted?: boolean;
  deletedSourceFiles?: string[];
  deletionErrors?: Array<{ path: string; error: string }>;

  // Text output content (for txt files)
  textOutputs?: Array<{
    fileName: string;
    filePath: string;
    content: {
      original: string;
      en?: string;      // Translated to English
      zh?: string;      // Translated to Chinese
    };
  }>;
}
```

### Store Design

**File**: `src/store/workspace-store.ts`

```typescript
interface WorkspaceState {
  // Folder
  selectedFolder: FolderSelectionResponse | null;
  mediaFiles: MediaFile[];

  // Workflows
  workflows: Workflow[];
  selectedWorkflowId: string | null;

  // Job preparation
  jobFiles: FileInputAssignment[];
  jobInputs: Record<string, string>;

  // Job history
  jobs: Job[];
  selectedJobId: string | null;

  // UI state
  viewMode: 'grid' | 'list';
  isLoading: boolean;
  error: string | null;
}
```

**Storage Strategy**:
- **Workflows**: localStorage via Zustand persist
- **Jobs**: localStorage via Zustand persist, limit to 50 jobs (LRU eviction)
- **Media Files**: Not persisted (loaded from folder each session)

---

## Component Architecture

### Component Hierarchy

```
/workspace (page.tsx)
├── FolderSelectionLayout (no folder selected)
│   └── FolderSelector
│
├── SelectedFolderHeader (folder selected)
│
├── WorkspaceTabs (View: Media | Workflows | Jobs)
│   ├── MediaTab
│   │   ├── MediaGallery (grid of images + videos)
│   │   │   └── MediaFileCard (click to view details)
│   │   ├── MediaFileDetailModal (or side panel)
│   │   │   ├── ImagePreview (with zoom, dimensions, file size)
│   │   │   ├── VideoPreview (playback, dimensions, FPS, file size)
│   │   │   ├── FileMetadata (created/modified dates, EXIF for images)
│   │   │   ├── FileActions (rename, delete, download)
│   │   │   └── FileProperties (format, codec, bitrate, etc.)
│   │   ├── MediaToolbar (filter, sort, view mode, select all)
│   │   ├── WorkflowSelector
│   │   ├── WorkflowInputBuilder (drag-and-drop assignment)
│   │   └── RunJobButton
│   │
│   ├── WorkflowsTab
│   │   ├── WorkflowList
│   │   ├── WorkflowEditor (add/edit workflow)
│   │   └── WorkflowPreview
│   │
│   └── JobsTab
│       ├── JobList
│       ├── JobDetail
│       │   └── JobTextOutputViewer (for txt files)
│       │       ├── TextEditorWithTranslation
│       │       └── CopyToWorkflowButton
│       └── JobActions (re-run, delete)
│
└── ConsoleViewer (global)
```

### Key Components

#### MediaGallery
- **File**: `src/components/workspace/MediaGallery.tsx`
- Display images and videos in grid/list view
- Multi-select files for job creation
- Filter by file type, extension
- Similar to ImageGallery but handles both types
- Click on file to open detail modal

#### MediaFileCard
- **File**: `src/components/workspace/MediaFileCard.tsx`
- Individual file card in gallery grid
- Shows thumbnail/preview
- Displays file name and size
- Selection checkbox
- Hover effects with action buttons
- Click to view full details

#### MediaFileDetailModal
- **File**: `src/components/workspace/MediaFileDetailModal.tsx`
- Modal (or side panel) for viewing file details
- Two variants: ImageDetail and VideoDetail

**ImageDetail Features**:
- Full-size image preview with zoom
- Dimensions display (width × height)
- File size display (formatted: "1.2 MB")
- Format information (JPEG, PNG, etc.)
- EXIF data (camera, ISO, aperture, etc.)
- Created/modified dates
- Rename button
- Delete button (with confirmation)
- Download button

**VideoDetail Features**:
- Video player with playback controls
- Dimensions display (width × height)
- File size display (formatted: "15.8 MB")
- FPS display (e.g., "30 fps", "60 fps")
- Duration display (e.g., "01:23", "10:45")
- Video codec information (H.264, H.265, etc.)
- Audio codec information (if available)
- Bitrate information
- Created/modified dates
- Rename button
- Delete button (with confirmation)
- Download button

#### MediaToolbar
- **File**: `src/components/workspace/MediaToolbar.tsx`
- Filter by file type (All, Images, Videos)
- Sort options (Name, Date, Size, Type)
- View mode toggle (Grid/List)
- Select all / Deselect all
- Bulk delete selected
- Search by file name

#### WorkflowSelector
- **File**: `src/components/workspace/WorkflowSelector.tsx`
- Dropdown to select configured workflow
- Shows workflow description
- Displays required input fields count

#### WorkflowInputBuilder
- **File**: `src/components/workspace/WorkflowInputBuilder.tsx`
- Shows all input parameters for selected workflow
- Drag-and-drop zones for file inputs
- Text/number input fields for other parameters
- Real-time validation feedback
- Auto-filters invalid files
- **Post-processing options**:
  - Checkbox/toggle: "Delete source files after successful completion"
  - Shows warning when enabled (list files that will be deleted)
  - Display count of files to be deleted

#### WorkflowEditor
- **File**: `src/components/workspace/WorkflowEditor.tsx`
- Form to add/edit workflow configuration
- Dynamic input parameter builder
- Parameter type selection, validation rules

#### WorkflowList
- **File**: `src/components/workspace/WorkflowList.tsx`
- List of all configured workflows
- Edit/delete actions
- Create new workflow button

#### JobList
- **File**: `src/components/workspace/JobList.tsx`
- List of all jobs with status indicators
- Filter by status, workflow, date
- Click to view job details

#### JobDetail
- **File**: `src/components/workspace/JobDetail.tsx`
- Show job inputs, results, logs
- Re-run button
- Download outputs button
- **Source file cleanup display**:
  - Show which source files were deleted (if applicable)
  - Show deletion errors if any occurred
  - Display summary: "X source files deleted after completion"
- **Text output viewer** (if job contains .txt output files):
  - Display each txt file in a tabbed text editor
  - Translation support (EN ↔ Chinese) using Chrome AI Translator API
  - Edit capability for translated text
  - Save edited translations back to file
  - **Copy button** for each text section:
    - Click to copy text to clipboard
    - Option to paste into another workflow's text input field
    - Show "Copy to workflow" dropdown when clicked
    - Enables workflow chaining (output → input)

#### JobTextOutputViewer
- **File**: `src/components/workspace/JobTextOutputViewer.tsx`
- Display when job results contain .txt files
- Tabbed interface for multiple txt files
- Shows file name and content
- Read-only original text display
- Integration with TextEditorWithTranslation

#### TextEditorWithTranslation
- **File**: `src/components/workspace/TextEditorWithTranslation.tsx`
- Similar to existing WorkspaceTextEditor
- Tabs for Original / English / Chinese
- Chrome AI Translator API integration
- Editable text areas
- Save button to save edited translations
- Language toggle button

#### CopyToWorkflowButton
- **File**: `src/components/workspace/CopyToWorkflowButton.tsx`
- Button next to each text output section
- Click to copy text to clipboard
- Shows "Copy to workflow" dropdown with:
  - List of available workflows
  - List of text input parameters in selected workflow
  - Option to paste text directly into selected parameter
- Enables workflow chaining (use output as input for next job)

---

## API Endpoints

### Execute Job
- **File**: `src/app/api/workspace/execute/route.ts`
- **Method**: POST
- **Request**:
  ```typescript
  {
    workflowId: string;
    fileInputs: Array<{ parameterId: string; filePath: string }>;
    textInputs: Record<string, string>;
    folderPath?: string;
    deleteSourceFiles: boolean;  // Whether to delete source files after completion
  }
  ```
- **Response**:
  ```typescript
  {
    success: boolean;
    taskId: string;
    jobId: string;
    message: string;
    error?: string;
  }
  ```
- **Post-processing**: After successful job completion, if `deleteSourceFiles` is true:
  - Delete all source files specified in `fileInputs`
  - Record deleted files in job results
  - Update job status with deletion information

### Job Management
- **File**: `src/app/api/workspace/jobs/[jobId]/route.ts`
- **GET**: Fetch job details by ID
- **PUT**: Update job (add results, update status)
- **DELETE**: Delete job

### File Validation
- **File**: `src/app/api/workspace/validate/route.ts`
- **Method**: POST
- **Request**:
  ```typescript
  {
    filePath: string;
    parameter: WorkflowInputParameter;
  }
  ```
- **Response**:
  ```typescript
  {
    valid: boolean;
    error?: string;
  }
  ```

### File Metadata
- **File**: `src/app/api/workspace/files/metadata/[filePath]/route.ts`
- **Method**: GET
- **Description**: Get detailed metadata for a media file
- **Response**:
  ```typescript
  {
    success: boolean;
    file: MediaFile;
    metadata: {
      width?: number;
      height?: number;
      fps?: number;
      duration?: number;
      bitrate?: number;
      codec?: string;
      createdDate: string;
      modifiedDate: string;
      mimeType: string;
      exif?: { /* EXIF data for images */ };
      audio?: { /* Audio data for videos */ };
    };
  }
  ```

### File Rename
- **File**: `src/app/api/workspace/files/rename/route.ts`
- **Method**: POST
- **Request**:
  ```typescript
  {
    oldPath: string;
    newName: string;
  }
  ```
- **Response**:
  ```typescript
  {
    success: boolean;
    newPath: string;
    error?: string;
  }
  ```

### File Delete
- **File**: `src/app/api/workspace/files/delete/route.ts`
- **Method**: POST
- **Request**:
  ```typescript
  {
    paths: string[];  // Support bulk delete
  }
  ```
- **Response**:
  ```typescript
  {
    success: boolean;
    deletedCount: number;
    errors?: Array<{ path: string; error: string }>;
  }
  ```

### File Thumbnail
- **File**: `src/app/api/workspace/files/thumbnail/[filePath]/route.ts`
- **Method**: GET
- **Description**: Generate and serve thumbnail for images/videos
- **Query Params**: `width`, `height` (optional, default: 200x200)
- **Response**: Image file (JPEG/PNG)

---

## File Validation System

**File**: `src/utils/workspace-validation.ts`

### validateFileForParameter
Checks if a file meets workflow parameter requirements:
- File type matching (image/*, video/*)
- Extension validation
- Returns: `{ valid: boolean; error?: string }`

### validateJobInputs
Validates complete job input set:
- All required parameters have values
- All file assignments are valid
- Returns: `{ valid: boolean; errors: string[] }`

---

## Implementation Steps

**IMPORTANT: Build Verification Rule**

After completing **each phase**, you MUST run `npm run build` to verify:
- TypeScript compilation succeeds
- No build errors are introduced
- Changes don't break existing functionality
- New types and components are properly integrated

Only proceed to the next phase after the build succeeds. This prevents accumulating errors that are harder to debug later.

```bash
cd runninghub-nextjs
npm run build
```

---

### Phase 1: Type Definitions
**File**: `src/types/workspace.ts`
- [ ] Add WorkflowInputParameter interface
- [ ] Add Workflow interface
- [ ] Add FileInputAssignment interface
- [ ] Add Job interface
- [ ] Add JobResult interface
- [ ] Add MediaFile interface (with metadata fields)
- [ ] Add MediaFileDetail interface
- [ ] Keep backward compatibility (preserve old types during migration)
- [ ] **BUILD VERIFICATION**: Run `npm run build` to ensure types compile correctly

### Phase 2: Store Migration
**File**: `src/store/workspace-store.ts`
- [ ] Define new WorkspaceState interface
- [ ] Define WorkspaceActions interface
- [ ] Implement folder management actions
- [ ] Implement workflow CRUD actions
- [ ] Implement job preparation actions
- [ ] Implement job management actions
- [ ] Implement UI state actions
- [ ] Add persist middleware with partialize for workflows/jobs
- [ ] **BUILD VERIFICATION**: Run `npm run build` to ensure store compiles correctly

### Phase 3: Validation Utilities
**File**: `src/utils/workspace-validation.ts`
- [ ] Implement validateFileForParameter function
- [ ] Implement validateJobInputs function
- [ ] Add utility functions for file type detection
- [ ] Add validation error formatting helpers
- [ ] **BUILD VERIFICATION**: Run `npm run build` to ensure utilities compile correctly

### Phase 4: Media Gallery Component
**File**: `src/components/workspace/MediaGallery.tsx`
- [ ] Adapt from ImageGallery component
- [ ] Support both images and videos in grid
- [ ] Implement multi-select functionality
- [ ] Add grid/list view toggle
- [ ] Add filter by type (images/videos)
- [ ] Integrate with WorkflowSelector
- [ ] Integrate with WorkflowInputBuilder
- [ ] Click on file to open detail modal

### Phase 4.1: Media File Card Component
**File**: `src/components/workspace/MediaFileCard.tsx`
- [ ] Create individual file card component
- [ ] Show thumbnail/preview
- [ ] Display file name and formatted size
- [ ] Add selection checkbox
- [ ] Add hover effects with quick actions
- [ ] Click to view full details

### Phase 4.2: Media File Detail Modal
**File**: `src/components/workspace/MediaFileDetailModal.tsx`
- [ ] Create modal component with tabs/split view
- [ ] Implement ImageDetail variant
  - [ ] Full-size image preview with zoom controls
  - [ ] Display dimensions (width × height)
  - [ ] Display file size (formatted: "1.2 MB")
  - [ ] Show format information
  - [ ] Extract and display EXIF data
  - [ ] Show created/modified dates
  - [ ] Add rename button
  - [ ] Add delete button with confirmation
  - [ ] Add download button
- [ ] Implement VideoDetail variant
  - [ ] Video player with playback controls
  - [ ] Display dimensions (width × height)
  - [ ] Display file size (formatted)
  - [ ] Display FPS (e.g., "30 fps")
  - [ ] Display duration (formatted: "01:23")
  - [ ] Show video codec information
  - [ ] Show audio codec information
  - [ ] Display bitrate
  - [ ] Show created/modified dates
  - [ ] Add rename button
  - [ ] Add delete button with confirmation
  - [ ] Add download button

### Phase 4.3: Media Toolbar Component
**File**: `src/components/workspace/MediaToolbar.tsx`
- [ ] Create toolbar with filter options
- [ ] Add file type filter (All, Images, Videos)
- [ ] Add sort options (Name, Date, Size, Type)
- [ ] Add view mode toggle (Grid/List)
- [ ] Add select all / deselect all
- [ ] Add bulk delete selected
- [ ] Add search by file name

### Phase 4.4: File Metadata Utilities
**File**: `src/utils/media-metadata.ts`
- [ ] Implement image metadata extraction
  - [ ] Extract dimensions (width, height)
  - [ ] Extract EXIF data
  - [ ] Get file size and format
- [ ] Implement video metadata extraction
  - [ ] Extract dimensions (width, height)
  - [ ] Extract FPS
  - [ ] Extract duration
  - [ ] Extract codec information
  - [ ] Extract audio codec info
  - [ ] Get file size
- [ ] Format file size (bytes → KB/MB/GB)
- [ ] Format duration (seconds → MM:SS)
- [ ] Format FPS display

### Phase 4.5: File Management API Endpoints
- [ ] Create file metadata endpoint (`/api/workspace/files/metadata/[filePath]/route.ts`)
  - [ ] Implement GET endpoint
  - [ ] Extract metadata using FFmpeg/Sharp
  - [ ] Return file details
- [ ] Create file rename endpoint (`/api/workspace/files/rename/route.ts`)
  - [ ] Implement POST endpoint
  - [ ] Validate new name
  - [ ] Rename file on disk
  - [ ] Update folder contents
- [ ] Create file delete endpoint (`/api/workspace/files/delete/route.ts`)
  - [ ] Implement POST endpoint
  - [ ] Support bulk delete
  - [ ] Delete files from disk
  - [ ] Update folder contents
- [ ] Create file thumbnail endpoint (`/api/workspace/files/thumbnail/[filePath]/route.ts`)
  - [ ] Implement GET endpoint
  - [ ] Generate thumbnails for images
  - [ ] Generate thumbnails for videos (using FFmpeg)
  - [ ] Cache thumbnails
  - [ ] Serve with proper cache headers
- [ ] **BUILD VERIFICATION**: Run `npm run build` to ensure media components compile correctly

### Phase 5: Workflow Selector Component
**File**: `src/components/workspace/WorkflowSelector.tsx`
- [ ] Create dropdown for workflow selection
- [ ] Display workflow description
- [ ] Show required/optional field counts
- [ ] Add "Configure New Workflow" button

### Phase 6: Workflow Input Builder Component
**File**: `src/components/workspace/WorkflowInputBuilder.tsx`
- [ ] Display all input parameters for selected workflow
- [ ] Create drag-and-drop zones for file inputs
- [ ] Create text/number input fields for other parameters
- [ ] Implement real-time validation
- [ ] Auto-filter invalid files
- [ ] Show count of filtered files with reason
- [ ] Add visual feedback for valid/invalid assignments
- [ ] Add post-processing options section
  - [ ] Checkbox: "Delete source files after successful completion"
  - [ ] Warning message showing which files will be deleted
  - [ ] Count display of files to be deleted
  - [ ] Store deleteSourceFiles preference in job object

### Phase 7: Workflow Editor Component
**File**: `src/components/workspace/WorkflowEditor.tsx`
- [ ] Create form for workflow configuration
- [ ] Implement dynamic input parameter builder
- [ ] Add parameter type selection (text, file, number, boolean)
- [ ] Add validation rules configuration
- [ ] Implement save/delete workflow actions
- [ ] Add parameter ordering (drag to reorder)

### Phase 8: Workflow List Component
**File**: `src/components/workspace/WorkflowList.tsx`
- [ ] Display list of configured workflows
- [ ] Add edit button for each workflow
- [ ] Add delete button for each workflow
- [ ] Add "Create New Workflow" button
- [ ] Show workflow parameter count
- [ ] Show creation date
- [ ] **BUILD VERIFICATION**: Run `npm run build` to ensure workflow components compile correctly

### Phase 9: Job Execution
**File**: `src/app/api/workspace/execute/route.ts`
- [ ] Create execute job endpoint
- [ ] Validate inputs against workflow definition
- [ ] Generate task ID and job ID
- [ ] Execute Python CLI with workflow ID and inputs
- [ ] Create job in store with taskId
- [ ] Return job details to frontend
- [ ] **Post-processing cleanup**:
  - [ ] After successful completion, check if deleteSourceFiles is true
  - [ ] Delete source files from disk
  - [ ] Record deleted files in job results
  - [ ] Handle deletion errors gracefully
  - [ ] Update folder contents after deletion
- [ ] **BUILD VERIFICATION**: Run `npm run build` to ensure job execution API compiles correctly

### Phase 10: Job List Component
**File**: `src/components/workspace/JobList.tsx`
- [ ] Display list of all jobs
- [ ] Add status indicators (pending, running, completed, failed)
- [ ] Add filter by status
- [ ] Add filter by workflow
- [ ] Add filter by date
- [ ] Add search functionality
- [ ] Implement click to view job details

### Phase 11: Job Detail Component
**File**: `src/components/workspace/JobDetail.tsx`
- [ ] Display job information
- [ ] Show input files and parameters
- [ ] Show results/outputs
- [ ] Add re-run button
- [ ] Add delete button
- [ ] Add download outputs button
- [ ] Display error messages if failed
- [ ] **Source file cleanup display**:
  - [ ] Show which source files were deleted
  - [ ] Show deletion errors if any
  - [ ] Display cleanup summary

### Phase 11.1: Job Text Output Viewer Component
**File**: `src/components/workspace/JobTextOutputViewer.tsx`
- [ ] Create component for displaying txt file outputs
- [ ] Tabbed interface for multiple txt files
- [ ] Show file name and path
- [ ] Read-only display of original text
- [ ] Integration with TextEditorWithTranslation
- [ ] Load txt file content from job results

### Phase 11.2: Text Editor with Translation Component
**File**: `src/components/workspace/TextEditorWithTranslation.tsx`
- [ ] Create text editor component (adapt from WorkspaceTextEditor)
- [ ] Add tabs for Original / English / Chinese
- [ ] Integrate Chrome AI Translator API
- [ ] Add translate buttons (to English, to Chinese)
- [ ] Editable text areas for translated content
- [ ] Save button to save edited translations back to file
- [ ] Auto-save tracking with visual indicator
- [ ] Language detection and toggle

### Phase 11.3: Copy to Workflow Button Component
**File**: `src/components/workspace/CopyToWorkflowButton.tsx`
- [ ] Create copy button component
- [ ] Click to copy text to clipboard
- [ ] Show dropdown menu with workflow selection
- [ ] List all available workflows
- [ ] List text input parameters for selected workflow
- [ ] Preview of text to be copied
- [ ] "Copy & Go to Workflow" action
  - [ ] Copy text to clipboard
  - [ ] Navigate to Media tab
  - [ ] Select the target workflow
  - [ ] Populate the selected text input field
- [ ] Show success notification after copying
- [ ] **BUILD VERIFICATION**: Run `npm run build` to ensure job components compile correctly

### Phase 12: Job Management API
**File**: `src/app/api/workspace/jobs/[jobId]/route.ts`
- [ ] Implement GET endpoint (fetch job details)
- [ ] Implement PUT endpoint (update job)
- [ ] Implement DELETE endpoint (delete job)

### Phase 13: File Validation API
**File**: `src/app/api/workspace/validate/route.ts`
- [ ] Create POST endpoint for file validation
- [ ] Implement file type checking
- [ ] Implement extension validation
- [ ] Return validation results
- [ ] **BUILD VERIFICATION**: Run `npm run build` to ensure all API endpoints compile correctly

### Phase 14: Workspace Page Redesign
**File**: `src/app/workspace/page.tsx`
- [ ] Import new components
- [ ] Add tab navigation (Media | Workflows | Jobs)
- [ ] Implement folder selection flow
- [ ] Add upload button integration
- [ ] Integrate ConsoleViewer
- [ ] Add responsive layout
- [ ] Handle error states
- [ ] **BUILD VERIFICATION**: Run `npm run build` to ensure workspace page compiles correctly

### Phase 15: Testing & Build
- [ ] Test folder selection (FS API + manual)
- [ ] Test workflow configuration
- [ ] Test file validation and auto-filtering
- [ ] Test job execution
- [ ] Test job re-running
- [ ] Test media file management
  - [ ] Test image detail view (dimensions, size, EXIF)
  - [ ] Test video detail view (dimensions, size, FPS, playback)
  - [ ] Test file rename functionality
  - [ ] Test file delete functionality
  - [ ] Test bulk delete
  - [ ] Test thumbnail generation
  - [ ] Test metadata extraction for various formats
- [ ] Test source file deletion after job completion
  - [ ] Test with deleteSourceFiles enabled
  - [ ] Verify files are deleted only on success
  - [ ] Verify files are preserved on failure
- [ ] Test text output viewing and translation
  - [ ] Test txt file display in JobDetail
  - [ ] Test translation (EN ↔ Chinese)
  - [ ] Test text editing
  - [ ] Test save translations back to file
- [ ] Test copy to workflow functionality
  - [ ] Test copy button copies text to clipboard
  - [ ] Test dropdown shows workflows and parameters
  - [ ] Test "Copy & Go to Workflow" action
  - [ ] Verify text is populated in target workflow input
- [ ] Test error handling
- [ ] Test with various file types (JPEG, PNG, WebP, MP4, WebM, AVI, MOV)
- [ ] Run `npm run build`
- [ ] Fix any TypeScript errors
- [ ] Fix any build warnings

---

## Data Flow Examples

### Flow 1: Select Folder → Configure Workflow → Run Job
```
1. User selects folder via FolderSelector
   ↓
2. handleFolderSelected callback
   ↓
3. setSelectedFolder in store
   ↓
4. loadFolderContents API called
   ↓
5. setMediaFiles in store
   ↓
6. MediaGallery displays files
```

### Flow 2: Create Workflow
```
1. User opens Workflows tab
   ↓
2. Clicks "Add Workflow"
   ↓
3. WorkflowEditor form opens
   ↓
4. User defines parameters (name, type, validation)
   ↓
5. User clicks "Save Workflow"
   ↓
6. addWorkflow action called
   ↓
7. Update store + persist to localStorage
```

### Flow 3: Run Job
```
1. User selects files in MediaGallery
   ↓
2. User selects workflow from WorkflowSelector
   ↓
3. WorkflowInputBuilder renders with parameters
   ↓
4. User drags files to parameter zones
   ↓
5. System auto-filters invalid files
   ↓
6. User fills text inputs
   ↓
7. User clicks "Run Job"
   ↓
8. validateJobInputs() called
   ↓
9. POST /api/workspace/execute
   ↓
10. Python CLI execution starts
   ↓
11. Create job in store with taskId
   ↓
12. ConsoleViewer tracks progress
   ↓
13. Task completes → updateJob with results
   ↓
14. Job appears in Jobs tab
```

### Flow 4: Re-run Job
```
1. User clicks job in JobList
   ↓
2. JobDetail shows inputs/results
   ↓
3. User clicks "Re-run"
   ↓
4. reRunJob(jobId) action called
   ↓
5. Create new job with same inputs
   ↓
6. Execute workflow
   ↓
7. Track with new taskId
```

---

## UI Mockups

### Main Workspace Layout (After Folder Selection)
```
┌─────────────────────────────────────────────────────────────┐
│ ← RunningHub Workspace                     [Upload Files]    │
├─────────────────────────────────────────────────────────────┤
│ 📁 /Users/username/workspace                   24 files      │
├─────────────────────────────────────────────────────────────┤
│ [Media Gallery] [Workflows] [Jobs History]                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Workflow: [Image Upscaler ▼]                    [+ Config]  │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Input: Image (required)                              │   │
│  │ ┌─────────────────────────────────────────────┐     │   │
│  │ │ Drag image files here                    ×    │     │   │
│  │ └─────────────────────────────────────────────┘     │   │
│  │ Assigned: 3 files ✅ (5 filtered: wrong type)        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Scale Factor: [2.0] (optional)                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ☑ Delete source files after successful completion   │   │
│  │ ⚠️ 3 source files will be permanently deleted        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  [Run Job]                                                   │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│ Media Files (24)                         [🔍 Search] [Grid] │
│                                                               │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐           │
│  │ IMG │ │ IMG │ │ VID │ │ IMG │ │ IMG │ │ VID │           │
│  │  ✅ │ │  ✅ │ │     │ │  ✅ │ │     │ │     │           │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘           │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐           │
│  │ VID │ │ IMG │ │ IMG │ │ VID │ │ IMG │ │ IMG │           │
│  │     │ │  ✅ │ │     │ │     │ │  ✅ │ │     │           │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘           │
│                                                               │
└─────────────────────────────────────────────────────────────┘
┌────────────────── Console ──────────────────┐ [Hide]
│ > Task started: Image Upscaler              │
│ > Processing image_001.jpg...               │
│ > Processing image_002.jpg...               │
│ > Processing image_003.jpg...               │
│ > ✓ Task completed (3/3 images)             │
│ > ✓ Deleted 3 source files                 │
└──────────────────────────────────────────────┘
```

### Workflow Editor UI
```
┌─────────────────────────────────────────────────────────────┐
│ ← Workflows                                   [+ New Workflow]│
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Image Upscaler                            [Edit] [Delete]   │
│  Upscale images by 2x using AI                              │
│  2 inputs (1 file, 1 number)                                │
│                                                               │
│  Video Background Remover                  [Edit] [Delete]   │
│  Remove background from videos automatically                │
│  1 input (1 file)                                           │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│ Add New Workflow                                              │
│                                                               │
│  Name: [My Custom Workflow                      ]            │
│  Description: [Does something cool                ]          │
│                                                               │
│  Input Parameters:                                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 1. Input Image (file, required)                      │   │
│  │    - Accepts: image/*                                │   │
│  │    - Extensions: .jpg, .png, .webp                   │   │
│  │                                          [Remove]     │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ 2. Quality (number, optional)                        │   │
│  │    - Min: 1, Max: 100                                │   │
│  │    - Default: 80                                     │   │
│  │                                          [Remove]     │   │
│  └──────────────────────────────────────────────────────┘   │
│  [+ Add Parameter]                                            │
│                                                               │
│  [Save Workflow]  [Cancel]                                    │
└─────────────────────────────────────────────────────────────┘
```

### Job History UI
```
┌─────────────────────────────────────────────────────────────┐
│ ← Job History (3 jobs)                        [Clear All]   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Image Upscaler #12                          ✓ Completed    │
│  Dec 25, 2025 at 3:45 PM                      3 image files │
│  Input: image_001.jpg, image_002.jpg, image_003.jpg         │
│  Output: 3 upscaled images                                    │
│  ♻️ 3 source files deleted                                  │
│  [View Details] [Re-run] [Delete]                            │
│                                                               │
│  Video Background Remover #11               ✗ Failed       │
│  Dec 25, 2025 at 2:30 PM                      1 video file  │
│  Error: Invalid video format                                  │
│  [View Details] [Re-run] [Delete]                            │
│                                                               │
│  Image Upscaler #10                          ✓ Completed    │
│  Dec 24, 2025 at 8:15 PM                      5 image files │
│  Input: photo_001.jpg, photo_002.jpg, ...                    │
│  Output: 5 upscaled images                                    │
│  Source files preserved                                      │
│  [View Details] [Re-run] [Delete]                            │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Job Detail with Text Output UI
```
┌─────────────────────────────────────────────────────────────┐
│ ← Job Details - Image Analysis #13             [×] Close      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Status: ✓ Completed    Duration: 2m 34s                     │
│  Workflow: Image Analysis                                    │
│  Started: Dec 25, 2025 at 4:15 PM                            │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📁 Input Files (3)                                    │   │
│  │   • image_001.jpg (2.4 MB)                           │   │
│  │   • image_002.jpg (1.8 MB)                           │   │
│  │   • image_003.jpg (3.1 MB)                           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📤 Output Files (3)                                   │   │
│  │   • image_001_analyzed.jpg (2.5 MB)                 │   │
│  │   • image_002_analyzed.jpg (1.9 MB)                 │   │
│  │   • image_003_analyzed.jpg (3.3 MB)                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📝 Text Outputs (2 txt files)                       │   │
│  │                                                       │   │
│  │ [analysis_results.txt]  [summary.txt]               │   │
│  │ ┌─────────────────────────────────────────────┐     │   │
│  │ │ analysis_results.txt                          │     │   │
│  │ ├─────────────────────────────────────────────┤     │   │
│  │ │ [Original] [English] [Chinese]               │     │   │
│  │ ├─────────────────────────────────────────────┤     │   │
│  │ │                                             │     │   │
│  │ │ Image 1 Analysis:                            │     │   │
│  │ │ The image shows a landscape scene...         │     │   │
│  │ │ Detected objects: tree, sky, mountains       │     │   │
│  │ │ Confidence score: 0.95                        │     │   │
│  │ │                                             │     │   │
│  │ └─────────────────────────────────────────────┘     │   │
│  │                                                     │   │
│  │ [🔄 Translate] [💾 Save] [📋 Copy to Workflow]      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ♻️ Source File Cleanup                               │   │
│  │   3 source files deleted (6.3 MB freed)            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  [Re-run Job] [Download All Outputs] [Delete Job]           │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Copy to Workflow Dropdown UI
```
┌─────────────────────────────────────────────────────────────┐
│  When user clicks [📋 Copy to Workflow]:                    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📋 Copy to Workflow Input                            │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │                                                       │   │
│  │ Select workflow:                                    │   │
│  │ [Text Summarizer ▼]                                  │   │
│  │   • Image Caption Generator                         │   │
│  │   • Text Translator                                │   │
│  │                                                       │   │
│  │ Select input parameter:                             │   │
│  │ [Prompt ▼]                                          │   │
│  │   • Context Text                                    │   │
│  │   • Custom Instructions                             │   │
│  │                                                       │   │
│  │ Preview:                                            │   │
│  │ ┌─────────────────────────────────────────────┐     │   │
│  │ │ Prompt field will be set to:               │     │   │
│  │ │ "Image 1 Analysis: The image shows a...     │     │   │
│  │ │  Detected objects: tree, sky, mountains...  │     │   │
│  └───────────────────────────────────────────────┘     │   │
│  │                                                       │   │
│  │ [Cancel] [Copy & Go to Workflow]                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Image Detail Modal UI
```
┌─────────────────────────────────────────────────────────────┐
│                                                  [×] Close   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                       │   │
│  │              [Image Preview with Zoom]               │   │
│  │                                                       │   │
│  │           [+ Zoom In]  [- Zoom Out]  [Fit]           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  📊 File Information                                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Name:            photo_001.jpg                        │   │
│  │ Size:            2.4 MB                              │   │
│  │ Dimensions:      1920 × 1080                         │   │
│  │ Format:          JPEG                                │   │
│  │ Created:         Dec 25, 2025 at 3:45 PM             │   │
│  │ Modified:        Dec 25, 2025 at 3:45 PM             │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  📷 EXIF Data (if available)                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Camera:          Canon EOS R5                        │   │
│  │ ISO:             400                                 │   │
│  │ Aperture:        f/2.8                               │   │
│  │ Shutter Speed:   1/125s                              │   │
│  │ Focal Length:    50mm                                │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ [📥 Download] [✏️ Rename] [🗑️ Delete]                 │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Video Detail Modal UI
```
┌─────────────────────────────────────────────────────────────┐
│                                                  [×] Close   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                       │   │
│  │              [Video Player with Controls]            │   │
│  │                                                       │   │
│  │     ▶️  ⏸️  ━━━━━●━━━━  01:23 / 03:45               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  📊 File Information                                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Name:            clip_001.mp4                         │   │
│  │ Size:            45.8 MB                             │   │
│  │ Dimensions:      1920 × 1080                         │   │
│  │ Duration:        03:45                               │   │
│  │ Frame Rate:      30 fps                              │   │
│  │ Video Codec:     H.264 (AVC)                         │   │
│  │ Bitrate:         8.5 Mbps                            │   │
│  │ Audio Codec:     AAC (128 kbps, 48 kHz, stereo)      │   │
│  │ Created:         Dec 25, 2025 at 2:30 PM             │   │
│  │ Modified:        Dec 25, 2025 at 2:30 PM             │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ [📥 Download] [✏️ Rename] [🗑️ Delete]                 │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Rename Dialog UI
```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ Rename File                                  [Cancel] [Rename]│
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Rename "photo_001.jpg" to:                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ new_photo_name.jpg                                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ⚠️ Warning: Renaming will break references in existing      │
│  jobs if this file is currently assigned.                    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Delete Confirmation Dialog UI
```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ Delete Files                                  [Cancel] [Delete]│
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Are you sure you want to delete 3 files?                    │
│  This action cannot be undone.                               │
│                                                               │
│  Files to be deleted:                                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ ✓ photo_001.jpg (2.4 MB)                             │   │
│  │ ✓ photo_002.jpg (1.8 MB)                             │   │
│  │ ✓ clip_001.mp4 (45.8 MB)                             │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  Total: 50.0 MB will be permanently deleted.                 │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Design Rationale

### Why Manual Workflow Configuration?
- **User Requirement**: No API fetching needed
- **Flexibility**: Users define custom workflows with their own input schemas
- **Simplicity**: No need to handle API authentication, rate limits, caching
- **Privacy**: Workflow definitions stay local

### Why localStorage for Jobs?
- **Simplicity**: No backend database needed for job history
- **Performance**: Instant access to job history
- **Sufficient Capacity**: 50 jobs × ~5KB each = 250KB (well within limits)
- **Privacy**: Job data stays on user's machine

### Why Drag-and-Drop File Assignment?
- **Intuitive**: Visual mapping of files to workflow inputs
- **Validation**: Immediate feedback on file validity
- **Flexibility**: Support multiple file parameters per workflow
- **Clarity**: User sees exactly which files go to which inputs

### Why Auto-Filter Invalid Files?
- **UX Optimization**: Don't overwhelm user with invalid options
- **Error Prevention**: Catch mistakes before execution
- **Transparency**: Show count and reason for filtered files
- **Efficiency**: User focuses on valid assignments

### Why Media File Management?
- **User Control**: Users need to manage their workspace files
- **Validation**: Verify files before processing with workflows
- **Organization**: Rename and delete files to keep workspace organized
- **Transparency**: View detailed file information (dimensions, size, FPS) to understand what you're working with
- **Quality Assurance**: Check image/video properties before submitting to jobs

---

## Migration Strategy

### Backward Compatibility
- Keep existing `workspace-store.ts` structure initially
- Add new fields alongside old ones
- Migrate data on first load

### Data Migration Code
```typescript
// On app load, check for legacy data
const legacyConfig = localStorage.getItem('runninghub-workspace-storage');
if (legacyConfig) {
  const parsed = JSON.parse(legacyConfig);
  // Migrate workflowId to workflows array
  if (parsed.config?.workflowId && !parsed.workflows?.length) {
    // Create default workflow from legacy workflowId
    const defaultWorkflow: Workflow = {
      id: parsed.config.workflowId,
      name: 'Legacy Workflow',
      inputs: [/* default inputs */],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    // Store in new format
  }
}
```

---

## Success Criteria

### Functional Requirements
- [ ] Users can select folder using FS API or manual input
- [ ] Users see all media files (images + videos) in gallery
- [ ] Users can configure workflows manually with input parameters
- [ ] Users can assign files to workflow inputs with validation
- [ ] Users can execute jobs and see results
- [ ] Users can view job history and re-run jobs
- [ ] System auto-filters invalid files

### Non-Functional Requirements
- [ ] Page loads within 2 seconds
- [ ] File selection updates within 500ms
- [ ] Job validation completes within 100ms
- [ ] localStorage stays within 5MB limit
- [ ] UI is responsive on mobile (320px width)
- [ ] Console shows real-time progress
- [ ] Build succeeds with no TypeScript errors

---

## Risk Mitigation

### Risk: localStorage Quota Exceeded
**Mitigation**:
- Implement LRU eviction for jobs
- Compress job data before storage
- Add quota monitoring
- Provide user notification when near limit

### Risk: Workflow Definition Complexity
**Mitigation**:
- Provide workflow templates
- Add wizard for common workflows
- Include validation helper
- Add example workflows

### Risk: File Type Validation Errors
**Mitigation**:
- Graceful degradation on validation errors
- Fallback to MIME type detection
- User override option with warning
- Clear error messages

### Risk: Job Result Size
**Mitigation**:
- Stream results instead of loading all at once
- Limit log size per job
- Store large outputs in filesystem instead of localStorage
- Implement result pagination

---

## Future Enhancements

### Phase 2 Features (Post-MVP)
- Workflow templates library
- Batch job scheduling
- Job chaining (output → input)
- Workflow sharing/import/export
- Advanced file filtering (regex, metadata)
- Custom output destinations

### Phase 3 Features
- Collaborative workspaces
- Cloud storage integration
- Workflow marketplace
- Real-time job collaboration
- Advanced analytics dashboard

---

## Related Documentation

- [Global Development Rules](../CLAUDE.md) - Git workflow and commit guidelines
- [Frontend Development Rules](../runninghub-nextjs/CLAUDE.md) - Next.js specific patterns
- [Image Gallery Implementation](../runninghub-nextjs/src/app/gallery/page.tsx) - Reference for folder selection

---

## TODO List

This is a checklist format that can be used during implementation. Each item should be checked off as completed.

### Type Definitions
- [ ] Add WorkflowInputParameter interface
- [ ] Add Workflow interface
- [ ] Add FileInputAssignment interface
- [ ] Add Job interface
- [ ] Add JobResult interface
- [ ] Add MediaFile interface (with metadata)
- [ ] Add MediaFileDetail interface

### Store
- [ ] Define new WorkspaceState interface
- [ ] Define WorkspaceActions interface
- [ ] Implement folder management actions
- [ ] Implement workflow CRUD actions
- [ ] Implement job preparation actions
- [ ] Implement job management actions
- [ ] Add persist middleware

### Utilities
- [ ] Implement validateFileForParameter
- [ ] Implement validateJobInputs
- [ ] Add file type detection helpers
- [ ] Add validation error formatting
- [ ] Create media-metadata.ts utilities
  - [ ] Image metadata extraction
  - [ ] Video metadata extraction
  - [ ] File size formatting
  - [ ] Duration formatting
  - [ ] FPS formatting

### Components
- [ ] Create MediaGallery component
- [ ] Create MediaFileCard component
- [ ] Create MediaFileDetailModal component
  - [ ] ImageDetail variant
  - [ ] VideoDetail variant
- [ ] Create MediaToolbar component
- [ ] Create WorkflowSelector component
- [ ] Create WorkflowInputBuilder component
  - [ ] Add post-processing options (delete source files checkbox)
- [ ] Create WorkflowEditor component
- [ ] Create WorkflowList component
- [ ] Create JobList component
- [ ] Create JobDetail component
  - [ ] Add source file cleanup display
- [ ] Create JobTextOutputViewer component
- [ ] Create TextEditorWithTranslation component
- [ ] Create CopyToWorkflowButton component

### API Endpoints
- [ ] Create execute job endpoint
- [ ] Create job management endpoint
- [ ] Create file validation endpoint
- [ ] Create file metadata endpoint
- [ ] Create file rename endpoint
- [ ] Create file delete endpoint
- [ ] Create file thumbnail endpoint

### Page Integration
- [ ] Redesign workspace page
- [ ] Add tab navigation
- [ ] Integrate all components
- [ ] Test folder selection
- [ ] Test job execution
- [ ] Test job re-running

### Build & Test
- [ ] Run `npm run build`
- [ ] Fix TypeScript errors
- [ ] Fix build warnings
- [ ] Test all features
- [ ] Test error states
- [ ] Test media file management features
  - [ ] Test image detail view
  - [ ] Test video detail view
  - [ ] Test file rename
  - [ ] Test file delete (single and bulk)
  - [ ] Test thumbnail generation
  - [ ] Test metadata extraction
- [ ] Test source file deletion after job completion
  - [ ] Test with deleteSourceFiles enabled
  - [ ] Verify files deleted only on success
  - [ ] Verify files preserved on failure
- [ ] Test text output viewing and translation
  - [ ] Test txt file display
  - [ ] Test translation (EN ↔ Chinese)
  - [ ] Test text editing
  - [ ] Test save translations
- [ ] Test copy to workflow functionality
  - [ ] Test copy button
  - [ ] Test dropdown workflows
  - [ ] Test "Copy & Go to Workflow"
  - [ ] Verify text populated in workflow input
- [ ] Performance testing
