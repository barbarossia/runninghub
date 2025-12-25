import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  WorkspaceFile,
  WorkspaceTextContent,
  WorkspaceConfig,
  Language,
} from '@/types/workspace';

interface WorkspaceState {
  // Configuration
  config: WorkspaceConfig;

  // Uploaded files
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

  // Error state
  error: string | null;

  // Actions - Configuration
  setConfig: (config: Partial<WorkspaceConfig>) => void;
  setWorkflowId: (workflowId: string) => void;

  // Actions - Files
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

  // Actions - Text Content
  updateTextContent: (
    fileId: string,
    content: string,
    language: Language
  ) => void;
  setTextContent: (fileId: string, content: WorkspaceTextContent) => void;
  getTextContent: (fileId: string) => WorkspaceTextContent | undefined;

  // Actions - Processing
  setProcessing: (isProcessing: boolean) => void;
  setActiveTaskId: (taskId: string | null) => void;

  // Actions - Loading
  setLoadingWorkspace: (loading: boolean) => void;
  setLoadingFiles: (loading: boolean) => void;

  // Actions - Error
  setError: (error: string | null) => void;

  // Actions - Reset
  resetWorkspace: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      // Initial state
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
      error: null,

      // Configuration actions
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

      // File actions
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

      // Text content actions
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

          // Also update in uploadedFiles
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

          // Also update in uploadedFiles
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

      // Processing actions
      setProcessing: (isProcessing) =>
        set({ isProcessing }),

      setActiveTaskId: (taskId) =>
        set({ activeTaskId: taskId }),

      // Loading actions
      setLoadingWorkspace: (loading) =>
        set({ isLoadingWorkspace: loading }),

      setLoadingFiles: (loading) =>
        set({ isLoadingFiles: loading }),

      // Error actions
      setError: (error) =>
        set({ error }),

      // Reset
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
        }),
    }),
    {
      name: 'runninghub-workspace-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        config: state.config,
        uploadedFiles: state.uploadedFiles,
        textContents: Array.from(state.textContents.entries()),
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
