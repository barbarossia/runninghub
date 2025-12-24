import { useEffect, useCallback, useRef } from 'react';
import { useVideoSelectionStore, useVideoStore } from '@/store';
import { KEYBOARD_SHORTCUTS } from '@/constants';
import type { VideoFile } from '@/types';

interface UseVideoSelectionOptions {
  videos?: VideoFile[];
  onSelectAll?: (selected: VideoFile[]) => void;
  onDeselectAll?: () => void;
  onConvert?: (selectedPaths: string[]) => void;
  enabled?: boolean;
}

interface UseVideoSelectionReturn {
  // Selection state
  selectedVideos: Map<string, VideoFile>;
  selectedCount: number;
  isAllSelected: boolean;
  hasSelection: boolean;

  // Actions
  toggleVideo: (video: VideoFile, event?: React.MouseEvent) => void;
  selectVideo: (video: VideoFile) => void;
  deselectVideo: (videoPath: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  convertSelected: () => void;

  // Range selection
  selectRange: (startIndex: number, endIndex: number) => void;

  // Helpers
  isVideoSelected: (videoPath: string) => boolean;
  getSelectedPaths: () => string[];
}

export function useVideoSelection(options: UseVideoSelectionOptions = {}): UseVideoSelectionReturn {
  const {
    videos,
    onSelectAll,
    onDeselectAll,
    onConvert,
    enabled = true,
  } = options;

  // Store state
  const store = useVideoSelectionStore();
  const videoStore = useVideoStore();
  const workingVideos = videos || videoStore.filteredVideos;

  // Track last clicked index for range selection
  const lastClickedIndexRef = useRef<number | null>(null);

  // Single video selection with toggle behavior
  const toggleVideo = useCallback((video: VideoFile, event?: React.MouseEvent) => {
    // Find the index of the clicked video
    const videoIndex = workingVideos.findIndex((vid) => vid.path === video.path);

    // If Shift is held and we have a previous click, perform range selection
    const isShiftClick = event?.shiftKey;
    if (isShiftClick && lastClickedIndexRef.current !== null && videoIndex !== -1) {
      const start = Math.min(lastClickedIndexRef.current, videoIndex);
      const end = Math.max(lastClickedIndexRef.current, videoIndex);
      store.selectRange(workingVideos, start, end);
      return;
    }

    // Default behavior for both normal clicks and checkbox clicks: Toggle
    store.toggleVideo(video);
    lastClickedIndexRef.current = videoIndex;
  }, [workingVideos, store]);

  const selectVideo = useCallback((video: VideoFile) => {
    store.selectVideo(video);
  }, [store]);

  const deselectVideo = useCallback((videoPath: string) => {
    store.deselectVideo(videoPath);
  }, [store]);

  const selectAll = useCallback(() => {
    store.selectAll(workingVideos);
  }, [store, workingVideos]);

  const deselectAll = useCallback(() => {
    store.deselectAll();
  }, [store]);

  const convertSelected = useCallback(() => {
    const selectedPaths = Array.from(store.selectedVideos.keys());
    if (selectedPaths.length > 0) {
      onConvert?.(selectedPaths);
    }
  }, [store, onConvert]);

  const selectRange = useCallback((startIndex: number, endIndex: number) => {
    store.selectRange(workingVideos, startIndex, endIndex);
  }, [store, workingVideos]);

  const isVideoSelected = useCallback((videoPath: string): boolean => {
    return store.selectedVideos.has(videoPath);
  }, [store.selectedVideos]);

  const getSelectedPaths = useCallback((): string[] => {
    return Array.from(store.selectedVideos.keys());
  }, [store.selectedVideos]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const isModKey = event.ctrlKey || event.metaKey;

      switch (event.key) {
        case KEYBOARD_SHORTCUTS.SELECT_ALL:
          if (isModKey) {
            event.preventDefault();
            selectAll();
            onSelectAll?.(workingVideos);
          }
          break;

        case KEYBOARD_SHORTCUTS.DESELECT_ALL:
          event.preventDefault();
          deselectAll();
          onDeselectAll?.();
          break;

        case KEYBOARD_SHORTCUTS.PROCESS_IMAGES:
          if (store.selectedVideos.size > 0) {
            event.preventDefault();
            convertSelected();
          }
          break;

        case KEYBOARD_SHORTCUTS.TOGGLE_VIEW:
          event.preventDefault();
          // Cycle through view modes
          const modes: Array<'grid' | 'list' | 'large'> = ['grid', 'list', 'large'];
          const currentIndex = modes.indexOf(videoStore.viewMode);
          const nextMode = modes[(currentIndex + 1) % modes.length];
          videoStore.setViewMode(nextMode);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, workingVideos, store, videoStore, onSelectAll, onDeselectAll, selectAll, deselectAll, convertSelected]);

  return {
    selectedVideos: store.selectedVideos,
    selectedCount: store.selectedVideos.size,
    isAllSelected: store.isAllSelected,
    hasSelection: store.selectedVideos.size > 0,

    toggleVideo,
    selectVideo,
    deselectVideo,
    selectAll,
    deselectAll,
    convertSelected,

    selectRange,

    isVideoSelected,
    getSelectedPaths,
  };
}
