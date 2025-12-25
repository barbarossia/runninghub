import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ProcessConfig } from '@/components/images/ImageProcessConfig';

interface ProcessStore {
  config: ProcessConfig;
  setConfig: (config: ProcessConfig) => void;
  updateConfig: (updates: Partial<ProcessConfig>) => void;
}

const DEFAULT_CONFIG: ProcessConfig = {
  triggerWord: 'naran',
  width: 512,
  height: 768,
};

export const useProcessStore = create<ProcessStore>()(
  persist(
    (set) => ({
      config: DEFAULT_CONFIG,
      setConfig: (config) => set({ config }),
      updateConfig: (updates) =>
        set((state) => ({
          config: { ...state.config, ...updates },
        })),
    }),
    {
      name: 'process-storage',
    }
  )
);
