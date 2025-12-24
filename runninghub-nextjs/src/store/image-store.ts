import { create } from 'zustand';
import { ImageFile, ViewMode } from '@/types';

interface ImageState {
  // Image data
  images: ImageFile[];
  filteredImages: ImageFile[];

  // View mode
  viewMode: ViewMode;

  // Loading state
  isLoadingImages: boolean;

  // Error state
  error: string | null;

  // Search/filter state
  searchQuery: string;
  selectedExtension: string | null;

  // Actions
  setImages: (images: ImageFile[]) => void;
  setViewMode: (mode: ViewMode) => void;
  setLoadingImages: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSelectedExtension: (extension: string | null) => void;

  // Filter actions
  applyFilters: () => void;
  clearFilters: () => void;

  // Image actions
  addImage: (image: ImageFile) => void;
  removeImage: (imagePath: string) => void;
  updateImage: (imagePath: string, updates: Partial<ImageFile>) => void;

  // Like actions
  likedImages: Set<string>;
  toggleLike: (imagePath: string) => void;
}

export const useImageStore = create<ImageState>((set, get) => ({
  // Initial state
  images: [],
  filteredImages: [],
  viewMode: 'grid',
  isLoadingImages: false,
  error: null,
  searchQuery: '',
  selectedExtension: null,
  likedImages: new Set(),

  // Setters
  setImages: (images) => {
    set({ images, filteredImages: images, error: null });
    get().applyFilters();
  },

  setViewMode: (mode) => set({ viewMode: mode }),

  setLoadingImages: (loading) => set({ isLoadingImages: loading }),

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
    let filtered = [...state.images];

    // Apply search query filter
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (img) =>
          img.name.toLowerCase().includes(query) ||
          img.path.toLowerCase().includes(query)
      );
    }

    // Apply extension filter
    if (state.selectedExtension) {
      filtered = filtered.filter(
        (img) => img.extension === state.selectedExtension
      );
    }

    set({ filteredImages: filtered });
  },

  clearFilters: () => {
    set({ searchQuery: '', selectedExtension: null });
    const state = get();
    set({ filteredImages: [...state.images] });
  },

  // Image actions
  addImage: (image) => {
    const state = get();
    const newImages = [...state.images, image];
    set({ images: newImages });
    get().applyFilters();
  },

  removeImage: (imagePath) => {
    const state = get();
    const newImages = state.images.filter((img) => img.path !== imagePath);
    set({ images: newImages });
    get().applyFilters();
  },

  updateImage: (imagePath, updates) => {
    const state = get();
    const newImages = state.images.map((img) =>
      img.path === imagePath ? { ...img, ...updates } : img
    );
    set({ images: newImages });
    get().applyFilters();
  },

  toggleLike: (imagePath) => {
    const state = get();
    const newLikedImages = new Set(state.likedImages);
    if (newLikedImages.has(imagePath)) {
      newLikedImages.delete(imagePath);
    } else {
      newLikedImages.add(imagePath);
    }
    set({ likedImages: newLikedImages });
  },
}));
