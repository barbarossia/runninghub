import { create } from 'zustand';
import { CropMode, CropConfig } from '@/types/crop';
import { DEFAULT_CROP_CONFIG } from '@/constants';

interface CropState {
  // Configuration
  cropConfig: CropConfig;

  // Actions
  setCropConfig: (config: CropConfig) => void;
  setCropMode: (mode: CropMode) => void;
  setCustomDimensions: (dimensions: {
    width?: string;
    height?: string;
    x?: string;
    y?: string;
  }) => void;
  setOutputSuffix: (suffix: string) => void;
  togglePreserveAudio: () => void;

  // Reset
  resetConfig: () => void;
}

export const useCropStore = create<CropState>((set) => ({
  // Initial state
  cropConfig: DEFAULT_CROP_CONFIG,

  // Setters
  setCropConfig: (config) => set({ cropConfig: config }),

  setCropMode: (mode) =>
    set((state) => ({
      cropConfig: { ...state.cropConfig, mode },
    })),

  setCustomDimensions: (dimensions) =>
    set((state) => ({
      cropConfig: {
        ...state.cropConfig,
        customWidth: dimensions.width,
        customHeight: dimensions.height,
        customX: dimensions.x,
        customY: dimensions.y,
      },
    })),

  setOutputSuffix: (suffix) =>
    set((state) => ({
      cropConfig: { ...state.cropConfig, outputSuffix: suffix },
    })),

  togglePreserveAudio: () =>
    set((state) => ({
      cropConfig: {
        ...state.cropConfig,
        preserveAudio: !state.cropConfig.preserveAudio,
      },
    })),

  // Reset
  resetConfig: () => set({ cropConfig: DEFAULT_CROP_CONFIG }),
}));
