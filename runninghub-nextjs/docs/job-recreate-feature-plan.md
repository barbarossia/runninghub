# Job Recreate Feature - Implementation Plan

## Overview
Enable users to run multiple jobs with the same or modified inputs without leaving the workflow configuration page, and compare results side-by-side.

## User Requirements
1. **Stay on workflow tab** - Don't auto-navigate away after job execution
2. **Persist inputs** - Keep file assignments and text inputs between runs
3. **Quick re-run** - Modify inputs (e.g., change prompt) and run again
4. **Compare results** - View outputs from multiple related jobs
5. **Flexible reuse** - Reuse all inputs or modify partial inputs

## Recommended Approach: Job Detail Page with Embedded Inputs

**Key Design Decisions:**
- Minimal data model changes (add optional fields to Job interface)
- Navigate to Job Detail page after job execution (keep this behavior)
- Add input fields directly to Job Detail page
- Show multiple job results in a series on the same page (tabs or side-by-side)
- Allow modifying inputs and re-running without leaving Job Detail page

---

## Phase 1: Data Model & Store (Foundation)

### 1.1 Update Type Definitions
**File**: `src/types/workspace.ts`

Add optional fields to `Job` interface:
```typescript
export interface Job {
  // ... existing fields ...

  // NEW: Optional fields for job grouping
  parentJobId?: string;      // ID of job this was recreated from
  seriesId?: string;         // Groups related jobs (auto-generated)
  runNumber?: number;        // Position in series (1, 2, 3, ...)
}
```

### 1.2 Extend Workspace Store
**File**: `src/store/workspace-store.ts`

Add new state and actions:
```typescript
interface WorkspaceState {
  // ... existing state ...

  // NEW: Job series tracking
  activeSeriesId: string | null;
}

interface WorkspaceActions extends WorkspaceState {
  // NEW: Job series management
  getJobsBySeriesId: (seriesId: string) => Job[];
  getRecentJobsForWorkflow: (workflowId: string, limit?: number) => Job[];
  setActiveSeriesId: (seriesId: string | null) => void;

  // UPDATED: Don't clear inputs after job run
  // clearJobInputs: () => void;  // Keep but don't call after successful run
}
```

Implement the actions:
- `getJobsBySeriesId`: Filter jobs by seriesId
- `getRecentJobsForWorkflow`: Get last N jobs for a workflow, sorted by createdAt
- Generate `seriesId` on first run: `${workflowId}_${Date.now()}`
- Increment `runNumber` on subsequent runs with same seriesId

---

## Phase 2: Core Behavior Changes

### 2.1 Modify Job Execution Flow
**File**: `src/app/workspace/page.tsx`

**Changes to `handleRunJob` function (around line 312-395):**

**BEFORE:**
```typescript
// Create job in store
addJob(newJob);

// Select the newly created job
setSelectedJob(newJob.id);

// Start tracking progress
if (resp.taskId) {
  setActiveConsoleTaskId(resp.taskId);
}

// Clear job inputs and switch to jobs tab
clearJobInputs();
setActiveTab('jobs');
```

**AFTER:**
```typescript
// Check if this is a re-run from Job Detail page
const currentJob = selectedJobId ? jobs.find(j => j.id === selectedJobId) : null;
const isReRun = currentJob?.workflowId === workflow.id;

// Generate series metadata
let seriesId: string | undefined;
let runNumber = 1;
let parentJobId: string | undefined;

if (isReRun && currentJob?.seriesId) {
  // Reuse seriesId from current job
  seriesId = currentJob.seriesId;
  runNumber = (currentJob.runNumber || 0) + 1;
  parentJobId = currentJob.id;
} else {
  // Create new series
  seriesId = `${workflow.id}_${Date.now()}`;
  runNumber = 1;
}

// Create job with series metadata
const newJob: Job = {
  // ... existing fields ...
  seriesId,
  runNumber,
  parentJobId,
};

addJob(newJob);

// Select the newly created job (this navigates to Job Detail)
setSelectedJob(newJob.id);

// Start tracking progress
if (resp.taskId) {
  setActiveConsoleTaskId(resp.taskId);
}

// DON'T clear inputs - Job Detail page will manage its own inputs
// DO switch to jobs tab - go to Job Detail page to see results
toast.success(`Job ${runNumber} started. View results and run variations.`);
```

### 2.2 Update API Response Handling
**File**: `src/app/api/workspace/execute/route.ts`

Ensure the API endpoint returns the new fields (if not already):
- `seriesId`
- `runNumber`
- `parentJobId`

---

## Phase 3: Job Detail Page with Embedded Inputs

### 3.1 Redesign JobDetail Component
**File**: `src/components/workspace/JobDetail.tsx`

**New Layout Structure:**
```tsx
export function JobDetail({ job }: JobDetailProps) {
  const [editableInputs, setEditableInputs] = useState({
    textInputs: job.textInputs,
    fileInputs: job.fileInputs,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [relatedJobs, setRelatedJobs] = useState<Job[]>([]);

  // Fetch related jobs (same seriesId)
  useEffect(() => {
    if (job.seriesId) {
      const jobsInSeries = getJobsBySeriesId(job.seriesId);
      setRelatedJobs(jobsInSeries.sort((a, b) => a.runNumber! - b.runNumber!));
    }
  }, [job.seriesId]);

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Left: Input Editor (collapsible) */}
      <div className="lg:col-span-1">
        <Collapsible open={isEditing} onOpenChange={setIsEditing}>
          <CollapsibleTrigger>
            {isEditing ? 'Hide' : 'Edit'} Inputs
          </CollapsibleTrigger>

          <CollapsibleContent>
            <JobInputEditor
              workflowId={job.workflowId}
              initialTextInputs={editableInputs.textInputs}
              initialFileInputs={editableInputs.fileInputs}
              onInputsChange={setEditableInputs}
              onRunJob={() => handleRunJob(editableInputs)}
            />
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Right: Results Display */}
      <div className="lg:col-span-2">
        {/* Series Navigation */}
        {relatedJobs.length > 1 && (
          <JobSeriesNav
            jobs={relatedJobs}
            currentJobId={job.id}
            onSelectJob={(jobId) => setSelectedJob(jobId)}
          />
        )}

        {/* Current Job Results */}
        <JobResults job={job} />
      </div>
    </div>
  );
}
```

### 3.2 Create JobInputEditor Component
**New File**: `src/components/workspace/JobInputEditor.tsx`

**Purpose**: Reusable input editor that can be embedded in JobDetail

**Component Structure:**
```tsx
interface JobInputEditorProps {
  workflowId: string;
  initialTextInputs: Record<string, string>;
  initialFileInputs: FileInputAssignment[];
  onInputsChange: (inputs: { textInputs: Record<string, string>; fileInputs: FileInputAssignment[] }) => void;
  onRunJob: () => void;
}

export function JobInputEditor({
  workflowId,
  initialTextInputs,
  initialFileInputs,
  onInputsChange,
  onRunJob
}: JobInputEditorProps) {
  const workflow = useWorkspaceStore(state =>
    state.workflows.find(w => w.id === workflowId)
  );

  const [localInputs, setLocalInputs] = useState(initialTextInputs);

  // Reuse logic from WorkflowInputBuilder for file assignment
  // But simplified for JobDetail context

  return (
    <Card>
      <CardHeader>
        <CardTitle>Job Inputs</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* File inputs */}
        {workflow.inputs.filter(p => p.type === 'file').map(param => (
          <FileInputSection
            key={param.id}
            parameter={param}
            assignedFiles={initialFileInputs.filter(f => f.parameterId === param.id)}
          />
        ))}

        {/* Text inputs */}
        {workflow.inputs.filter(p => p.type !== 'file').map(param => (
          <TextInput
            key={param.id}
            parameter={param}
            value={localInputs[param.id] || ''}
            onChange={(value) => {
              setLocalInputs(prev => ({ ...prev, [param.id]: value }));
              onInputsChange({ textInputs: { ...localInputs, [param.id]: value }, fileInputs: initialFileInputs });
            }}
          />
        ))}

        <Button onClick={onRunJob} className="w-full">
          Run Job with These Inputs
        </Button>
      </CardContent>
    </Card>
  );
}
```

### 3.3 Create JobSeriesNav Component
**New File**: `src/components/workspace/JobSeriesNav.tsx`

**Purpose**: Show navigation for all jobs in a series

**Component Structure:**
```tsx
interface JobSeriesNavProps {
  jobs: Job[];
  currentJobId: string;
  onSelectJob: (jobId: string) => void;
}

export function JobSeriesNav({ jobs, currentJobId, onSelectJob }: JobSeriesNavProps) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-sm text-gray-600">Run:</span>
      {jobs.map((job, index) => (
        <button
          key={job.id}
          onClick={() => onSelectJob(job.id)}
          className={cn(
            "px-3 py-1 text-sm rounded",
            job.id === currentJobId
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          )}
        >
          #{job.runNumber || index + 1}
        </button>
      ))}
    </div>
  );
}
```

### 3.4 Update JobDetail Run Handler
**File**: `src/components/workspace/JobDetail.tsx`

Add function to handle running job from JobDetail:
```typescript
const handleRunJob = async (inputs: { textInputs: Record<string, string>; fileInputs: FileInputAssignment[] }) => {
  const workflow = workflows.find(w => w.id === job.workflowId);
  if (!workflow) return;

  try {
    const response = await fetch(API_ENDPOINTS.WORKSPACE_EXECUTE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workflowId: workflow.id,
        sourceWorkflowId: workflow.sourceWorkflowId,
        workflowName: workflow.name,
        fileInputs: inputs.fileInputs,
        textInputs: inputs.textInputs,
        folderPath: job.folderPath,
        deleteSourceFiles: false,
        parentJobId: job.id,  // Link to current job
        seriesId: job.seriesId,  // Continue series
      }),
    });

    const resp = await response.json();

    if (resp.success) {
      // Navigate to new job (will refresh JobDetail with new job)
      setSelectedJob(resp.jobId);
      toast.success('Job started. You can continue modifying inputs.');
    }
  } catch (error) {
    toast.error('Failed to run job');
  }
};
```

---

## Phase 4: Polish & Integration

### 4.1 Add "Edit & Run" Button to JobDetail Header
**File**: `src/components/workspace/JobDetail.tsx`

Add toggle button to show/hide input editor:
```tsx
<div className="flex items-center justify-between mb-4">
  <div>
    <h2 className="text-xl font-bold">{job.workflowName}</h2>
    <p className="text-sm text-gray-600">
      Run #{job.runNumber || 1} • {formatTimestamp(job.createdAt)}
    </p>
  </div>

  <Button
    variant={isEditing ? "default" : "outline"}
    onClick={() => setIsEditing(!isEditing)}
  >
    {isEditing ? (
      <>
        <Check className="h-4 w-4 mr-2" />
        Done Editing
      </>
    ) : (
      <>
        <Edit className="h-4 w-4 mr-2" />
        Edit & Run
      </>
    )}
  </Button>
</div>
```

### 4.2 Handle Edge Cases

**Workflow Changed:**
- If user navigates to a job with different workflow, show that job's inputs
- Update JobInputEditor to use new workflowId

**Files Deleted:**
- Check if source files still exist before running
- Show warning in FileInputSection: "Source file no longer available"
- Allow reassigning files from current folder

**Job Failed:**
- Still show in series navigation
- Show error message in results area
- Allow re-running with same inputs (retry)

**Large Number of Jobs in Series:**
- Series navigation shows all jobs with scroll
- Add "View Series Summary" button to see all jobs in a list

### 4.3 Loading States & UX

**Job Submission:**
- Disable "Run Job" button while submitting
- Show loading spinner on button
- Re-enable after response or error
- Navigate to new job when it's created

**Series Navigation:**
- Highlight current job
- Show status indicators for each job
- Auto-refresh when jobs complete

**Input Editor:**
- Smooth expand/collapse animation
- Save inputs to localStorage when modified
- Restore inputs when returning to job

---

## Phase 5: Testing & Documentation

### 5.1 Test Scenarios

1. **Single Job Run**
   - Select workflow, assign files, enter prompt
   - Click "Run Job"
   - Verify: Navigates to Job Detail page, seriesId generated

2. **Edit and Re-run from JobDetail**
   - View completed job
   - Click "Edit & Run" button
   - Modify prompt
   - Click "Run Job with These Inputs"
   - Verify: New job created, linked via parentJobId, navigates to new job

3. **View Job Series**
   - Run 3 jobs with same inputs, different prompts
   - Navigate to any of the jobs
   - Verify: Series navigation shows all 3 jobs, can click between them

4. **Compare Results**
   - View job with series
   - Click through different jobs in series
   - Verify: Each job shows its own inputs and results

5. **File Modifications**
   - View job, edit inputs
   - Change file assignments
   - Run new job
   - Verify: New job uses updated file assignments

6. **Edge Cases**
   - Run job with deleted source files (should show warning)
   - View failed job in series (should show error)
   - Run 10+ jobs in series (verify navigation shows all)

### 5.2 Documentation

**Create Plan Document:**
- File: `runninghub-nextjs/docs/job-recreate-feature-plan.md`
- Include: Overview, requirements, architecture, implementation phases

**Create TODO List:**
- File: `runninghub-nextjs/docs/job-recreate-feature-todos.md`
- Include: Checkbox list of all implementation tasks

**Update CLAUDE.md:**
- Document job series pattern
- Add to "State Management" section

### 5.3 Build Verification

Run build after each phase:
```bash
npm run build
```

Expected output: No TypeScript errors, no build failures.

---

## Critical Files Summary

### Files to Modify:
1. **src/types/workspace.ts** - Add series fields to Job interface
2. **src/store/workspace-store.ts** - Add job series actions and selectors
3. **src/app/workspace/page.tsx** - Update handleRunJob to generate series metadata, don't clear inputs
4. **src/components/workspace/JobDetail.tsx** - Major redesign: add embedded input editor, series navigation

### New Files to Create:
1. **src/components/workspace/JobInputEditor.tsx** - Reusable input editor component
2. **src/components/workspace/JobSeriesNav.tsx** - Navigation for jobs in a series

### Optional Enhancements (Future):
- Series management UI (rename, archive)
- Batch job execution (run multiple prompt variations)
- Export comparison as PDF
- Image diff slider for visual comparison
- Advanced filters and search in recent jobs

---

## Success Criteria

✅ Users can run multiple jobs from Job Detail page
✅ Job Detail has embedded input editor
✅ Series navigation shows all related jobs
✅ Can modify inputs and re-run without leaving page
✅ Can click between jobs in series to compare results
✅ Build passes without errors
✅ All test scenarios pass

---

## Estimated Timeline

- **Phase 1**: 1-2 hours (Data model)
- **Phase 2**: 1-2 hours (Core behavior)
- **Phase 3**: 4-5 hours (JobDetail redesign - major work)
- **Phase 4**: 2-3 hours (Polish)
- **Phase 5**: 1-2 hours (Testing/docs)

**Total**: 9-14 hours

---

## Notes

- Backward compatible: New fields are optional, existing jobs work unchanged
- Progressive enhancement: Can implement phases incrementally
- No API changes needed: All logic is frontend
- Store pattern follows existing Zustand conventions
- UI follows existing design system (shadcn/ui + Tailwind)
