import { create } from 'zustand';
import { VideoFile } from '@/types';

interface VideoSelectionState {
  // Selection state
  selectedVideos: Map<string, VideoFile>;
  lastSelectedVideoPath: string | null;
  isAllSelected: boolean;

  // Range selection state
  rangeStartIndex: number | null;
  rangeEndIndex: number | null;

  // Actions
  selectVideo: (video: VideoFile) => void;
  deselectVideo: (videoPath: string) => void;
  toggleVideo: (video: VideoFile) => void;
  selectAll: (videos: VideoFile[]) => void;
  deselectAll: () => void;
  selectRange: (videos: VideoFile[], startIndex: number, endIndex: number) => void;

  // Batch actions
  addSelections: (videos: VideoFile[]) => void;
  removeSelections: (videoPaths: string[]) => void;

  // Clear
  clearSelection: () => void;

  // Get selected paths
  getSelectedPaths: () => string[];
}

export const useVideoSelectionStore = create<VideoSelectionState>((set, get) => ({
  // Initial state
  selectedVideos: new Map(),
  lastSelectedVideoPath: null,
  isAllSelected: false,
  rangeStartIndex: null,
  rangeEndIndex: null,

  // Single video actions
  selectVideo: (video) => {
    const state = get();
    const newSelected = new Map(state.selectedVideos);
    newSelected.set(video.path, video);
    set({
      selectedVideos: newSelected,
      lastSelectedVideoPath: video.path,
      isAllSelected: false,
    });
  },

  deselectVideo: (videoPath) => {
    const state = get();
    const newSelected = new Map(state.selectedVideos);
    newSelected.delete(videoPath);
    set({
      selectedVideos: newSelected,
      isAllSelected: false,
    });
  },

  toggleVideo: (video) => {
    const state = get();
    const newSelected = new Map(state.selectedVideos);

    if (newSelected.has(video.path)) {
      newSelected.delete(video.path);
    } else {
      newSelected.set(video.path, video);
    }

    set({
      selectedVideos: newSelected,
      lastSelectedVideoPath: video.path,
      isAllSelected: false,
    });
  },

  selectAll: (videos) => {
    const newSelected = new Map<string, VideoFile>();
    videos.forEach((vid) => newSelected.set(vid.path, vid));
    set({
      selectedVideos: newSelected,
      isAllSelected: videos.length > 0,
    });
  },

  deselectAll: () => {
    set({
      selectedVideos: new Map(),
      lastSelectedVideoPath: null,
      isAllSelected: false,
      rangeStartIndex: null,
      rangeEndIndex: null,
    });
  },

  selectRange: (videos, startIndex, endIndex) => {
    const start = Math.min(startIndex, endIndex);
    const end = Math.max(startIndex, endIndex);
    const newSelected = new Map<string, VideoFile>();

    for (let i = start; i <= end; i++) {
      if (videos[i]) {
        newSelected.set(videos[i].path, videos[i]);
      }
    }

    set({
      selectedVideos: newSelected,
      rangeStartIndex: startIndex,
      rangeEndIndex: endIndex,
    });
  },

  // Batch actions
  addSelections: (videos) => {
    const state = get();
    const newSelected = new Map(state.selectedVideos);
    videos.forEach((vid) => newSelected.set(vid.path, vid));
    set({ selectedVideos: newSelected });
  },

  removeSelections: (videoPaths) => {
    const state = get();
    const newSelected = new Map(state.selectedVideos);
    videoPaths.forEach((path) => newSelected.delete(path));
    set({
      selectedVideos: newSelected,
      isAllSelected: false,
    });
  },

  // Clear
  clearSelection: () => {
    set({
      selectedVideos: new Map(),
      lastSelectedVideoPath: null,
      isAllSelected: false,
      rangeStartIndex: null,
      rangeEndIndex: null,
    });
  },

  // Get selected paths
  getSelectedPaths: () => {
    const state = get();
    return Array.from(state.selectedVideos.keys());
  },
}));
