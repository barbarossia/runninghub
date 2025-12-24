import { create } from 'zustand';
import { VideoFile } from '@/types';

interface VideoState {
  // Video data
  videos: VideoFile[];
  filteredVideos: VideoFile[];

  // View mode
  viewMode: 'grid' | 'list' | 'large';

  // Loading state
  isLoadingVideos: boolean;

  // Error state
  error: string | null;

  // Search/filter state
  searchQuery: string;
  selectedExtension: string | null;

  // Actions
  setVideos: (videos: VideoFile[]) => void;
  setViewMode: (mode: 'grid' | 'list' | 'large') => void;
  setLoadingVideos: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSelectedExtension: (extension: string | null) => void;

  // Filter actions
  applyFilters: () => void;
  clearFilters: () => void;

  // Video actions
  addVideo: (video: VideoFile) => void;
  removeVideo: (videoPath: string) => void;
  updateVideo: (videoPath: string, updates: Partial<VideoFile>) => void;
}

export const useVideoStore = create<VideoState>((set, get) => ({
  // Initial state
  videos: [],
  filteredVideos: [],
  viewMode: 'grid',
  isLoadingVideos: false,
  error: null,
  searchQuery: '',
  selectedExtension: null,

  // Setters
  setVideos: (videos) => {
    set({ videos, filteredVideos: videos, error: null });
    get().applyFilters();
  },

  setViewMode: (mode) => set({ viewMode: mode }),

  setLoadingVideos: (loading) => set({ isLoadingVideos: loading }),

  setError: (error) => set({ error }),

  setSearchQuery: (query) => {
    set({ searchQuery: query });
    get().applyFilters();
  },

  setSelectedExtension: (extension) => {
    set({ selectedExtension: extension });
    get().applyFilters();
  },

  // Filter actions
  applyFilters: () => {
    const state = get();
    let filtered = [...state.videos];

    // Apply search query filter
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (video) =>
          video.name.toLowerCase().includes(query) ||
          video.path.toLowerCase().includes(query)
      );
    }

    // Apply extension filter
    if (state.selectedExtension) {
      filtered = filtered.filter(
        (video) => video.extension === state.selectedExtension
      );
    }

    set({ filteredVideos: filtered });
  },

  clearFilters: () => {
    set({ searchQuery: '', selectedExtension: null });
    const state = get();
    set({ filteredVideos: [...state.videos] });
  },

  // Video actions
  addVideo: (video) => {
    const state = get();
    const newVideos = [...state.videos, video];
    set({ videos: newVideos });
    get().applyFilters();
  },

  removeVideo: (videoPath) => {
    const state = get();
    const newVideos = state.videos.filter((vid) => vid.path !== videoPath);
    set({ videos: newVideos });
    get().applyFilters();
  },

  updateVideo: (videoPath, updates) => {
    const state = get();
    const newVideos = state.videos.map((vid) =>
      vid.path === videoPath ? { ...vid, ...updates } : vid
    );
    set({ videos: newVideos });
    get().applyFilters();
  },
}));
