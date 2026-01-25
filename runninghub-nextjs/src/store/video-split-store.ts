import { create } from "zustand";
import { persist } from "zustand/middleware";
import { VideoSplitOptions } from "@/types/video-split";

interface VideoSplitState {
	// Configuration
	splitOptions: VideoSplitOptions;

	// Actions
	setSplitOptions: (options: VideoSplitOptions) => void;
	setSplitMode: (mode: "duration" | "count") => void;
	setSegmentDuration: (duration: number) => void;
	setSegmentCount: (count: number) => void;
	setOutputDir: (dir: string) => void;
	toggleDeleteOriginal: () => void;

	// Reset
	resetOptions: () => void;
}

const DEFAULT_SPLIT_OPTIONS: VideoSplitOptions = {
	mode: "duration",
	segmentDuration: 5,
	segmentCount: 12,
	deleteOriginal: false,
};

export const useVideoSplitStore = create<VideoSplitState>()(
	persist(
		(set) => ({
			// Initial state
			splitOptions: DEFAULT_SPLIT_OPTIONS,

			// Setters
			setSplitOptions: (options) => set({ splitOptions: options }),

			setSplitMode: (mode) =>
				set((state) => ({
					splitOptions: { ...state.splitOptions, mode },
				})),

			setSegmentDuration: (duration) =>
				set((state) => ({
					splitOptions: { ...state.splitOptions, segmentDuration: duration },
				})),

			setSegmentCount: (count) =>
				set((state) => ({
					splitOptions: { ...state.splitOptions, segmentCount: count },
				})),

			setOutputDir: (dir) =>
				set((state) => ({
					splitOptions: { ...state.splitOptions, outputDir: dir },
				})),

			toggleDeleteOriginal: () =>
				set((state) => ({
					splitOptions: {
						...state.splitOptions,
						deleteOriginal: !state.splitOptions.deleteOriginal,
					},
				})),

			// Reset
			resetOptions: () => set({ splitOptions: DEFAULT_SPLIT_OPTIONS }),
		}),
		{
			name: "runninghub-video-split-storage",
			partialize: (state) => ({
				splitOptions: state.splitOptions,
			}),
		},
	),
);
