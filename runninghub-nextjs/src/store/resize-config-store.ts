import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ResizeConfigState {
  longestEdge: string;
  outputSuffix: string;
  deleteOriginal: boolean;
  setLongestEdge: (edge: string) => void;
  setOutputSuffix: (suffix: string) => void;
  setDeleteOriginal: (value: boolean) => void;
  toggleDeleteOriginal: () => void;
}

export const useResizeConfigStore = create<ResizeConfigState>()(
  persist(
    (set) => ({
      longestEdge: '768',
      outputSuffix: '_resized',
      deleteOriginal: false,
      setLongestEdge: (edge) => set({ longestEdge: edge }),
      setOutputSuffix: (suffix) => set({ outputSuffix: suffix }),
      setDeleteOriginal: (value) => set({ deleteOriginal: value }),
      toggleDeleteOriginal: () => set((state) => ({ deleteOriginal: !state.deleteOriginal })),
    }),
    {
      name: 'runninghub-resize-config-storage',
      partialize: (state) => ({
        longestEdge: state.longestEdge,
        outputSuffix: state.outputSuffix,
        deleteOriginal: state.deleteOriginal,
      }),
    }
  )
);
