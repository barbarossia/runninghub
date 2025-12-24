import { useEffect, useCallback, useRef } from 'react';
import { useSelectionStore, useImageStore } from '@/store';
import { KEYBOARD_SHORTCUTS } from '@/constants';
import type { ImageFile } from '@/types';

interface UseImageSelectionOptions {
  images?: ImageFile[];
  onSelectAll?: (selected: ImageFile[]) => void;
  onDeselectAll?: () => void;
  onDelete?: (selectedPaths: string[]) => void;
  onProcess?: (selectedPaths: string[]) => void;
  enabled?: boolean;
}

interface UseImageSelectionReturn {
  // Selection state
  selectedImages: Map<string, ImageFile>;
  selectedCount: number;
  isAllSelected: boolean;
  hasSelection: boolean;

  // Actions
  toggleImage: (image: ImageFile, event?: React.MouseEvent) => void;
  selectImage: (image: ImageFile) => void;
  deselectImage: (imagePath: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  deleteSelected: () => void;
  processSelected: () => void;

  // Range selection
  selectRange: (startIndex: number, endIndex: number) => void;

  // Helpers
  isImageSelected: (imagePath: string) => boolean;
  getSelectedPaths: () => string[];
}

export function useImageSelection(options: UseImageSelectionOptions = {}): UseImageSelectionReturn {
  const {
    images,
    onSelectAll,
    onDeselectAll,
    onDelete,
    onProcess,
    enabled = true,
  } = options;

  // Store state
  const store = useSelectionStore();
  const imageStore = useImageStore();
  const workingImages = images || imageStore.filteredImages;

  // Track last clicked index for range selection
  const lastClickedIndexRef = useRef<number | null>(null);

  // Single image selection with toggle behavior
  const toggleImage = useCallback((image: ImageFile, event?: React.MouseEvent) => {
    // Find the index of the clicked image
    const imageIndex = workingImages.findIndex((img) => img.path === image.path);

    // If Shift is held and we have a previous click, perform range selection
    const isShiftClick = event?.shiftKey;
    if (isShiftClick && lastClickedIndexRef.current !== null && imageIndex !== -1) {
      const start = Math.min(lastClickedIndexRef.current, imageIndex);
      const end = Math.max(lastClickedIndexRef.current, imageIndex);
      store.selectRange(workingImages, start, end);
      return;
    }

    // Default behavior for both normal clicks and checkbox clicks: Toggle
    store.toggleImage(image);
    lastClickedIndexRef.current = imageIndex;
  }, [workingImages, store]);

  const selectImage = useCallback((image: ImageFile) => {
    store.selectImage(image);
  }, [store]);

  const deselectImage = useCallback((imagePath: string) => {
    store.deselectImage(imagePath);
  }, [store]);

  const selectAll = useCallback(() => {
    store.selectAll(workingImages);
  }, [store, workingImages]);

  const deselectAll = useCallback(() => {
    store.deselectAll();
  }, [store]);

  const deleteSelected = useCallback(() => {
    const selectedPaths = Array.from(store.selectedImages.keys());
    if (selectedPaths.length > 0) {
      onDelete?.(selectedPaths);
    }
  }, [store, onDelete]);

  const processSelected = useCallback(() => {
    const selectedPaths = Array.from(store.selectedImages.keys());
    if (selectedPaths.length > 0) {
      onProcess?.(selectedPaths);
    }
  }, [store, onProcess]);

  const selectRange = useCallback((startIndex: number, endIndex: number) => {
    store.selectRange(workingImages, startIndex, endIndex);
  }, [store, workingImages]);

  const isImageSelected = useCallback((imagePath: string): boolean => {
    return store.selectedImages.has(imagePath);
  }, [store.selectedImages]);

  const getSelectedPaths = useCallback((): string[] => {
    return Array.from(store.selectedImages.keys());
  }, [store.selectedImages]);

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
            onSelectAll?.(workingImages);
          }
          break;

        case KEYBOARD_SHORTCUTS.DESELECT_ALL:
          event.preventDefault();
          deselectAll();
          onDeselectAll?.();
          break;

        case KEYBOARD_SHORTCUTS.DELETE_SELECTED:
          if (store.selectedImages.size > 0) {
            event.preventDefault();
            deleteSelected();
          }
          break;

        case KEYBOARD_SHORTCUTS.PROCESS_IMAGES:
          if (store.selectedImages.size > 0) {
            event.preventDefault();
            processSelected();
          }
          break;

        case KEYBOARD_SHORTCUTS.TOGGLE_VIEW:
          event.preventDefault();
          // Cycle through view modes
          const modes: Array<'grid' | 'list' | 'large'> = ['grid', 'list', 'large'];
          const currentIndex = modes.indexOf(imageStore.viewMode);
          const nextMode = modes[(currentIndex + 1) % modes.length];
          imageStore.setViewMode(nextMode);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, workingImages, store, imageStore, onSelectAll, onDeselectAll, selectAll, deselectAll, deleteSelected, processSelected]);

  return {
    selectedImages: store.selectedImages,
    selectedCount: store.selectedImages.size,
    isAllSelected: store.isAllSelected,
    hasSelection: store.selectedImages.size > 0,

    toggleImage,
    selectImage,
    deselectImage,
    selectAll,
    deselectAll,
    deleteSelected,
    processSelected,

    selectRange,

    isImageSelected,
    getSelectedPaths,
  };
}
