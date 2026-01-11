import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ExportConfig {
  deleteAfterExport: boolean;
}

interface ExportConfigStore extends ExportConfig {
  deleteAfterExport: boolean;
  toggleDeleteAfterExport: () => void;
  setDeleteAfterExport: (value: boolean) => void;
}

export const useExportConfigStore = create<ExportConfigStore>()(
  persist(
    (set) => ({
      deleteAfterExport: false,
      toggleDeleteAfterExport: () => set((state) => ({ deleteAfterExport: !state.deleteAfterExport })),
      setDeleteAfterExport: (value) => set({ deleteAfterExport: value }),
    }),
    {
      name: 'runninghub-export-config-storage',
    }
  )
);
