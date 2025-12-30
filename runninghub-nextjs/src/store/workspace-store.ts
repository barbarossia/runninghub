import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  // Legacy types (backward compatibility)
  WorkspaceFile,
  WorkspaceTextContent,
  WorkspaceConfig,
  Language,

  // New types
  Workflow,
  Job,
  FileInputAssignment,
  MediaFile,
  JobStatus,
} from '@/types/workspace';

// Import folder types from folder-store
import { FolderSelectionResponse } from '@/types';
import { validateFileForParameter } from '@/utils/workspace-validation';

// ============================================================================
// STORE STATE & ACTIONS
// ============================================================================

interface WorkspaceState {
  // ============================================================
  // LEGACY STATE (Backward Compatibility)
  // ============================================================
  // Configuration
  config: WorkspaceConfig;

  // Uploaded files (legacy)
  uploadedFiles: WorkspaceFile[];
  selectedFiles: Set<string>;

  // Processing state
  isProcessing: boolean;
  activeTaskId: string | null;

  // Text contents (indexed by file ID)
  textContents: Map<string, WorkspaceTextContent>;

  // Loading states
  isLoadingWorkspace: boolean;
  isLoadingFiles: boolean;

  // ============================================================
  // NEW STATE - Folder & Media
  // ============================================================
  // Selected folder for workspace
  selectedFolder: FolderSelectionResponse | null;
  // Media files loaded from folder (images + videos)
  mediaFiles: MediaFile[];

  // ============================================================
  // NEW STATE - Workflows
  // ============================================================
  // User-configured workflows
  workflows: Workflow[];
  // Currently selected workflow for job execution
  selectedWorkflowId: string | null;

  // ============================================================
  // NEW STATE - Job Preparation
  // ============================================================
  // Files assigned to workflow parameters
  jobFiles: FileInputAssignment[];

  // ============================================================
  // NEW STATE - Job History
  // ============================================================
  // Job execution history
  jobs: Job[];
  // Currently selected job for viewing details
  selectedJobId: string | null;
  // Loading state for jobs history
  isLoadingJobs: boolean;

  // ============================================================
  // NEW STATE - UI State
  // ============================================================
  // Gallery view mode
  viewMode: 'grid' | 'list' | 'large';
  // Selected file extension filter
  selectedExtension: string | null;
  // General loading state
  isLoading: boolean;

  // ============================================================
  // Error State
  // ============================================================
  error: string | null;
}

interface WorkspaceActions extends WorkspaceState {
  // ============================================================
  // LEGACY ACTIONS (Backward Compatibility)
  // ============================================================
  // Configuration
  setConfig: (config: Partial<WorkspaceConfig>) => void;
  setWorkflowId: (workflowId: string) => void;

  // Files
  addUploadedFile: (file: WorkspaceFile) => void;
  removeUploadedFile: (fileId: string) => void;
  updateFileStatus: (
    fileId: string,
    status: WorkspaceFile['status'],
    errorMessage?: string
  ) => void;
  setSelectedFiles: (files: Set<string>) => void;
  toggleFileSelection: (fileId: string) => void;
  clearAllFiles: () => void;

  // Text Content
  updateTextContent: (
    fileId: string,
    content: string,
    language: Language
  ) => void;
  setTextContent: (fileId: string, content: WorkspaceTextContent) => void;
  getTextContent: (fileId: string) => WorkspaceTextContent | undefined;

  // Processing
  setProcessing: (isProcessing: boolean) => void;
  setActiveTaskId: (taskId: string | null) => void;

  // Loading
  setLoadingWorkspace: (loading: boolean) => void;
  setLoadingFiles: (loading: boolean) => void;

  // Error
  setError: (error: string | null) => void;

  // Reset
  resetWorkspace: () => void;

  // ============================================================
  // NEW ACTIONS - Folder & Media Management
  // ============================================================
  setSelectedFolder: (folder: FolderSelectionResponse | null) => void;
  setMediaFiles: (files: MediaFile[]) => void;
  addMediaFile: (file: MediaFile) => void;
  removeMediaFile: (fileId: string) => void;
  updateMediaFile: (fileId: string, updates: Partial<MediaFile>) => void;
  toggleMediaFileSelection: (fileId: string) => void;
  selectAllMediaFiles: () => void;
  deselectAllMediaFiles: () => void;
  getSelectedMediaFiles: () => MediaFile[];

  // ============================================================
  // NEW ACTIONS - Workflow Management
  // ============================================================
  setWorkflows: (workflows: Workflow[]) => void;
  addWorkflow: (workflow: Workflow) => void;
  updateWorkflow: (id: string, updates: Partial<Workflow>) => void;
  deleteWorkflow: (id: string) => void;
  setSelectedWorkflow: (workflowId: string | null) => void;
  getWorkflowById: (id: string) => Workflow | undefined;
  getSelectedWorkflow: () => Workflow | undefined;

  // ============================================================
  // NEW ACTIONS - Job Preparation
  // ============================================================
  setJobFiles: (assignments: FileInputAssignment[]) => void;
  assignFileToParameter: (filePath: string, parameterId: string, mediaFile: MediaFile) => void;
  removeFileAssignment: (filePath: string) => void;
  clearJobInputs: () => void;
  resetJobPreparation: () => void;
  autoAssignSelectedFilesToWorkflow: (workflowId: string) => void;

  // ============================================================
  // NEW ACTIONS - Job Management
  // ============================================================
  addJob: (job: Job) => void;
  updateJob: (id: string, updates: Partial<Job>) => void;
  setSelectedJob: (jobId: string | null) => void;
  getJobById: (id: string) => Job | undefined;
  getSelectedJob: () => Job | undefined;
  reRunJob: (jobId: string) => Job;
  deleteJob: (jobId: string) => void;
  clearJobs: () => void;
  getJobsByWorkflow: (workflowId: string) => Job[];
  getJobsByStatus: (status: JobStatus) => Job[];
  fetchJobs: () => Promise<void>;

  // ============================================================
  // NEW ACTIONS - UI State
  // ============================================================
  setViewMode: (mode: 'grid' | 'list' | 'large') => void;
  setSelectedExtension: (extension: string | null) => void;
  setLoading: (loading: boolean) => void;
}

// ============================================================================
// STORE CREATION
// ============================================================================

const MAX_JOBS = 50; // Maximum number of jobs to store

export const useWorkspaceStore = create<WorkspaceActions>()(
  persist(
    (set, get) => ({
      // ============================================================
      // INITIAL STATE
      // ============================================================
      // Legacy state
      config: {
        path: '~/Downloads/workspace',
        workflowId: null,
      },
      uploadedFiles: [],
      selectedFiles: new Set<string>(),
      isProcessing: false,
      activeTaskId: null,
      textContents: new Map<string, WorkspaceTextContent>(),
      isLoadingWorkspace: false,
      isLoadingFiles: false,

      // New state - Folder & Media
      selectedFolder: null,
      mediaFiles: [],

      // New state - Workflows
      workflows: [],
      selectedWorkflowId: null,

      // New state - Job Preparation
      jobFiles: [],

      // New state - Job History
      jobs: [],
      selectedJobId: null,
      isLoadingJobs: false,

      // New state - UI State
      viewMode: 'grid',
      selectedExtension: null,
      isLoading: false,

      // Error state
      error: null,

      // ============================================================
      // LEGACY ACTIONS (Backward Compatibility)
      // ============================================================
      setConfig: (config) =>
        set((state) => ({
          config: { ...state.config, ...config },
          error: null,
        })),

      setWorkflowId: (workflowId) =>
        set((state) => ({
          config: { ...state.config, workflowId },
          error: null,
        })),

      addUploadedFile: (file) =>
        set((state) => ({
          uploadedFiles: [...state.uploadedFiles, file],
          error: null,
        })),

      removeUploadedFile: (fileId) =>
        set((state) => ({
          uploadedFiles: state.uploadedFiles.filter((f) => f.id !== fileId),
          selectedFiles: new Set(
            [...state.selectedFiles].filter((id) => id !== fileId)
          ),
          textContents: new Map(
            [...state.textContents].filter(([id]) => id !== fileId)
          ),
        })),

      updateFileStatus: (fileId, status, errorMessage) =>
        set((state) => ({
          uploadedFiles: state.uploadedFiles.map((f) =>
            f.id === fileId
              ? { ...f, status, errorMessage }
              : f
          ),
        })),

      setSelectedFiles: (files) =>
        set({ selectedFiles: files }),

      toggleFileSelection: (fileId) =>
        set((state) => {
          const newSelected = new Set(state.selectedFiles);
          if (newSelected.has(fileId)) {
            newSelected.delete(fileId);
          } else {
            newSelected.add(fileId);
          }
          return { selectedFiles: newSelected };
        }),

      clearAllFiles: () =>
        set({
          uploadedFiles: [],
          selectedFiles: new Set<string>(),
          textContents: new Map<string, WorkspaceTextContent>(),
          error: null,
        }),

      updateTextContent: (fileId, content, language) =>
        set((state) => {
          const existing = state.textContents.get(fileId) || {
            original: '',
            en: '',
            zh: '',
            lastModified: Date.now(),
          };

          const updated: WorkspaceTextContent = {
            ...existing,
            [language]: content,
            lastModified: Date.now(),
          };

          const newContents = new Map(state.textContents);
          newContents.set(fileId, updated);

          const updatedFiles = state.uploadedFiles.map((f) =>
            f.id === fileId
              ? { ...f, textContent: updated }
              : f
          );

          return {
            textContents: newContents,
            uploadedFiles: updatedFiles,
          };
        }),

      setTextContent: (fileId, content) =>
        set((state) => {
          const newContents = new Map(state.textContents);
          newContents.set(fileId, content);

          const updatedFiles = state.uploadedFiles.map((f) =>
            f.id === fileId
              ? { ...f, textContent: content }
              : f
          );

          return {
            textContents: newContents,
            uploadedFiles: updatedFiles,
          };
        }),

      getTextContent: (fileId) => {
        return get().textContents.get(fileId);
      },

      setProcessing: (isProcessing) =>
        set({ isProcessing }),

      setActiveTaskId: (taskId) =>
        set({ activeTaskId: taskId }),

      setLoadingWorkspace: (loading) =>
        set({ isLoadingWorkspace: loading }),

      setLoadingFiles: (loading) =>
        set({ isLoadingFiles: loading }),

      setError: (error) =>
        set({ error }),

      resetWorkspace: () =>
        set({
          uploadedFiles: [],
          selectedFiles: new Set<string>(),
          isProcessing: false,
          activeTaskId: null,
          textContents: new Map<string, WorkspaceTextContent>(),
          isLoadingWorkspace: false,
          isLoadingFiles: false,
          error: null,
          // Reset new state
          selectedFolder: null,
          mediaFiles: [],
          jobFiles: [],
          selectedJobId: null,
        }),

      // ============================================================
      // NEW ACTIONS - Folder & Media Management
      // ============================================================
      setSelectedFolder: (folder) =>
        set({ selectedFolder: folder, error: null }),

      setMediaFiles: (files) =>
        set({ mediaFiles: files, error: null }),

      addMediaFile: (file) =>
        set((state) => ({
          mediaFiles: [...state.mediaFiles, file],
          error: null,
        })),

      removeMediaFile: (fileId) =>
        set((state) => ({
          mediaFiles: state.mediaFiles.filter((f) => f.id !== fileId),
          jobFiles: state.jobFiles.filter((jf) => jf.filePath !== fileId),
        })),

      updateMediaFile: (fileId, updates) =>
        set((state) => {
          // Update mediaFiles
          const updatedMediaFiles = state.mediaFiles.map((f) =>
            f.id === fileId ? { ...f, ...updates } : f
          );

          // Update corresponding assignments in jobFiles
          const updatedJobFiles = state.jobFiles.map((jf) => {
            if (jf.filePath === fileId) {
              const jobUpdates: Partial<FileInputAssignment> = {};
              if (updates.width !== undefined) jobUpdates.width = updates.width;
              if (updates.height !== undefined) jobUpdates.height = updates.height;
              
              if (Object.keys(jobUpdates).length > 0) {
                return { ...jf, ...jobUpdates };
              }
            }
            return jf;
          });

          return {
            mediaFiles: updatedMediaFiles,
            jobFiles: updatedJobFiles,
          };
        }),

      toggleMediaFileSelection: (fileId) =>
        set((state) => ({
          mediaFiles: state.mediaFiles.map((f) =>
            f.id === fileId ? { ...f, selected: !f.selected } : f
          ),
        })),

      selectAllMediaFiles: () =>
        set((state) => ({
          mediaFiles: state.mediaFiles.map((f) => ({ ...f, selected: true })),
        })),

      deselectAllMediaFiles: () =>
        set((state) => ({
          mediaFiles: state.mediaFiles.map((f) => ({ ...f, selected: false })),
        })),

      getSelectedMediaFiles: () => {
        return get().mediaFiles.filter((f) => f.selected);
      },

      // ============================================================
      // NEW ACTIONS - Workflow Management
      // ============================================================
      setWorkflows: (workflows) =>
        set({ workflows, error: null }),

      addWorkflow: (workflow) =>
        set((state) => ({
          workflows: [...state.workflows, workflow],
          error: null,
        })),

      updateWorkflow: (id, updates) =>
        set((state) => ({
          workflows: state.workflows.map((w) =>
            w.id === id ? { ...w, ...updates, updatedAt: Date.now() } : w
          ),
          error: null,
        })),

      deleteWorkflow: (id) =>
        set((state) => ({
          workflows: state.workflows.filter((w) => w.id !== id),
          selectedWorkflowId: state.selectedWorkflowId === id ? null : state.selectedWorkflowId,
        })),

      setSelectedWorkflow: (workflowId) =>
        set({ selectedWorkflowId: workflowId, error: null }),

      getWorkflowById: (id) => {
        return get().workflows.find((w) => w.id === id);
      },

      getSelectedWorkflow: () => {
        const state = get();
        return state.selectedWorkflowId
          ? state.workflows.find((w) => w.id === state.selectedWorkflowId)
          : undefined;
      },

      // ============================================================
      // NEW ACTIONS - Job Preparation
      // ============================================================
      setJobFiles: (assignments) =>
        set({ jobFiles: assignments, error: null }),

      assignFileToParameter: (filePath, parameterId, mediaFile) =>
        set((state) => {
          // DEBUG: Log mediaFile dimensions
          console.log(`[assignFileToParameter] Assigning ${mediaFile.name}: width=${mediaFile.width}, height=${mediaFile.height}`);

          // Remove existing assignment for this file
          const filtered = state.jobFiles.filter((jf) => jf.filePath !== filePath);

          // Add new assignment
          const assignment: FileInputAssignment = {
            parameterId,
            filePath,
            fileName: mediaFile.name,
            fileSize: mediaFile.size,
            fileType: mediaFile.type,
            valid: true, // Will be validated by WorkflowInputBuilder
            width: mediaFile.width,
            height: mediaFile.height,
          };

          // DEBUG: Log assignment dimensions
          console.log(`[assignFileToParameter] Created assignment:`, assignment);

          return {
            jobFiles: [...filtered, assignment],
            error: null,
          };
        }),

      removeFileAssignment: (filePath) =>
        set((state) => ({
          jobFiles: state.jobFiles.filter((jf) => jf.filePath !== filePath),
        })),

      clearJobInputs: () =>
        set({ jobFiles: [] }),

      resetJobPreparation: () =>
        set({ jobFiles: [] }),

      autoAssignSelectedFilesToWorkflow: (workflowId) => {
        const state = get();
        const workflow = state.workflows.find((w) => w.id === workflowId);
        if (!workflow) return;

        const selected = state.mediaFiles.filter((f) => f.selected);
        if (selected.length === 0) return;

        // Clear existing assignments for this workflow's parameters
        const currentAssignments = state.jobFiles.filter(
          (assignment) => !workflow.inputs.some((input) => input.id === assignment.parameterId)
        );

        // Smart assignment logic - distribute files across parameters
        const assignments: FileInputAssignment[] = [];
        const assignedFiles = new Set<string>();
        const paramAssignmentCount = new Map<string, number>();

        // Get file input parameters in order
        const fileParams = workflow.inputs.filter((p) => p.type === 'file');

        // Initialize count for each parameter
        fileParams.forEach(param => {
          paramAssignmentCount.set(param.id, 0);
        });

        // Assign files to parameters (one file per parameter)
        selected.forEach((file, fileIndex) => {
          // Find the first compatible parameter that doesn't have any files yet
          for (const param of fileParams) {
            // Skip if this file is already assigned
            if (assignedFiles.has(file.path)) continue;

            // Check if this parameter already has a file assigned
            const currentCount = paramAssignmentCount.get(param.id) || 0;
            if (currentCount > 0) {
              // Parameter already has a file, try next parameter
              continue;
            }

            // Check if file is compatible with this parameter
            const validation = validateFileForParameter(file, param);
            if (validation.valid) {
              // Assign file to this parameter
              assignments.push({
                parameterId: param.id,
                filePath: file.path,
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                valid: true,
              });
              assignedFiles.add(file.path);
              paramAssignmentCount.set(param.id, currentCount + 1);
              break; // Move to next file
            }
          }
        });

        // Update store
        set({
          jobFiles: [...currentAssignments, ...assignments],
          selectedWorkflowId: workflowId,
        });
      },

      // ============================================================
      // NEW ACTIONS - Job Management
      // ============================================================
      addJob: (job) =>
        set((state) => {
          const newJobs = [job, ...state.jobs];

          // Implement LRU eviction - keep only MAX_JOBS
          if (newJobs.length > MAX_JOBS) {
            newJobs.splice(MAX_JOBS);
          }

          return { jobs: newJobs, error: null };
        }),

      updateJob: (id, updates) =>
        set((state) => ({
          jobs: state.jobs.map((j) =>
            j.id === id ? { ...j, ...updates } : j
          ),
        })),

      setSelectedJob: (jobId) =>
        set({ selectedJobId: jobId }),

      getJobById: (id) => {
        return get().jobs.find((j) => j.id === id);
      },

      getSelectedJob: () => {
        const state = get();
        return state.selectedJobId
          ? state.jobs.find((j) => j.id === state.selectedJobId)
          : undefined;
      },

      reRunJob: (jobId) => {
        const state = get();
        const job = state.jobs.find((j) => j.id === jobId);

        if (!job) {
          throw new Error(`Job ${jobId} not found`);
        }

        // Create new job with same inputs
        const newJob: Job = {
          ...job,
          id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          status: 'pending',
          taskId: undefined,
          startedAt: undefined,
          completedAt: undefined,
          results: undefined,
          error: undefined,
          createdAt: Date.now(),
          deletedSourceFiles: undefined,
        };

        set((state) => ({
          jobs: [newJob, ...state.jobs],
          selectedJobId: newJob.id,
        }));

        return newJob;
      },

      deleteJob: (jobId) =>
        set((state) => ({
          jobs: state.jobs.filter((j) => j.id !== jobId),
          selectedJobId: state.selectedJobId === jobId ? null : state.selectedJobId,
        })),

      clearJobs: () =>
        set({ jobs: [], selectedJobId: null }),

      getJobsByWorkflow: (workflowId) => {
        return get().jobs.filter((j) => j.workflowId === workflowId);
      },

      getJobsByStatus: (status) => {
        return get().jobs.filter((j) => j.status === status);
      },

      fetchJobs: async () => {
        set({ isLoadingJobs: true, error: null });
        try {
          // Use string literal to avoid import issues if API_ENDPOINTS is not available in store
          const response = await fetch('/api/workspace/jobs');
          if (!response.ok) {
            throw new Error('Failed to fetch jobs');
          }
          const data = await response.json();
          set({ jobs: data.jobs || [], isLoadingJobs: false });
        } catch (error) {
          console.error('Fetch jobs error:', error);
          set({ 
            isLoadingJobs: false, 
            error: error instanceof Error ? error.message : 'Failed to fetch jobs' 
          });
        }
      },

      // ============================================================
      // NEW ACTIONS - UI State
      // ============================================================
      setViewMode: (mode) =>
        set({ viewMode: mode }),

      setSelectedExtension: (extension) =>
        set({ selectedExtension: extension }),

      setLoading: (loading) =>
        set({ isLoading: loading }),
    }),
    {
      name: 'runninghub-workspace-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Legacy state
        config: state.config,
        uploadedFiles: state.uploadedFiles,
        textContents: Array.from(state.textContents.entries()),

        // New state - Workflows and Jobs
        workflows: state.workflows,
        // jobs: state.jobs, // Jobs are now fetched from server
        selectedWorkflowId: state.selectedWorkflowId,

        // UI state
        viewMode: state.viewMode,
        selectedExtension: state.selectedExtension,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Convert textContents back to Map
          state.textContents = new Map(
            state.textContents as unknown as Array<[string, WorkspaceTextContent]>
          );
          // Convert selectedFiles back to Set
          state.selectedFiles = new Set(state.selectedFiles as unknown as string[]);
        }
      },
    }
  )
);
