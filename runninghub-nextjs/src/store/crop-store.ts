import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CropMode, CropConfig } from '@/types/crop';

interface CropStore {
  cropConfig: CropConfig;
  setCropMode: (mode: CropMode) => void;
  setCustomDimensions: (dimensions: Partial<Pick<CropConfig, 'customWidth' | 'customHeight' | 'customX' | 'customY'>>) => void;
  setOutputSuffix: (suffix: string) => void;
  togglePreserveAudio: () => void;
}

export const useCropStore = create<CropStore>()(
  persist(
    (set) => ({
      cropConfig: {
        mode: 'center',
        outputSuffix: '_cropped',
        preserveAudio: false,
      },
      setCropMode: (mode) =>
        set((state) => ({
          cropConfig: { ...state.cropConfig, mode },
        })),
      setCustomDimensions: (dimensions) =>
        set((state) => ({
          cropConfig: { ...state.cropConfig, ...dimensions },
        })),
      setOutputSuffix: (outputSuffix) =>
        set((state) => ({
          cropConfig: { ...state.cropConfig, outputSuffix },
        })),
      togglePreserveAudio: () =>
        set((state) => ({
          cropConfig: {
            ...state.cropConfig,
            preserveAudio: !state.cropConfig.preserveAudio,
          },
        })),
    }),
    {
      name: 'crop-storage',
    }
  )
);
