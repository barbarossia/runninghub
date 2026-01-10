import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { FolderSelectionResponse, FileSystemContents } from '@/types';

export type PageType = 'images' | 'videos' | 'workspace' | 'clip' | 'crop';

export interface RecentFolder {
  path: string;
  name: string;
  timestamp: number;
  source: 'filesystem_api' | 'manual_input';
}

interface PageFolderState {
  selectedFolder: FolderSelectionResponse | null;
  folderContents: FileSystemContents | null;
  currentPath: string;
  isLoadingFolder: boolean;
  isLoadingContents: boolean;
  error: string | null;
}

interface FolderState {
  // Page-specific folder states
  images: PageFolderState;
  videos: PageFolderState;
  workspace: PageFolderState;
  clip: PageFolderState;
  crop: PageFolderState;

  // Active page (which page's folder state should be used for "current" operations)
  activePage: PageType;

  // Recent folders (shared across pages)
  recentFolders: RecentFolder[];

  // Actions
  setActivePage: (page: PageType) => void;

  // Page-specific actions
  setSelectedFolder: (page: PageType, folder: FolderSelectionResponse | null) => void;
  setFolderContents: (page: PageType, contents: FileSystemContents | null) => void;
  setCurrentPath: (page: PageType, path: string) => void;
  setLoadingFolder: (page: PageType, loading: boolean) => void;
  setLoadingContents: (page: PageType, loading: boolean) => void;
  setError: (page: PageType, error: string | null) => void;
  clearPageFolder: (page: PageType) => void;

  // Convenience selectors for each page (for backward compatibility)
  getSelectedFolder: (page: PageType) => FolderSelectionResponse | null;
  getFolderContents: (page: PageType) => FileSystemContents | null;
  getCurrentPath: (page: PageType) => string;
  getIsLoadingFolder: (page: PageType) => boolean;
  getIsLoadingContents: (page: PageType) => boolean;
  getError: (page: PageType) => string | null;

  // Recent folders
  addRecentFolder: (folder: Omit<RecentFolder, 'timestamp'>) => void;
}

export const useFolderStore = create<FolderState>()(
  persist(
    (set, get) => ({
      // Initial page states
      images: {
        selectedFolder: null,
        folderContents: null,
        currentPath: '',
        isLoadingFolder: false,
        isLoadingContents: false,
        error: null,
      },
      videos: {
        selectedFolder: null,
        folderContents: null,
        currentPath: '',
        isLoadingFolder: false,
        isLoadingContents: false,
        error: null,
      },
      workspace: {
        selectedFolder: null,
        folderContents: null,
        currentPath: '',
        isLoadingFolder: false,
        isLoadingContents: false,
        error: null,
      },
      clip: {
        selectedFolder: null,
        folderContents: null,
        currentPath: '',
        isLoadingFolder: false,
        isLoadingContents: false,
        error: null,
      },
      crop: {
        selectedFolder: null,
        folderContents: null,
        currentPath: '',
        isLoadingFolder: false,
        isLoadingContents: false,
        error: null,
      },
      activePage: 'images',
      recentFolders: [],

      // Set active page
      setActivePage: (page) => set({ activePage: page }),

      // Page-specific setters
      setSelectedFolder: (page, folder) =>
        set((state) => {
          const pageState = state[page];
          return {
            [page]: { ...pageState, selectedFolder: folder, error: null },
          } as Partial<FolderState>;
        }),

      setFolderContents: (page, contents) =>
        set((state) => {
          const pageState = state[page];
          return {
            [page]: {
              ...pageState,
              folderContents: contents,
              currentPath: contents?.current_path || '',
              error: null,
            },
          } as Partial<FolderState>;
        }),

      setCurrentPath: (page, path) =>
        set((state) => {
          const pageState = state[page];
          return {
            [page]: { ...pageState, currentPath: path },
          } as Partial<FolderState>;
        }),

      setLoadingFolder: (page, loading) =>
        set((state) => {
          const pageState = state[page];
          return {
            [page]: { ...pageState, isLoadingFolder: loading },
          } as Partial<FolderState>;
        }),

      setLoadingContents: (page, loading) =>
        set((state) => {
          const pageState = state[page];
          return {
            [page]: { ...pageState, isLoadingContents: loading },
          } as Partial<FolderState>;
        }),

      setError: (page, error) =>
        set((state) => {
          const pageState = state[page];
          return {
            [page]: { ...pageState, error },
          } as Partial<FolderState>;
        }),

      clearPageFolder: (page) =>
        set({
          [page]: {
            selectedFolder: null,
            folderContents: null,
            currentPath: '',
            isLoadingFolder: false,
            isLoadingContents: false,
            error: null,
          },
        } as Partial<FolderState>),

      // Convenience selectors
      getSelectedFolder: (page) => get()[page].selectedFolder,
      getFolderContents: (page) => get()[page].folderContents,
      getCurrentPath: (page) => get()[page].currentPath,
      getIsLoadingFolder: (page) => get()[page].isLoadingFolder,
      getIsLoadingContents: (page) => get()[page].isLoadingContents,
      getError: (page) => get()[page].error,

      // Recent folders
      addRecentFolder: (folder) =>
        set((state) => {
          const newFolder = { ...folder, timestamp: Date.now() };
          // Remove duplicates based on path
          const filtered = state.recentFolders.filter((f) => f.path !== folder.path);
          // Add new to top, keep max 5
          return { recentFolders: [newFolder, ...filtered].slice(0, 5) };
        }),
    }),
    {
      name: 'runninghub-folder-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        recentFolders: state.recentFolders,
        images: state.images,
        videos: state.videos,
        workspace: state.workspace,
        clip: state.clip,
        crop: state.crop,
      }),
    }
  )
);

// Convenience hooks for each page (for cleaner component code)
export const useImageFolder = () => useFolderStore((state) => state.images);
export const useVideoFolder = () => useFolderStore((state) => state.videos);
export const useWorkspaceFolder = () => useFolderStore((state) => state.workspace);
export const useClipFolder = () => useFolderStore((state) => state.clip);
export const useCropFolder = () => useFolderStore((state) => state.crop);
