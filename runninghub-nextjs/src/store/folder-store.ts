import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { FolderSelectionResponse, FileSystemContents, FolderItem } from '@/types';

export interface RecentFolder {
  path: string;
  name: string;
  timestamp: number;
  source: 'filesystem_api' | 'manual_input';
}

interface FolderState {
  // Current folder state
  selectedFolder: FolderSelectionResponse | null;
  folderContents: FileSystemContents | null;
  currentPath: string;

  // Recent folders
  recentFolders: RecentFolder[];

  // Loading states
  isLoadingFolder: boolean;
  isLoadingContents: boolean;

  // Error state
  error: string | null;

  // Actions
  setSelectedFolder: (folder: FolderSelectionResponse | null) => void;
  setFolderContents: (contents: FileSystemContents | null) => void;
  setCurrentPath: (path: string) => void;
  addRecentFolder: (folder: Omit<RecentFolder, 'timestamp'>) => void;
  setLoadingFolder: (loading: boolean) => void;
  setLoadingContents: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Navigation actions
  navigateToFolder: (folderPath: string) => void;
  navigateToParent: () => void;
  clearFolder: () => void;
}

export const useFolderStore = create<FolderState>()(
  persist(
    (set, get) => ({
      // Initial state
      selectedFolder: null,
      folderContents: null,
      currentPath: '',
      recentFolders: [],
      isLoadingFolder: false,
      isLoadingContents: false,
      error: null,

      // Setters
      setSelectedFolder: (folder) => set({ selectedFolder: folder, error: null }),

      setFolderContents: (contents) =>
        set({
          folderContents: contents,
          currentPath: contents?.current_path || '',
          error: null,
        }),

      setCurrentPath: (path) => set({ currentPath: path }),

      addRecentFolder: (folder) =>
        set((state) => {
          const newFolder = { ...folder, timestamp: Date.now() };
          // Remove duplicates based on path
          const filtered = state.recentFolders.filter((f) => f.path !== folder.path);
          // Add new to top, keep max 5
          return { recentFolders: [newFolder, ...filtered].slice(0, 5) };
        }),

      setLoadingFolder: (loading) => set({ isLoadingFolder: loading }),

      setLoadingContents: (loading) => set({ isLoadingContents: loading }),

      setError: (error) => set({ error }),

      // Navigation actions
      navigateToFolder: (folderPath) => {
        set({ currentPath: folderPath, error: null });
      },

      navigateToParent: () => {
        const state = get();
        const parentPath = state.folderContents?.parent_path;
        if (parentPath) {
          set({ currentPath: parentPath, error: null });
        }
      },

      clearFolder: () =>
        set({
          selectedFolder: null,
          folderContents: null,
          currentPath: '',
          error: null,
        }),
    }),
    {
      name: 'runninghub-folder-storage', // unique name
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ recentFolders: state.recentFolders }), // only persist recentFolders
    }
  )
);
